import 'dotenv/config';
import fs from 'fs';
import path from 'path';

console.log('☁️  AI男友机器人 - 云端部署设置助手\n');

const cloudProviders = {
  1: {
    name: 'Railway',
    description: '最简单，支持GitHub自动部署',
    url: 'https://railway.app',
    cost: '免费额度每月$5，超出$0.20/h',
    steps: [
      '访问 railway.app 注册账户',
      '点击 "Deploy from GitHub repo"',
      '选择你的AI男友机器人仓库',
      '在Variables页面添加环境变量',
      '自动部署完成'
    ]
  },
  2: {
    name: 'Render',
    description: '免费版本，但可能有延迟',
    url: 'https://render.com',
    cost: '免费版（有限制），付费版$7/月',
    steps: [
      '访问 render.com 注册账户',
      '创建新的 "Web Service"',
      '连接GitHub仓库',
      '设置构建命令: npm install',
      '设置启动命令: npm start',
      '添加环境变量'
    ]
  },
  3: {
    name: 'Heroku',
    description: '老牌平台，稳定可靠',
    url: 'https://heroku.com',
    cost: '基础版$7/月',
    steps: [
      '访问 heroku.com 注册账户',
      '安装 Heroku CLI',
      '创建新应用',
      '连接GitHub或直接部署',
      '配置环境变量'
    ]
  },
  4: {
    name: 'VPS自建',
    description: '完全控制，需要技术知识',
    url: '各大云服务商',
    cost: 'DigitalOcean $4/月, Vultr $2.5/月',
    steps: [
      '购买VPS服务器',
      '配置Linux环境',
      '安装Node.js和PM2',
      '上传代码并启动',
      '配置防火墙和SSL'
    ]
  }
};

function displayProviders() {
  console.log('🌍 选择云端部署平台：\n');
  
  Object.entries(cloudProviders).forEach(([key, provider]) => {
    console.log(`${key}. ${provider.name}`);
    console.log(`   💡 ${provider.description}`);
    console.log(`   💰 费用：${provider.cost}`);
    console.log(`   🔗 网址：${provider.url}\n`);
  });
}

function generateRailwayGuide() {
  console.log('🚄 Railway 部署详细指南');
  console.log('========================\n');
  
  console.log('📋 步骤说明：');
  cloudProviders[1].steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });
  
  console.log('\n🔧 环境变量配置：');
  console.log('在Railway项目的Variables页面添加以下变量：');
  
  const envVars = [
    'BOT_TOKEN',
    'CLIENT_ID', 
    'OPENROUTER_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'HUGGINGFACE_API_KEY'
  ];
  
  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value && !value.startsWith('your_')) {
      console.log(`✅ ${varName}: ${value.substring(0, 12)}...`);
    } else {
      console.log(`❌ ${varName}: 需要配置`);
    }
  });
  
  console.log('\n🎯 部署后验证：');
  console.log('1. 检查部署日志是否成功');
  console.log('2. 查看机器人在Discord中是否在线');
  console.log('3. 发送测试消息验证功能');
  
  console.log('\n🔗 Railway项目配置：');
  console.log('- 构建命令: npm install');
  console.log('- 启动命令: npm start');
  console.log('- 端口: 自动分配（Railway会设置PORT环境变量）');
}

function generateRenderGuide() {
  console.log('🎨 Render 部署详细指南');
  console.log('======================\n');
  
  console.log('📋 步骤说明：');
  cloudProviders[2].steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });
  
  console.log('\n⚙️  Render配置：');
  console.log('- Service Type: Web Service');
  console.log('- Build Command: npm install');
  console.log('- Start Command: npm start');
  console.log('- Environment: Node');
  
  console.log('\n⚠️  注意事项：');
  console.log('- 免费版会在无活动30分钟后休眠');
  console.log('- 休眠后重启需要30-60秒');
  console.log('- 建议升级到付费版保持24/7运行');
}

