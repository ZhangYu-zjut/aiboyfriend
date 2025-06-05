#!/bin/bash

echo "🌐 AI男友机器人 - 代理配置向导"
echo ""

echo "请选择你的代理类型："
echo "1) Clash (端口 7890)"
echo "2) Shadowsocks (端口 1087)" 
echo "3) SOCKS5 (端口 1080)"
echo "4) 自定义代理"
echo "5) 跳过代理配置"
echo ""

read -p "请输入选择 (1-5): " choice

case $choice in
  1)
    echo "HTTPS_PROXY=http://127.0.0.1:7890" >> .env
    echo "HTTP_PROXY=http://127.0.0.1:7890" >> .env
    echo "✅ 已配置 Clash 代理"
    ;;
  2)
    echo "HTTPS_PROXY=http://127.0.0.1:1087" >> .env
    echo "HTTP_PROXY=http://127.0.0.1:1087" >> .env
    echo "✅ 已配置 Shadowsocks 代理"
    ;;
  3)
    echo "ALL_PROXY=socks5://127.0.0.1:1080" >> .env
    echo "✅ 已配置 SOCKS5 代理"
    ;;
  4)
    read -p "请输入代理地址 (如 http://127.0.0.1:8080): " proxy_url
    echo "HTTPS_PROXY=$proxy_url" >> .env
    echo "HTTP_PROXY=$proxy_url" >> .env
    echo "✅ 已配置自定义代理: $proxy_url"
    ;;
  5)
    echo "USE_LOCAL_PROXY=true" >> .env
    echo "⚠️  已跳过代理配置，将尝试自动检测本地代理"
    ;;
  *)
    echo "❌ 无效选择"
    exit 1
    ;;
esac

echo ""
echo "🚀 代理配置完成！现在可以尝试启动机器人："
echo "   npm start"
echo ""
echo "或者再次运行网络测试："
echo "   node scripts/network-test.js" 