import { Knex } from 'knex';
import { db, createTenantSchema } from '../config/database';
import { FieldDefinition } from '../builders/DynamicQueryBuilder';

export interface CreateTableOptions {
  tenantId: string;
  objectApiName: string;
  fields: FieldDefinition[];
}

export class TenantTableService {
  /**
   * Create a new tenant table dynamically based on object definition
   */
  async createTenantTable(options: CreateTableOptions): Promise<void> {
    const { tenantId, objectApiName, fields } = options;
    const tableName = this.tableNameFor(tenantId, objectApiName);
    const schemaName = this.schemaNameFor(tenantId);

    await db.transaction(async (trx) => {
      // Ensure tenant schema exists
      await createTenantSchema(tenantId);

      // Set search path to tenant schema
      await trx.raw(`SET search_path TO ${schemaName}, public`);

      // Create the table
      await this.createTable(trx, tableName, fields);

      // Create indexes
      await this.createIndexes(trx, tableName, fields);

      // Create RLS policies
      await this.createRLSPolicies(trx, tableName);

      // Create audit trigger
      await this.createAuditTrigger(trx, tableName);
    });
  }

  /**
   * Add a new column to an existing tenant table
   */
  async addColumn(
    tenantId: string, 
    objectApiName: string, 
    field: FieldDefinition
  ): Promise<void> {
    const tableName = this.tableNameFor(tenantId, objectApiName);
    const schemaName = this.schemaNameFor(tenantId);

    await db.transaction(async (trx) => {
      await trx.raw(`SET search_path TO ${schemaName}, public`);
      
      const columnDefinition = this.buildColumnDefinition(field);
      await trx.raw(`ALTER TABLE ${this.qIdent(tableName)} ADD COLUMN ${columnDefinition}`);

      // Create index if field is indexed
      if (this.shouldCreateIndex(field)) {
        const fieldName = this.sanitizeIdentifier(field.apiName, 'field apiName');
        await trx.raw(
          `CREATE INDEX IF NOT EXISTS ${this.qIdent(`idx_${tableName}_${fieldName}`)} ON ${this.qIdent(tableName)}(${this.qIdent(fieldName)})`
        );
      }
    });
  }

  /**
   * Remove a column from an existing tenant table
   */
  async removeColumn(
    tenantId: string, 
    objectApiName: string, 
    fieldApiName: string
  ): Promise<void> {
    const tableName = this.tableNameFor(tenantId, objectApiName);
    const schemaName = this.schemaNameFor(tenantId);
    const safeFieldApiName = this.sanitizeIdentifier(fieldApiName, 'field apiName');

    await db.transaction(async (trx) => {
      await trx.raw(`SET search_path TO ${schemaName}, public`);
      
      // Drop index if exists
      await trx.raw(
        `DROP INDEX IF EXISTS ${this.qIdent(`idx_${tableName}_${safeFieldApiName}`)}`
      );

      // Drop column
      await trx.raw(`ALTER TABLE ${this.qIdent(tableName)} DROP COLUMN IF EXISTS ${this.qIdent(safeFieldApiName)}`);
    });
  }

  /**
   * Drop an entire tenant table
   */
  async dropTenantTable(tenantId: string, objectApiName: string): Promise<void> {
    const tableName = this.tableNameFor(tenantId, objectApiName);
    const schemaName = this.schemaNameFor(tenantId);

    await db.transaction(async (trx) => {
      await trx.raw(`SET search_path TO ${schemaName}, public`);
      
      // Drop table with cascade
      await trx.raw(`DROP TABLE IF EXISTS ${this.qIdent(tableName)} CASCADE`);
    });
  }

  private async createTable(
    trx: Knex.Transaction, 
    tableName: string, 
    fields: FieldDefinition[]
  ): Promise<void> {
    const columns = [
      'id UUID PRIMARY KEY DEFAULT uuid_generate_v4()',
      'tenant_id VARCHAR(255) NOT NULL',
      'created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
      'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
      'created_by VARCHAR(255)',
      'is_deleted BOOLEAN DEFAULT FALSE',
      'version INTEGER DEFAULT 1',
      ...fields.map(field => this.buildColumnDefinition(field))
    ];

    await trx.raw(`CREATE TABLE ${this.qIdent(tableName)} (${columns.join(', ')})`);
  }

  private buildColumnDefinition(field: FieldDefinition): string {
    const fieldName = this.sanitizeIdentifier(field.apiName, 'field apiName');
    let definition = `${this.qIdent(fieldName)} `;

    switch (field.dataType) {
      case 'TEXT':
        definition += 'TEXT';
        break;
      case 'EMAIL':
        definition += 'VARCHAR(255)';
        break;
      case 'PHONE':
        definition += 'VARCHAR(50)';
        break;
      case 'URL':
        definition += 'TEXT';
        break;
      case 'NUMBER':
        definition += 'DECIMAL(20,8)';
        break;
      case 'CURRENCY':
        definition += 'DECIMAL(20,2)';
        break;
      case 'DATE':
        definition += 'DATE';
        break;
      case 'DATETIME':
        definition += 'TIMESTAMP WITH TIME ZONE';
        break;
      case 'BOOLEAN':
        definition += 'BOOLEAN';
        break;
      case 'PICKLIST':
        definition += 'VARCHAR(255)';
        break;
      case 'LOOKUP':
        definition += 'UUID';
        break;
      case 'FORMULA':
        definition += 'TEXT';
        break;
      default:
        definition += 'TEXT';
    }

    // Add NOT NULL constraint for required fields
    if (field.required) {
      definition += ' NOT NULL';
    }

    // Add default value
    if (field.defaultValue) {
      definition += ` DEFAULT ${this.formatDefaultValue(field.defaultValue, field.dataType)}`;
    }

    // Add UNIQUE constraint
    if (field.unique) {
      definition += ' UNIQUE';
    }

    return definition;
  }