function generateVPSGuide() {
  console.log('🖥️  VPS 自建部署指南');
  console.log('====================\n');
  
  console.log('1️⃣ 购买VPS服务器：');
  console.log('推荐提供商：');
  console.log('- DigitalOcean: 新用户$200免费额度');
  console.log('- Vultr: 便宜稳定，$2.5/月起');
  console.log('- Linode: 性能优秀，$5/月起');
  console.log('- AWS Lightsail: 亚马逊云，$3.5/月起');
  
  console.log('\n2️⃣ 服务器配置要求：');
  console.log('- 操作系统: Ubuntu 20.04+ 或 CentOS 8+');
  console.log('- 内存: 至少512MB（推荐1GB）');
  console.log('- 存储: 至少10GB');
  console.log('- 网络: 不限流量');
  
  console.log('\n3️⃣ 快速部署命令：');
  console.log('复制以下命令到服务器执行：');
  console.log('```bash');
  console.log('# 更新系统');
  console.log('sudo apt update && sudo apt upgrade -y');
  console.log('');
  console.log('# 安装Node.js');
  console.log('curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -');
  console.log('sudo apt-get install -y nodejs');
  console.log('');
  console.log('# 安装PM2');
  console.log('sudo npm install -g pm2');
  console.log('');
  console.log('# 克隆项目');
  console.log('git clone https://github.com/你的用户名/aiboyfriend.git');
  console.log('cd aiboyfriend');
  console.log('');
  console.log('# 安装依赖');
  console.log('npm install');
  console.log('');
  console.log('# 配置环境变量');
  console.log('nano .env  # 编辑配置文件');
  console.log('');
  console.log('# 启动机器人');
  console.log('pm2 start src/index.js --name aiboyfriend');
  console.log('pm2 save && pm2 startup');
  console.log('```');
}

function generateEnvFile() {
  console.log('📄 生成云端部署环境变量文件\n');
  
  const envContent = [];
  const requiredVars = [
    'BOT_TOKEN',
    'CLIENT_ID',
    'OPENROUTER_API_KEY', 
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'HUGGINGFACE_API_KEY'
  ];
  
  console.log('📋 当前配置状态：');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && !value.startsWith('your_')) {
      console.log(`✅ ${varName}: 已配置`);
      envContent.push(`${varName}=${value}`);
    } else {
      console.log(`❌ ${varName}: 需要配置`);
      envContent.push(`${varName}=your_${varName.toLowerCase()}_here`);
    }
  });
  
  // 写入云端环境变量文件
  const cloudEnvPath = path.join(process.cwd(), '.env.cloud');
  fs.writeFileSync(cloudEnvPath, envContent.join('\n'));
  
  console.log(`\n💾 已生成云端环境变量文件: ${cloudEnvPath}`);
  console.log('🔧 请编辑此文件，补充缺失的配置项');
  console.log('📤 部署时将此文件内容复制到云平台的环境变量设置中');
}

function checkGitHubIntegration() {
  console.log('🐙 GitHub集成检查\n');
  
  // 检查是否有.git目录
  const gitPath = path.join(process.cwd(), '.git');
  if (fs.existsSync(gitPath)) {
    console.log('✅ 检测到Git仓库');
    
    // 检查是否有远程仓库
    try {
      const { execSync } = require('child_process');
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      console.log(`✅ GitHub仓库: ${remoteUrl}`);
      
      console.log('\n🚀 可以使用自动部署：');
      console.log('1. Railway - 直接连接GitHub自动部署');
      console.log('2. Render - 支持GitHub自动部署');
      console.log('3. Vercel - 虽然不适合机器人，但技术上可行');
      
    } catch (error) {
      console.log('⚠️  未配置GitHub远程仓库');
      console.log('💡 建议：将代码推送到GitHub以便自动部署');
    }
  } else {
    console.log('❌ 未初始化Git仓库');
    console.log('💡 建议：');
    console.log('1. git init');
    console.log('2. git add .');
    console.log('3. git commit -m "Initial commit"');
    console.log('4. 创建GitHub仓库并推送代码');
  }
}

function main() {
  console.log('欢迎使用云端部署设置助手！\n');
  
  console.log('🎯 根据调试结果，你的问题是：');
  console.log('✅ 所有配置正确');
  console.log('✅ API调用正常');
  console.log('❌ WebSocket连接超时（本地网络限制）');
  console.log('💡 解决方案：使用云端部署\n');
  
  // 显示云服务商选项
  displayProviders();
  
  console.log('💡 推荐方案：');
  console.log('🥇 新手推荐: Railway（最简单，GitHub自动部署）');
  console.log('🥈 预算有限: Render（有免费版）'); 
  console.log('🥉 完全控制: VPS自建（需要技术经验）\n');
  
  // 生成详细指南
  console.log('📖 详细部署指南：\n');
  
  generateRailwayGuide();
  console.log('\n' + '='.repeat(50) + '\n');
  
  generateRenderGuide();
  console.log('\n' + '='.repeat(50) + '\n');
  
  generateVPSGuide();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 生成环境变量文件
  generateEnvFile();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 检查GitHub集成
  checkGitHubIntegration();
  
  console.log('\n🎉 设置完成！');
  console.log('💡 建议：选择Railway进行第一次部署，它最简单且有GitHub自动部署功能。');
}

main(); 