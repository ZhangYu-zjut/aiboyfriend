# Railway部署AI男友机器人指南

## 🚀 第一步：获取Railway域名

1. **登录Railway Dashboard**
   ```
   访问：https://railway.app/dashboard
   ```

2. **查看项目域名**
   - 进入你的AI男友项目
   - 点击 Settings → Domains
   - 复制自动分配的域名，格式类似：
     ```
     https://aiboyfriend-production.up.railway.app
     ```

3. **设置环境变量**
   在Railway项目的Variables页面添加：
   ```bash
   APP_URL=https://你的项目域名.up.railway.app
   WEBHOOK_PORT=3001
   ```

## 💳 第二步：配置Creem支付

### 1. 注册Creem账户
- 访问：https://creem.io
- 完成商户注册和验证

### 2. 创建支付产品
在Creem Dashboard中创建4个产品：

```bash
🌟 新手包：$4.50 USD → 450 DOL
💝 基础包：$9.90 USD → 1000 DOL  
💎 标准包：$19.90 USD → 2200 DOL
👑 至尊包：$49.90 USD → 6000 DOL
```

### 3. 配置Webhook
在Creem Dashboard → Webhooks：
```bash
Webhook URL: https://你的Railway域名.up.railway.app/webhook/creem
事件类型: checkout.completed, checkout.failed, payment.completed, payment.failed
```

保存后获得：`CREEM_WEBHOOK_SECRET=whsec_...`

### 4. 获取API密钥和产品ID
```bash
CREEM_API_KEY=sk_live_...
CREEM_PRODUCT_ID_STARTER=prod_...
CREEM_PRODUCT_ID_BASIC=prod_...
CREEM_PRODUCT_ID_STANDARD=prod_...
CREEM_PRODUCT_ID_PREMIUM=prod_...
```

## 🔧 第三步：Railway环境变量配置

在Railway项目的Variables页面添加：

```bash
# Discord配置
BOT_TOKEN=你的Discord机器人Token
CLIENT_ID=你的Discord应用ID

# 数据库配置  
SUPABASE_URL=你的Supabase项目URL
SUPABASE_ANON_KEY=你的Supabase密钥

# AI服务配置
OPENROUTER_API_KEY=你的OpenRouter密钥

# 部署配置
APP_URL=https://你的Railway域名.up.railway.app
WEBHOOK_PORT=3001

# Creem支付配置
CREEM_API_KEY=你的Creem API密钥
CREEM_WEBHOOK_SECRET=你的Webhook密钥
CREEM_PRODUCT_ID_STARTER=新手包产品ID
CREEM_PRODUCT_ID_BASIC=基础包产品ID
CREEM_PRODUCT_ID_STANDARD=标准包产品ID
CREEM_PRODUCT_ID_PREMIUM=至尊包产品ID
```

## 🧪 第四步：测试部署

1. **部署后测试**
   ```bash
   # 测试健康检查
   curl https://你的Railway域名.up.railway.app/health
   
   # 应该返回：
   {"status":"ok","service":"AI男友 Webhook服务器"}
   ```

2. **Discord测试**
   - 机器人应该上线
   - 使用 `/stats` 命令测试
   - 使用 `/shop` 查看商品列表

3. **支付测试**
   - 使用 `/recharge starter` 测试支付流程
   - 检查webhook接收是否正常

## ⚠️ 常见问题

### Q: Railway域名在哪里查看？
A: Railway Dashboard → 项目 → Settings → Domains

### Q: Webhook一直报错怎么办？
A: 确保Railway项目已部署成功，域名可访问

### Q: 支付测试失败？
A: 检查Creem后台的Event Log，确认webhook配置正确

### Q: 环境变量不生效？
A: 修改环境变量后需要重新部署项目

## 📞 技术支持

遇到问题可以：
1. 查看Railway部署日志
2. 检查机器人运行状态  
3. 验证所有环境变量配置
4. 测试webhook连通性

---

配置完成后，你的AI男友机器人就可以在Railway上稳定运行并处理支付了！🎉 