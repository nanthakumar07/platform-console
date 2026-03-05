-- Initialize platform database
-- This script sets up the base database structure for the Developer Console Platform

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create platform user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'platform') THEN

      CREATE ROLE platform LOGIN PASSWORD 'platform123';
   END IF;
END
$do$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE platform TO platform;
GRANT ALL PRIVILEGES ON SCHEMA public TO platform;

-- Create audit log function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, operation, old_data, user_id, tenant_id, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_setting('app.current_user_id', true), current_setting('app.current_tenant_id', true), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, operation, old_data, new_data, user_id, tenant_id, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_setting('app.current_user_id', true), current_setting('app.current_tenant_id', true), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(table_name, operation, new_data, user_id, tenant_id, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_setting('app.current_user_id', true), current_setting('app.current_tenant_id', true), NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id VARCHAR(255),
    tenant_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

-- Create tenant usage metrics table
CREATE TABLE IF NOT EXISTS tenant_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(255) NOT NULL,
    metric_date DATE NOT NULL,
    api_calls INTEGER DEFAULT 0,
    record_count INTEGER DEFAULT 0,
    storage_mb DECIMAL(10,2) DEFAULT 0,
    automation_runs INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, metric_date)
);

-- Create indexes for usage metrics
CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant_date ON tenant_usage_metrics(tenant_id, metric_date);

-- Create platform settings table
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description, is_public) VALUES
('max_tenant_records', '100000', 'Maximum records per tenant', false),
('default_rate_limit', '1000', 'Default API rate limit per minute', true),
('enable_workflow_engine', 'true', 'Enable workflow engine globally', false),
('max_file_upload_mb', '10', 'Maximum file upload size in MB', true)
ON CONFLICT (key) DO NOTHING;

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- Create function to set user context
CREATE OR REPLACE FUNCTION set_user_context(user_id VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, true);
END;
$$ LANGUAGE plpgsql;

-- Create Row Level Security (RLS) policies template
-- These will be applied to tenant-specific tables

-- Example RLS policy for tenant isolation
-- This will be dynamically created for each tenant table
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE POLICY tenant_isolation_policy ON %I
        FOR ALL
        TO platform
        USING (tenant_id = current_setting(''app.current_tenant_id'', true))
        WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true));
    ', table_name);
    
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to platform user
GRANT EXECUTE ON FUNCTION audit_trigger_function() TO platform;
GRANT EXECUTE ON FUNCTION set_tenant_context(VARCHAR) TO platform;
GRANT EXECUTE ON FUNCTION set_user_context(VARCHAR) TO platform;
GRANT EXECUTE ON FUNCTION create_tenant_rls_policy(TEXT) TO platform;

-- Create notification channel for real-time events
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'table_changes',
        json_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'tenant_id', COALESCE(NEW.tenant_id, OLD.tenant_id),
            'id', COALESCE(NEW.id, OLD.id)
        )::text
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;
