// Railway环境变量修复工具
import 'dotenv/config';

console.log('🚀 Railway环境变量修复工具');
console.log('================================\n');

// 检查所有相关的环境变量
const envVars = {
  'OPENROUTER_API_KEY': process.env.OPENROUTER_API_KEY,
  'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
  'AI_API_KEY': process.env.AI_API_KEY,
  'OPENROUTER_KEY': process.env.OPENROUTER_KEY,
  'BOT_TOKEN': process.env.BOT_TOKEN,
  'CLIENT_ID': process.env.CLIENT_ID,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
  'APP_URL': process.env.APP_URL
};

console.log('1. 📋 当前环境变量状态:');
console.log('========================');

for (const [key, value] of Object.entries(envVars)) {
  if (value) {
    console.log(`✅ ${key}: 已配置`);
    console.log(`   长度: ${value.length}`);
    console.log(`   预览: ${value.substring(0, 20)}...`);
    
    // 检查常见问题
    const issues = [];
    if (value.includes('\n') || value.includes('\r')) {
      issues.push('包含换行符');
    }
    if (value.trim() !== value) {
      issues.push('包含前后空格');
    }
    if (value.includes('"') || value.includes("'")) {
      issues.push('包含引号');
    }
    if (key.includes('API_KEY') && !value.startsWith('sk-')) {
      issues.push('API密钥格式可能不正确');
    }
    
    if (issues.length > 0) {
      console.log(`   ⚠️  潜在问题: ${issues.join(', ')}`);
    }
    console.log('');
  } else {
    console.log(`❌ ${key}: 未配置\n`);
  }
}

console.log('2. 🔍 Railway环境变量修复建议:');
console.log('==============================');

// 为Railway生成正确格式的环境变量
console.log('\n📝 Railway环境变量配置模板:');
console.log('===========================');

const railwayTemplate = {
  // Discord配置
  'BOT_TOKEN': 'your_discord_bot_token_here',
  'CLIENT_ID': 'your_discord_client_id_here',
  
  // 数据库配置
  'SUPABASE_URL': 'https://your-project.supabase.co',
  'SUPABASE_ANON_KEY': 'your_supabase_anon_key_here',
  
  // AI服务配置 (只需要一个)
  'OPENROUTER_API_KEY': 'sk-or-v1-your_openrouter_api_key_here',
  
  // Railway部署配置
  'APP_URL': 'https://your-project-production.up.railway.app',
  'WEBHOOK_PORT': '3001',
  
  // Creem支付配置 (可选)
  'CREEM_API_KEY': 'your_creem_api_key_here',
  'CREEM_WEBHOOK_SECRET': 'your_creem_webhook_secret_here',
  'CREEM_PRODUCT_ID_STARTER': 'your_starter_product_id',
  'CREEM_PRODUCT_ID_BASIC': 'your_basic_product_id',
  'CREEM_PRODUCT_ID_STANDARD': 'your_standard_product_id',
  'CREEM_PRODUCT_ID_PREMIUM': 'your_premium_product_id'
};

for (const [key, template] of Object.entries(railwayTemplate)) {
  const current = envVars[key];
  if (current && !current.startsWith('your_')) {
    console.log(`✅ ${key}=${current.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${key}=${template}`);
  }
}

console.log('\n3. 🎯 修复步骤:');
console.log('==============');
console.log('1. 访问 Railway Dashboard: https://railway.app/dashboard');
console.log('2. 选择你的项目');
console.log('3. 进入 Variables 选项卡');
console.log('4. 删除所有紫色的环境变量');
console.log('5. 重新添加上述环境变量（复制粘贴时避免多余的空格或换行）');
console.log('6. 确保API密钥来自有效且有余额的账户');
console.log('7. 重新部署项目');

console.log('\n4. ⚠️  常见问题解决:');
console.log('===================');
console.log('🟣 紫色环境变量 → 删除并重新添加');
console.log('🔑 API密钥无效 → 重新生成密钥');
console.log('💰 余额不足 → 充值OpenRouter账户');
console.log('📱 权限问题 → 检查API密钥权限设置');

console.log('\n5. 🧪 测试命令:');
console.log('===============');
console.log('本地测试: npm run start:payment');
console.log('API测试: node debug-openrouter-api.js');
console.log('Webhook测试: npm run test:webhook'); 