#!/usr/bin/env node

// 监控支付后的DOL余额变化
import 'dotenv/config';
import { ProfileService } from './src/services/database.js';

const USER_ID = '1113108345998549102';
const EXPECTED_INCREASE = 450;

async function monitorBalance() {
  console.log('💰 ================ DOL余额监控 ================');
  console.log(`👤 监控用户: ${USER_ID}`);
  console.log(`📈 预期增加: +${EXPECTED_INCREASE} DOL`);
  console.log('⏰ 每10秒检查一次，最多监控5分钟...\n');
  
  // 获取初始余额
  const initialProfile = await ProfileService.getOrCreateProfile(USER_ID);
  const initialDol = initialProfile.dol;
  console.log(`📊 当前余额: ${initialDol} DOL`);
  console.log(`🎯 目标余额: ${initialDol + EXPECTED_INCREASE} DOL\n`);
  
  const startTime = Date.now();
  const maxWaitMs = 5 * 60 * 1000; // 5分钟
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const currentProfile = await ProfileService.getOrCreateProfile(USER_ID);
      const currentDol = currentProfile.dol;
      const increase = currentDol - initialDol;
      
      const timestamp = new Date().toLocaleString('zh-CN');
      console.log(`[${timestamp}] 💰 当前余额: ${currentDol} DOL (+${increase})`);
      
      if (increase >= EXPECTED_INCREASE) {
        console.log('\n🎉 ================ 支付成功！ ================');
        console.log(`✅ DOL余额已更新: ${initialDol} → ${currentDol} (+${increase})`);
        console.log('💕 可以继续和AI男友愉快聊天了~');
        return;
      }
      
      if (increase > 0 && increase < EXPECTED_INCREASE) {
        console.log(`⚠️  部分到账: +${increase} DOL，继续监控...`);
      }
      
      // 等待10秒
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error(`❌ 余额检查失败: ${error.message}`);
    }
  }
  
  console.log('\n⏰ ================ 监控超时 ================');
  console.log('💡 DOL余额未更新，可能的原因:');
  console.log('   1. 支付实际未完成');
  console.log('   2. Webhook配置不正确');
  console.log('   3. Webhook处理过程出错');
  console.log('\n🔍 建议检查:');
  console.log('   - Creem Dashboard中的webhook配置');
  console.log('   - Railway应用日志');
  console.log('   - 支付是否真的成功');
}

monitorBalance().catch(console.error); 