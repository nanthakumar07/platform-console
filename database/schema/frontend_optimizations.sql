-- Database Schema for Frontend Optimizations
-- Created: 2026-02-26
-- Purpose: Support activity logging, user preferences, analytics caching, and session tracking

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS dashboard_preferences CASCADE;
DROP TABLE IF EXISTS analytics_cache CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Activity Logs Table
-- Stores detailed audit trail of all user actions and system events
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    session_id UUID REFERENCES user_sessions(id),
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL, -- 'dashboard_view', 'widget_update', 'data_export', etc.
    activity_subtype VARCHAR(50), -- 'create', 'read', 'update', 'delete'
    action VARCHAR(100) NOT NULL, -- specific action performed
    description TEXT, -- human-readable description
    
    -- Resource information
    resource_type VARCHAR(50), -- 'dashboard', 'widget', 'report', etc.
    resource_id UUID, -- ID of the resource being acted upon
    resource_name VARCHAR(255), -- name of the resource
    resource_path VARCHAR(500), -- URL or path to the resource
    
    -- Request details
    request_method VARCHAR(10), -- HTTP method (GET, POST, PUT, DELETE)
    request_url VARCHAR(1000), -- full request URL
    request_ip INET, -- client IP address
    user_agent TEXT, -- browser/client user agent
    referer VARCHAR(1000), -- HTTP referer
    
    -- Response details
    response_status INTEGER, -- HTTP status code
    response_time_ms INTEGER, -- response time in milliseconds
    error_message TEXT, -- error details if applicable
    
    -- Data changes
    old_values JSONB, -- previous state of data (for updates)
    new_values JSONB, -- new state of data
    
    -- Metadata
    metadata JSONB, -- additional activity metadata
    tags TEXT[], -- searchable tags
    severity VARCHAR(20) DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_activity_type CHECK (activity_type IN (
        'dashboard_view', 'dashboard_create', 'dashboard_update', 'dashboard_delete', 'dashboard_share',
        'widget_create', 'widget_update', 'widget_delete', 'widget_move', 'widget_resize',
        'data_view', 'data_export', 'data_import', 'data_filter', 'data_sort',
        'collaboration_join', 'collaboration_leave', 'comment_add', 'comment_edit', 'comment_delete',
        'notification_send', 'notification_read', 'notification_dismiss',
        'user_login', 'user_logout', 'user_profile_update',
        'system_backup', 'system_maintenance', 'system_error'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    CONSTRAINT valid_response_status CHECK (response_status >= 100 AND response_status <= 599)
);

-- Dashboard Preferences Table
-- Stores user-specific dashboard settings and preferences
CREATE TABLE dashboard_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    dashboard_id UUID NOT NULL,
    
    -- Layout preferences
    layout_config JSONB NOT NULL, -- widget positions, sizes, grid layout
    theme_settings JSONB, -- color scheme, fonts, visual preferences
    display_settings JSONB, -- density, zoom, visibility settings
    
    -- Widget preferences
    widget_preferences JSONB, -- per-widget settings (filters, chart options, etc.)
    default_widgets UUID[], -- list of default widget IDs for new dashboards
    hidden_widgets UUID[], -- widgets that user has hidden
    
    -- Filter preferences
    default_filters JSONB, -- default filter values
    saved_filters JSONB, -- user-saved filter configurations
    recent_filters JSONB, -- recently used filters
    
    -- View preferences
    default_view_type VARCHAR(50), -- 'grid', 'list', 'table', 'chart'
    default_sort_column VARCHAR(100),
    default_sort_direction VARCHAR(10) DEFAULT 'asc',
    page_size INTEGER DEFAULT 20,
    
    -- Notification preferences
    notification_settings JSONB, -- email, push, in-app notification preferences
    alert_thresholds JSONB, -- custom alert thresholds and conditions
    
    -- Export preferences
    export_format VARCHAR(20) DEFAULT 'json', -- 'json', 'csv', 'xlsx', 'pdf'
    export_settings JSONB, -- export-specific settings
    
    -- Collaboration preferences
    collaboration_settings JSONB, -- sharing, visibility, access settings
    
    -- Metadata
    is_default BOOLEAN DEFAULT FALSE, -- whether this is the user's default preference
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1, -- for preference versioning
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_export_format CHECK (export_format IN ('json', 'csv', 'xlsx', 'pdf')),
    CONSTRAINT valid_sort_direction CHECK (default_sort_direction IN ('asc', 'desc')),
    CONSTRAINT unique_user_dashboard UNIQUE (user_id, dashboard_id),
    CONSTRAINT valid_page_size CHECK (page_size > 0 AND page_size <= 1000)
);

