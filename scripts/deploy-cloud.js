#!/usr/bin/env node

console.log('☁️  AI男友机器人 - 云端部署脚本\n');

const fs = await import('fs');

// 部署配置
const deployConfig = {
  vps: {
    providers: [
      {
        name: 'DigitalOcean',
        regions: ['Singapore', 'Tokyo', 'San Francisco'],
        pricing: '$6/month (1GB RAM)',
        features: ['SSD存储', '1TB传输', 'IPv6支持'],
        tutorial: 'https://www.digitalocean.com/docs/droplets/how-to/create/'
      },
      {
        name: 'Vultr',
        regions: ['Tokyo', 'Singapore', 'Los Angeles'],
        pricing: '$6/month (1GB RAM)',
        features: ['高性能SSD', 'DDoS防护', '多地域'],
        tutorial: 'https://www.vultr.com/docs/deploy-a-new-server'
      },
      {
        name: 'AWS EC2',
        regions: ['Tokyo', 'Singapore', 'Oregon'],
        pricing: '免费套餐/按量付费',
        features: ['可靠性高', '服务完整', '弹性扩展'],
        tutorial: 'https://docs.aws.amazon.com/ec2/latest/userguide/EC2_GetStarted.html'
      }
    ]
  }
};

// 生成部署脚本
function generateDeployScript() {
  const script = `#!/bin/bash
# AI男友机器人 - 云服务器部署脚本

set -e  # 如果任何命令失败，脚本停止

echo "🚀 开始部署AI男友机器人到云服务器"
echo "=================================="

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装Node.js (使用NodeSource仓库)
echo "📦 安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
echo "✅ Node.js版本: \$(node -v)"
echo "✅ npm版本: \$(npm -v)"

# 安装PM2
echo "📦 安装PM2进程管理器..."
sudo npm install -g pm2

# 克隆项目 (需要替换为你的仓库地址)
echo "📦 克隆项目代码..."
if [ ! -d "aiboyfriend" ]; then
    # git clone https://github.com/your-username/aiboyfriend.git
    echo "请手动上传项目文件到服务器"
    echo "或者配置Git仓库进行克隆"
else
    echo "项目目录已存在，跳过克隆"
fi

cd aiboyfriend

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 复制环境配置
echo "📝 配置环境变量..."
if [ ! -f ".env" ]; then
    cp env.example .env
    echo "请编辑 .env 文件配置你的 API 密钥"
    echo "nano .env"
    echo "需要配置:"
    echo "- BOT_TOKEN"
    echo "- CLIENT_ID"
    echo "- OPENROUTER_API_KEY"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_ANON_KEY"
    echo ""
    read -p "配置完成后按Enter继续..."
fi

# 启动应用
echo "🚀 启动AI男友机器人..."
pm2 start src/index.js --name aiboyfriend --time
pm2 save
pm2 startup

echo "✅ 部署完成！"
echo ""
echo "管理命令:"
echo "pm2 status          - 查看状态"
echo "pm2 logs aiboyfriend - 查看日志"
echo "pm2 restart aiboyfriend - 重启"
echo "pm2 stop aiboyfriend - 停止"
echo ""
echo "监控地址:"
echo "pm2 monit           - 实时监控"
`;

  return script;
}

// 生成Docker配置
function generateDockerConfig() {
  const dockerfile = `# AI男友机器人 Dockerfile
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production

# 启动应用
CMD ["npm", "start"]
`;

  const dockerCompose = `# AI男友机器人 Docker Compose
version: '3.8'

services:
  aiboyfriend:
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - BOT_TOKEN=\${BOT_TOKEN}
      - CLIENT_ID=\${CLIENT_ID}
      - OPENROUTER_API_KEY=\${OPENROUTER_API_KEY}
      - SUPABASE_URL=\${SUPABASE_URL}
      - SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY}
    ports:
      - "3000:3000"
    volumes:
      - ./.env:/app/.env:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`;

  return { dockerfile, dockerCompose };
}

// 生成GitHub Actions工作流
function generateGitHubActions() {
  const workflow = `# AI男友机器人 GitHub Actions 部署
name: Deploy to VPS

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Deploy to VPS
      if: github.ref == 'refs/heads/main'
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: \${{ secrets.VPS_HOST }}
        username: \${{ secrets.VPS_USERNAME }}
        key: \${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /path/to/aiboyfriend
          git pull origin main
          npm install
          pm2 restart aiboyfriend
`;

  return workflow;
}

