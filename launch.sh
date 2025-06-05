#!/bin/bash

echo "🚀 启动AI男友机器人..."

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo "❌ 错误：.env文件不存在"
    echo "请先复制env.example到.env并配置API密钥"
    exit 1
fi

# 运行测试
echo "🔍 运行配置测试..."
node scripts/test.js

if [ $? -eq 0 ]; then
    echo "✅ 测试通过，启动机器人..."
    npm start
else
    echo "❌ 测试失败，请检查配置"
    exit 1
fi 