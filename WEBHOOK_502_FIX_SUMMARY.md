# 🎯 Creem Webhook 502错误修复总结

## 🔍 问题诊断

**症状**：支付完成后出现 `502 Bad Gateway` 错误页面

**原因分析**：
1. ❌ Railway端口配置错误（使用固定3001而非$PORT）
2. ❌ APP_URL配置包含重复路径
3. ❌ Webhook服务器未监听0.0.0.0地址
4. ❌ A/B测试事件记录字段长度超限

## ✅ 修复内容

### 1. **Railway端口配置修复** 
- `src/services/webhook.js`：使用 `process.env.PORT` 替代固定端口
- 添加生产环境检测和URL配置
- 修改监听地址为 `0.0.0.0`

### 2. **支付服务URL修复**
- `src/services/payment.js`：移除不支持的 `cancel_url` 参数
- 添加环境检测，使用正确的回调URL
- 修复A/B测试事件记录

### 3. **Railway专用启动脚本**
- 新增 `railway-start.js`：专门处理Railway环境
- 自动配置端口和URL环境变量
- APP_URL清理和验证

### 4. **Package.json更新**
- 修改 `start` 脚本为Railway启动模式
- 添加开发和生产环境分离

### 5. **数据库字段修复**
- 修复A/B测试事件记录的 `group_name` 字段长度问题
- 所有事件使用单字符编码（P、S）

## 🚀 部署步骤

### 步骤1：更新代码
```bash
# 确保所有修复代码已提交
git add .
git commit -m "fix: Railway webhook 502 error"
git push origin main
```

### 步骤2：Railway环境变量
在Railway Dashboard中确认以下变量：
```bash
# 必需变量
NODE_ENV=production
BOT_TOKEN=your_bot_token
CLIENT_ID=your_client_id
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
OPENROUTER_API_KEY=your_openrouter_key

# Creem配置
CREEM_API_KEY=your_creem_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
CREEM_PRODUCT_ID_STARTER=prod_xxx
CREEM_PRODUCT_ID_BASIC=prod_xxx
CREEM_PRODUCT_ID_STANDARD=prod_xxx
CREEM_PRODUCT_ID_PREMIUM=prod_xxx

# URL配置（Railway会自动提供PORT）
APP_URL=https://your-railway-app.up.railway.app
```

### 步骤3：Creem Dashboard配置
1. 登录 [Creem Dashboard](https://dashboard.creem.io)
2. 进入 **Settings** → **Webhooks**
3. 设置Webhook URL：
   ```
   https://your-railway-app.up.railway.app/webhook/creem
   ```
4. 设置Webhook Secret（与环境变量相同）
5. 选择事件：
   - ✅ `checkout.completed`
   - ✅ `checkout.failed`

### 步骤4：重新部署
在Railway中点击 **Deploy** 按钮或推送代码自动部署

## 🔍 验证修复

### 1. 检查部署日志
应该看到：
```
🚀 启动AI男友机器人 (Railway生产环境)
✅ 使用Railway端口: 8080
✅ 使用配置的URL: https://your-app.up.railway.app
🌐 Webhook服务器运行在端口 8080
📍 Creem Webhook URL: https://your-app.up.railway.app/webhook/creem
```

### 2. 测试健康检查
访问：`https://your-railway-app.up.railway.app/health`

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2025-06-09T...",
  "service": "AI男友 Webhook服务器",
  "port": 8080
}
```

### 3. 测试支付流程
1. 在Discord中使用 `/recharge starter` 命令
2. 点击支付链接完成支付
3. 应该跳转到成功页面（而不是502错误）
4. 检查Railway日志是否有webhook接收记录

## 🎯 关键修复点

### 端口配置
```javascript
// 修复前：固定端口
const port = 3001;

// 修复后：Railway动态端口
const port = process.env.PORT || process.env.WEBHOOK_PORT || 3001;
```

### 监听地址
```javascript
// 修复前：默认监听
app.listen(port, callback);

// 修复后：指定地址
app.listen(port, '0.0.0.0', callback);
```

### URL配置
```javascript
// 修复前：硬编码URL
success_url: 'https://aiboyfriend.app/payment/success'

// 修复后：动态URL
const baseUrl = process.env.APP_URL || 'https://aiboyfriend-production.up.railway.app';
success_url: `${baseUrl}/payment/success?request_id=${requestId}`
```

## 🚨 故障排除

### 问题：仍然出现502错误
**解决方案**：
1. 检查Creem Dashboard中的Webhook URL是否正确
2. 确认Railway应用域名没有变化
3. 查看Railway部署日志排查错误

### 问题：Webhook接收但处理失败
**解决方案**：
1. 检查数据库连接状态
2. 确认Supabase环境变量正确
3. 查看详细错误日志

### 问题：支付成功但DOL未到账
**解决方案**：
1. 检查webhook事件处理日志
2. 确认用户ID格式正确
3. 验证数据库更新函数

## 🎉 成功标志

修复成功后的支付流程：
1. ✅ Discord充值命令正常响应
2. ✅ Creem支付页面正常加载
3. ✅ 信用卡支付成功完成
4. ✅ 重定向到成功页面（非502）
5. ✅ Railway日志显示webhook接收
6. ✅ 用户收到Discord通知
7. ✅ DOL余额正确更新

## 📞 技术支持

如果问题仍然存在：
1. 📋 收集Railway部署日志
2. 🔍 检查Creem Dashboard配置
3. 📧 联系：changyu6899@gmail.com
4. 🌐 参考：RAILWAY_WEBHOOK_SETUP.md

---

**最后更新**：2025-06-09  
**修复版本**：v1.0.1  
**状态**：✅ 已修复 