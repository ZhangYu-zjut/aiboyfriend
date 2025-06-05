#!/bin/bash

# AI男友 Discord机器人 - 快速部署脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "🤖💕 AI男友 Discord机器人 - 快速部署开始"
echo "============================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 检查 Git
if ! command -v git &> /dev/null; then
    echo "📦 安装 Git..."
    sudo apt-get update
    sudo apt-get install -y git
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
fi

echo "✅ 环境检查完成"

# 项目目录
PROJECT_DIR="/opt/aiboyfriend"
SERVICE_NAME="aiboyfriend"

# 停止现有服务
if pm2 list | grep -q $SERVICE_NAME; then
    echo "🔄 停止现有服务..."
    pm2 stop $SERVICE_NAME
    pm2 delete $SERVICE_NAME
fi

# 克隆或更新项目
if [ -d "$PROJECT_DIR" ]; then
    echo "🔄 更新项目代码..."
    cd $PROJECT_DIR
    git pull origin main
else
    echo "📥 克隆项目..."
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
    git clone https://github.com/yourusername/aiboyfriend.git $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，从示例文件创建..."
    cp env.example .env
    echo ""
    echo "🔧 请编辑 .env 文件配置你的API密钥："
    echo "   nano .env"
    echo ""
    echo "📋 需要配置的关键变量："
    echo "   - BOT_TOKEN (Discord机器人令牌)"
    echo "   - CLIENT_ID (Discord应用程序ID)"  
    echo "   - OPENAI_API_KEY (OpenAI API密钥)"
    echo "   - SUPABASE_URL (Supabase项目URL)"
    echo "   - SUPABASE_ANON_KEY (Supabase匿名密钥)"
    echo "   - HUGGINGFACE_API_KEY (HuggingFace API密钥)"
    echo ""
    echo "配置完成后，重新运行此脚本继续部署。"
    exit 1
fi

# 验证关键环境变量
echo "🔍 验证环境变量..."
source .env

if [ -z "$BOT_TOKEN" ] || [ "$BOT_TOKEN" = "your_discord_bot_token" ]; then
    echo "❌ BOT_TOKEN 未配置，请检查 .env 文件"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key" ]; then
    echo "❌ OPENAI_API_KEY 未配置，请检查 .env 文件"
    exit 1
fi

# 启动服务
echo "🚀 启动AI男友机器人..."
pm2 start src/index.js --name $SERVICE_NAME --env production

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup

echo ""
echo "🎉 部署完成！"
echo "============================================"
echo "📊 服务状态: pm2 status"
echo "📋 查看日志: pm2 logs $SERVICE_NAME"
echo "🔄 重启服务: pm2 restart $SERVICE_NAME"
echo "🛑 停止服务: pm2 stop $SERVICE_NAME"
echo ""
echo "🌐 Webhook服务器运行在: http://localhost:${PORT:-3000}"
echo "🤖 机器人状态请查看Discord服务器"
echo ""

# 显示状态
pm2 status

echo "💕 AI男友机器人部署成功！开始你的甜蜜之旅吧～" 