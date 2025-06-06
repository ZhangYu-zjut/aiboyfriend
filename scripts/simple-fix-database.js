#!/usr/bin/env node

// 简化的数据库修复脚本
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

console.log('🔧 简化数据库修复检查...\n');

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

// 检查列是否存在
async function checkProfilesColumns() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('ab_group, total_messages')
      .limit(1);
    
    return !error;
  } catch (error) {
    return false;
  }
}

// 测试get_user_stats函数
async function testGetUserStats() {
  try {
    const { data, error } = await supabase
      .rpc('get_user_stats', { u: 'test_user_12345' });
    
    return !error;
  } catch (error) {
    return false;
  }
}

// 主诊断函数
async function main() {
  console.log('🔧 AI男友Discord机器人 - 简化数据库诊断\n');
  
  logInfo('开始数据库诊断...');
  
  // 1. 检查基本连接
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
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
  const missingTables = [];
  
  for (const table of tables) {
    const exists = await checkTableExists(table);
    if (exists) {
      logSuccess(`表 ${table} 存在`);
    } else {
      logError(`表 ${table} 不存在`);
      missingTables.push(table);
    }
  }
  
  // 3. 检查profiles表的关键列
  let columnsExist = false;
  if (missingTables.includes('profiles')) {
    logWarning('profiles表不存在，跳过列检查');
  } else {
    columnsExist = await checkProfilesColumns();
    if (columnsExist) {
      logSuccess('profiles表包含必要列 (ab_group, total_messages)');
    } else {
      logError('profiles表缺少关键列 (ab_group 或 total_messages)');
    }
  }
  
  // 4. 检查get_user_stats函数
  const functionExists = await testGetUserStats();
  if (functionExists) {
    logSuccess('get_user_stats函数存在且可用');
  } else {
    logError('get_user_stats函数不存在或不可用');
  }
  
  // 5. 生成诊断报告
  console.log('\n📋 诊断报告');
  console.log('=============');
  
  if (missingTables.length === 0 && columnsExist && functionExists) {
    logSuccess('✅ 数据库结构完整，/stats 和 /leaderboard 命令应该正常工作');
  } else {
    logError('❌ 发现数据库结构问题，需要修复');
    
    console.log('\n🛠️  修复建议：');
    console.log('1. 登录 Supabase Dashboard');
    console.log('2. 进入 SQL Editor');
    console.log('3. 执行 database/init-schema.sql 中的完整脚本');
    console.log('4. 或者按照 DATABASE_SETUP_GUIDE.md 手动修复');
    
    if (missingTables.length > 0) {
      console.log(`\n缺少的表: ${missingTables.join(', ')}`);
    }
    if (!columnsExist) {
      console.log('缺少的列: ab_group, total_messages (在profiles表中)');
    }
    if (!functionExists) {
      console.log('缺少的函数: get_user_stats');
    }
  }
  
  console.log('\n📖 详细修复指南请查看: DATABASE_SETUP_GUIDE.md');
}

// 运行诊断
main().catch(error => {
  console.error('❌ 诊断脚本执行失败:', error);
  process.exit(1);
}); 