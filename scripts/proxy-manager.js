import 'dotenv/config';
import { ProxyConfig } from '../src/config/proxy.js';
import net from 'net';

console.log('🌐 AI男友机器人 - 代理管理器\n');

// 常见代理配置
const COMMON_PROXIES = [
  { name: 'Clash', url: 'http://127.0.0.1:7890', type: 'http' },
  { name: 'ClashX', url: 'http://127.0.0.1:7890', type: 'http' },
  { name: 'Shadowsocks', url: 'http://127.0.0.1:1087', type: 'http' },
  { name: 'V2Ray', url: 'http://127.0.0.1:1081', type: 'http' },
  { name: 'SOCKS5', url: 'socks5://127.0.0.1:1080', type: 'socks5' },
  { name: 'Surge', url: 'http://127.0.0.1:6152', type: 'http' }
];

// 检查端口是否开放
function checkPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// 测试代理连接
async function testProxyConnection(proxyUrl) {
  try {
    // 解析代理URL
    const url = new URL(proxyUrl);
    const host = url.hostname;
    const port = parseInt(url.port);
    
    // 检查端口是否开放
    const isPortOpen = await checkPort(host, port);
    if (!isPortOpen) {
      return { success: false, error: '端口未开放' };
    }
    
    // 尝试通过代理访问测试URL
    const testUrl = 'https://httpbin.org/ip';
    const response = await fetch(testUrl, {
      signal: AbortSignal.timeout(10000),
      // 注意：Node.js的fetch不直接支持代理，这里只是示例
      // 实际使用时需要配置环境变量
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, ip: data.origin };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 自动检测可用代理
async function detectAvailableProxies() {
  console.log('🔍 自动检测本地代理服务...\n');
  
  const availableProxies = [];
  
  for (const proxy of COMMON_PROXIES) {
    try {
      const url = new URL(proxy.url);
      const host = url.hostname;
      const port = parseInt(url.port);
      
      console.log(`检测 ${proxy.name} (${proxy.url})...`);
      
      const isPortOpen = await checkPort(host, port, 2000);
      
      if (isPortOpen) {
        console.log(`✅ ${proxy.name} - 端口 ${port} 已开放`);
        availableProxies.push(proxy);
      } else {
        console.log(`❌ ${proxy.name} - 端口 ${port} 未开放`);
      }
    } catch (error) {
      console.log(`❌ ${proxy.name} - 检测失败: ${error.message}`);
    }
  }
  
  console.log('');
  return availableProxies;
}

// 测试代理功能
async function testProxyFunctionality(proxyUrl) {
  console.log(`🧪 测试代理功能: ${proxyUrl}`);
  
  // 临时设置代理环境变量
  const originalProxy = process.env.HTTPS_PROXY;
  process.env.HTTPS_PROXY = proxyUrl;
  
  try {
    // 测试国外网站访问
    const testSites = [
      'https://httpbin.org/ip',
      'https://api.github.com',
      'https://discord.com/api/v10/gateway'
    ];
    
    for (const site of testSites) {
      try {
        const response = await fetch(site, {
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          console.log(`✅ ${site} - 访问成功`);
          if (site.includes('httpbin.org/ip')) {
            const data = await response.json();
            console.log(`   IP地址: ${data.origin}`);
          }
        } else {
          console.log(`⚠️  ${site} - HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${site} - ${error.message}`);
      }
    }
  } finally {
    // 恢复原始代理设置
    if (originalProxy) {
      process.env.HTTPS_PROXY = originalProxy;
    } else {
      delete process.env.HTTPS_PROXY;
    }
  }
  
  console.log('');
}

// 生成代理配置
function generateProxyConfig(selectedProxy) {
  console.log('📝 生成代理配置...\n');
  
  const config = [];
  config.push('# 代理配置');
  config.push(`HTTPS_PROXY=${selectedProxy.url}`);
  config.push(`HTTP_PROXY=${selectedProxy.url}`);
  
  if (selectedProxy.type === 'socks5') {
    config.push(`ALL_PROXY=${selectedProxy.url}`);
  }
  
  console.log('将以下配置添加到 .env 文件:');
  console.log('```');
  config.forEach(line => console.log(line));
  console.log('```\n');
  
  return config;
}

// 交互式代理选择
async function interactiveProxySelection(availableProxies) {
  if (availableProxies.length === 0) {
    console.log('❌ 未检测到可用的代理服务\n');
    console.log('💡 解决方案:');
    console.log('1. 启动代理软件 (Clash/ClashX/Shadowsocks等)');
    console.log('2. 检查代理软件是否正在运行');
    console.log('3. 确认代理端口配置正确');
    return null;
  }
  
  console.log(`🎯 检测到 ${availableProxies.length} 个可用代理:\n`);
  
  availableProxies.forEach((proxy, index) => {
    console.log(`${index + 1}. ${proxy.name} - ${proxy.url}`);
  });
  
  // 自动选择第一个可用代理进行测试
  console.log('\n⚡ 自动选择第一个代理进行功能测试...\n');
  const selectedProxy = availableProxies[0];
  
  await testProxyFunctionality(selectedProxy.url);
  
  return selectedProxy;
}

// 保存代理配置到.env文件
async function saveProxyConfig(proxyConfig) {
  try {
    const fs = await import('fs');
    let envContent = '';
    
    // 读取现有.env文件
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }
    
    // 移除旧的代理配置
    const lines = envContent.split('\n').filter(line => 
      !line.startsWith('HTTPS_PROXY=') && 
      !line.startsWith('HTTP_PROXY=') && 
      !line.startsWith('ALL_PROXY=')
    );
    
    // 添加新的代理配置
    lines.push('');
    lines.push('# 代理配置 (自动生成)');
    proxyConfig.forEach(config => {
      if (config.startsWith('HTTPS_PROXY=') || 
          config.startsWith('HTTP_PROXY=') || 
          config.startsWith('ALL_PROXY=')) {
        lines.push(config);
      }
    });
    
    // 写入文件
    fs.writeFileSync('.env', lines.join('\n'));
    console.log('✅ 代理配置已保存到 .env 文件');
    
  } catch (error) {
    console.log('⚠️  保存配置失败:', error.message);
    console.log('请手动添加代理配置到 .env 文件');
  }
}

// 主函数
async function main() {
  try {
    // 1. 检测可用代理
    const availableProxies = await detectAvailableProxies();
    
    // 2. 交互式选择和测试
    const selectedProxy = await interactiveProxySelection(availableProxies);
    
    if (selectedProxy) {
      // 3. 生成配置
      const proxyConfig = generateProxyConfig(selectedProxy);
      
      // 4. 保存配置
      await saveProxyConfig(proxyConfig);
      
      console.log('🚀 下一步操作:');
      console.log('1. 重新启动机器人: npm start');
      console.log('2. 运行网络测试: node scripts/network-test.js');
      console.log('3. 如果仍有问题，尝试其他代理软件');
    }
    
  } catch (error) {
    console.error('代理管理器运行出错:', error);
  }
}

main(); 