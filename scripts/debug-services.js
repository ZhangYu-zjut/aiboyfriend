#!/usr/bin/env node

// 服务调试和健康检查脚本
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { HfInference } from '@huggingface/inference';

console.log('🔍 开始服务健康检查...\n');

// 颜色输出函数
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

// 1. 检查环境变量
function checkEnvironmentVariables() {
  console.log('1. 📋 检查环境变量配置');
  
  const requiredVars = [
    'BOT_TOKEN',
    'CLIENT_ID', 
    'OPENAI_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'HUGGINGFACE_API_KEY'
  ];

  const optionalVars = [
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  let allRequired = true;

  // 检查必需变量
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
      logSuccess(`${varName}: ${preview}`);
    } else {
      logError(`${varName}: 未配置`);
      allRequired = false;
    }
  });

  // 检查可选变量
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
      logInfo(`${varName}: ${preview}`);
    } else {
      logWarning(`${varName}: 未配置（可选）`);
    }
  });

  return allRequired;
}

// 2. 检查Supabase连接
async function checkSupabaseConnection() {
  console.log('\n2. 🗄️  检查Supabase数据库连接');
  
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logError('Supabase配置缺失');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 测试连接
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      logError(`Supabase连接失败: ${error.message}`);
      return false;
    }

    logSuccess('Supabase连接正常');
    
    // 检查表结构
    const tables = ['profiles', 'sessions', 'ab_events'];
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (tableError) {
        logError(`表 ${table} 不存在或无法访问: ${tableError.message}`);
      } else {
        logSuccess(`表 ${table} 存在且可访问`);
      }
    }

    return true;
  } catch (error) {
    logError(`Supabase检查异常: ${error.message}`);
    return false;
  }
}

// 3. 检查OpenAI API
async function checkOpenAIConnection() {
  console.log('\n3. 🤖 检查OpenAI API连接');
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logError('OpenAI API Key未配置');
      return false;
    }

    const openai = new OpenAI({ apiKey });
    
    // 测试API调用
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: '测试连接' }],
      max_tokens: 10
    });

    if (response.choices && response.choices.length > 0) {
      logSuccess('OpenAI API连接正常');
      logInfo(`模型: ${response.model}`);
      logInfo(`用量: ${response.usage.total_tokens} tokens`);
      return true;
    } else {
      logError('OpenAI API响应异常');
      return false;
    }
  } catch (error) {
    logError(`OpenAI API连接失败: ${error.message}`);
    if (error.message.includes('quota')) {
      logWarning('可能是API配额用尽');
    } else if (error.message.includes('invalid')) {
      logWarning('可能是API Key无效');
    }
    return false;
  }
}

// 4. 检查HuggingFace API
async function checkHuggingFaceConnection() {
  console.log('\n4. 🤗 检查HuggingFace API连接');
  
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      logError('HuggingFace API Key未配置');
      return false;
    }

    const hf = new HfInference(apiKey);
    
    // 测试情感分析
    const result = await hf.textClassification({
      model: 'j-hartmann/emotion-english-distilroberta-base',
      inputs: 'I love you'
    });

    if (result && result.length > 0) {
      logSuccess('HuggingFace API连接正常');
      logInfo(`检测到情感: ${result[0].label} (${(result[0].score * 100).toFixed(1)}%)`);
      return true;
    } else {
      logError('HuggingFace API响应异常');
      return false;
    }
  } catch (error) {
    logError(`HuggingFace API连接失败: ${error.message}`);
    return false;
  }
}

// 5. 检查Discord API
async function checkDiscordConnection() {
  console.log('\n5. 🎮 检查Discord API连接');
  
  try {
    const response = await fetch('https://discord.com/api/v10/gateway', {
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const data = await response.json();
      logSuccess('Discord Gateway可访问');
      logInfo(`Gateway URL: ${data.url}`);
      return true;
    } else {
      logError(`Discord API响应错误: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Discord API连接失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🚀 AI男友Discord机器人 - 服务健康检查\n');
  
  const results = {
    env: false,
    supabase: false,
    openai: false,
    huggingface: false,
    discord: false
  };

  // 执行所有检查
  results.env = checkEnvironmentVariables();
  results.supabase = await checkSupabaseConnection();
  results.openai = await checkOpenAIConnection();
  results.huggingface = await checkHuggingFaceConnection();
  results.discord = await checkDiscordConnection();

  // 生成报告
  console.log('\n📊 健康检查报告');
  console.log('==================');
  
  const services = [
    { name: '环境变量', key: 'env', critical: true },
    { name: 'Supabase数据库', key: 'supabase', critical: true },
    { name: 'OpenAI API', key: 'openai', critical: true },
    { name: 'HuggingFace API', key: 'huggingface', critical: false },
    { name: 'Discord API', key: 'discord', critical: true }
  ];

  let criticalIssues = 0;
  let warnings = 0;

  services.forEach(service => {
    const status = results[service.key];
    if (status) {
      logSuccess(`${service.name}: 正常`);
    } else {
      if (service.critical) {
        logError(`${service.name}: 异常 (关键服务)`);
        criticalIssues++;
      } else {
        logWarning(`${service.name}: 异常 (非关键服务)`);
        warnings++;
      }
    }
  });

  console.log('\n🎯 建议措施');
  console.log('==========');
  
  if (criticalIssues === 0) {
    logSuccess('所有关键服务正常，机器人可以启动！');
  } else {
    logError(`发现 ${criticalIssues} 个关键问题，需要修复后才能正常运行`);
    console.log('\n💡 修复建议:');
    
    if (!results.env) {
      console.log('- 检查Railway环境变量配置');
    }
    if (!results.supabase) {
      console.log('- 检查Supabase项目配置和数据库表结构');
    }
    if (!results.openai) {
      console.log('- 检查OpenAI API Key和配额');
    }
    if (!results.discord) {
      console.log('- 检查网络连接和防火墙设置');
    }
  }

  if (warnings > 0) {
    logWarning(`发现 ${warnings} 个非关键问题，功能可能受限`);
  }

  console.log('\n✨ 检查完成！');
}

// 运行检查
main().catch(error => {
  console.error('健康检查脚本执行失败:', error);
  process.exit(1);
}); 