// 显示部署指南
function showDeploymentGuide() {
  console.log('📋 云端部署指南\n');
  
  console.log('🌟 推荐VPS服务商:');
  deployConfig.vps.providers.forEach(provider => {
    console.log(`\n${provider.name}:`);
    console.log(`  价格: ${provider.pricing}`);
    console.log(`  地区: ${provider.regions.join(', ')}`);
    console.log(`  特性: ${provider.features.join(', ')}`);
    console.log(`  教程: ${provider.tutorial}`);
  });
  
  console.log('\n📝 部署步骤:');
  console.log('1. 选择VPS服务商并创建实例');
  console.log('2. 配置SSH密钥访问');
  console.log('3. 上传部署脚本到服务器');
  console.log('4. 执行部署脚本');
  console.log('5. 配置环境变量');
  console.log('6. 启动机器人');
  
  console.log('\n🔧 服务器最低配置:');
  console.log('- CPU: 1核心');
  console.log('- 内存: 1GB RAM');
  console.log('- 存储: 20GB SSD');
  console.log('- 网络: 1TB流量/月');
  console.log('- 系统: Ubuntu 20.04 LTS');
  
  console.log('\n💰 预估费用:');
  console.log('- VPS: $6-10/月');
  console.log('- 域名(可选): $10-15/年');
  console.log('- SSL证书(可选): 免费(Let\'s Encrypt)');
}

// 创建部署文件
function createDeploymentFiles() {
  console.log('📁 生成部署文件...\n');
  
  try {
    // 创建deploy目录
    if (!fs.existsSync('deploy')) {
      fs.mkdirSync('deploy');
    }
    
    // 生成部署脚本
    const deployScript = generateDeployScript();
    fs.writeFileSync('deploy/deploy.sh', deployScript);
    console.log('✅ 已生成: deploy/deploy.sh');
    
    // 生成Docker配置
    const dockerConfig = generateDockerConfig();
    fs.writeFileSync('deploy/Dockerfile', dockerConfig.dockerfile);
    fs.writeFileSync('deploy/docker-compose.yml', dockerConfig.dockerCompose);
    console.log('✅ 已生成: deploy/Dockerfile');
    console.log('✅ 已生成: deploy/docker-compose.yml');
    
    // 生成GitHub Actions工作流
    const githubDir = '.github/workflows';
    if (!fs.existsSync('.github')) fs.mkdirSync('.github');
    if (!fs.existsSync(githubDir)) fs.mkdirSync(githubDir);
    
    const workflow = generateGitHubActions();
    fs.writeFileSync(`${githubDir}/deploy.yml`, workflow);
    console.log('✅ 已生成: .github/workflows/deploy.yml');
    
    // 生成快速部署说明
    const quickStart = `# 快速云端部署

## 方法1: 手动部署
1. 上传 deploy/deploy.sh 到你的VPS
2. 执行: chmod +x deploy.sh && ./deploy.sh

## 方法2: Docker部署
1. 上传项目文件到VPS
2. 执行: docker-compose -f deploy/docker-compose.yml up -d

## 方法3: GitHub Actions自动部署
1. 在GitHub仓库设置中配置Secrets:
   - VPS_HOST: 你的服务器IP
   - VPS_USERNAME: SSH用户名
   - VPS_SSH_KEY: SSH私钥
2. 推送代码到main分支自动部署

## 环境变量配置
复制并编辑 .env 文件:
- BOT_TOKEN=你的Discord机器人Token
- CLIENT_ID=你的Discord应用ID
- OPENROUTER_API_KEY=你的OpenAI API密钥
- SUPABASE_URL=你的Supabase项目URL
- SUPABASE_ANON_KEY=你的Supabase匿名密钥
`;
    
    fs.writeFileSync('deploy/QUICK_DEPLOY.md', quickStart);
    console.log('✅ 已生成: deploy/QUICK_DEPLOY.md');
    
  } catch (error) {
    console.log('❌ 文件生成失败:', error.message);
  }
}

// 主函数
function main() {
  showDeploymentGuide();
  
  console.log('\n🛠️  是否生成部署文件？这将创建完整的云端部署配置。');
  console.log('生成的文件包括:');
  console.log('- deploy/deploy.sh (VPS部署脚本)');
  console.log('- deploy/Dockerfile (Docker配置)');
  console.log('- deploy/docker-compose.yml (Docker Compose配置)');
  console.log('- .github/workflows/deploy.yml (GitHub Actions工作流)');
  console.log('- deploy/QUICK_DEPLOY.md (快速部署说明)');
  
  // 直接生成文件
  createDeploymentFiles();
  
  console.log('\n🎉 云端部署配置已生成完成！');
  console.log('\n下一步:');
  console.log('1. 选择VPS服务商注册账户');
  console.log('2. 创建Ubuntu 20.04服务器实例');
  console.log('3. 上传deploy.sh到服务器并执行');
  console.log('4. 配置.env环境变量');
  console.log('5. 机器人将自动启动并保持运行');
  
  console.log('\n📞 需要帮助？');
  console.log('查看 deploy/QUICK_DEPLOY.md 获取详细说明');
}

main(); 