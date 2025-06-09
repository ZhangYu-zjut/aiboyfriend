#!/usr/bin/env node

// Railway专用启动脚本 - 处理环境变量和端口配置
import 'dotenv/config';

console.log('🚀 启动AI男友机器人 (Railway生产环境)');
console.log('='.repeat(50));

// 设置Railway特定的环境变量
process.env.NODE_ENV = 'production';
process.env.RAILWAY_ENVIRONMENT = 'true';

// 确保使用Railway提供的PORT环境变量
if (process.env.PORT) {
  console.log(`✅ 使用Railway端口: ${process.env.PORT}`);
} else {
  console.log('⚠️  未检测到Railway PORT环境变量');
}

// 设置正确的APP_URL - 修复重复路径问题
if (!process.env.APP_URL && process.env.RAILWAY_STATIC_URL) {
  process.env.APP_URL = process.env.RAILWAY_STATIC_URL;
  console.log(`✅ 使用Railway URL: ${process.env.APP_URL}`);
} else if (!process.env.APP_URL) {
  process.env.APP_URL = 'https://aiboyfriend-production.up.railway.app';
  console.log(`⚠️  未检测到APP_URL，使用默认: ${process.env.APP_URL}`);
} else {
  // 清理APP_URL，移除可能的额外路径
  let cleanUrl = process.env.APP_URL;
  
  // 移除常见的错误路径
  if (cleanUrl.includes('/webhook/creem')) {
    cleanUrl = cleanUrl.replace('/webhook/creem', '');
    console.log('🔧 移除了重复的webhook路径');
  }
  
  if (cleanUrl.includes('/webhook')) {
    cleanUrl = cleanUrl.replace('/webhook', '');
    console.log('🔧 移除了webhook路径');
  }
  
  // 移除末尾的斜杠
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  
  // 确保使用https协议
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  
  process.env.APP_URL = cleanUrl;
  console.log(`✅ 使用清理后的URL: ${process.env.APP_URL}`);
}

// 显示关键配置信息
console.log('\n📋 Railway部署配置:');
console.log(`🌐 应用URL: ${process.env.APP_URL}`);
console.log(`🎣 服务端口: ${process.env.PORT || '未设置'}`);
console.log(`💳 Creem API: ${process.env.CREEM_API_KEY ? '已配置' : '未配置'}`);
console.log(`🔐 Webhook密钥: ${process.env.CREEM_WEBHOOK_SECRET ? '已配置' : '未配置'}`);

// 检查关键的Creem配置
const creemVars = [
  'CREEM_PRODUCT_ID_STARTER',
  'CREEM_PRODUCT_ID_BASIC', 
  'CREEM_PRODUCT_ID_STANDARD',
  'CREEM_PRODUCT_ID_PREMIUM'
];

console.log('\n💳 Creem产品配置检查:');
let allCreemConfigured = true;
for (const varName of creemVars) {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: 已配置`);
  } else {
    console.log(`❌ ${varName}: 未配置`);
    allCreemConfigured = false;
  }
}

if (allCreemConfigured) {
  console.log('\n🎯 Creem Webhook配置:');
  console.log(`📍 正确的Webhook URL: ${process.env.APP_URL}/webhook/creem`);
  console.log('💡 请确保在Creem Dashboard中配置此Webhook URL');
  console.log('⚠️  常见错误: 不要在URL末尾添加额外的路径');
} else {
  console.log('\n⚠️  Creem配置不完整，支付功能将使用备用模式');
}

console.log('\n🚀 启动应用...');

// 动态导入并启动主应用
async function startApp() {
  try {
    const { default: app } = await import('./src/index.js');
    console.log('✅ 应用启动成功');
  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    process.exit(1);
  }
}

startApp(); 