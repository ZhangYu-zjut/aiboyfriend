# 🗄️ Supabase数据库设置指南

## 🚨 **当前问题**

根据Railway错误日志，发现以下数据库问题：

1. ❌ `get_user_stats` 数据库函数不存在
2. ❌ `profiles` 表缺少 `ab_group` 和 `total_messages` 列
3. ❌ 表结构不完整，导致查询失败

## 🛠️ **修复步骤**

### 步骤 1：登录 Supabase Dashboard

1. 访问 [https://supabase.com](https://supabase.com)
2. 登录你的账户
3. 选择你的AI男友项目

### 步骤 2：打开 SQL Editor

1. 在左侧菜单中点击 **"SQL Editor"**
2. 点击 **"New query"** 创建新查询

### 步骤 3：执行数据库初始化脚本

将 `database/init-schema.sql` 中的全部内容复制粘贴到SQL Editor中，然后点击 **"RUN"** 执行。

**脚本位置**: `database/init-schema.sql`

### 步骤 4：验证表结构

执行以下查询来检查表结构是否正确：

```sql
-- 检查 profiles 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- 检查 sessions 表结构  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sessions';

-- 检查函数是否存在
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_stats', 'update_profile');
```

### 步骤 5：测试数据库函数

```sql
-- 测试 get_user_stats 函数
SELECT * FROM get_user_stats('test_user_123');

-- 测试 update_profile 函数
SELECT update_profile('test_user_123', 100, 5);
```

## 📋 **预期的表结构**

### `profiles` 表
| 列名 | 类型 | 默认值 | 说明 |
|------|------|---------|------|
| id | SERIAL | AUTO | 主键 |
| user_id | VARCHAR(20) | - | Discord用户ID |
| intimacy | INTEGER | 0 | 亲密度 |
| dol | INTEGER | 300 | DOL余额 |
| ab_group | VARCHAR(1) | 'A' | A/B测试分组 |
| total_messages | INTEGER | 0 | 消息总数 |
| created_at | TIMESTAMP | NOW() | 创建时间 |
| updated_at | TIMESTAMP | NOW() | 更新时间 |

### `sessions` 表
| 列名 | 类型 | 默认值 | 说明 |
|------|------|---------|------|
| id | SERIAL | AUTO | 主键 |
| user_id | VARCHAR(20) | - | Discord用户ID |
| msg | TEXT | - | 用户消息 |
| bot_reply | TEXT | - | 机器人回复 |
| tokens | INTEGER | 0 | Token使用量 |
| het | INTEGER | 0 | 高情感Token |
| emotion_score | FLOAT | 0 | 情感得分 |
| created_at | TIMESTAMP | NOW() | 创建时间 |

### `ab_events` 表
| 列名 | 类型 | 默认值 | 说明 |
|------|------|---------|------|
| id | SERIAL | AUTO | 主键 |
| user_id | VARCHAR(20) | - | Discord用户ID |
| event_type | VARCHAR(50) | - | 事件类型 |
| group_name | VARCHAR(1) | - | 测试组别 |
| metadata | JSONB | {} | 事件元数据 |
| created_at | TIMESTAMP | NOW() | 创建时间 |

## 🔧 **数据库函数说明**

### `get_user_stats(user_id)`
**功能**: 获取用户完整统计数据
**返回**: 用户档案 + 聊天统计信息

### `update_profile(user_id, dol_delta, intimacy_delta)`
**功能**: 原子性更新用户档案
**参数**: 
- `user_id`: 用户ID
- `dol_delta`: DOL变化量（可正可负）
- `intimacy_delta`: 亲密度变化量（可正可负）

## 🚀 **验证修复是否成功**

### 方法1：使用调试脚本
```bash
npm run debug
```

### 方法2：查看Railway日志
1. 登录Railway Dashboard
2. 查看部署日志
3. 确认不再有数据库错误

### 方法3：在Discord中测试
```
/stats    # 应该能正常显示用户数据
/leaderboard    # 应该能正常显示排行榜
```

## ⚠️ **常见问题**

### 问题1：RLS策略阻止访问
**症状**: 查询返回空结果但无错误
**解决**: 在SQL Editor中执行：
```sql
-- 暂时禁用RLS（不推荐生产环境）
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
```

### 问题2：权限不足
**症状**: "permission denied" 错误
**解决**: 确保使用 `SUPABASE_SERVICE_ROLE_KEY` 而不是 `SUPABASE_ANON_KEY`

### 问题3：函数执行失败
**症状**: 函数调用返回错误
**解决**: 
1. 检查函数定义是否正确
2. 确保所有依赖的表和列都存在
3. 查看Supabase日志获取详细错误信息

## 🔄 **如果仍有问题**

1. **删除所有表重新创建**:
```sql
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS ab_events CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```

2. **重新执行完整初始化脚本**

3. **检查环境变量**:
   - `SUPABASE_URL` 格式正确
   - `SUPABASE_SERVICE_ROLE_KEY` 权限充足

4. **联系支持**:
   - 提供Supabase项目URL
   - 提供具体错误信息
   - 提供Railway部署日志

## 📞 **技术支持**

如果按照上述步骤仍无法解决问题，请提供：

1. Supabase SQL Editor的执行截图
2. Railway最新的错误日志
3. 环境变量配置确认（隐去敏感信息）

---

*修复指南更新时间: 2024年1月*
*适用版本: AI男友Discord机器人 v1.0* 