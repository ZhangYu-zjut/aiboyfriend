import { EmotionService } from '../src/services/emotion.js';

async function test() {
  const testMessages = [
    '我爱死你了！',
    '今天心情有点低落...',
    '你好'
  ];
  
  for (const message of testMessages) {
    console.log(`\n测试消息: "${message}"`);
    const result = await EmotionService.analyzeEmotion(message);
    console.log('情感分析结果:', JSON.stringify(result, null, 2));
  }
}

test().catch(console.error); 