-- Analytics Cache Table
-- Stores pre-computed metrics and analytics data for performance
CREATE TABLE analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Cache key information
    cache_key VARCHAR(500) NOT NULL UNIQUE, -- composite key for cache lookup
    cache_type VARCHAR(50) NOT NULL, -- 'dashboard_metrics', 'user_analytics', 'system_health', etc.
    cache_subtype VARCHAR(50), -- specific subtype for categorization
    
    -- Data content
    cached_data JSONB NOT NULL, -- the actual cached analytics data
    data_format VARCHAR(20) DEFAULT 'json', -- 'json', 'csv', 'binary'
    data_size_bytes INTEGER, -- size of cached data
    
    -- Computation details
    computation_query TEXT, -- SQL query or computation method used
    computation_parameters JSONB, -- parameters used for computation
    computation_time_ms INTEGER, -- time taken to compute the data
    
    -- Cache metadata
    data_version VARCHAR(50), -- version of the data structure
    source_tables TEXT[], -- source tables used for computation
    refresh_strategy VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'manual', 'triggered'
    
    -- Performance metrics
    hit_count INTEGER DEFAULT 0, -- number of times this cache was hit
    miss_count INTEGER DEFAULT 0, -- number of times cache was missed
    last_hit_at TIMESTAMP WITH TIME ZONE,
    last_miss_at TIMESTAMP WITH TIME ZONE,
    
    -- TTL and expiration
    ttl_seconds INTEGER DEFAULT 3600, -- time to live in seconds
    expires_at TIMESTAMP WITH TIME ZONE, -- explicit expiration time
    refresh_at TIMESTAMP WITH TIME ZONE, -- next scheduled refresh
    
    -- Dependencies
    depends_on JSONB, -- other cache keys this depends on
    invalidates JSONB, -- cache keys that should be invalidated when this changes
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_computing BOOLEAN DEFAULT FALSE, -- flag to prevent duplicate computations
    computation_status VARCHAR(20) DEFAULT 'ready', -- 'ready', 'computing', 'error', 'expired'
    error_message TEXT, -- error details if computation failed
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_cache_type CHECK (cache_type IN (
        'dashboard_metrics', 'user_analytics', 'system_health', 'performance_metrics',
        'engagement_stats', 'usage_patterns', 'business_kpis', 'data_quality',
        'collaboration_metrics', 'notification_stats', 'error_rates', 'response_times'
    )),
    CONSTRAINT valid_computation_status CHECK (computation_status IN ('ready', 'computing', 'error', 'expired')),
    CONSTRAINT valid_refresh_strategy CHECK (refresh_strategy IN ('scheduled', 'manual', 'triggered')),
    CONSTRAINT valid_data_format CHECK (data_format IN ('json', 'csv', 'binary')),
    CONSTRAINT positive_ttl CHECK (ttl_seconds > 0),
    CONSTRAINT positive_data_size CHECK (data_size_bytes IS NULL OR data_size_bytes >= 0)
);

