import { Knex } from 'knex';
import { db } from '../config/database';

export interface QueryOptions {
  tenantId: string;
  userId?: string;
  fields?: string[];
  filters?: Record<string, any>;
  sort?: Record<string, 'asc' | 'desc'>;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface FieldDefinition {
  apiName: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  defaultValue?: string;
  picklistValues?: Array<{ value: string; label: string; isActive: boolean }>;
  validationRules?: Array<{ type: string; value?: string | number; message?: string }>;
}

export interface ObjectDefinition {
  apiName: string;
  fields: FieldDefinition[];
}

export class DynamicQueryBuilder {
  private tenantId: string;
  private userId?: string;
  private objectDefinition: ObjectDefinition;

  constructor(tenantId: string, objectDefinition: ObjectDefinition, userId?: string) {
    this.tenantId = tenantId;
    this.objectDefinition = objectDefinition;
    this.userId = userId;
  }

  async buildSelectQuery(options: Partial<QueryOptions> = {}): Promise<Knex.QueryBuilder> {
    const {
      fields = this.objectDefinition.fields.map(f => f.apiName),
      filters = {},
      sort = {},
      page = 1,
      limit = 20,
      cursor
    } = options;

    // Set tenant context
    await db.raw('SELECT set_tenant_context(?)', [this.tenantId]);
    if (this.userId) {
      await db.raw('SELECT set_user_context(?)', [this.userId]);
    }

    const tableName = `t_${this.tenantId}__${this.objectDefinition.apiName}`;
    let query = db(tableName);

    // Select specific fields
    const selectedFields = this.buildSelectedFields(fields);
    query.select(selectedFields);

    // Apply filters
    query = this.applyFilters(query, filters);

    // Apply sorting
    query = this.applySorting(query, sort);

    // Apply pagination
    if (cursor) {
      query = this.applyCursorPagination(query, cursor, limit);
    } else {
      query = this.applyOffsetPagination(query, page, limit);
    }

    return query;
  }

  async buildInsertQuery(data: Record<string, any>): Promise<Knex.QueryBuilder> {
    await this.setContext();

    const tableName = `t_${this.tenantId}__${this.objectDefinition.apiName}`;
    const validatedData = await this.validateAndTransformData(data);

    return db(tableName).insert(validatedData).returning('*');
  }

  async buildUpdateQuery(
    id: string, 
    data: Record<string, any>,
    version?: number
  ): Promise<Knex.QueryBuilder> {
    await this.setContext();

    const tableName = `t_${this.tenantId}__${this.objectDefinition.apiName}`;
    const validatedData = await this.validateAndTransformData(data);

    let query = db(tableName).where('id', id).update(validatedData).returning('*');

    // Add optimistic locking if version is provided
    if (version !== undefined) {
      query = query.where('version', version);
    }

    return query;
  }

  async buildDeleteQuery(id: string, soft = true): Promise<Knex.QueryBuilder> {
    await this.setContext();

    const tableName = `t_${this.tenantId}__${this.objectDefinition.apiName}`;

    if (soft) {
      return db(tableName).where('id', id).update({ 
        is_deleted: true, 
        updated_at: new Date() 
      });
    } else {
      return db(tableName).where('id', id).del();
    }
  }

  async buildCountQuery(filters: Record<string, any> = {}): Promise<Knex.QueryBuilder> {
    await this.setContext();

    const tableName = `t_${this.tenantId}__${this.objectDefinition.apiName}`;
    let query = db(tableName).count('* as total');

    // Apply filters
    query = this.applyFilters(query, filters);

    return query;
  }

  private async setContext(): Promise<void> {
    await db.raw('SELECT set_tenant_context(?)', [this.tenantId]);
    if (this.userId) {
      await db.raw('SELECT set_user_context(?)', [this.userId]);
    }
  }

  private buildSelectedFields(fields: string[]): string[] {
    return fields.map(field => {
      const fieldDef = this.objectDefinition.fields.find(f => f.apiName === field);
      if (!fieldDef) {
        throw new Error(`Field ${field} not found in object definition`);
      }

      // Handle special field types
      if (fieldDef.dataType === 'LOOKUP') {
        return `${field}__r as ${field}__r`;
      }
      
      return field;
    });
  }

