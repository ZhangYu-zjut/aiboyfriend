# Creem Webhook 数据格式问题修复总结

## 问题描述

用户支付成功后，数据库余额没有更新，服务端显示：
```
❌ 无法确定事件类型，将记录原始数据用于调试
✅ 最终事件类型: "undefined"
```

## 根本原因分析

### 1. 数据格式不匹配
真实的Creem webhook数据格式与我们的测试数据格式完全不同：

**我们原来预期的格式**：
```json
{
  "event_type": "checkout.completed",
  "data": {
    "request_id": "...",
    "metadata": { ... }
  }
}
```

**真实Creem格式**：
```json
{
  "id": "evt_289KlnuTgvrltUB9TGPRsz",
  "eventType": "checkout.completed",
  "created_at": 1749479795591,
  "object": {
    "request_id": "aiboyfriend_1113108345998549102_1749479704662",
    "status": "completed",
    "metadata": {
      "discord_user_id": "1113108345998549102",
      "package_key": "starter",
      "dol_amount": "450"
    },
    "order": {
      "amount": 450
    }
  }
}
```

### 2. 关键差异
- **事件类型字段**: `eventType` 而不是 `event_type`
- **数据字段**: `object` 而不是 `data`
- **数据结构**: 完全嵌套的层次结构

## 修复方案

### 1. 更新事件类型检测逻辑

```javascript
// 兼容不同的Creem webhook格式
let actualEventType;
let actualData;

// 优先使用真实Creem格式：eventType + object
if (eventType && object) {
  actualEventType = eventType;
  actualData = object;
  console.log(`✅ 使用真实Creem格式: eventType=${eventType}, 数据在object中`);
}
// 备用格式：event_type + data
else if (event_type && data) {
  actualEventType = event_type;
  actualData = data;
  console.log(`✅ 使用测试格式: event_type=${event_type}, 数据在data中`);
}
```

### 2. 增强支付数据处理

```javascript
// 提取关键字段 - 支持真实Creem格式
let request_id, metadata, amount, userId, packageKey, dolAmount;

// 真实Creem格式: object字段包含支付数据
if (webhookData.request_id) {
  request_id = webhookData.request_id;
  metadata = webhookData.metadata;
  amount = webhookData.amount || (webhookData.order && webhookData.order.amount);
  console.log('✅ 检测到真实Creem格式，从object层级提取数据');
}

// 从request_id中提取用户信息（备用方案）
if (!metadata && request_id && request_id.includes('aiboyfriend_')) {
  const parts = request_id.split('_');
  if (parts.length >= 2) {
    userId = parts[1];
    // 根据金额推断套餐...
  }
}
```

### 3. 修复Webhook中间件

```javascript
// 全局JSON中间件，但排除webhook路径
app.use('/webhook/creem', (req, res, next) => {
  // 为webhook路径使用原始请求体
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    req.body = JSON.parse(req.rawBody.toString('utf8'));
    next();
  });
});
```

## 测试验证

### 成功的cURL测试
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"id":"evt_test_12345","eventType":"checkout.completed",...}' \
  http://localhost:3001/webhook/creem
```

### 测试结果
```
✅ 使用真实Creem格式: eventType=checkout.completed, 数据在object中
✅ 从metadata成功提取用户信息
👤 用户ID: 1113108345998549102
📦 套餐: starter
💎 DOL数量: 450
💰 支付金额: 450
✅ 数据库函数更新成功
✅ 支付成功通知已发送给用户 1113108345998549102
✅ 用户 1113108345998549102 充值成功: +450 DOL
```

## 修复效果

1. ✅ **正确识别真实Creem数据格式**
2. ✅ **成功提取用户和支付信息**
3. ✅ **数据库余额正确更新**（20 DOL → 470 DOL）
4. ✅ **Discord通知发送成功**
5. ✅ **支付流程完整工作**

## 兼容性保证

修复后的代码同时支持：
- ✅ 真实Creem格式（`eventType` + `object`）
- ✅ 测试格式（`event_type` + `data`）
- ✅ 从request_id备用提取用户信息
- ✅ 根据金额自动推断套餐类型

## 关键文件修改

1. **src/services/webhook.js** - 事件类型检测和中间件配置
2. **src/services/payment.js** - 支付数据处理逻辑
3. **test-simple-creem.js** - 真实格式测试脚本

## 结论

通过分析真实的Creem webhook数据格式并相应调整我们的处理逻辑，成功解决了支付成功后数据库不更新的问题。现在系统能够正确处理真实的Creem支付webhook，确保用户充值后DOL余额正确更新并发送通知。 