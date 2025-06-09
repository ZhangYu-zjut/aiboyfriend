import 'dotenv/config';

console.log('🔍 OpenRouter API 调试工具');
console.log('=========================\n');

// 检查环境变量
console.log('1. 📋 环境变量检查:');
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.log('❌ OPENROUTER_API_KEY 未设置');
  process.exit(1);
} else {
  console.log(`✅ OPENROUTER_API_KEY: ${apiKey.substring(0, 20)}...`);
  console.log(`📏 长度: ${apiKey.length}`);
  console.log(`🔍 格式检查: ${apiKey.startsWith('sk-or-') ? '✅ 正确' : '❌ 错误'}`);
}

// 测试API调用
console.log('\n2. 🌐 测试API连接:');

const testPayload = {
  model: 'openai/gpt-4o-mini',
  messages: [
    { role: 'user', content: '你好，这是一个测试消息。请简短回复。' }
  ],
  max_tokens: 50
};

const testHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'HTTP-Referer': 'discord.com',
  'X-Title': 'AI-Boyfriend-Bot'
};

console.log('📦 请求配置:');
console.log(`   URL: https://openrouter.ai/api/v1/chat/completions`);
console.log(`   模型: ${testPayload.model}`);
console.log(`   Headers: ${Object.keys(testHeaders).join(', ')}`);

try {
  console.log('\n🚀 发送测试请求...');
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: testHeaders,
    body: JSON.stringify(testPayload)
  });

  console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ API调用失败:');
    console.log(`   状态码: ${response.status}`);
    console.log(`   错误信息: ${errorText}`);
    
    // 分析具体错误
    try {
      const errorJson = JSON.parse(errorText);
      console.log('\n🔍 错误分析:');
      
      if (errorJson.error?.code === 401) {
        console.log('   问题类型: 认证失败');
        console.log('   可能原因:');
        console.log('   - API密钥无效或过期');
        console.log('   - API密钥格式错误');
        console.log('   - 账户余额不足');
        console.log('   - API密钥权限不够');
      }
    } catch (e) {
      console.log('   无法解析错误信息');
    }
    
  } else {
    const data = await response.json();
    console.log('✅ API调用成功!');
    console.log(`💬 回复: ${data.choices[0].message.content}`);
    console.log(`🔢 Token使用: ${data.usage?.total_tokens || 0}`);
  }

} catch (error) {
  console.log('❌ 网络错误:');
  console.log(`   ${error.message}`);
}

console.log('\n🎯 修复建议:');
console.log('1. 检查OpenRouter账户状态: https://openrouter.ai/keys');
console.log('2. 确认API密钥权限和余额');
console.log('3. 尝试重新生成API密钥');
console.log('4. 检查Railway环境变量设置'); 