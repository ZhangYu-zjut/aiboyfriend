import 'dotenv/config';
import { ProxyConfig } from '../src/config/proxy.js';
import { ProxyAgent } from 'proxy-agent';

console.log('🤖 Discord连接测试工具\n');

// 初始化代理配置
ProxyConfig.setup();

// Discord API端点
const DISCORD_ENDPOINTS = [
  'https://discord.com/api/v10/gateway',
  'https://discord.com/api/v10/applications/@me',
  'https://discord.com',
  'https://canary.discord.com',
  'https://ptb.discord.com'
];

// 测试DNS解析
async function testDNSResolution() {
  console.log('🔍 测试DNS解析...');
  
  try {
    const dns = await import('dns');
    const { promisify } = await import('util');
    const lookup = promisify(dns.lookup);
    
    const domains = ['discord.com', 'canary.discord.com'];
    
    for (const domain of domains) {
      try {
        const result = await lookup(domain);
        console.log(`✅ ${domain} -> ${result.address}`);
      } catch (error) {
        console.log(`❌ ${domain} DNS解析失败: ${error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ DNS测试失败:', error.message);
  }
  console.log('');
}

// 测试直连（无代理）
async function testDirectConnection() {
  console.log('🌐 测试直连（无代理）...');
  
  // 临时清除代理
  const originalProxies = {
    HTTPS_PROXY: process.env.HTTPS_PROXY,
    HTTP_PROXY: process.env.HTTP_PROXY,
    ALL_PROXY: process.env.ALL_PROXY
  };
  
  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;
  delete process.env.ALL_PROXY;
  
  try {
    for (const endpoint of DISCORD_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(8000),
          method: 'HEAD'
        });
        console.log(`✅ ${endpoint} - 直连成功 (${response.status})`);
      } catch (error) {
        console.log(`❌ ${endpoint} - 直连失败: ${error.message}`);
      }
    }
  } finally {
    // 恢复代理设置
    if (originalProxies.HTTPS_PROXY) process.env.HTTPS_PROXY = originalProxies.HTTPS_PROXY;
    if (originalProxies.HTTP_PROXY) process.env.HTTP_PROXY = originalProxies.HTTP_PROXY;
    if (originalProxies.ALL_PROXY) process.env.ALL_PROXY = originalProxies.ALL_PROXY;
  }
  console.log('');
}

// 测试代理连接
async function testProxyConnection() {
  console.log('🔧 测试代理连接...');
  
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) {
    console.log('⚠️  未配置代理');
    return;
  }
  
  console.log(`代理地址: ${proxyUrl}`);
  
  try {
    for (const endpoint of DISCORD_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(15000),
          method: 'HEAD'
        });
        console.log(`✅ ${endpoint} - 代理连接成功 (${response.status})`);
      } catch (error) {
        console.log(`❌ ${endpoint} - 代理连接失败: ${error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ 代理测试失败:', error.message);
  }
  console.log('');
}

// 测试Bot Token有效性
async function testBotToken() {
  console.log('🔑 测试Bot Token...');
  
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || botToken.startsWith('your_')) {
    console.log('⚠️  Bot Token未配置或使用默认值');
    return;
  }
  
  try {
    const response = await fetch('https://discord.com/api/v10/applications/@me', {
      headers: {
        'Authorization': `Bot ${botToken}`
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const appData = await response.json();
      console.log(`✅ Bot Token有效 - 应用: ${appData.name}`);
    } else if (response.status === 401) {
      console.log('❌ Bot Token无效');
    } else {
      console.log(`⚠️  Bot Token测试返回状态码: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Bot Token测试失败:', error.message);
  }
  console.log('');
}

// 检查系统和网络环境
function checkSystemEnvironment() {
  console.log('💻 检查系统环境...');
  
  console.log(`操作系统: ${process.platform}`);
  console.log(`Node.js版本: ${process.version}`);
  console.log(`代理配置: ${process.env.HTTPS_PROXY || '未配置'}`);
  console.log('');
}

// 提供解决方案
function provideSolutions() {
  console.log('🛠️  解决方案建议:\n');
  
  console.log('📋 方案1: 代理配置优化');
  console.log('1. 确保Clash开启全局模式或规则模式');
  console.log('2. 检查discord.com是否在代理规则中');
  console.log('3. 尝试更换代理节点');
  console.log('4. 重启Clash/ClashX');
  
  console.log('\n🌍 方案2: 手动测试连接');
  console.log('1. 在浏览器中访问 https://discord.com');
  console.log('2. 使用curl测试: curl -v https://discord.com/api/v10/gateway');
  console.log('3. 检查终端网络代理设置');
  
  console.log('\n☁️  方案3: 云端部署（推荐）');
  console.log('1. 使用国外VPS部署机器人');
  console.log('2. 推荐服务商: AWS, DigitalOcean, Vultr');
  console.log('3. 使用GitHub Actions自动部署');
}

// 主函数
async function main() {
  try {
    checkSystemEnvironment();
    await testDNSResolution();
    await testDirectConnection();
    await testProxyConnection();
    await testBotToken();
    
    console.log('📊 Discord连接测试完成\n');
    provideSolutions();
    
  } catch (error) {
    console.error('Discord测试过程中出错:', error);
  }
}

main(); 