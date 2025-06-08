# 每日DOL重置配置说明

## 📋 配置参数详解

在 `src/config/settings.js` 文件中，每日DOL重置功能的配置位于 `GAME_CONFIG.DOL.DAILY_RESET` 对象中：

```javascript
DAILY_RESET: {
  ENABLED: true,                // 是否开启每日DOL重置功能
  RESET_AMOUNT: 100,            // 每日重置到多少DOL
  RESET_THRESHOLD: 100,         // 只有DOL低于此值的用户才重置
  RESET_TIME: '00:00',          // 重置时间 (24小时制)
  TIMEZONE: 'Asia/Shanghai'     // 时区设置
}
```

### 配置参数说明

#### `ENABLED` - 功能开关
- **类型**: Boolean
- **默认值**: `true`
- **说明**: 控制是否启用每日DOL重置功能
- **用法**:
  - `true`: 启用功能，每日凌晨自动重置用户DOL
  - `false`: 禁用功能，完全停止DOL重置

#### `RESET_AMOUNT` - 重置金额
- **类型**: Number
- **默认值**: `100`
- **说明**: 每日重置时，将用户DOL补充到的目标金额
- **建议值**:
  - `50-200`: 适中的免费额度
  - `100`: 当前推荐值，可支持3-4条聊天

#### `RESET_THRESHOLD` - 重置阈值
- **类型**: Number
- **默认值**: `100`
- **说明**: 只有DOL余额低于此值的用户才会被重置
- **逻辑**: 防止给高余额付费用户重复发放免费DOL
- **建议**: 通常设置为与 `RESET_AMOUNT` 相同或略低

#### `RESET_TIME` - 重置时间
- **类型**: String
- **默认值**: `"00:00"`
- **说明**: 每日执行重置的时间（24小时制）
- **格式**: `"HH:MM"`
- **示例**:
  - `"00:00"`: 凌晨12点
  - `"06:00"`: 早上6点
  - `"23:30"`: 晚上11点30分

#### `TIMEZONE` - 时区设置
- **类型**: String
- **默认值**: `"Asia/Shanghai"`
- **说明**: 用于计算重置时间的时区
- **常用值**:
  - `"Asia/Shanghai"`: 北京时间
  - `"UTC"`: 世界标准时间
  - `"America/New_York"`: 纽约时间

## 🎯 使用场景和建议

### 场景1: 标准配置（推荐）
```javascript
DAILY_RESET: {
  ENABLED: true,
  RESET_AMOUNT: 100,
  RESET_THRESHOLD: 100,
  RESET_TIME: '00:00',
  TIMEZONE: 'Asia/Shanghai'
}
```
- **适用**: 大多数情况
- **效果**: 每日凌晨给DOL不足100的用户补充到100

### 场景2: 更慷慨的免费额度
```javascript
DAILY_RESET: {
  ENABLED: true,
  RESET_AMOUNT: 200,      // 更多免费DOL
  RESET_THRESHOLD: 150,   // 更高的补充阈值
  RESET_TIME: '06:00',    // 早上6点重置
  TIMEZONE: 'Asia/Shanghai'
}
```
- **适用**: 想要提供更多免费体验
- **效果**: 早上6点给DOL不足150的用户补充到200

### 场景3: 保守的免费额度
```javascript
DAILY_RESET: {
  ENABLED: true,
  RESET_AMOUNT: 50,       // 较少的免费DOL
  RESET_THRESHOLD: 50,    // 较低的补充阈值
  RESET_TIME: '00:00',
  TIMEZONE: 'Asia/Shanghai'
}
```
- **适用**: 希望用户更多付费使用
- **效果**: 每日凌晨给DOL不足50的用户补充到50

### 场景4: 完全禁用
```javascript
DAILY_RESET: {
  ENABLED: false,         // 关闭功能
  // 其他参数不影响
}
```
- **适用**: 纯付费模式，不提供免费DOL
- **效果**: 完全停止DOL重置

## 🔧 配置修改方法

### 1. 修改配置文件
编辑 `src/config/settings.js` 文件中的 `DAILY_RESET` 配置。

### 2. 重启机器人
修改配置后需要重启Discord机器人使配置生效。

### 3. 验证配置
运行测试脚本验证配置：
```bash
node test-daily-reset-config.js
```

## 📊 配置效果预览

### 当前配置效果
基于默认配置 (重置金额100, 阈值100)：

| 用户当前DOL | 是否重置 | 重置后DOL | 增加DOL |
|-------------|----------|-----------|---------|
| 0           | ✅ 是    | 100       | 100     |
| 50          | ✅ 是    | 100       | 50      |
| 99          | ✅ 是    | 100       | 1       |
| 100         | ❌ 否    | 100       | 0       |
| 150         | ❌ 否    | 150       | 0       |
| 500         | ❌ 否    | 500       | 0       |

## ⚠️ 注意事项

### 1. 配置合理性
- `RESET_AMOUNT` 应该 ≥ `RESET_THRESHOLD`
- 两个值都应该 > 0
- 测试脚本会自动检查这些条件

### 2. 数据库兼容性
- 修改配置无需更新数据库结构
- 旧的硬编码值已被移除，现在完全使用配置

### 3. 重启需求
- 配置修改后必须重启机器人
- 功能开关可以实时生效

### 4. 付费用户保护
- 设置合理的阈值可以避免给付费用户重复发放免费DOL
- 建议阈值不要设置得太高

## 🎛️ 快速调整指南

### 增加免费额度
```javascript
RESET_AMOUNT: 150,      // 从100改为150
RESET_THRESHOLD: 150    // 同步调整阈值
```

### 减少免费额度
```javascript
RESET_AMOUNT: 50,       // 从100改为50
RESET_THRESHOLD: 50     // 同步调整阈值
```

### 临时禁用功能
```javascript
ENABLED: false          // 快速关闭功能
```

### 更改重置时间
```javascript
RESET_TIME: '06:00'     // 改为早上6点重置
```

通过这些配置，你可以灵活控制每日DOL重置功能，满足不同的运营需求！ 