import 'dotenv/config';
import { AIService } from '../src/services/ai.js';
import { EmotionService } from '../src/services/emotion.js';

async function testAIService() {
  console.log('🤖 测试AI服务...');
  
  const mockProfile = {
    user_id: 'test_user',
    dol: 300,
    intimacy: 50,
    ab_group: 'A'
  };
  
  try {
    const response = await AIService.generateReply(
      '你好，我今天心情很好呢！',
      mockProfile
    );
    
    console.log('✅ AI回复生成成功');
    console.log('回复内容:', response.reply);
    console.log('使用Token:', response.tokens);
  } catch (error) {
    console.log('❌ AI服务测试失败:', error.message);
  }
}

async function testEmotionService() {
  console.log('\n💕 测试情感分析服务...');
  
  const testMessages = [
    '我爱你！',
    '今天好开心呀～',
    '心情有点低落...',
    '你好，请问有什么可以帮助你的吗？'
  ];
  
  for (const message of testMessages) {
    try {
      const emotion = await EmotionService.analyzeEmotion(message);
      const het = EmotionService.calculateHET(message, emotion, 20);
      
      console.log(`消息: "${message}"`);
      console.log(`情感得分: ${emotion.score.toFixed(2)}`);
      console.log(`HET值: ${het}`);
      console.log(`是否正面: ${emotion.isPositive ? '✅' : '❌'}`);
      console.log('---');
    } catch (error) {
      console.log(`❌ 情感分析失败 "${message}":`, error.message);
    }
  }
}

function testConfigValidation() {
  console.log('\n🔧 验证环境配置...');
  
  const requiredEnvs = [
    'BOT_TOKEN',
    'CLIENT_ID', 
    'OPENROUTER_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  let allValid = true;
  
  requiredEnvs.forEach(env => {
    if (!process.env[env] || process.env[env].startsWith('your_')) {
      console.log(`❌ ${env} 未配置或使用默认值`);
      allValid = false;
    } else {
      console.log(`✅ ${env} 已配置`);
    }
  });
  
  if (allValid) {
    console.log('🎉 所有必要的环境变量都已正确配置！');
  } else {
    console.log('⚠️  请检查并配置缺失的环境变量');
  }
  
  return allValid;
}

function testSystemPrompt() {
  console.log('\n🎭 测试AI人设系统...');
  
  const mockProfile = {
    user_id: 'test_user',
    dol: 300,
    intimacy: 25,
    ab_group: 'A'
  };
  
  const prompt = AIService.getSystemPrompt(mockProfile, 25);
  console.log('生成的系统Prompt长度:', prompt.length);
  console.log('包含中文人设:', prompt.includes('温柔体贴') ? '✅' : '❌');
  console.log('包含亲密度调整:', prompt.includes('初见倾心') ? '✅' : '❌');
}

async function runAllTests() {
  console.log('🚀 开始运行AI男友机器人测试套件...\n');
  
  // 配置验证
  const configValid = testConfigValidation();
  
  // 系统Prompt测试
  testSystemPrompt();
  
  if (configValid && process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('your_')) {
    // AI服务测试（需要OpenRouter API密钥）
    await testAIService();
  } else {
    console.log('\n⚠️  跳过AI服务测试（需要有效的OpenRouter API密钥）');
  }
  
  // 情感分析测试
  await testEmotionService();
  
  console.log('\n🎉 测试完成！');
  console.log('\n💡 提示：');
  console.log('- 确保所有环境变量都已正确配置');
  console.log('- 在Supabase中执行 database/init.sql 初始化数据库');
  console.log('- 在Discord Developer Portal中创建并配置机器人');
  console.log('- 使用 npm start 启动完整的机器人服务');
}

// 运行测试
runAllTests().catch(console.error); 