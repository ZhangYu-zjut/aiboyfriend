import 'dotenv/config';
import { ProxyConfig } from '../src/config/proxy.js';

// 初始化代理配置
ProxyConfig.setup();

console.log('🔍 网络连接诊断工具\n');

// 测试基础网络连接
async function testBasicConnection() {
  console.log('1. 测试基础网络连接...');
  
  const testUrls = [
    'https://www.google.com',
    'https://www.baidu.com',
    'https://api.openai.com',
    'https://discord.com'
  ];
  
  for (const url of testUrls) {
    try {
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000),
        method: 'HEAD'
      });
      console.log(`✅ ${url} - 连接成功 (${response.status})`);
    } catch (error) {
      console.log(`❌ ${url} - 连接失败: ${error.message}`);
    }
  }
}

// 测试Discord API
async function testDiscordAPI() {
  console.log('\n2. 测试Discord API连接...');
  
  try {
    const response = await fetch('https://discord.com/api/v10/gateway', {
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Discord API连接成功');
      console.log(`   网关地址: ${data.url}`);
    } else {
      console.log(`❌ Discord API连接失败，状态码: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Discord API连接失败: ${error.message}`);
    
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message.includes('timeout')) {
      console.log('\n💡 连接超时，这通常表示：');
      console.log('   - 网络访问被限制（防火墙/GFW）');
      console.log('   - 需要配置代理服务器');
      console.log('   - DNS解析问题');
    }
  }
}

// 检查代理配置
function checkProxyConfig() {
  console.log('\n3. 检查代理配置...');
  
  const proxyVars = ['HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY', 'USE_LOCAL_PROXY'];
  let hasProxy = false;
  
  for (const varName of proxyVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
      hasProxy = true;
    }
  }
  
  if (!hasProxy) {
    console.log('ℹ️  未检测到代理配置');
    console.log('\n如果Discord连接失败，可以尝试以下代理设置：');
    console.log('   # Clash代理');
    console.log('   HTTPS_PROXY=http://127.0.0.1:7890');
    console.log('   \n   # Shadowsocks代理');
    console.log('   HTTPS_PROXY=http://127.0.0.1:1087');
    console.log('   \n   # SOCKS5代理');
    console.log('   ALL_PROXY=socks5://127.0.0.1:1080');
  }
}

// 检查环境变量
function checkEnvironmentVars() {
  console.log('\n4. 检查环境变量...');
  
  const requiredVars = ['BOT_TOKEN', 'CLIENT_ID'];
  let allSet = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.startsWith('your_')) {
      console.log(`❌ ${varName}: 未设置或使用默认值`);
      allSet = false;
    } else {
      const maskedValue = value.substring(0, 8) + '...';
      console.log(`✅ ${varName}: ${maskedValue}`);
    }
  }
  
  return allSet;
}

// 提供解决方案
function provideSolutions() {
  console.log('\n🛠️  解决方案建议:\n');
  
  console.log('📋 方案1: 配置代理（推荐）');
  console.log('   1. 启动本地代理软件（Clash/Shadowsocks等）');
  console.log('   2. 在.env文件中添加代理设置：');
  console.log('      HTTPS_PROXY=http://127.0.0.1:7890');
  console.log('   3. 重新启动机器人');
  
  console.log('\n🌐 方案2: 使用VPS部署');
  console.log('   1. 在海外VPS（如AWS/DigitalOcean）部署');
  console.log('   2. 确保VPS可以正常访问Discord');
  console.log('   3. 使用PM2等工具管理进程');
  
  console.log('\n🔧 方案3: 本地测试替代');
  console.log('   1. 使用测试模式跳过Discord连接');
  console.log('   2. 先开发其他功能（AI、数据库等）');
  console.log('   3. 部署时再解决网络问题');
}

// 主函数
async function runDiagnosis() {
  try {
    await testBasicConnection();
    await testDiscordAPI();
    checkProxyConfig();
    const varsOk = checkEnvironmentVars();
    
    console.log('\n📊 诊断完成\n');
    
    if (!varsOk) {
      console.log('⚠️  请先配置必要的环境变量');
    }
    
    provideSolutions();
    
  } catch (error) {
    console.error('诊断过程中出错:', error);
  }
}

runDiagnosis(); 