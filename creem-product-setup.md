# Creem支付产品配置指南

## 📋 概述

本指南将帮助你在Creem平台上创建支付产品，并配置到AI男友机器人中。

## 🔧 第一步：在Creem平台创建产品

### 1. 登录Creem商户后台
访问：https://dashboard.creem.io

### 2. 创建产品
在产品管理页面，创建以下4个产品：

#### 🌟 新手包 (Starter Package)
- **产品名称**: AI男友 - 新手包
- **价格**: $4.50 USD
- **描述**: 450 DOL - 初次体验AI男友的甜蜜聊天
- **产品类型**: 数字商品

#### 💝 基础包 (Basic Package)
- **产品名称**: AI男友 - 基础包  
- **价格**: $9.90 USD
- **描述**: 1000 DOL - 畅聊一周，体验完整AI男友功能
- **产品类型**: 数字商品

#### 💎 标准包 (Standard Package)  
- **产品名称**: AI男友 - 标准包
- **价格**: $19.90 USD
- **描述**: 2200 DOL - 超值优惠10%，享受更多甜蜜时光
- **产品类型**: 数字商品

#### 👑 至尊包 (Premium Package)
- **产品名称**: AI男友 - 至尊包
- **价格**: $49.90 USD  
- **描述**: 6000 DOL - 豪华享受20%优惠，无限制畅聊
- **产品类型**: 数字商品

### 3. 获取产品ID
创建完成后，每个产品都会有唯一的Product ID，格式类似：`prod_xxxxxxxxxxxxxxxx`

## 🔧 第二步：配置环境变量

在你的 `.env` 文件中添加以下配置：

```bash
# Creem API配置
CREEM_API_KEY=sk_live_xxxxxxxxxxxxxxxx  # 从Creem后台获取
CREEM_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx  # Webhook签名密钥

# Creem产品ID配置
CREEM_PRODUCT_ID_STARTER=prod_xxxxxxxxxxxxxxxx    # 新手包产品ID
CREEM_PRODUCT_ID_BASIC=prod_xxxxxxxxxxxxxxxx      # 基础包产品ID  
CREEM_PRODUCT_ID_STANDARD=prod_xxxxxxxxxxxxxxxx   # 标准包产品ID
CREEM_PRODUCT_ID_PREMIUM=prod_xxxxxxxxxxxxxxxx    # 至尊包产品ID

# 应用配置
APP_URL=https://你的域名.com  # 用于支付成功/失败页面回调
WEBHOOK_PORT=3001           # Webhook服务器端口
```

## 🔧 第三步：设置Webhook

### 1. 在Creem后台配置Webhook
- **Webhook URL**: `https://你的域名.com/webhook/creem`
- **事件类型**: 选择以下事件：
  - `checkout.completed` - 支付完成
  - `checkout.failed` - 支付失败
  - `payment.completed` - 付款成功确认
  - `payment.failed` - 付款失败

### 2. 本地开发测试
如果在本地开发，可以使用ngrok：

```bash
# 安装ngrok
npm install -g ngrok

# 启动AI男友机器人
npm run start:payment

# 在另一个终端启动ngrok
ngrok http 3001

# 使用ngrok提供的URL配置Creem webhook
# 例如：https://abc123.ngrok.io/webhook/creem
```

## 📋 第四步：测试配置

### 1. 检查环境变量
```bash
node debug-env-variables.js
```

### 2. 测试webhook连接
```bash
npm run test:webhook
```

### 3. 测试支付流程
在Discord中使用以下命令：
- `/shop` - 查看商品列表
- `/recharge starter` - 测试新手包购买

## 🔍 常见问题

### Q: 如何获取Creem API密钥？
A: 在Creem商户后台的"开发者设置"中可以找到API密钥。

### Q: Webhook签名验证失败怎么办？
A: 确保 `CREEM_WEBHOOK_SECRET` 与Creem后台设置的一致。

### Q: 支付成功但DOL没有到账？
A: 检查webhook是否正确配置，查看机器人日志确认是否收到webhook通知。

### Q: 如何修改套餐价格？
A: 在Creem后台修改产品价格，同时更新 `src/services/payment.js` 中的 `DOL_PACKAGES` 配置。

## 💡 最佳实践

1. **生产环境安全**：
   - 使用HTTPS
   - 启用Webhook签名验证
   - 定期轮换API密钥

2. **测试流程**：
   - 先在Creem测试环境验证
   - 使用小额测试支付
   - 确保webhook正常响应

3. **监控**：
   - 监控支付成功率
   - 记录失败原因
   - 定期检查webhook状态

## 📞 技术支持

如果遇到问题，可以：
1. 查看机器人运行日志
2. 检查Creem后台的事件日志
3. 使用测试工具验证配置

---

配置完成后，你的AI男友机器人就具备完整的支付功能了！🎉 