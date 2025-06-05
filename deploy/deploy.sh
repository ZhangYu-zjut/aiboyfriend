#!/bin/bash
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
echo "✅ Node.js版本: $(node -v)"
echo "✅ npm版本: $(npm -v)"

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
    echo "- OPENAI_API_KEY"
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
