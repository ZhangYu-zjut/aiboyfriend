import 'dotenv/config';
import { ProxyConfig } from '../src/config/proxy.js';

console.log('🔧 AI男友机器人 - 本地调试工具\n');

// 调试步骤
const debugSteps = [
  '检查环境变量配置',
  '测试网络连接',
  '验证Discord API访问',
  '测试Bot认证',
  '检查代理配置',
  '模拟WebSocket连接',
  '生成调试报告'
];

let debugResults = {};

// 步骤1：检查环境变量
async function step1_CheckEnvironment() {
  console.log('🔍 步骤1: 检查环境变量配置');
  console.log('================================');
  
  const requiredVars = {
    'BOT_TOKEN': '机器人Token',
    'CLIENT_ID': '应用程序ID', 
    'OPENROUTER_API_KEY': 'OpenRouter API密钥',
    'SUPABASE_URL': 'Supabase数据库URL',
    'SUPABASE_ANON_KEY': 'Supabase匿名密钥'
  };
  
  let allConfigured = true;
  let missingVars = [];
  
  for (const [varName, description] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (!value || value.startsWith('your_')) {
      console.log(`❌ ${varName}: 未配置 (${description})`);
      allConfigured = false;
      missingVars.push(varName);
    } else {
      const maskedValue = value.substring(0, 8) + '...';
      console.log(`✅ ${varName}: ${maskedValue}`);
    }
  }
  
  debugResults.step1 = {
    success: allConfigured,
    missingVars: missingVars
  };
  
  if (!allConfigured) {
    console.log('\n💡 解决方案：');
    console.log('1. 检查.env文件是否存在');
    console.log('2. 参考env.example文件配置缺失项');
    console.log('3. 确保没有多余的空格或换行');
  }
  
  console.log('');
  return allConfigured;
}

