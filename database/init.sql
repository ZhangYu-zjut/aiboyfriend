-- AI男友 Discord Bot 数据库初始化脚本

-- DOL虚拟货币说明：
-- DOL是AI男友平台的专属虚拟货币，用于聊天消费和功能解锁
-- 1 DOL = 1个聊天token，用户可通过付费或每日免费获得DOL

-- 用户档案表
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  dol INTEGER DEFAULT 300,
  intimacy INTEGER DEFAULT 0,
  ab_group TEXT DEFAULT 'A',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 聊天记录表
CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(user_id),
  msg TEXT NOT NULL,
  bot_reply TEXT,
  tokens INTEGER DEFAULT 0,
  het INTEGER DEFAULT 0,
  emotion_score FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 支付记录表
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(user_id),
  amount DECIMAL(10,2) NOT NULL,
  dol_amount INTEGER NOT NULL,
  payment_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B测试事件表
CREATE TABLE IF NOT EXISTS ab_events (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(user_id),
  event_type TEXT NOT NULL,
  group_name TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 更新用户档案的函数
CREATE OR REPLACE FUNCTION update_profile(
  u TEXT,
  dol_delta INTEGER DEFAULT 0,
  intimacy_delta INTEGER DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO profiles(user_id, dol, intimacy)
  VALUES(u, GREATEST(0, 300 + dol_delta), intimacy_delta)
  ON CONFLICT(user_id) DO UPDATE SET
    dol = GREATEST(0, profiles.dol + dol_delta),
    intimacy = profiles.intimacy + intimacy_delta,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 获取用户统计数据的函数
CREATE OR REPLACE FUNCTION get_user_stats(u TEXT)
RETURNS TABLE(
  user_id TEXT,
  dol INTEGER,
  intimacy INTEGER,
  total_messages BIGINT,
  total_het INTEGER,
  avg_emotion FLOAT,
  days_active INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.dol,
    p.intimacy,
    COUNT(s.id) as total_messages,
    COALESCE(SUM(s.het), 0)::INTEGER as total_het,
    COALESCE(AVG(s.emotion_score), 0)::FLOAT as avg_emotion,
    COUNT(DISTINCT DATE(s.created_at))::INTEGER as days_active
  FROM profiles p
  LEFT JOIN sessions s ON p.user_id = s.user_id
  WHERE p.user_id = u
  GROUP BY p.user_id, p.dol, p.intimacy;
END;
$$ LANGUAGE plpgsql;

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_user_id ON ab_events(user_id);

-- 启用行级安全（RLS）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（允许服务端访问所有数据）
CREATE POLICY "Allow service role full access" ON profiles
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON sessions
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON payments
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON ab_events
FOR ALL USING (auth.role() = 'service_role'); 