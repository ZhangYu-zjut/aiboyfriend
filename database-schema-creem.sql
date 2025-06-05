-- Creem支付系统数据库结构

-- 1. 充值记录表
CREATE TABLE recharge_records (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL, -- Discord用户ID
    request_id VARCHAR(50) UNIQUE NOT NULL, -- Creem请求ID
    package_type VARCHAR(20) NOT NULL, -- 套餐类型
    amount_usd DECIMAL(10,2) NOT NULL, -- 美元金额
    dol_amount INTEGER NOT NULL, -- DOL币数量
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    failure_reason TEXT, -- 失败原因
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 用户DOL余额函数
CREATE OR REPLACE FUNCTION add_dol_balance(user_id VARCHAR, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    -- 尝试更新现有用户
    UPDATE user_profiles 
    SET dol_balance = dol_balance + amount,
        updated_at = NOW()
    WHERE discord_id = user_id;
    
    -- 如果用户不存在，创建新用户记录
    IF NOT FOUND THEN
        INSERT INTO user_profiles (discord_id, dol_balance, created_at, updated_at)
        VALUES (user_id, amount, NOW(), NOW())
        ON CONFLICT (discord_id) DO UPDATE SET
            dol_balance = user_profiles.dol_balance + amount,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建充值记录索引
CREATE INDEX idx_recharge_user_id ON recharge_records(user_id);
CREATE INDEX idx_recharge_request_id ON recharge_records(request_id);
CREATE INDEX idx_recharge_status ON recharge_records(status);
CREATE INDEX idx_recharge_created_at ON recharge_records(created_at);

-- 4. 用户余额查询函数
CREATE OR REPLACE FUNCTION get_user_dol_balance(user_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    balance INTEGER;
BEGIN
    SELECT dol_balance INTO balance
    FROM user_profiles 
    WHERE discord_id = user_id;
    
    RETURN COALESCE(balance, 0);
END;
$$ LANGUAGE plpgsql;

-- 5. 获取用户充值历史函数
CREATE OR REPLACE FUNCTION get_user_recharge_history(user_id VARCHAR, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    request_id VARCHAR,
    package_type VARCHAR,
    amount_usd DECIMAL,
    dol_amount INTEGER,
    status VARCHAR,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.request_id,
        r.package_type,
        r.amount_usd,
        r.dol_amount,
        r.status,
        r.created_at
    FROM recharge_records r
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql; 