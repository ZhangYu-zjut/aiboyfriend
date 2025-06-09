#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPayment() {
  console.log('🔍 查询最近的支付记录...');
  
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }
  
  console.log('✅ 最近的支付记录:');
  data.forEach((payment, index) => {
    console.log(`${index + 1}. 用户ID: ${payment.user_id}`);
    console.log(`   💰 金额: $${payment.amount}`);
    console.log(`   💎 DOL数量: ${payment.dol_amount}`);
    console.log(`   📊 状态: ${payment.status}`);
    console.log(`   🆔 支付ID: ${payment.payment_id}`);
    console.log(`   ⏰ 创建时间: ${payment.created_at}`);
    console.log(`   🔄 更新时间: ${payment.updated_at}`);
    console.log('');
  });
  
  // 检查用户DOL余额
  console.log('💎 检查用户DOL余额...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, dol, intimacy, updated_at')
    .eq('user_id', '1113108345998549102')
    .single();
    
  if (profileError) {
    console.error('❌ 获取用户档案失败:', profileError);
  } else {
    console.log('✅ 用户档案:');
    console.log(`   用户ID: ${profile.user_id}`);
    console.log(`   💎 DOL余额: ${profile.dol}`);
    console.log(`   💕 亲密度: ${profile.intimacy}`);
    console.log(`   🔄 更新时间: ${profile.updated_at}`);
  }
}

checkPayment().catch(console.error); 