  private applyFilters(query: Knex.QueryBuilder, filters: Record<string, any>): Knex.QueryBuilder {
    Object.entries(filters).forEach(([field, value]) => {
      if (value === undefined || value === null) return;

      const fieldDef = this.objectDefinition.fields.find(f => f.apiName === field);
      if (!fieldDef) return;

      if (typeof value === 'object' && value !== null) {
        // Handle complex filter objects
        if (value.like) {
          query = query.where(field, 'ILIKE', `%${value.like}%`);
        } else if (value.in) {
          query = query.whereIn(field, Array.isArray(value.in) ? value.in : [value.in]);
        } else if (value.gt) {
          query = query.where(field, '>', value.gt);
        } else if (value.gte) {
          query = query.where(field, '>=', value.gte);
        } else if (value.lt) {
          query = query.where(field, '<', value.lt);
        } else if (value.lte) {
          query = query.where(field, '<=', value.lte);
        } else if (value.ne) {
          query = query.whereNot(field, value.ne);
        }
      } else {
        // Simple equality filter
        query = query.where(field, value);
      }
    });

    // Always filter out deleted records
    query = query.where('is_deleted', false);

    return query;
  }

  private applySorting(query: Knex.QueryBuilder, sort: Record<string, 'asc' | 'desc'>): Knex.QueryBuilder {
    Object.entries(sort).forEach(([field, direction]) => {
      const fieldDef = this.objectDefinition.fields.find(f => f.apiName === field);
      if (fieldDef) {
        query = query.orderBy(field, direction);
      }
    });

    // Default sort by created_at desc
    if (Object.keys(sort).length === 0) {
      query = query.orderBy('created_at', 'desc');
    }

    return query;
  }

  private applyCursorPagination(
    query: Knex.QueryBuilder, 
    cursor: string, 
    limit: number
  ): Knex.QueryBuilder {
    // Decode cursor (base64 encoded JSON with id and timestamp)
    try {
      const cursorData = JSON.parse(Buffer.from(cursor, 'base64').toString());
      query = query.where('created_at', '<', new Date(cursorData.timestamp));
      query = query.orWhere('created_at', '=', new Date(cursorData.timestamp)).andWhere('id', '<', cursorData.id);
    } catch (error) {
      throw new Error('Invalid cursor format');
    }

    return query.limit(limit);
  }

  private applyOffsetPagination(
    query: Knex.QueryBuilder, 
    page: number, 
    limit: number
  ): Knex.QueryBuilder {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  }

  private async validateAndTransformData(data: Record<string, any>): Promise<Record<string, any>> {
    const validatedData: Record<string, any> = {};
    const errors: string[] = [];

    for (const fieldDef of this.objectDefinition.fields) {
      const value = data[fieldDef.apiName];
      
      // Skip if value is not provided and field is not required
      if (value === undefined && !fieldDef.required) {
        continue;
      }

      // Validate required fields
      if (fieldDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field ${fieldDef.apiName} is required`);
        continue;
      }

      // Skip validation if value is not provided
      if (value === undefined) {
        continue;
      }

      // Type validation and transformation
      try {
        validatedData[fieldDef.apiName] = await this.validateFieldValue(fieldDef, value);
      } catch (error) {
        errors.push(`Field ${fieldDef.apiName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Add system fields
    validatedData.created_at = new Date();
    validatedData.updated_at = new Date();
    validatedData.version = 1;

    return validatedData;
  }

  private async validateFieldValue(fieldDef: FieldDefinition, value: any): Promise<any> {
    switch (fieldDef.dataType) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
        if (typeof value !== 'string') {
          throw new Error('Must be a string');
        }
        
        // Email validation
        if (fieldDef.dataType === 'EMAIL') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error('Invalid email format');
          }
        }
        
        // URL validation
        if (fieldDef.dataType === 'URL') {
          try {
            new URL(value);
          } catch {
            throw new Error('Invalid URL format');
          }
        }
        
        return value;

      case 'NUMBER':
      case 'CURRENCY':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error('Must be a valid number');
        }
        return numValue;

      case 'BOOLEAN':
        if (typeof value === 'boolean') return value;
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
        throw new Error('Must be a boolean value');

      case 'DATE':
      case 'DATETIME':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          throw new Error('Must be a valid date');
        }
        return dateValue;

      case 'PICKLIST':
        if (!fieldDef.picklistValues) {
          throw new Error('Picklist values not defined');
        }
        
        const validValues = fieldDef.picklistValues
          .filter(pv => pv.isActive)
          .map(pv => pv.value);
          
        if (!validValues.includes(value)) {
          throw new Error(`Invalid picklist value. Valid values: ${validValues.join(', ')}`);
        }
        
        return value;

      case 'FORMULA':
        // Formula fields are read-only
        throw new Error('Formula fields are read-only');

      default:
        return value;
    }
  }
}
