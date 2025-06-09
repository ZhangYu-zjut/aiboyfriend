#!/usr/bin/env node

// 监控用户DOL余额变化
import 'dotenv/config';
import { ProfileService } from './src/services/database.js';

const USER_ID = '1113108345998549102'; // 你的真实用户ID

async function monitorBalance() {
  console.log('💰 ================ DOL余额监控 ================');
  console.log(`👤 监控用户: ${USER_ID}`);
  console.log('⏰ 每5秒检查一次余额变化...\n');
  
  let lastBalance = null;
  let checkCount = 0;
  
  const checkBalance = async () => {
    try {
      checkCount++;
      const profile = await ProfileService.getOrCreateProfile(USER_ID);
      const currentBalance = profile.dol;
      
      const timestamp = new Date().toLocaleTimeString('zh-CN');
      
      if (lastBalance === null) {
        console.log(`[${timestamp}] 📊 初始余额: ${currentBalance} DOL`);
        lastBalance = currentBalance;
      } else if (currentBalance !== lastBalance) {
        const change = currentBalance - lastBalance;
        const changeStr = change > 0 ? `+${change}` : `${change}`;
        console.log(`[${timestamp}] 🔄 余额变化: ${lastBalance} → ${currentBalance} DOL (${changeStr})`);
        
        if (change > 0) {
          console.log(`🎉 检测到充值成功！增加了 ${change} DOL`);
        }
        
        lastBalance = currentBalance;
      } else {
        console.log(`[${timestamp}] ✅ 余额稳定: ${currentBalance} DOL (检查次数: ${checkCount})`);
      }
      
    } catch (error) {
      console.error(`❌ 获取余额失败:`, error.message);
    }
  };
  
  // 立即检查一次
  await checkBalance();
  
  // 然后每5秒检查一次
  setInterval(checkBalance, 5000);
}

console.log('🚀 启动DOL余额监控...');
console.log('💡 在另一个终端进行支付测试，这里会实时显示余额变化');
console.log('⏹️  按 Ctrl+C 停止监控\n');

monitorBalance().catch(console.error); 