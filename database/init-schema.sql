-- AI男友Discord机器人数据库初始化脚本
-- 请在Supabase SQL Editor中执行此脚本

-- 1. 创建用户档案表
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL,
    intimacy INTEGER DEFAULT 0,
    dol INTEGER DEFAULT 300,
    ab_group VARCHAR(1) DEFAULT 'A',
    total_messages INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建聊天记录表
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    msg TEXT NOT NULL,
    bot_reply TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    het INTEGER DEFAULT 0,
    emotion_score FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建A/B测试事件表
CREATE TABLE IF NOT EXISTS ab_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    group_name VARCHAR(1) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建支付记录表
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    dol_amount INTEGER NOT NULL,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_intimacy ON profiles(intimacy DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_events_user_id ON ab_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);

-- 6. 创建更新档案的函数
CREATE OR REPLACE FUNCTION update_profile(
    u VARCHAR(20),
    dol_delta INTEGER DEFAULT 0,
    intimacy_delta INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    -- 更新用户档案
    UPDATE profiles 
    SET 
        dol = GREATEST(0, dol + dol_delta),
        intimacy = GREATEST(0, intimacy + intimacy_delta),
        updated_at = NOW()
    WHERE user_id = u;
    
    -- 如果用户不存在，创建新用户
    IF NOT FOUND THEN
        INSERT INTO profiles (user_id, dol, intimacy, ab_group)
        VALUES (u, GREATEST(0, 300 + dol_delta), GREATEST(0, intimacy_delta), 
                CASE WHEN random() > 0.5 THEN 'A' ELSE 'B' END);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建获取用户统计数据的函数
CREATE OR REPLACE FUNCTION get_user_stats(u VARCHAR(20))
RETURNS TABLE (
    user_id VARCHAR(20),
    intimacy INTEGER,
    dol INTEGER,
    total_messages BIGINT,
    total_het BIGINT,
    days_active BIGINT,
    ab_group VARCHAR(1),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.user_id,
        p.intimacy,
        p.dol,
        COALESCE(COUNT(s.id), 0) as total_messages,
        COALESCE(SUM(s.het), 0) as total_het,
        COALESCE(COUNT(DISTINCT DATE(s.created_at)), 0) as days_active,
        p.ab_group,
        p.created_at,
        p.updated_at
    FROM profiles p
    LEFT JOIN sessions s ON p.user_id = s.user_id
    WHERE p.user_id = u
    GROUP BY p.user_id, p.intimacy, p.dol, p.ab_group, p.created_at, p.updated_at;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建触发器自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. 创建触发器自动更新消息计数
CREATE OR REPLACE FUNCTION update_message_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 增加用户的消息计数
    UPDATE profiles 
    SET total_messages = total_messages + 1,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    
    -- 如果用户档案不存在，创建一个
    IF NOT FOUND THEN
        INSERT INTO profiles (user_id, total_messages, ab_group)
        VALUES (NEW.user_id, 1, CASE WHEN random() > 0.5 THEN 'A' ELSE 'B' END);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_count_trigger
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_message_count();

-- 10. 设置RLS (Row Level Security) 策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户读写（适合服务端操作）
CREATE POLICY "Allow anonymous access" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON ab_events FOR ALL USING (true);
CREATE POLICY "Allow anonymous access" ON payments FOR ALL USING (true);

-- 11. 创建一些测试数据（可选）
-- INSERT INTO profiles (user_id, intimacy, dol, ab_group, total_messages) VALUES
-- ('test_user_1', 50, 500, 'A', 10),
-- ('test_user_2', 80, 300, 'B', 25),
-- ('test_user_3', 120, 200, 'A', 50);

-- 初始化完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ AI男友Discord机器人数据库初始化完成！';
    RAISE NOTICE '📊 已创建表: profiles, sessions, ab_events, payments';
    RAISE NOTICE '🔧 已创建函数: update_profile, get_user_stats';
    RAISE NOTICE '⚡ 已创建索引和触发器';
    RAISE NOTICE '�� 已设置RLS策略';
END $$; 