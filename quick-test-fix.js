#!/usr/bin/env node

// 快速测试重复支付记录修复
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 导入数据库服务，不导入完整的PaymentService
import { PaymentService as DatabasePaymentService } from './src/services/database.js';

async function quickTestFix() {
  console.log('🧪 快速测试支付重复记录修复...\n');
  
  const testUserId = '1113108345998549102';
  const timestamp = Date.now();
  const requestId = `test_fix_${timestamp}`;
  
  console.log(`📋 测试参数:`);
  console.log(`   用户ID: ${testUserId}`);
  console.log(`   请求ID: ${requestId}\n`);
  
  try {
    // 步骤1: 创建pending记录 (模拟创建充值会话)
    console.log('📝 步骤1: 创建pending支付记录...');
    await DatabasePaymentService.createPayment(testUserId, 4.50, 450, requestId);
    console.log('✅ pending记录创建完成\n');
    
    // 检查记录数
    console.log('🔍 检查步骤1后的记录数...');
    const { data: afterCreate } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', requestId);
    
    console.log(`📊 步骤1后记录数: ${afterCreate.length}`);
    afterCreate.forEach((record, index) => {
      console.log(`   ${index + 1}. 状态: ${record.status}`);
    });
    console.log('');
    
    // 步骤2: 确认支付 (模拟webhook处理)
    console.log('📝 步骤2: 确认支付完成...');
    await DatabasePaymentService.confirmPayment(requestId);
    console.log('✅ 支付确认完成\n');
    
    // 检查最终记录数
    console.log('🔍 检查步骤2后的记录数...');
    const { data: afterConfirm } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', requestId);
    
    console.log(`📊 步骤2后记录数: ${afterConfirm.length}`);
    afterConfirm.forEach((record, index) => {
      console.log(`   ${index + 1}. 状态: ${record.status}`);
    });
    
    // 结果分析
    console.log('\n🎯 测试结果分析:');
    if (afterConfirm.length === 1) {
      const record = afterConfirm[0];
      if (record.status === 'completed') {
        console.log('✅ 测试通过: 单条记录，状态正确更新为completed');
        console.log('✅ 修复成功: 没有重复创建记录');
      } else {
        console.log('❌ 状态更新失败');
      }
    } else if (afterConfirm.length > 1) {
      console.log('❌ 测试失败: 仍然存在重复记录');
    } else {
      console.log('❌ 测试失败: 记录丢失');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

quickTestFix().catch(console.error); 