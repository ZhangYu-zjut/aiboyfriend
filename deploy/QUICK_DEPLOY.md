# 快速云端部署

## 方法1: 手动部署
1. 上传 deploy/deploy.sh 到你的VPS
2. 执行: chmod +x deploy.sh && ./deploy.sh

## 方法2: Docker部署
1. 上传项目文件到VPS
2. 执行: docker-compose -f deploy/docker-compose.yml up -d

## 方法3: GitHub Actions自动部署
1. 在GitHub仓库设置中配置Secrets:
   - VPS_HOST: 你的服务器IP
   - VPS_USERNAME: SSH用户名
   - VPS_SSH_KEY: SSH私钥
2. 推送代码到main分支自动部署

## 环境变量配置
复制并编辑 .env 文件:
- BOT_TOKEN=你的Discord机器人Token
- CLIENT_ID=你的Discord应用ID
- OPENROUTER_API_KEY=你的OpenRouter API密钥
- SUPABASE_URL=你的Supabase项目URL
- SUPABASE_ANON_KEY=你的Supabase匿名密钥
