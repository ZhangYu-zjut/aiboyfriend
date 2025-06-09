#!/bin/bash

# AI男友机器人 + ngrok 自动启动脚本
echo "🚀 启动AI男友机器人 + ngrok"
echo "================================"

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok未安装，正在安装..."
    npm install -g ngrok
    if [ $? -ne 0 ]; then
        echo "❌ ngrok安装失败，请手动安装："
        echo "   npm install -g ngrok"
        echo "   或访问 https://ngrok.com/download"
        exit 1
    fi
fi

# 检查.env文件
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，正在复制模板..."
    cp env.example .env
    echo "📝 请编辑.env文件，填入你的配置信息"
    echo "   特别是Creem相关的配置项"
fi

# 清理可能存在的进程
echo "🧹 清理环境..."
pkill -f "node.*start-payment-bot.js" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
sleep 2

# 启动机器人（后台运行）
echo "🤖 启动AI男友机器人..."
npm run start:payment > bot.log 2>&1 &
BOT_PID=$!

# 检查机器人是否启动成功
sleep 8
if ! ps -p $BOT_PID > /dev/null; then
    echo "❌ 机器人启动失败，请检查配置"
    echo "📄 查看日志: cat bot.log"
    exit 1
fi

echo "✅ 机器人启动成功 (PID: $BOT_PID)"

# 测试webhook服务器
echo "🔍 测试webhook服务器..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Webhook服务器就绪"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Webhook服务器启动失败"
        kill $BOT_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# 启动ngrok
echo "🌐 启动ngrok隧道..."
ngrok http 3001 --log=ngrok.log > /dev/null 2>&1 &
NGROK_PID=$!

# 等待ngrok启动
echo "⏳ 等待ngrok启动..."
for i in {1..15}; do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 15 ]; then
        echo "❌ ngrok启动超时"
        kill $BOT_PID $NGROK_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# 获取ngrok URL
echo "📋 获取Webhook URL..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | sed 's/"public_url":"//g' | sed 's/"//g')

if [ -z "$NGROK_URL" ]; then
    echo "❌ 无法获取ngrok URL"
    kill $BOT_PID $NGROK_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 服务启动成功！"
echo "================================"
echo "🤖 AI男友机器人: 运行中 (PID: $BOT_PID)"
echo "🌐 ngrok隧道: 运行中 (PID: $NGROK_PID)"
echo ""
echo "📍 Webhook URL:"
echo "   $NGROK_URL/webhook/creem"
echo ""
echo "🔗 有用的链接:"
echo "   ngrok管理界面: http://127.0.0.1:4040"
echo "   健康检查: $NGROK_URL/health"
echo ""
echo "📝 配置Creem Webhook:"
echo "   1. 访问 Creem商户后台"
echo "   2. 找到 Webhook设置"
echo "   3. 添加URL: $NGROK_URL/webhook/creem"
echo "   4. 选择事件: checkout.completed, checkout.failed"
echo ""
echo "📄 日志文件:"
echo "   机器人日志: tail -f bot.log"
echo "   ngrok日志: tail -f ngrok.log"
echo ""
echo "🛑 停止服务: 按 Ctrl+C"

# 保存URL到文件，方便其他脚本使用
echo "$NGROK_URL/webhook/creem" > .webhook_url

