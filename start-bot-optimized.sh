#!/bin/bash

echo "🤖 AI男友机器人 - 优化启动脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查Node.js版本
echo -e "${BLUE}🔍 检查Node.js环境...${NC}"
node_version=$(node -v)
echo "Node.js版本: $node_version"

# 检查代理状态
echo -e "${BLUE}🌐 检查代理状态...${NC}"
if curl -s --max-time 3 http://127.0.0.1:7890 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Clash代理服务正常运行${NC}"
else
    echo -e "${YELLOW}⚠️  Clash代理服务异常，请检查ClashX是否运行${NC}"
    echo "建议:"
    echo "1. 启动ClashX或Clash"
    echo "2. 确保开启系统代理或TUN模式"
    echo "3. 检查代理端口是否为7890"
fi

# 设置代理环境变量
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890
echo -e "${GREEN}✅ 代理环境变量已设置${NC}"

# 运行连接测试
echo -e "${BLUE}🧪 运行连接测试...${NC}"
if node scripts/test-proxy-fix.js | grep -q "Bot认证成功"; then
    echo -e "${GREEN}✅ 连接测试通过，准备启动机器人${NC}"
else
    echo -e "${RED}❌ 连接测试失败${NC}"
    echo "请检查:"
    echo "1. 网络连接和代理设置"
    echo "2. Bot Token配置"
    echo "3. .env文件是否正确配置"
    
    read -p "是否仍要尝试启动机器人? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "启动已取消"
        exit 1
    fi
fi

echo -e "${BLUE}🚀 启动AI男友机器人...${NC}"
echo "按 Ctrl+C 停止机器人"
echo "================================"

# 启动机器人，并处理错误
npm start

# 如果机器人异常退出
exit_code=$?
if [ $exit_code -ne 0 ]; then
    echo -e "${RED}❌ 机器人异常退出 (代码: $exit_code)${NC}"
    echo
    echo "常见问题排查:"
    echo "1. 检查.env文件配置"
    echo "2. 验证Bot Token有效性"
    echo "3. 确认代理连接正常"
    echo "4. 查看上方错误信息"
    echo
    echo "获取帮助:"
    echo "- 运行网络测试: node scripts/network-test.js"
    echo "- 运行代理测试: node scripts/test-proxy-fix.js"
    echo "- 运行离线测试: node scripts/test-offline.js"
fi 