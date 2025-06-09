#!/usr/bin/env node

// AI男友机器人 - 集成支付功能启动脚本
import 'dotenv/config';
import { spawn } from 'child_process';
import { startWebhookServer } from './src/services/webhook.js';

console.log('🚀 启动AI男友机器人 (集成Creem支付功能)');
console.log('='.repeat(50));

// 检查必要的环境变量
function checkEnvironmentVariables() {
  const required = [
    'BOT_TOKEN',
    'CLIENT_ID',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'OPENROUTER_API_KEY'
  ];

  const creem = [
    'CREEM_API_KEY',
    'CREEM_WEBHOOK_SECRET',
    'CREEM_PRODUCT_ID_STARTER',
    'CREEM_PRODUCT_ID_BASIC',
    'CREEM_PRODUCT_ID_STANDARD',
    'CREEM_PRODUCT_ID_PREMIUM'
  ];

  console.log('🔍 检查环境变量...');
  
  let allGood = true;
  
  // 检查基础配置
  for (const key of required) {
    if (!process.env[key]) {
      console.log(`❌ 缺少必需的环境变量: ${key}`);
      allGood = false;
    } else {
      console.log(`✅ ${key}: 已配置`);
    }
  }

  // 检查Creem配置
  console.log('\n💳 检查Creem支付配置...');
  let creemConfigured = true;
  
  for (const key of creem) {
    if (!process.env[key]) {
      console.log(`⚠️  缺少Creem配置: ${key}`);
      creemConfigured = false;
    } else {
      console.log(`✅ ${key}: 已配置`);
    }
  }

  if (!creemConfigured) {
    console.log('\n⚠️  Creem支付功能未完全配置，充值功能可能无法正常工作');
    console.log('💡 请参考 creem-setup-guide.md 完成配置');
  }

  if (!allGood) {
    console.log('\n❌ 请检查 .env 文件并确保所有必需变量都已设置');
    process.exit(1);
  }

  console.log('\n✅ 环境变量检查完成');
  return creemConfigured;
}

async function startServices() {
  const creemEnabled = checkEnvironmentVariables();

  console.log('\n🤖 启动AI男友机器人 (包含支付功能)...');
  
  // 直接启动主机器人程序，让它处理所有功能
  const botProcess = spawn('node', ['src/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      WEBHOOK_STARTED: 'false'  // 让机器人启动webhook服务器
    }
  });

  botProcess.on('close', (code) => {
    console.log(`\n🔄 机器人进程退出，代码: ${code}`);
    if (code !== 0) {
      console.log('❌ 机器人异常退出');
      process.exit(1);
    }
  });

  // 优雅关闭处理
  process.on('SIGINT', () => {
    console.log('\n🔄 正在关闭所有服务...');
    botProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🔄 收到终止信号，正在关闭...');
    botProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  if (creemEnabled) {
    console.log('💳 Creem支付功能已启用');
    console.log(`📍 Webhook URL: http://localhost:${process.env.WEBHOOK_PORT || 3001}/webhook/creem`);
  } else {
    console.log('⚪ Creem支付功能未配置，仅启动基础webhook服务');
  }
}

// 显示启动信息
function showStartupInfo() {
  console.log('\n📋 启动信息:');
  console.log(`🤖 机器人模式: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎣 Webhook端口: ${process.env.WEBHOOK_PORT || 3001}`);
  console.log(`🌐 应用URL: ${process.env.APP_URL || 'http://localhost:3000'}`);
  console.log(`💳 Creem API: ${process.env.CREEM_API_KEY ? '已配置' : '未配置'}`);
  console.log('');
}

// 主启动函数
async function main() {
  try {
    showStartupInfo();
    await startServices();
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

main(); 