// 步骤2：测试网络连接
async function step2_TestNetwork() {
  console.log('🌐 步骤2: 测试网络连接');
  console.log('====================');
  
  const testUrls = [
    { name: 'Discord API', url: 'https://discord.com/api/v10/gateway' },
    { name: 'OpenRouter API', url: 'https://openrouter.ai/api/v1/models' },
    { name: 'Google DNS', url: 'https://8.8.8.8' }
  ];
  
  let networkResults = {};
  
  for (const test of testUrls) {
    try {
      console.log(`🔄 测试 ${test.name}...`);
      const startTime = Date.now();
      
      const response = await fetch(test.url, {
        signal: AbortSignal.timeout(8000),
        method: 'HEAD' // 只获取头部，更快
      });
      
      const duration = Date.now() - startTime;
      
      if (response.ok || response.status === 401) { // 401表示需要认证，但网络通
        console.log(`✅ ${test.name}: 可访问 (${duration}ms)`);
        networkResults[test.name] = { success: true, duration };
      } else {
        console.log(`⚠️  ${test.name}: 状态码 ${response.status} (${duration}ms)`);
        networkResults[test.name] = { success: false, status: response.status, duration };
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      networkResults[test.name] = { success: false, error: error.message };
    }
  }
  
  debugResults.step2 = networkResults;
  console.log('');
  
  return Object.values(networkResults).some(result => result.success);
}

// 步骤3：测试Discord API
async function step3_TestDiscordAPI() {
  console.log('📡 步骤3: 验证Discord API访问');
  console.log('=============================');
  
  try {
    // 测试Gateway API
    console.log('🔄 测试Gateway API...');
    const gatewayResponse = await fetch('https://discord.com/api/v10/gateway', {
      signal: AbortSignal.timeout(10000)
    });
    
    if (gatewayResponse.ok) {
      const gatewayData = await gatewayResponse.json();
      console.log(`✅ Gateway API: ${gatewayData.url}`);
      debugResults.step3_gateway = { success: true, url: gatewayData.url };
    } else {
      console.log(`❌ Gateway API失败: ${gatewayResponse.status}`);
      debugResults.step3_gateway = { success: false, status: gatewayResponse.status };
    }
    
    // 测试Bot认证
    console.log('🔄 测试Bot认证...');
    const botToken = process.env.BOT_TOKEN;
    
    if (!botToken) {
      console.log('❌ Bot Token未配置');
      debugResults.step3_auth = { success: false, error: 'No token' };
      return false;
    }
    
    const authResponse = await fetch('https://discord.com/api/v10/applications/@me', {
      headers: {
        'Authorization': `Bot ${botToken}`
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (authResponse.ok) {
      const botData = await authResponse.json();
      console.log(`✅ Bot认证成功: ${botData.name} (ID: ${botData.id})`);
      debugResults.step3_auth = { 
        success: true, 
        botName: botData.name, 
        botId: botData.id 
      };
      return true;
    } else {
      console.log(`❌ Bot认证失败: ${authResponse.status}`);
      if (authResponse.status === 401) {
        console.log('💡 可能是Token错误，请检查BOT_TOKEN配置');
      }
      debugResults.step3_auth = { success: false, status: authResponse.status };
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Discord API测试失败: ${error.message}`);
    debugResults.step3_error = error.message;
    return false;
  } finally {
    console.log('');
  }
}

// 步骤4：检查代理配置
async function step4_CheckProxy() {
  console.log('🔧 步骤4: 检查代理配置');
  console.log('====================');
  
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  
  if (!proxyUrl) {
    console.log('ℹ️  未配置代理，使用直连模式');
    debugResults.step4 = { proxy: false, mode: 'direct' };
  } else {
    console.log(`🔧 检测到代理: ${proxyUrl}`);
    
    // 测试代理连接
    try {
      const testResult = await ProxyConfig.testProxyConnection();
      if (testResult.success) {
        console.log(`✅ 代理连接正常 - IP: ${testResult.ip}`);
        debugResults.step4 = { 
          proxy: true, 
          mode: 'proxy', 
          url: proxyUrl, 
          ip: testResult.ip 
        };
      } else {
        console.log(`❌ 代理连接失败: ${testResult.error}`);
        debugResults.step4 = { 
          proxy: true, 
          mode: 'proxy', 
          url: proxyUrl, 
          error: testResult.error 
        };
      }
    } catch (error) {
      console.log(`❌ 代理测试异常: ${error.message}`);
      debugResults.step4 = { 
        proxy: true, 
        mode: 'proxy', 
        url: proxyUrl, 
        error: error.message 
      };
    }
  }
  
  console.log('');
}

// 步骤5：生成调试报告
function step5_GenerateReport() {
  console.log('📊 步骤5: 调试报告');
  console.log('================');
  
  console.log('📋 配置状态:');
  console.log(`  环境变量: ${debugResults.step1?.success ? '✅' : '❌'}`);
  console.log(`  网络连接: ${Object.values(debugResults.step2 || {}).some(r => r.success) ? '✅' : '❌'}`);
  console.log(`  Discord API: ${debugResults.step3_gateway?.success ? '✅' : '❌'}`);
  console.log(`  Bot认证: ${debugResults.step3_auth?.success ? '✅' : '❌'}`);
  console.log(`  代理状态: ${debugResults.step4?.proxy ? `🔧 ${debugResults.step4.mode}` : '🌐 直连'}`);
  
  console.log('\n🎯 问题诊断:');
  
  // 环境变量问题
  if (!debugResults.step1?.success) {
    console.log('❌ 环境变量配置不完整');
    console.log('   解决方案: 完善.env文件配置');
    debugResults.step1.missingVars.forEach(v => {
      console.log(`   - 添加 ${v}`);
    });
  }
  
  // 网络问题
  const networkSuccess = Object.values(debugResults.step2 || {}).some(r => r.success);
  if (!networkSuccess) {
    console.log('❌ 网络连接问题');
    console.log('   解决方案: 检查网络或配置代理');
  }
  
  // Bot认证问题
  if (!debugResults.step3_auth?.success) {
    console.log('❌ Bot认证失败');
    console.log('   解决方案: 检查BOT_TOKEN是否正确');
  }
  
  // 代理问题
  if (debugResults.step4?.proxy && debugResults.step4?.error) {
    console.log('❌ 代理连接问题');
    console.log('   解决方案: 检查代理软件是否正常运行');
  }
  
  console.log('\n💡 建议的解决方案:');
  
  if (debugResults.step3_auth?.success && debugResults.step3_gateway?.success) {
    console.log('🟢 API访问正常，WebSocket问题可能需要:');
    console.log('   1. 尝试不同的代理配置');
    console.log('   2. 使用云服务器部署');
    console.log('   3. 联系网络服务提供商');
  } else if (!networkSuccess) {
    console.log('🔴 网络连接问题，建议:');
    console.log('   1. 检查网络连接');
    console.log('   2. 配置科学上网工具');
    console.log('   3. 使用云服务器部署');
  } else {
    console.log('🟡 配置问题，建议:');
    console.log('   1. 完善环境变量配置');
    console.log('   2. 验证Discord机器人设置');
    console.log('   3. 检查API密钥有效性');
  }
  
  console.log('\n📞 获取帮助:');
  console.log('   - 查看详细指南: cat QUICK_START.md');
  console.log('   - 云端部署: node deploy/deploy-cloud.js');
  console.log('   - 重新运行调试: node scripts/debug-local.js');
}

// 主函数
async function main() {
  console.log('开始本地调试...\n');
  
  // 初始化代理配置
  ProxyConfig.setup();
  
  // 执行调试步骤
  for (let i = 0; i < debugSteps.length - 1; i++) {
    console.log(`📍 进度: ${i + 1}/${debugSteps.length - 1} - ${debugSteps[i]}`);
  }
  console.log('');
  
  await step1_CheckEnvironment();
  await step2_TestNetwork();
  await step3_TestDiscordAPI();
  await step4_CheckProxy();
  step5_GenerateReport();
  
  console.log('\n🎉 调试完成！');
  console.log('如果问题仍未解决，建议使用云端部署方案。');
}

main().catch(console.error); 