# 优雅关闭处理
cleanup() {
    echo ""
    echo "🔄 正在关闭服务..."
    kill $BOT_PID $NGROK_PID 2>/dev/null
    rm -f .webhook_url
    echo "✅ 服务已关闭"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 保持脚本运行
echo "⌨️  按 Ctrl+C 停止所有服务"
while true; do
    # 检查进程是否还在运行
    if ! ps -p $BOT_PID > /dev/null 2>&1; then
        echo "❌ 机器人进程意外退出"
        kill $NGROK_PID 2>/dev/null
        exit 1
    fi
    
    if ! ps -p $NGROK_PID > /dev/null 2>&1; then
        echo "❌ ngrok进程意外退出"
        kill $BOT_PID 2>/dev/null
        exit 1
    fi
    
    sleep 5
done 

# AI男友机器人 + ngrok 自动启动脚本
echo "🚀 启动AI男友机器人 + ngrok"
echo "================================"

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok未安装，正在安装..."
    npm install -g ngrok
    if [ $? -ne 0 ]; then
        echo "❌ ngrok安装失败，请手动安装："
        echo "   npm install -g ngrok"
        echo "   或访问 https://ngrok.com/download"
        exit 1
    fi
fi

# 检查.env文件
if [ ! -f .env ]; then
    echo "⚠️  未找到.env文件，正在复制模板..."
    cp env.example .env
    echo "📝 请编辑.env文件，填入你的配置信息"
    echo "   特别是Creem相关的配置项"
fi

# 清理可能存在的进程
echo "🧹 清理环境..."
pkill -f "node.*start-payment-bot.js" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
sleep 2

# 启动机器人（后台运行）
echo "🤖 启动AI男友机器人..."
npm run start:payment > bot.log 2>&1 &
BOT_PID=$!

# 检查机器人是否启动成功
sleep 8
if ! ps -p $BOT_PID > /dev/null; then
    echo "❌ 机器人启动失败，请检查配置"
    echo "📄 查看日志: cat bot.log"
    exit 1
fi

echo "✅ 机器人启动成功 (PID: $BOT_PID)"

# 测试webhook服务器
echo "🔍 测试webhook服务器..."
for i in {1..10}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Webhook服务器就绪"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Webhook服务器启动失败"
        kill $BOT_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# 启动ngrok
echo "🌐 启动ngrok隧道..."
ngrok http 3001 --log=ngrok.log > /dev/null 2>&1 &
NGROK_PID=$!

# 等待ngrok启动
echo "⏳ 等待ngrok启动..."
for i in {1..15}; do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 15 ]; then
        echo "❌ ngrok启动超时"
        kill $BOT_PID $NGROK_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# 获取ngrok URL
echo "📋 获取Webhook URL..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | sed 's/"public_url":"//g' | sed 's/"//g')

if [ -z "$NGROK_URL" ]; then
    echo "❌ 无法获取ngrok URL"
    kill $BOT_PID $NGROK_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 服务启动成功！"
echo "================================"
echo "🤖 AI男友机器人: 运行中 (PID: $BOT_PID)"
echo "🌐 ngrok隧道: 运行中 (PID: $NGROK_PID)"
echo ""
echo "📍 Webhook URL:"
echo "   $NGROK_URL/webhook/creem"
echo ""
echo "🔗 有用的链接:"
echo "   ngrok管理界面: http://127.0.0.1:4040"
echo "   健康检查: $NGROK_URL/health"
echo ""
echo "📝 配置Creem Webhook:"
echo "   1. 访问 Creem商户后台"
echo "   2. 找到 Webhook设置"
echo "   3. 添加URL: $NGROK_URL/webhook/creem"
echo "   4. 选择事件: checkout.completed, checkout.failed"
echo ""
echo "📄 日志文件:"
echo "   机器人日志: tail -f bot.log"
echo "   ngrok日志: tail -f ngrok.log"
echo ""
echo "🛑 停止服务: 按 Ctrl+C"

# 保存URL到文件，方便其他脚本使用
echo "$NGROK_URL/webhook/creem" > .webhook_url

# 优雅关闭处理
cleanup() {
    echo ""
    echo "🔄 正在关闭服务..."
    kill $BOT_PID $NGROK_PID 2>/dev/null
    rm -f .webhook_url
    echo "✅ 服务已关闭"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 保持脚本运行
echo "⌨️  按 Ctrl+C 停止所有服务"
while true; do
    # 检查进程是否还在运行
    if ! ps -p $BOT_PID > /dev/null 2>&1; then
        echo "❌ 机器人进程意外退出"
        kill $NGROK_PID 2>/dev/null
        exit 1
    fi
    
    if ! ps -p $NGROK_PID > /dev/null 2>&1; then
        echo "❌ ngrok进程意外退出"
        kill $BOT_PID 2>/dev/null
        exit 1
    fi
    
    sleep 5
done 