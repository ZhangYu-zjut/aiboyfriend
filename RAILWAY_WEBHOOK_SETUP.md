# Railway Webhook 配置指南

## 🎯 解决 502 Bad Gateway 问题

这个文档将帮助你修复Creem支付完成后出现的502错误，确保webhook正常工作。

## 🔍 问题分析

**502 Bad Gateway错误的原因**：
1. Railway端口配置不正确（未使用 `$PORT` 环境变量）
2. Creem Dashboard中配置的Webhook URL不正确
3. 应用未正确监听在0.0.0.0地址上

## ✅ 修复步骤

### 1. 确认Railway环境变量

在Railway Dashboard中设置以下环境变量：

```bash
# 基础配置
NODE_ENV=production
APP_URL=https://your-railway-app.up.railway.app

# Discord配置
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id

# 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# AI配置
OPENROUTER_API_KEY=your_openrouter_key

# Creem配置
CREEM_API_KEY=your_creem_api_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
CREEM_PRODUCT_ID_STARTER=prod_xxx
CREEM_PRODUCT_ID_BASIC=prod_xxx
CREEM_PRODUCT_ID_STANDARD=prod_xxx
CREEM_PRODUCT_ID_PREMIUM=prod_xxx
```

### 2. 配置Creem Dashboard

1. 登录 [Creem Dashboard](https://dashboard.creem.io)
2. 进入 **Settings** -> **Webhooks**
3. 设置Webhook URL为：
   ```
   https://your-railway-app.up.railway.app/webhook/creem
   ```
4. 设置Webhook Secret（与环境变量中的相同）
5. 选择事件类型：
   - ✅ `checkout.completed`
   - ✅ `checkout.failed`
   - ✅ `payment.completed`
   - ✅ `payment.failed`

### 3. 部署修复

重新部署应用，确保使用最新的修复代码：

1. 在Railway中点击 **Deploy** 按钮
2. 或者推送新代码到GitHub（如果使用GitHub集成）

### 4. 验证修复

#### 检查应用启动日志
```
🚀 启动AI男友机器人 (Railway生产环境)
✅ 使用Railway端口: 8080
✅ 使用Railway URL: https://your-app.up.railway.app
🌐 Webhook服务器运行在端口 8080
📍 Creem Webhook URL: https://your-app.up.railway.app/webhook/creem
```

#### 测试健康检查
访问：`https://your-railway-app.up.railway.app/health`

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2025-06-09T...",
  "service": "AI男友 Webhook服务器",
  "port": 8080
}
```

#### 测试webhook接收
查看Railway部署日志，支付完成后应该看到：
```
🎯 收到Creem webhook: {...}
✅ 处理支付成功事件...
✅ 用户 xxx 充值成功: +450 DOL
```

## 🚨 常见问题排查

### 问题1：仍然出现502错误
**原因**：Creem Dashboard中的Webhook URL配置错误

**解决**：
1. 确认Railway应用的正确域名
2. 在Creem Dashboard中更新Webhook URL
3. 确保URL格式为：`https://your-app.up.railway.app/webhook/creem`

### 问题2：webhook接收到但处理失败
**原因**：数据库连接或业务逻辑错误

**排查**：
1. 查看Railway部署日志
2. 检查Supabase数据库连接
3. 确认Creem API密钥有效

### 问题3：支付成功但DOL没有到账
**原因**：数据库更新失败或用户通知失败

**排查**：
1. 检查webhook处理日志
2. 确认用户ID格式正确
3. 检查数据库函数是否正常

## 🔧 手动测试

### 测试webhook端点
```bash
curl -X POST https://your-railway-app.up.railway.app/webhook/creem \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "checkout.completed",
    "data": {
      "id": "test_payment",
      "request_id": "test_123",
      "amount": 4.5,
      "metadata": {
        "discord_user_id": "your_discord_id",
        "package_key": "starter",
        "dol_amount": "450"
      }
    }
  }'
```

预期响应：
```json
{
  "status": "success",
  "received": true
}
```

## 📞 获取帮助

如果问题仍然存在：

1. **检查Railway日志**：在Railway Dashboard的Deployments页面查看详细日志
2. **验证Creem配置**：确保所有Product ID和API密钥正确
3. **测试网络连接**：确认Railway应用可以访问外部API
4. **联系支持**：如果是Creem服务的问题，联系Creem技术支持

## 🎉 成功标志

修复成功后，支付流程应该是：
1. ✅ 用户点击充值按钮
2. ✅ 跳转到Creem支付页面
3. ✅ 完成信用卡支付
4. ✅ 重定向到成功页面（而不是502错误）
5. ✅ 用户收到Discord私信通知
6. ✅ DOL余额自动更新

现在你的webhook应该能正常工作了！🎊 