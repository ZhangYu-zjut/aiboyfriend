#!/usr/bin/env node

// 检查和修复webhook URL配置
import 'dotenv/config';

console.log('🔧 ================ Webhook URL修复工具 ================');

function checkAndFixAppUrl() {
  console.log('\n📋 当前APP_URL配置检查:');
  
  let currentUrl = process.env.APP_URL;
  console.log(`🔍 当前APP_URL: ${currentUrl || '未设置'}`);
  
  if (!currentUrl) {
    console.log('❌ APP_URL未设置');
    return null;
  }
  
  // 检查是否有问题
  const issues = [];
  let fixedUrl = currentUrl;
  
  if (currentUrl.includes('/webhook/creem')) {
    issues.push('包含重复的/webhook/creem路径');
    fixedUrl = fixedUrl.replace('/webhook/creem', '');
  }
  
  if (fixedUrl.includes('/webhook')) {
    issues.push('包含/webhook路径');
    fixedUrl = fixedUrl.replace('/webhook', '');
  }
  
  if (fixedUrl.endsWith('/')) {
    issues.push('末尾有多余的斜杠');
    fixedUrl = fixedUrl.slice(0, -1);
  }
  
  if (!fixedUrl.startsWith('http')) {
    issues.push('缺少协议前缀');
    fixedUrl = 'https://' + fixedUrl;
  }
  
  console.log('\n🔍 问题检查结果:');
  if (issues.length === 0) {
    console.log('✅ APP_URL配置正确，无需修复');
  } else {
    console.log('⚠️  发现问题:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log(`🔧 修复后的URL: ${fixedUrl}`);
  }
  
  return {
    original: currentUrl,
    fixed: fixedUrl,
    needsFix: issues.length > 0,
    issues: issues
  };
}

function generateCorrectWebhookUrl(baseUrl) {
  // 确保baseUrl是干净的
  let cleanUrl = baseUrl;
  
  if (cleanUrl.includes('/webhook')) {
    cleanUrl = cleanUrl.split('/webhook')[0];
  }
  
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }
  
  return `${cleanUrl}/webhook/creem`;
}

function validateCreemConfiguration() {
  console.log('\n💳 Creem配置验证:');
  
  const requiredVars = [
    'CREEM_API_KEY',
    'CREEM_WEBHOOK_SECRET',
    'CREEM_PRODUCT_ID_STARTER',
    'CREEM_PRODUCT_ID_BASIC',
    'CREEM_PRODUCT_ID_STANDARD',
    'CREEM_PRODUCT_ID_PREMIUM'
  ];
  
  let allConfigured = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName}: 已配置`);
    } else {
      console.log(`❌ ${varName}: 未配置`);
      allConfigured = false;
    }
  }
  
  return allConfigured;
}

function main() {
  console.log('🚀 开始检查webhook配置...\n');
  
  // 检查APP_URL
  const urlResult = checkAndFixAppUrl();
  
  if (!urlResult) {
    console.log('\n❌ 无法修复：APP_URL未设置');
    console.log('💡 请在Railway环境变量中设置APP_URL');
    return;
  }
  
  // 生成正确的webhook URL
  const correctWebhookUrl = generateCorrectWebhookUrl(urlResult.fixed);
  
  console.log('\n🎯 ================ 配置指南 ================');
  console.log('\n📋 Railway环境变量设置:');
  console.log(`APP_URL=${urlResult.fixed}`);
  
  console.log('\n🌐 Creem Dashboard配置:');
  console.log(`Webhook URL: ${correctWebhookUrl}`);
  console.log(`Webhook Secret: ${process.env.CREEM_WEBHOOK_SECRET ? '与环境变量相同' : '需要设置'}`);
  console.log('Webhook Events: checkout.completed, checkout.failed');
  
  // 验证Creem配置
  const creemConfigured = validateCreemConfiguration();
  
  console.log('\n🎯 ================ 修复总结 ================');
  
  if (urlResult.needsFix) {
    console.log('⚠️  需要修复的问题:');
    urlResult.issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n🔧 修复步骤:');
    console.log('1. 在Railway环境变量中更新APP_URL:');
    console.log(`   ${urlResult.original} → ${urlResult.fixed}`);
    console.log('2. 在Creem Dashboard中更新Webhook URL:');
    console.log(`   ${correctWebhookUrl}`);
    console.log('3. 重新部署应用');
  } else {
    console.log('✅ APP_URL配置正确');
  }
  
  if (!creemConfigured) {
    console.log('\n⚠️  Creem配置不完整，请完善环境变量');
  } else {
    console.log('\n✅ Creem配置完整');
  }
  
  console.log('\n💡 测试建议:');
  console.log('1. 修复配置后重新部署应用');
  console.log('2. 使用 node test-real-payment-flow.js 生成测试链接');
  console.log('3. 完成测试支付并验证DOL到账');
  
  console.log('\n🔗 重要链接:');
  console.log(`健康检查: ${urlResult.fixed}/health`);
  console.log(`Webhook端点: ${correctWebhookUrl}`);
  console.log(`支付成功页: ${urlResult.fixed}/payment/success`);
}

main(); 