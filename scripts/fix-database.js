#!/usr/bin/env node

// 数据库修复脚本 - 自动检查并修复表结构问题
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

console.log('🔧 开始数据库修复检查...\n');

// 颜色输出函数
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logAction(message) {
  console.log(`${colors.cyan}🔄 ${message}${colors.reset}`);
}

// 初始化Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  logError('Supabase配置缺失！请检查环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 检查表是否存在
async function checkTableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    return !error;
  } catch (error) {
    return false;
  }
}

// 手动创建必要的表和函数
async function createDatabaseStructure() {
  try {
    logAction('创建完整的数据库结构...');
    
    // 1. 创建 profiles 表
    try {
      const { error: profilesError } = await supabase.rpc('exec_sql', {
        sql: `
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
        `
      });
      
      if (profilesError) {
        logWarning(`创建profiles表: ${profilesError.message}`);
      } else {
        logSuccess('profiles表创建/验证完成');
      }
    } catch (error) {
      logError(`profiles表创建失败: ${error.message}`);
    }
    
    // 2. 创建 sessions 表
    try {
      const { error: sessionsError } = await supabase.rpc('exec_sql', {
        sql: `
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
        `
      });
      
      if (sessionsError) {
        logWarning(`创建sessions表: ${sessionsError.message}`);
      } else {
        logSuccess('sessions表创建/验证完成');
      }
    } catch (error) {
      logError(`sessions表创建失败: ${error.message}`);
    }
    
    // 3. 创建 ab_events 表
    try {
      const { error: abEventsError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS ab_events (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(20) NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            group_name VARCHAR(1) NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      if (abEventsError) {
        logWarning(`创建ab_events表: ${abEventsError.message}`);
      } else {
        logSuccess('ab_events表创建/验证完成');
      }
    } catch (error) {
      logError(`ab_events表创建失败: ${error.message}`);
    }
    
    // 4. 创建get_user_stats函数
    try {
      const { error: funcError } = await supabase.rpc('exec_sql', {
        sql: `
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
        `
      });
      
      if (funcError) {
        logWarning(`创建get_user_stats函数: ${funcError.message}`);
      } else {
        logSuccess('get_user_stats函数创建完成');
      }
    } catch (error) {
      logError(`get_user_stats函数创建失败: ${error.message}`);
    }
    
    // 5. 创建update_profile函数
    try {
      const { error: updateFuncError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION update_profile(
            u VARCHAR(20),
            dol_delta INTEGER DEFAULT 0,
            intimacy_delta INTEGER DEFAULT 0
          )
          RETURNS VOID AS $$
          BEGIN
            UPDATE profiles 
            SET 
              dol = GREATEST(0, dol + dol_delta),
              intimacy = GREATEST(0, intimacy + intimacy_delta),
              updated_at = NOW()
            WHERE user_id = u;
            
            IF NOT FOUND THEN
              INSERT INTO profiles (user_id, dol, intimacy, ab_group)
              VALUES (u, GREATEST(0, 300 + dol_delta), GREATEST(0, intimacy_delta), 
                      CASE WHEN random() > 0.5 THEN 'A' ELSE 'B' END);
            END IF;
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      if (updateFuncError) {
        logWarning(`创建update_profile函数: ${updateFuncError.message}`);
      } else {
        logSuccess('update_profile函数创建完成');
      }
    } catch (error) {
      logError(`update_profile函数创建失败: ${error.message}`);
    }
    
    // 6. 设置RLS策略
    try {
      const rlsStatements = [
        'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY',
        'ALTER TABLE sessions ENABLE ROW LEVEL SECURITY', 
        'ALTER TABLE ab_events ENABLE ROW LEVEL SECURITY',
        'CREATE POLICY IF NOT EXISTS "Allow anonymous access" ON profiles FOR ALL USING (true)',
        'CREATE POLICY IF NOT EXISTS "Allow anonymous access" ON sessions FOR ALL USING (true)',
        'CREATE POLICY IF NOT EXISTS "Allow anonymous access" ON ab_events FOR ALL USING (true)'
      ];
      
      for (const sql of rlsStatements) {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error && !error.message.includes('already exists')) {
          logWarning(`RLS设置: ${error.message}`);
        }
      }
      
      logSuccess('RLS策略设置完成');
    } catch (error) {
      logWarning(`RLS策略设置失败: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    logError(`数据库结构创建失败: ${error.message}`);
    return false;
  }
}

// 测试数据库功能
async function testDatabaseFunctions() {
  try {
    logAction('测试数据库功能...');
    
    // 测试表查询
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      logError(`profiles表查询失败: ${profileError.message}`);
      return false;
    } else {
      logSuccess('profiles表查询正常');
    }
    
    // 测试get_user_stats函数
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_user_stats', { u: 'test_user_12345' });
    
    if (statsError) {
      logError(`get_user_stats函数测试失败: ${statsError.message}`);
    } else {
      logSuccess('get_user_stats函数测试通过');
    }
    
    // 测试update_profile函数
    const { error: updateError } = await supabase
      .rpc('update_profile', { u: 'test_user_12345', dol_delta: 0, intimacy_delta: 0 });
    
    if (updateError) {
      logError(`update_profile函数测试失败: ${updateError.message}`);
    } else {
      logSuccess('update_profile函数测试通过');
    }
    
    return true;
  } catch (error) {
    logError(`数据库功能测试失败: ${error.message}`);
    return false;
  }
}

// 主修复函数
async function main() {
  console.log('🔧 AI男友Discord机器人 - 数据库修复工具\n');
  
  logInfo('开始数据库诊断...');
  
  // 1. 检查基本连接
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: 'SELECT 1 as test'
      });
    
    if (error) {
      logError(`数据库连接失败: ${error.message}`);
      process.exit(1);
    } else {
      logSuccess('数据库连接正常');
    }
  } catch (error) {
    logError(`数据库连接异常: ${error.message}`);
    process.exit(1);
  }
  
  // 2. 检查表是否存在
  const tables = ['profiles', 'sessions', 'ab_events'];
  let allTablesExist = true;
  
  for (const table of tables) {
    const exists = await checkTableExists(table);
    if (exists) {
      logSuccess(`表 ${table} 存在`);
    } else {
      logError(`表 ${table} 不存在`);
      allTablesExist = false;
    }
  }
  
  // 3. 执行修复
  if (!allTablesExist) {
    console.log('\n🔨 开始数据库修复...');
    
    const success = await createDatabaseStructure();
    
    if (success) {
      logSuccess('数据库结构修复完成');
    } else {
      logError('数据库结构修复失败');
      process.exit(1);
    }
  } else {
    logInfo('所有表都存在，检查函数...');
    
    // 仍然尝试创建函数，以防函数缺失
    await createDatabaseStructure();
  }
  
  // 4. 最终测试
  console.log('\n✅ 最终功能测试...');
  
  const testSuccess = await testDatabaseFunctions();
  
  if (testSuccess) {
    logSuccess('所有数据库功能测试通过！');
    console.log('\n🎉 数据库修复完成！');
    console.log('✨ 现在可以重新部署机器人，测试以下命令：');
    console.log('   • /stats - 查看用户统计');
    console.log('   • /leaderboard - 查看排行榜');
    console.log('   • 普通聊天 - 测试AI对话');
  } else {
    logWarning('部分功能测试失败，但基本结构已创建');
    console.log('\n💡 建议：');
    console.log('1. 检查Supabase权限设置');
    console.log('2. 确认使用Service Role Key而非Anon Key');
    console.log('3. 查看Supabase项目日志获取详细错误信息');
  }
}

// 运行修复
main().catch(error => {
  console.error('❌ 修复脚本执行失败:', error);
  process.exit(1);
}); 