  private formatDefaultValue(value: string, dataType: string): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    switch (dataType) {
      case 'BOOLEAN':
        return value === 'true' ? 'TRUE' : 'FALSE';
      case 'NUMBER':
      case 'CURRENCY':
        if (!/^-?\d+(\.\d+)?$/.test(String(value))) {
          throw new Error(`Invalid numeric default value: ${value}`);
        }
        return String(value);
      case 'DATE':
      case 'DATETIME':
        return `'${value}'`;
      default:
        return `'${value.replace(/'/g, "''")}'`;
    }
  }

  private shouldCreateIndex(field: FieldDefinition): boolean {
    // Index commonly queried fields
    const indexableTypes = ['TEXT', 'EMAIL', 'LOOKUP', 'PICKLIST'];
    return indexableTypes.includes(field.dataType) || field.unique;
  }

  private async createIndexes(
    trx: Knex.Transaction, 
    tableName: string, 
    fields: FieldDefinition[]
  ): Promise<void> {
    // Create standard indexes
    const standardIndexes = [
      `CREATE INDEX IF NOT EXISTS ${this.qIdent(`idx_${tableName}_created_at`)} ON ${this.qIdent(tableName)}(${this.qIdent('created_at')})`,
      `CREATE INDEX IF NOT EXISTS ${this.qIdent(`idx_${tableName}_updated_at`)} ON ${this.qIdent(tableName)}(${this.qIdent('updated_at')})`,
      `CREATE INDEX IF NOT EXISTS ${this.qIdent(`idx_${tableName}_is_deleted`)} ON ${this.qIdent(tableName)}(${this.qIdent('is_deleted')})`,
      `CREATE INDEX IF NOT EXISTS ${this.qIdent(`idx_${tableName}_tenant_id`)} ON ${this.qIdent(tableName)}(${this.qIdent('tenant_id')})`,
    ];

    for (const indexSql of standardIndexes) {
      await trx.raw(indexSql);
    }

    // Create field-specific indexes
    for (const field of fields) {
      if (this.shouldCreateIndex(field)) {
        const fieldName = this.sanitizeIdentifier(field.apiName, 'field apiName');
        await trx.raw(
          `CREATE INDEX IF NOT EXISTS ${this.qIdent(`idx_${tableName}_${fieldName}`)} ON ${this.qIdent(tableName)}(${this.qIdent(fieldName)})`
        );
      }
    }
  }

  private async createRLSPolicies(
    trx: any,
    tableName: string
  ): Promise<void> {
    // Enable RLS
    await trx.raw(`ALTER TABLE ${this.qIdent(tableName)} ENABLE ROW LEVEL SECURITY`);

    // Create tenant isolation policy
    await trx.raw(`
      CREATE POLICY ${this.qIdent(`tenant_isolation_policy_${tableName}`)} ON ${this.qIdent(tableName)}
      FOR ALL
      TO platform
      USING (tenant_id = current_setting('app.current_tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true))
    `);

    // Create user-based policies for different access levels
    await trx.raw(`
      CREATE POLICY ${this.qIdent(`user_read_policy_${tableName}`)} ON ${this.qIdent(tableName)}
      FOR SELECT
      TO platform
      USING (created_by = current_setting('app.current_user_id', true) OR created_by IS NULL)
    `);

    await trx.raw(`
      CREATE POLICY ${this.qIdent(`user_write_policy_${tableName}`)} ON ${this.qIdent(tableName)}
      FOR INSERT, UPDATE
      TO platform
      WITH CHECK (created_by = current_setting('app.current_user_id', true) OR created_by IS NULL)
    `);
  }

  private async createAuditTrigger(trx: Knex.Transaction, tableName: string): Promise<void> {
    // Create trigger function if it doesn't exist
    await trx.raw(`
      CREATE OR REPLACE FUNCTION ${this.qIdent(`${tableName}_audit_trigger`)}()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          INSERT INTO audit_log(table_name, operation, old_data, user_id)
          VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_setting('app.current_user_id', true));
          RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
          INSERT INTO audit_log(table_name, operation, old_data, new_data, user_id)
          VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.current_user_id', true));
          RETURN NEW;
        ELSIF TG_OP = 'INSERT' THEN
          INSERT INTO audit_log(table_name, operation, new_data, user_id)
          VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_setting('app.current_user_id', true));
          RETURN NEW;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await trx.raw(`
      CREATE TRIGGER ${this.qIdent(`${tableName}_audit_trigger`)}
      AFTER INSERT OR UPDATE OR DELETE ON ${this.qIdent(tableName)}
      FOR EACH ROW EXECUTE FUNCTION ${this.qIdent(`${tableName}_audit_trigger`)}()
    `);
  }

  private tableNameFor(tenantId: string, objectApiName: string): string {
    const safeTenantId = this.sanitizeTenantId(tenantId);
    const safeObjectApiName = this.sanitizeIdentifier(objectApiName, 'object apiName');
    return `t_${safeTenantId}__${safeObjectApiName}`;
  }

  private schemaNameFor(tenantId: string): string {
    const safeTenantId = this.sanitizeTenantId(tenantId);
    return this.qIdent(`tenant_${safeTenantId}`);
  }

  private sanitizeTenantId(value: string): string {
    if (!/^[A-Za-z0-9_]+$/.test(value)) {
      throw new Error('Invalid tenantId format');
    }
    return value;
  }

  private sanitizeIdentifier(value: string, label: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
      throw new Error(`Invalid ${label}`);
    }
    return value;
  }

  private qIdent(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
