import knex, { Knex } from 'knex';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  pool?: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    destroyTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
  };
}

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'platform',
    password: process.env.DB_PASSWORD || 'platform123',
    database: process.env.DB_NAME || 'platform',
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
    createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '100'),
  },
  searchPath: ['public'],
  migrations: {
    directory: './src/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/seeds',
  },
};

export const db = knex(config);

export const initializeDatabase = async () => {
  try {
    await db.raw('SELECT 1');
    console.log('Database connection established successfully');
    
    // Run migrations in production
    if (process.env.NODE_ENV === 'production') {
      await db.migrate.latest();
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
};

export const closeDatabase = async () => {
  await db.destroy();
};

// Helper function to set tenant context
export const setTenantContext = async (tenantId: string) => {
  await db.raw('SELECT set_tenant_context(?)', [tenantId]);
};

// Helper function to set user context
export const setUserContext = async (userId: string) => {
  await db.raw('SELECT set_user_context(?)', [userId]);
};

// Helper function to create tenant schema
export const createTenantSchema = async (tenantId: string) => {
  if (!/^[A-Za-z0-9_]+$/.test(tenantId)) {
    throw new Error('Invalid tenantId format');
  }
  const schemaName = `tenant_${tenantId}`;
  const quotedSchemaName = `"${schemaName.replace(/"/g, '""')}"`;
  
  await db.transaction(async (trx) => {
    // Create schema
    await trx.raw(`CREATE SCHEMA IF NOT EXISTS ${quotedSchemaName}`);
    
    // Set search path for this transaction
    await trx.raw(`SET search_path TO ${quotedSchemaName}, public`);
    
    // Create base tables for tenant
    await createBaseTenantTables(trx);
    
    // Create RLS policies
    await createTenantRLSPolicies(trx, quotedSchemaName);
  });
  
  return schemaName;
};

const createBaseTenantTables = async (trx: Knex.Transaction) => {
  // Create audit_log table for tenant
  await trx.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
    table.string('table_name', 255).notNullable();
    table.string('operation', 10).notNullable();
    table.jsonb('old_data');
    table.jsonb('new_data');
    table.string('user_id');
    table.timestamp('created_at').defaultTo(trx.raw('NOW()'));
  });
  
  // Create indexes
  await trx.raw('CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name)');
  await trx.raw('CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)');
};

const createTenantRLSPolicies = async (trx: Knex.Transaction, quotedSchemaName: string) => {
  // Enable RLS on audit_log
  await trx.raw(`ALTER TABLE ${quotedSchemaName}.audit_log ENABLE ROW LEVEL SECURITY`);
  
  // Create policy for audit_log
  await trx.raw(`
    CREATE POLICY tenant_audit_log_policy ON ${quotedSchemaName}.audit_log
    FOR ALL
    TO platform
    USING (true)
    WITH CHECK (true)
  `);
};

export default db;