-- User Sessions Table
-- Tracks user engagement and session information
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Session details
    session_token VARCHAR(255) UNIQUE, -- JWT token or session identifier
    session_type VARCHAR(50) DEFAULT 'web', -- 'web', 'mobile', 'api', 'desktop'
    
    -- Device and browser information
    device_type VARCHAR(50), -- 'desktop', 'tablet', 'mobile'
    device_id VARCHAR(255), -- unique device identifier
    browser_name VARCHAR(100), -- Chrome, Firefox, Safari, etc.
    browser_version VARCHAR(50), -- browser version
    operating_system VARCHAR(100), -- Windows, macOS, Linux, iOS, Android
    os_version VARCHAR(50), -- OS version
    
    -- Network information
    ip_address INET, -- client IP address
    user_agent TEXT, -- full user agent string
    connection_type VARCHAR(50), -- 'wifi', 'cellular', 'ethernet', 'unknown'
    connection_speed VARCHAR(20), -- 'slow', 'medium', 'fast', 'unknown'
    
    -- Geographic information
    country VARCHAR(2), -- ISO country code
    region VARCHAR(100), -- state/province/region
    city VARCHAR(100), -- city name
    timezone VARCHAR(50), -- user timezone
    language VARCHAR(10), -- preferred language (en-US, etc.)
    
    -- Session timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE, -- when session ended
    duration_seconds INTEGER, -- total session duration
    
    -- Activity metrics
    page_views INTEGER DEFAULT 0, -- total page views
    api_calls INTEGER DEFAULT 0, -- total API calls made
    data_downloaded_mb DECIMAL(10,2) DEFAULT 0, -- data downloaded in MB
    data_uploaded_mb DECIMAL(10,2) DEFAULT 0, -- data uploaded in MB
    
    -- Engagement metrics
    interaction_count INTEGER DEFAULT 0, -- total user interactions
    dashboard_views INTEGER DEFAULT 0, -- dashboards viewed
    widgets_interacted INTEGER DEFAULT 0, -- widgets interacted with
    collaboration_events INTEGER DEFAULT 0, -- collaboration activities
    
    -- Performance metrics
    avg_response_time_ms INTEGER, -- average API response time
    error_count INTEGER DEFAULT 0, -- number of errors encountered
    timeout_count INTEGER DEFAULT 0, -- number of timeouts
    
    -- Session status
    is_active BOOLEAN DEFAULT TRUE,
    is_secure BOOLEAN DEFAULT FALSE, -- HTTPS connection
    authentication_method VARCHAR(50), -- 'password', 'oauth', 'sso', 'mfa'
    
    -- Security information
    login_method VARCHAR(50), -- how user authenticated
    mfa_verified BOOLEAN DEFAULT FALSE, -- multi-factor authentication status
    risk_score INTEGER DEFAULT 0, -- session risk score (0-100)
    security_flags JSONB, -- security-related flags and notes
    
    -- Metadata
    referrer VARCHAR(1000), -- how user arrived at the application
    utm_source VARCHAR(255), -- marketing campaign source
    utm_medium VARCHAR(255), -- marketing campaign medium
    utm_campaign VARCHAR(255), -- marketing campaign name
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_session_type CHECK (session_type IN ('web', 'mobile', 'api', 'desktop')),
    CONSTRAINT valid_device_type CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
    CONSTRAINT valid_connection_type CHECK (connection_type IN ('wifi', 'cellular', 'ethernet', 'unknown')),
    CONSTRAINT valid_connection_speed CHECK (connection_speed IN ('slow', 'medium', 'fast', 'unknown')),
    CONSTRAINT valid_authentication_method CHECK (authentication_method IN ('password', 'oauth', 'sso', 'mfa')),
    CONSTRAINT positive_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT positive_metrics CHECK (
        page_views >= 0 AND 
        api_calls >= 0 AND 
        interaction_count >= 0 AND
        dashboard_views >= 0 AND
        widgets_interacted >= 0 AND
        collaboration_events >= 0 AND
        error_count >= 0 AND
        timeout_count >= 0
    ),
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Indexes for Activity Logs
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_session_id ON activity_logs(session_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_resource_type ON activity_logs(resource_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_severity ON activity_logs(severity);
CREATE INDEX idx_activity_logs_tenant_user ON activity_logs(tenant_id, user_id);
CREATE INDEX idx_activity_logs_tenant_type ON activity_logs(tenant_id, activity_type);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_metadata ON activity_logs USING GIN(metadata);
CREATE INDEX idx_activity_logs_tags ON activity_logs USING GIN(tags);
CREATE INDEX idx_activity_logs_old_values ON activity_logs USING GIN(old_values);
CREATE INDEX idx_activity_logs_new_values ON activity_logs USING GIN(new_values);

-- Indexes for Dashboard Preferences
CREATE INDEX idx_dashboard_preferences_tenant_id ON dashboard_preferences(tenant_id);
CREATE INDEX idx_dashboard_preferences_user_id ON dashboard_preferences(user_id);
CREATE INDEX idx_dashboard_preferences_dashboard_id ON dashboard_preferences(dashboard_id);
CREATE INDEX idx_dashboard_preferences_is_default ON dashboard_preferences(is_default);
CREATE INDEX idx_dashboard_preferences_is_active ON dashboard_preferences(is_active);
CREATE INDEX idx_dashboard_preferences_last_accessed ON dashboard_preferences(last_accessed_at);
CREATE INDEX idx_dashboard_preferences_user_dashboard ON dashboard_preferences(user_id, dashboard_id);
CREATE INDEX idx_dashboard_preferences_layout_config ON dashboard_preferences USING GIN(layout_config);
CREATE INDEX idx_dashboard_preferences_widget_preferences ON dashboard_preferences USING GIN(widget_preferences);

-- Indexes for Analytics Cache
CREATE INDEX idx_analytics_cache_tenant_id ON analytics_cache(tenant_id);
CREATE INDEX idx_analytics_cache_cache_key ON analytics_cache(cache_key);
CREATE INDEX idx_analytics_cache_cache_type ON analytics_cache(cache_type);
CREATE INDEX idx_analytics_cache_cache_subtype ON analytics_cache(cache_subtype);
CREATE INDEX idx_analytics_cache_is_active ON analytics_cache(is_active);
CREATE INDEX idx_analytics_cache_expires_at ON analytics_cache(expires_at);
CREATE INDEX idx_analytics_cache_refresh_at ON analytics_cache(refresh_at);
CREATE INDEX idx_analytics_cache_computation_status ON analytics_cache(computation_status);
CREATE INDEX idx_analytics_cache_hit_count ON analytics_cache(hit_count);
CREATE INDEX idx_analytics_cache_type_subtype ON analytics_cache(cache_type, cache_subtype);
CREATE INDEX idx_analytics_cache_cached_data ON analytics_cache USING GIN(cached_data);
CREATE INDEX idx_analytics_cache_computation_parameters ON analytics_cache USING GIN(computation_parameters);

-- Indexes for User Sessions
CREATE INDEX idx_user_sessions_tenant_id ON user_sessions(tenant_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_session_type ON user_sessions(session_type);
CREATE INDEX idx_user_sessions_device_type ON user_sessions(device_type);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_started_at ON user_sessions(started_at);
CREATE INDEX idx_user_sessions_last_activity_at ON user_sessions(last_activity_at);
CREATE INDEX idx_user_sessions_duration ON user_sessions(duration_seconds);
CREATE INDEX idx_user_sessions_ip_address ON user_sessions(ip_address);
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_user_sessions_tenant_active ON user_sessions(tenant_id, is_active);
CREATE INDEX idx_user_sessions_security_flags ON user_sessions USING GIN(security_flags);

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activity_logs_updated_at 
    BEFORE UPDATE ON activity_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_preferences_updated_at 
    BEFORE UPDATE ON dashboard_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_cache_updated_at 
    BEFORE UPDATE ON analytics_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update last_accessed_at for dashboard preferences
CREATE OR REPLACE FUNCTION update_last_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dashboard_preferences_last_accessed 
    BEFORE UPDATE ON dashboard_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_last_accessed_at();

-- Trigger to update last_activity_at for user sessions
CREATE OR REPLACE FUNCTION update_last_activity_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_sessions_last_activity 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_last_activity_at();

-- Views for common queries
CREATE VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(al.id) as total_activities,
    COUNT(DISTINCT al.session_id) as unique_sessions,
    MAX(al.created_at) as last_activity,
    COUNT(DISTINCT al.resource_type) as resource_types_used,
    COUNT(DISTINCT al.activity_type) as activity_types_used
FROM users u
LEFT JOIN activity_logs al ON u.id = al.user_id
GROUP BY u.id, u.email;

CREATE VIEW dashboard_usage_stats AS
SELECT 
    dp.dashboard_id,
    COUNT(DISTINCT dp.user_id) as unique_users,
    COUNT(*) as total_preferences,
    COUNT(DISTINCT dp.tenant_id) as tenant_count,
    MAX(dp.last_accessed_at) as last_accessed,
    AVG(dp.page_size) as avg_page_size
FROM dashboard_preferences dp
WHERE dp.is_active = true
GROUP BY dp.dashboard_id;

CREATE VIEW cache_performance_stats AS
SELECT 
    ac.cache_type,
    COUNT(*) as total_entries,
    SUM(ac.hit_count) as total_hits,
    SUM(ac.miss_count) as total_misses,
    CASE 
        WHEN SUM(ac.hit_count + ac.miss_count) > 0 
        THEN ROUND(SUM(ac.hit_count)::decimal / SUM(ac.hit_count + ac.miss_count) * 100, 2)
        ELSE 0 
    END as hit_rate_percent,
    AVG(ac.computation_time_ms) as avg_computation_time_ms,
    SUM(ac.data_size_bytes) as total_data_size_bytes
FROM analytics_cache ac
WHERE ac.is_active = true
GROUP BY ac.cache_type;

CREATE VIEW session_engagement_stats AS
SELECT 
    us.user_id,
    COUNT(*) as total_sessions,
    AVG(us.duration_seconds) as avg_duration_seconds,
    SUM(us.page_views) as total_page_views,
    SUM(us.api_calls) as total_api_calls,
    SUM(us.interaction_count) as total_interactions,
    AVG(us.avg_response_time_ms) as avg_response_time_ms,
    SUM(us.error_count) as total_errors,
    MAX(us.started_at) as last_session_start
FROM user_sessions us
GROUP BY us.user_id;

-- Comments for documentation
COMMENT ON TABLE activity_logs IS 'Detailed audit trail of all user actions and system events';
COMMENT ON TABLE dashboard_preferences IS 'User-specific dashboard settings and preferences';
COMMENT ON TABLE analytics_cache IS 'Pre-computed metrics and analytics data for performance';
COMMENT ON TABLE user_sessions IS 'User engagement and session tracking information';

COMMENT ON COLUMN activity_logs.metadata IS 'Additional activity metadata in JSON format';
COMMENT ON COLUMN dashboard_preferences.layout_config IS 'Widget positions, sizes, and grid layout in JSON';
COMMENT ON COLUMN analytics_cache.cached_data IS 'The actual cached analytics data in JSON format';
COMMENT ON COLUMN user_sessions.security_flags IS 'Security-related flags and notes in JSON format';
