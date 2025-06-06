#!/usr/bin/env node

// 服务调试和健康检查脚本
import 'dotenv/config';

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
    'OPENROUTER_API_KEY',
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


// 3. 检查OpenRouter API
async function checkOpenAIConnection() {
  console.log('\n3. 🤖 检查OpenRouter API连接');
  
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      logError('OpenRouter API Key未配置');
      return false;
    }

    // 使用 fetch 进行原生 HTTP 请求
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'discord.com',
        'X-Title': 'AI-Boyfriend-Bot'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ 
          role: 'user', 
          content: "Hello, this is a test message. Please respond briefly."
        }],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError(`OpenRouter API请求失败: ${response.status} ${response.statusText}`);
      logError(`错误详情: ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log("response ai", data);
    
    if (data.choices && data.choices.length > 0) {
      logSuccess('OpenRouter API连接正常');
      logInfo(`模型: ${data.model || 'openai/gpt-4o-mini'}`);
      if (data.usage) {
        logInfo(`用量: ${data.usage.total_tokens} tokens`);
      }
      logInfo(`响应内容: ${data.choices[0].message.content.substring(0, 50)}...`);
      return true;
    } else {
      logError('OpenRouter API响应异常');
      return false;
    }
  } catch (error) {
    logError(`OpenRouter API连接失败: ${error.message}`);
    if (error.message.includes('quota')) {
      logWarning('可能是API配额用尽');
    } else if (error.message.includes('invalid')) {
      logWarning('可能是API Key无效');
    } else if (error.message.includes('fetch')) {
      logWarning('可能是网络连接问题');
    }
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
  results.openai = await checkOpenAIConnection();

  // 生成报告
  console.log('\n📊 健康检查报告');
  console.log('==================');
  
  const services = [
    { name: '环境变量', key: 'env', critical: true },
    { name: 'OpenRouter API', key: 'openai', critical: true },

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

    if (!results.openai) {
      console.log('- 检查OpenRouter API Key和配额');
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