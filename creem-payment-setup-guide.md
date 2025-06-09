# AI男友 Creem支付集成设置指南

本指南将帮助你完成AI男友项目与Creem支付系统的集成，实现用户DOL充值功能。

## 📋 功能特性

- ✅ 支持信用卡支付（Visa、MasterCard等）
- ✅ 4档充值套餐：$4.5-$49.9
- ✅ 自动DOL余额更新
- ✅ 支付成功/失败通知
- ✅ 完整的支付记录
- ✅ 安全的webhook验证
- ✅ 中英文双语支持

## 🛠️ 设置步骤

### 1. Creem账户设置

1. 访问 [Creem.io](https://creem.io) 注册账户
2. 完成商户认证流程
3. 获取API密钥和Webhook密钥

### 2. 创建商品

根据[Creem快速入门文档](https://docs.creem.io/quickstart)，在Creem后台创建4个商品：

```
🌟 新手包
- 名称: AI男友DOL新手包
- 价格: $4.50
- 描述: 450 DOL - 初次体验

💝 基础包
- 名称: AI男友DOL基础包
- 价格: $9.90
- 描述: 1000 DOL - 畅聊一周

💎 标准包
- 名称: AI男友DOL标准包
- 价格: $19.90
- 描述: 2200 DOL - 超值优惠10%

👑 至尊包
- 名称: AI男友DOL至尊包
- 价格: $49.90
- 描述: 6000 DOL - 豪华享受20%
```

### 3. 配置环境变量

在 `.env` 文件中添加以下配置：

```env
# Creem支付配置
CREEM_API_KEY=你的_creem_api_密钥
CREEM_WEBHOOK_SECRET=你的_webhook_密钥

# Creem商品ID配置
CREEM_PRODUCT_ID_STARTER=prod_xxxxx  # 新手包商品ID
CREEM_PRODUCT_ID_BASIC=prod_xxxxx    # 基础包商品ID
CREEM_PRODUCT_ID_STANDARD=prod_xxxxx # 标准包商品ID
CREEM_PRODUCT_ID_PREMIUM=prod_xxxxx  # 至尊包商品ID

# 应用配置
APP_URL=https://你的域名.com
WEBHOOK_PORT=3001
```

### 4. 设置Webhook URL

在Creem后台设置Webhook URL：
```
https://你的域名.com:3001/webhook/creem
```

或者如果你在本地测试，可以使用ngrok：
```bash
npx ngrok http 3001
# 然后使用生成的URL，例如：
# https://abcd1234.ngrok.io/webhook/creem
```

### 5. 启动服务

使用集成启动脚本：
```bash
node start-payment-bot.js
```

或者分别启动：
```bash
# 终端1：启动机器人
npm start

# 终端2：启动webhook服务器（如果需要单独启动）
node src/services/webhook.js
```

## 🧪 测试流程

### 1. 测试充值命令
```
/recharge
```
应该显示4个充值套餐选项

### 2. 测试具体套餐
```
/recharge starter
```
应该生成支付链接和按钮

### 3. 测试Webhook
- 完成一笔测试支付
- 检查用户是否收到成功通知
- 验证DOL余额是否增加

## 📱 用户使用流程

1. **用户DOL不足时**：
   - 系统提示余额不足
   - 引导使用 `/recharge` 命令

2. **选择充值套餐**：
   - 使用命令或点击按钮
   - 查看价格和DOL数量

3. **进行支付**：
   - 点击"立即充值"按钮
   - 跳转到Creem支付页面
   - 输入信用卡信息完成支付

4. **支付完成**：
   - 收到支付成功通知
   - DOL自动到账（1分钟内）
   - 可以继续聊天

## 💳 支付说明展示

每个充值界面都会显示：

```
💳 支付方式
支持信用卡付款、若没有信用卡，可以联系开发者进行微信或者支付宝支付

📧 联系方式  
有任何问题，请联系：changyu6899@gmail.com
```

## 🔧 故障排除

### 常见问题

1. **Webhook未收到**
   - 检查URL配置是否正确
   - 确认防火墙端口3001开放
   - 验证SSL证书（生产环境）

2. **支付后DOL未到账**
   - 检查webhook日志
   - 验证用户ID匹配
   - 查看数据库事件记录

3. **支付链接无法生成**
   - 检查Creem API密钥
   - 验证商品ID配置
   - 查看错误日志

### 调试命令

```bash
# 查看webhook日志
tail -f webhook.log

# 测试Creem API连接
curl -H "x-api-key: 你的API密钥" https://api.creem.io/v1/products

# 检查环境变量
node -e "console.log(process.env.CREEM_API_KEY ? '已配置' : '未配置')"
```

## 📊 支付数据统计

系统会自动记录：
- 充值发起事件 (`recharge_initiated`)
- 支付完成事件 (`payment_completed`)
- 支付失败事件 (`payment_failed`)

可以通过数据库查询获取用户充值统计。

## 🔒 安全考虑

1. **Webhook签名验证**：所有webhook请求都会验证签名
2. **HTTPS要求**：生产环境必须使用HTTPS
3. **环境变量保护**：敏感信息不要提交到代码库
4. **API密钥轮换**：定期更换API密钥

## 📞 技术支持

如遇到技术问题：
1. 查看本文档的故障排除部分
2. 检查项目issue和文档
3. 联系开发者：changyu6899@gmail.com

---

**配置完成后，用户就可以在DOL不足时使用 `/recharge` 命令进行充值，享受更好的AI男友聊天体验！** 💕 