# 🔗 AI男友 Webhook URL设置指南

本指南将详细说明如何为AI男友项目设置Creem支付的Webhook URL，特别针对没有自己域名的开发者。

## 📋 什么是Webhook URL？

Webhook URL是一个HTTP接口地址，当用户完成支付后，Creem会自动向这个地址发送支付结果通知，包括：
- ✅ 支付成功/失败状态
- 💰 支付金额和商品信息
- 👤 用户身份信息
- 📄 支付详细数据

## 🏠 没有域名的解决方案

### 方案1：使用ngrok（推荐 - 免费）

ngrok可以将你本地的服务器暴露到公网，提供临时的公网域名。

#### 1. 安装ngrok
```bash
# 方法1：通过npm安装（推荐）
npm install -g ngrok

# 方法2：下载官方客户端
# 访问 https://ngrok.com/download 下载
```

#### 2. 启动你的webhook服务器
```bash
# 方法1：使用集成启动脚本（推荐）
npm run start:payment

# 方法2：单独启动机器人，webhook会自动启动
npm start

# 默认webhook端口是3001
```

#### 3. 使用ngrok暴露端口
打开新的终端窗口：
```bash
# 暴露3001端口到公网
ngrok http 3001
```

你会看到类似这样的输出：
```
ngrok by @inconshreveable

Session Status                online
Session Expires               7 hours, 59 minutes
Version                       2.3.40
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abcd1234.ngrok.io -> http://localhost:3001
Forwarding                    http://abcd1234.ngrok.io -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

#### 4. 获取Webhook URL
从上面的输出中，你的Webhook URL就是：
```
https://abcd1234.ngrok.io/webhook/creem
```

⚠️ **注意**：每次重启ngrok，域名都会变化！

### 方案2：使用Localtunnel（免费替代）

```bash
# 安装localtunnel
npm install -g localtunnel

# 启动隧道
lt --port 3001 --subdomain my-aiboyfriend-webhook

# 你的webhook URL将是：
# https://my-aiboyfriend-webhook.loca.lt/webhook/creem
```

### 方案3：使用免费云服务

#### Railway（推荐）
1. 访问 [railway.app](https://railway.app)
2. 连接你的GitHub仓库
3. 自动部署并获得免费域名

#### Render
1. 访问 [render.com](https://render.com)
2. 部署你的应用
3. 获得免费的`onrender.com`子域名

## 🛠️ 在Creem后台设置Webhook

### 1. 登录Creem商户后台
访问 [Creem商户后台](https://dashboard.creem.io)

### 2. 找到Webhook设置
通常在：设置 → API设置 → Webhooks 或类似菜单

### 3. 添加Webhook端点
- **URL**: `https://你的域名/webhook/creem`
- **事件类型**: 选择支付相关事件
  - `checkout.completed` (支付成功)
  - `checkout.failed` (支付失败)
- **签名密钥**: 复制保存到`.env`文件

### 4. 测试Webhook
点击"测试Webhook"按钮，确保能收到测试请求

## 🧪 本地测试完整流程

### 步骤1：准备环境
```bash
# 确保已配置Creem相关环境变量
cp env.example .env
# 编辑.env文件，填入你的Creem配置
```

### 步骤2：启动服务
```bash
# 终端1：启动AI男友机器人（包含webhook服务器）
npm run start:payment
```

### 步骤3：暴露到公网
```bash
# 终端2：启动ngrok
ngrok http 3001
```

### 步骤4：配置Creem
1. 复制ngrok提供的HTTPS URL
2. 在Creem后台设置webhook为：`https://你的ngrok域名.ngrok.io/webhook/creem`

### 步骤5：测试充值流程
1. 在Discord中使用 `/recharge` 命令
2. 点击充值按钮进行测试支付
3. 观察终端日志，确认收到webhook通知

## 🔍 调试和测试

### 查看ngrok请求日志
访问 `http://127.0.0.1:4040` 可以看到ngrok的Web界面，显示所有HTTP请求。

### 测试webhook连通性
```bash
# 使用curl测试webhook是否可达
curl -X POST https://你的ngrok域名.ngrok.io/webhook/creem \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 检查webhook服务器状态
```bash
# 检查本地webhook服务器
curl http://localhost:3001/health
```

## ⚠️ 重要注意事项

### ngrok免费版限制
- ✅ 每月40,000个请求（足够测试）
- ✅ 1个在线隧道
- ❌ 每次重启域名会变化
- ❌ 隧道会在8小时后断开

### 生产环境建议
对于正式运营，建议：
1. 购买域名和VPS服务器
2. 使用HTTPS证书
3. 配置防火墙和安全措施

### 环境变量示例
```env
# Creem配置
CREEM_API_KEY=sk_test_1234567890abcdef
CREEM_WEBHOOK_SECRET=whsec_1234567890abcdef

# 应用配置（ngrok示例）
APP_URL=https://abcd1234.ngrok.io
WEBHOOK_PORT=3001
```

## 🚀 快速启动脚本

创建一个自动化脚本来简化开发流程：

```bash
#!/bin/bash
# start-with-ngrok.sh

echo "🚀 启动AI男友机器人 + ngrok"

# 检查ngrok是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok未安装，正在安装..."
    npm install -g ngrok
fi

# 启动机器人（后台运行）
echo "🤖 启动AI男友机器人..."
npm run start:payment &
BOT_PID=$!

# 等待服务器启动
sleep 5

# 启动ngrok
echo "🌐 启动ngrok隧道..."
ngrok http 3001 &
NGROK_PID=$!

# 等待ngrok启动
sleep 3

# 获取ngrok URL
echo "📋 获取Webhook URL..."
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | sed 's/"public_url":"//g' | sed 's/"//g'

echo "✅ 服务已启动！"
echo "📍 Webhook URL: 请查看上方显示的URL，并添加 /webhook/creem"
echo "🌐 ngrok管理界面: http://127.0.0.1:4040"

# 优雅关闭处理
trap "kill $BOT_PID $NGROK_PID" EXIT

wait
```

使用方法：
```bash
chmod +x start-with-ngrok.sh
./start-with-ngrok.sh
```

---

**配置完成后，你就可以在没有自己域名的情况下测试和使用Creem支付功能了！** 🎉

如有问题，可以联系：changyu6899@gmail.com 