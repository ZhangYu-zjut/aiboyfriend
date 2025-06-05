# 🚀 AI男友机器人 - 一天完成清单

本文档将指导你在一天内完成AI男友Discord机器人的完整部署和上线。

## ⏰ 时间规划（预计6-8小时）

### 阶段1: 基础配置 (1-2小时)
- [x] ✅ 项目已下载并初始化
- [ ] 📝 配置环境变量
- [ ] 🤖 创建Discord机器人
- [ ] 🗄️ 初始化Supabase数据库

### 阶段2: API配置 (1-2小时)  
- [ ] 🧠 获取OpenAI API密钥
- [ ] 🤗 获取HuggingFace API密钥
- [ ] 💳 配置Creem支付（可选）

### 阶段3: 部署测试 (1小时)
- [ ] 🔍 运行测试脚本
- [ ] 🚀 启动机器人
- [ ] ✅ 验证功能正常

### 阶段4: 引流上线 (2-3小时)
- [ ] 📱 制作小红书内容
- [ ] 📊 设置数据追踪
- [ ] 🎯 开始投放引流

---

## 📋 详细执行步骤

### Step 1: 环境变量配置

```bash
# 复制环境变量模板
cp env.example .env

# 编辑配置文件
nano .env
```

必填配置项：
```env
BOT_TOKEN=你的Discord机器人令牌
CLIENT_ID=你的Discord应用程序ID
OPENAI_API_KEY=sk-开头的OpenAI密钥
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_ANON_KEY=eyJ开头的匿名密钥
SUPABASE_SERVICE_ROLE_KEY=eyJ开头的服务角色密钥
HUGGINGFACE_API_KEY=hf_开头的HuggingFace密钥
```

### Step 2: Discord机器人创建

1. 访问 [Discord Developer Portal](https://discord.com/developers/applications)
2. 点击 "New Application" 创建应用
3. 进入 "Bot" 页面，点击 "Add Bot"
4. 复制 Token 到 `.env` 文件的 `BOT_TOKEN`
5. 在 "General Information" 页面复制 Application ID 到 `CLIENT_ID`
6. 在 "Bot" 页面启用以下权限：
   - Send Messages
   - Use Slash Commands  
   - Read Message History
   - Add Reactions
7. 生成邀请链接添加机器人到你的测试服务器

### Step 3: Supabase数据库设置

1. 访问 [Supabase](https://supabase.com) 创建免费账户
2. 创建新项目，等待初始化完成
3. 在项目设置中找到：
   - Project URL → `SUPABASE_URL`
   - API Keys → anon public → `SUPABASE_ANON_KEY`  
   - API Keys → service_role → `SUPABASE_SERVICE_ROLE_KEY`
4. 在 SQL Editor 中执行 `database/init.sql` 文件内容
5. 验证表是否创建成功

### Step 4: OpenAI API配置

1. 访问 [OpenAI Platform](https://platform.openai.com)
2. 创建账户并绑定支付方式
3. 在 API Keys 页面创建新密钥
4. 复制密钥到 `.env` 文件（格式：sk-开头）
5. 设置使用限制避免超支

### Step 5: HuggingFace API配置

1. 访问 [HuggingFace](https://huggingface.co) 创建账户
2. 在 Settings → Access Tokens 创建新token
3. 复制到 `.env` 文件（格式：hf_开头）
4. 免费额度前30k请求，足够测试使用

### Step 6: 运行测试

```bash
# 运行测试脚本验证配置
node scripts/test.js

# 如果测试通过，启动机器人
npm start
```

期望输出：
```
🚀 正在启动AI男友机器人...
🤖 AI男友机器人已上线: YourBot#1234
🔄 开始注册斜杠命令...
✅ 斜杠命令注册成功！
🌐 Webhook服务器运行在端口 3000
⏰ 每日重置将在 2024-01-02 00:00:00 执行
```

### Step 7: 功能验证

在Discord测试服务器中测试：

1. **基础聊天**：直接发送消息给机器人
   - 期望：收到温柔的AI回复
   - 验证：消息消耗30 DOL，亲密度增长

2. **斜杠命令**：
   ```
   /stats - 查看个人数据
   /shop - 查看商店
   /help - 查看帮助
   ```

3. **情感系统**：发送情感化消息
   - 期望：HET值计算正确，达阈值有特殊反应

### Step 8: 支付系统配置（可选）

如果要启用付费功能：

1. 注册 [Creem](https://creem.io) 账户
2. 创建产品和价格
3. 配置webhook URL
4. 测试支付流程

---

## 🎯 引流上线策略

### 小红书投放准备

1. **内容制作**（30分钟）：
   - 使用 `marketing/xiaohongshu_templates.md` 中的模板
   - 制作聊天截图（使用真实对话）
   - 设计封面图（Canva等工具）

2. **账号准备**（15分钟）：
   - 完善小红书个人资料
   - 设置自动回复关键词

3. **发布投放**（30分钟）：
   - 选择高峰时段发布（晚上8-10点）
   - 添加相关话题标签
   - 准备Dou+投放预算（100-200元）

### 数据追踪设置

创建简单的数据追踪表格：

| 日期 | 新增用户 | 活跃用户 | 付费用户 | 收入 | 留存率 |
|------|----------|----------|----------|------|--------|
| 今天 |          |          |          |      |        |

每日更新关键指标，便于快速迭代优化。

---

## ⚠️ 常见问题排查

### 机器人无法启动
- 检查 `.env` 文件是否正确配置
- 验证所有API密钥是否有效
- 查看控制台错误日志

### 斜杠命令不显示
- 确认 CLIENT_ID 配置正确
- 重新邀请机器人到服务器
- 等待Discord缓存更新（最多1小时）

### 数据库连接失败
- 检查Supabase URL和密钥
- 确认已执行初始化SQL
- 验证RLS策略是否正确

### OpenAI API调用失败
- 检查API密钥格式和有效性
- 确认账户有足够余额
- 查看是否触发速率限制

---

## ✅ 完成检查清单

部署完成后，确认以下功能正常：

- [ ] 机器人在Discord服务器中显示在线
- [ ] 可以正常聊天并收到AI回复
- [ ] `/stats` 命令显示正确数据
- [ ] 情感分析和HET计算工作正常
- [ ] 亲密度系统正确增长
- [ ] 支付链接可以正常生成（如果配置）
- [ ] Webhook服务器响应正常
- [ ] 数据库正确记录用户行为

---

## 🎉 恭喜！

如果上述检查全部通过，你的AI男友机器人已经成功上线！

接下来可以：
1. 开始小红书等平台的引流
2. 收集用户反馈进行优化
3. 分析数据调整A/B测试参数
4. 扩展更多功能和人设

�� **开始你的AI男友事业之旅吧！** 

## ✅ 验证测试

### 1. 基础功能测试
- 发送消息："你好，今天心情怎么样？"
- 验证：消息消耗30 DOL，亲密度增长
- 验证：情感分析正常，AI回复符合人设

### 2. 支付流程测试
- 使用 `/shop` 命令查看商店
- 使用 `/topup dol_100` 测试支付链接
- 验证：支付页面正常加载

### 3. 命令测试
- `/stats` - 查看用户数据
- `/help` - 查看帮助信息
- 验证：所有命令正常响应 