#!/usr/bin/env node
import 'dotenv/config';

console.log('🔍 ==================== 环境变量调试 ====================');

function checkEnvironmentVariable(varName, required = true) {
  const value = process.env[varName];
  const exists = !!value;
  const length = value ? value.length : 0;
  const preview = value ? (value.substring(0, 20) + '...') : 'undefined';
  
  console.log(`\n📋 ${varName}:`);
  console.log(`   存在: ${exists ? '✅' : '❌'}`);
  console.log(`   长度: ${length}`);
  console.log(`   预览: ${preview}`);
  console.log(`   必需: ${required ? '是' : '否'}`);
  
  if (required && !exists) {
    console.log(`   🚨 严重: ${varName} 是必需的但未找到！`);
  }
  
  return exists;
}

// 检查所有环境变量
console.log('\n📊 环境变量检查报告:');
console.log('===========================');

const vars = [
  { name: 'BOT_TOKEN', required: true },
  { name: 'CLIENT_ID', required: true },
  { name: 'OPENROUTER_API_KEY', required: true },
  { name: 'OPENAI_API_KEY', required: false }, // 旧版本可能有这个
  { name: 'SUPABASE_URL', required: true },
  { name: 'SUPABASE_ANON_KEY', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: false },
  { name: 'HUGGINGFACE_API_KEY', required: false }
];

let criticalMissing = 0;
let allVarsFound = [];

vars.forEach(variable => {
  const found = checkEnvironmentVariable(variable.name, variable.required);
  if (found) {
    allVarsFound.push(variable.name);
  } else if (variable.required) {
    criticalMissing++;
  }
});

// 额外检查：查看所有以特定前缀开头的环境变量
console.log('\n🔍 搜索相关环境变量:');
console.log('===========================');

const allEnvVars = Object.keys(process.env);
console.log(`📊 总环境变量数: ${allEnvVars.length}`);

const relevantPrefixes = ['BOT_', 'CLIENT_', 'OPENROUTER_', 'OPENAI_', 'SUPABASE_', 'HUGGING'];
relevantPrefixes.forEach(prefix => {
  const matching = allEnvVars.filter(key => key.startsWith(prefix));
  console.log(`🔍 ${prefix}*: ${matching.length}个变量`);
  matching.forEach(key => {
    const value = process.env[key];
    console.log(`   ${key}: ${value ? value.substring(0, 15) + '...' : 'empty'}`);
  });
});

// 特别检查OpenRouter相关的变量
console.log('\n🤖 OpenRouter API检查:');
console.log('===========================');

const openRouterVars = allEnvVars.filter(key => 
  key.toLowerCase().includes('openrouter') || 
  key.toLowerCase().includes('openai')
);

console.log(`🔍 找到 ${openRouterVars.length} 个AI相关变量:`);
openRouterVars.forEach(key => {
  const value = process.env[key];
  console.log(`   ${key}: ${value ? '已配置 (' + value.length + '字符)' : '未配置'}`);
});

// 模拟代码中的读取方式
console.log('\n🧪 模拟AI服务读取:');
console.log('===========================');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
console.log(`const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;`);
console.log(`结果: ${OPENROUTER_API_KEY ? '✅ 成功读取' : '❌ 读取失败'}`);

if (OPENROUTER_API_KEY) {
  console.log(`长度: ${OPENROUTER_API_KEY.length}`);
  console.log(`格式检查: ${OPENROUTER_API_KEY.startsWith('sk-or-') ? '✅ 格式正确' : '⚠️ 格式可能有误'}`);
} else {
  console.log('❌ 无法读取OPENROUTER_API_KEY');
  console.log('💡 可能的原因:');
  console.log('   1. Railway环境变量名称不匹配');
  console.log('   2. 环境变量未正确部署');
  console.log('   3. 需要重启服务');
}

// 总结报告
console.log('\n📋 总结报告:');
console.log('===========================');

if (criticalMissing === 0) {
  console.log('✅ 所有必需的环境变量都已配置');
} else {
  console.log(`❌ 缺少 ${criticalMissing} 个必需的环境变量`);
}

console.log(`📊 已配置变量: ${allVarsFound.length}/${vars.length}`);
console.log(`🔍 已配置的变量: ${allVarsFound.join(', ')}`);

// Railway特殊检查
console.log('\n🚄 Railway部署检查:');
console.log('===========================');

const railwayVars = ['RAILWAY_ENVIRONMENT', 'RAILWAY_PROJECT_ID', 'PORT'];
railwayVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? '✅ 存在' : '❌ 不存在'}`);
});

if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('🎯 检测到Railway环境，这是正常的部署环境');
} else {
  console.log('💻 本地开发环境');
}

console.log('\n🎉 ==================== 调试完成 ===================='); 