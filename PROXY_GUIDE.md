# 🌐 AI男友机器人 - 网络代理配置指南

## 📋 问题诊断

### 网络连接测试工具

```bash
# 1. 基础网络诊断
node scripts/network-test.js

# 2. 代理自动检测和配置
node scripts/proxy-manager.js

# 3. Discord连接专项测试
node scripts/discord-test.js

# 4. 代理修复验证
node scripts/test-proxy-fix.js

# 5. 离线功能测试
node scripts/test-offline.js
```

## 🔧 代理配置方案

### 方案1: Clash/ClashX (推荐)

1. **安装Clash**
   - macOS: 安装ClashX
   - Windows: 安装Clash for Windows
   - Linux: 安装clash

2. **配置设置**
   ```bash
   # 自动配置脚本
   ./setup-proxy.sh
   
   # 手动配置 .env
   HTTPS_PROXY=http://127.0.0.1:7890
   HTTP_PROXY=http://127.0.0.1:7890
   ```

3. **验证连接**
   ```bash
   # 测试代理连接
   curl --proxy http://127.0.0.1:7890 https://discord.com/api/v10/gateway
   ```

### 方案2: 系统代理

1. **开启全局模式**
   - ClashX: 开启 "设置为系统代理"
   - 或使用TUN模式 (推荐)

2. **验证系统代理**
   ```bash
   # 检查环境变量
   echo $HTTPS_PROXY
   echo $HTTP_PROXY
   ```

### 方案3: 手动环境变量

```bash
# 临时设置
export HTTPS_PROXY=http://127.0.0.1:7890
export HTTP_PROXY=http://127.0.0.1:7890

# 持久化设置 (添加到 ~/.zshrc 或 ~/.bashrc)
echo 'export HTTPS_PROXY=http://127.0.0.1:7890' >> ~/.zshrc
echo 'export HTTP_PROXY=http://127.0.0.1:7890' >> ~/.zshrc
```

## 🚀 启动机器人

### 快速启动
```bash
# 使用优化启动脚本 (推荐)
./start-bot-optimized.sh

# 或标准启动
npm start
```

### 启动前检查清单
- [ ] Clash/代理软件已启动
- [ ] 代理端口7890可访问
- [ ] Discord API可连接
- [ ] Bot Token有效
- [ ] 环境变量已配置

## 🛠️ 故障排除

### 常见问题

#### 1. Discord连接超时
```
Error: Connect Timeout Error (discord.com:443, timeout: 10000ms)
```

**解决方案:**
1. 检查代理软件是否运行
2. 尝试开启TUN模式
3. 验证代理规则包含discord.com
4. 重启代理软件

#### 2. 代理连接失败
```
Error: fetch failed
```

**解决方案:**
1. 确认代理端口正确 (默认7890)
2. 检查代理软件配置
3. 尝试手动设置环境变量
4. 使用curl测试代理连接

#### 3. Bot Token无效
```
401 Unauthorized
```

**解决方案:**
1. 检查.env文件中的BOT_TOKEN
2. 确认Token没有空格或特殊字符
3. 在Discord开发者平台重新生成Token

### 网络环境检查

```bash
# DNS解析测试
nslookup discord.com

# 直连测试
curl -v --connect-timeout 5 https://discord.com

# 代理测试
curl -v --proxy http://127.0.0.1:7890 https://discord.com

# 端口检测
nc -zv 127.0.0.1 7890
```

## ☁️ 云端部署方案

### 推荐VPS服务商
- **AWS EC2** - 稳定可靠
- **DigitalOcean** - 简单易用
- **Vultr** - 性价比高
- **Linode** - 网络优秀

### 部署步骤
1. 创建海外VPS实例
2. 配置Node.js环境
3. 克隆项目代码
4. 配置环境变量
5. 使用PM2管理进程

```bash
# VPS部署示例
git clone https://github.com/your-repo/aiboyfriend.git
cd aiboyfriend
npm install
cp env.example .env
# 编辑.env配置

# 使用PM2启动
npm install -g pm2
pm2 start src/index.js --name aiboyfriend
pm2 save
pm2 startup
```

## 📊 监控和维护

### 日志查看
```bash
# PM2日志
pm2 logs aiboyfriend

# 系统资源
pm2 monit

# 重启服务
pm2 restart aiboyfriend
```

### 定期维护
- 检查代理连接状态
- 监控机器人在线状态
- 更新依赖包
- 备份数据库

## 🆘 获取帮助

### 问题报告
如果遇到问题，请提供以下信息：
1. 操作系统版本
2. Node.js版本
3. 代理软件和版本
4. 错误日志
5. 网络测试结果

### 联系方式
- 提交Issue到GitHub仓库
- 查看项目文档
- 社区讨论群

---

**注意:** 此项目仅供学习和研究使用，请遵守当地法律法规和Discord服务条款。 