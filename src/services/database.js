import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// 🔍 调试输出 - 检查环境变量
console.log('=== 🔍 Supabase配置调试 ===');
console.log('SUPABASE_URL存在:', !!supabaseUrl);
console.log('SUPABASE_URL长度:', supabaseUrl ? supabaseUrl.length : 0);
console.log('SUPABASE_URL预览:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'undefined');

console.log('SUPABASE_KEY存在:', !!supabaseKey);
console.log('SUPABASE_KEY长度:', supabaseKey ? supabaseKey.length : 0);
console.log('SUPABASE_KEY预览:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined');

console.log('所有环境变量名称:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
console.log('===========================');

// 添加错误检查
if (!supabaseUrl) {
  console.error('❌ 错误: SUPABASE_URL未配置!');
  console.log('💡 请在Railway中添加SUPABASE_URL环境变量');
}

if (!supabaseKey) {
  console.error('❌ 错误: SUPABASE_ANON_KEY或SUPABASE_SERVICE_ROLE_KEY未配置!');
  console.log('💡 请在Railway中添加Supabase密钥环境变量');
}

export const db = createClient(supabaseUrl, supabaseKey);

// 检查表结构的辅助函数
async function checkTableStructure() {
  try {
    console.log('🔍 检查数据库表结构...');
    
    // 检查profiles表的列
    const { data: profilesInfo, error: profilesError } = await db
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ profiles表查询失败:', profilesError.message);
      return false;
    }
    
    console.log('✅ profiles表连接正常');
    return true;
  } catch (error) {
    console.error('❌ 表结构检查失败:', error);
    return false;
  }
}

// 初始化检查
checkTableStructure();

// 用户档案相关操作
export class ProfileService {
  // 获取或创建用户档案
  static async getOrCreateProfile(userId) {
    try {
      console.log(`📋 获取用户档案: ${userId}`);
      
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ 查询用户档案失败:', error);
        throw error;
      }

      if (!data) {
        console.log('👤 创建新用户档案...');
        // 创建新用户，进行A/B测试分组
        const abGroup = Math.random() > 0.5 ? 'A' : 'B';
        const dolAmount = abGroup === 'A' ? 300 : 400;
        
        const { data: newProfile, error: createError } = await db
          .from('profiles')
          .insert({
            user_id: userId,
            dol: dolAmount,
            ab_group: abGroup,
            intimacy: 0,
            total_messages: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ 创建用户档案失败:', createError);
          throw createError;
        }
        
        console.log(`✅ 新用户创建成功: ${abGroup}组, ${dolAmount} DOL`);
        
        // 记录A/B测试事件
        await this.logABEvent(userId, 'user_created', abGroup, {
          initial_dol: dolAmount
        });
        
        return newProfile;
      }

      console.log(`✅ 用户档案获取成功: 亲密度${data.intimacy}, DOL${data.dol}`);
      return data;
    } catch (error) {
      console.error('❌ getOrCreateProfile异常:', error);
      throw error;
    }
  }

  // 更新用户档案
  static async updateProfile(userId, updates) {
    try {
      console.log(`📝 更新用户档案: ${userId}`, updates);
      
      // 首先尝试使用数据库函数
      const { error: functionError } = await db.rpc('update_profile', {
        u: userId,
        dol_delta: updates.dolDelta || 0,
        intimacy_delta: updates.intimacyDelta || 0
      });

      if (functionError) {
        console.error('❌ 数据库函数调用失败，使用直接更新:', functionError.message);
        
        // 降级方案：直接更新
        const currentProfile = await this.getOrCreateProfile(userId);
        const newDol = Math.max(0, currentProfile.dol + (updates.dolDelta || 0));
        const newIntimacy = Math.max(0, currentProfile.intimacy + (updates.intimacyDelta || 0));
        
        const { error: updateError } = await db
          .from('profiles')
          .update({
            dol: newDol,
            intimacy: newIntimacy,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
          
        if (updateError) {
          console.error('❌ 直接更新也失败:', updateError);
          throw updateError;
        }
        
        console.log(`✅ 直接更新成功: DOL=${newDol}, 亲密度=${newIntimacy}`);
      } else {
        console.log('✅ 数据库函数更新成功');
      }
    } catch (error) {
      console.error('❌ updateProfile异常:', error);
      throw error;
    }
  }

  // 获取用户统计数据
  static async getUserStats(userId) {
    try {
      console.log(`📊 获取用户统计数据: ${userId}`);
      
      // 首先尝试使用数据库函数
      const { data, error } = await db.rpc('get_user_stats', { u: userId });
      
      if (error) {
        console.error('❌ 数据库函数调用失败:', error.message);
        console.log('🔄 使用降级查询方案...');
        
        // 降级方案：直接查询用户档案
        return await this.getUserStatsDirectQuery(userId);
      }
      
      if (data && data.length > 0) {
        console.log('✅ 成功获取用户统计数据');
        return data[0];
      } else {
        console.log('⚠️  用户数据为空，使用降级查询...');
        return await this.getUserStatsDirectQuery(userId);
      }
    } catch (error) {
      console.error('❌ 获取用户统计数据异常:', error);
      console.log('🔄 使用降级查询方案...');
      return await this.getUserStatsDirectQuery(userId);
    }
  }

  // 降级方案：直接查询用户统计数据
  static async getUserStatsDirectQuery(userId) {
    try {
      console.log('🔄 执行降级统计查询');
      
      // 获取用户基本档案
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('❌ 获取用户档案失败:', profileError.message);
        return null;
      }

      if (!profile) {
        console.log('⚠️  用户档案不存在');
        return null;
      }

      // 获取聊天统计
      const { data: sessions, error: sessionError } = await db
        .from('sessions')
        .select('created_at, het, emotion_score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      let totalMessages = 0;
      let totalHet = 0;
      let daysActive = 0;

      if (!sessionError && sessions) {
        totalMessages = sessions.length;
        totalHet = sessions.reduce((sum, session) => sum + (session.het || 0), 0);
        
        // 计算活跃天数
        const activeDates = new Set();
        sessions.forEach(session => {
          const date = new Date(session.created_at).toDateString();
          activeDates.add(date);
        });
        daysActive = activeDates.size;
      }

      // 如果profile有total_messages字段，优先使用它
      const finalTotalMessages = profile.total_messages !== undefined 
        ? profile.total_messages 
        : totalMessages;

      const stats = {
        user_id: userId,
        intimacy: profile.intimacy || 0,
        dol: profile.dol || 0,
        total_messages: finalTotalMessages,
        total_het: totalHet,
        days_active: daysActive,
        ab_group: profile.ab_group || 'A',
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };

      console.log('✅ 降级查询成功完成');
      console.log(`📈 统计数据: 消息${finalTotalMessages}条, 亲密度${stats.intimacy}, DOL${stats.dol}`);
      
      return stats;
    } catch (error) {
      console.error('❌ 降级查询也失败了:', error);
      return null;
    }
  }

  // 记录A/B测试事件
  static async logABEvent(userId, eventType, groupName, metadata = {}) {
    try {
      const { error } = await db
        .from('ab_events')
        .insert({
          user_id: userId,
          event_type: eventType,
          group_name: groupName,
          metadata
        });

      if (error) {
        console.error('❌ A/B测试事件记录失败:', error);
        // 不抛出错误，避免影响主要功能
      } else {
        console.log(`✅ A/B测试事件记录成功: ${eventType}`);
      }
    } catch (error) {
      console.error('❌ logABEvent异常:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  // 获取亲密度排行榜 - 修复版本
  static async getLeaderboard(limit = 10) {
    try {
      console.log(`🏆 获取排行榜 (前${limit}名)`);
      
      // 检查表中是否有total_messages字段
      const { data, error } = await db
        .from('profiles')
        .select('user_id, intimacy, total_messages, updated_at')
        .order('intimacy', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ 排行榜查询失败:', error.message);
        
        // 如果是因为total_messages字段不存在，使用简化查询
        if (error.message.includes('total_messages')) {
          console.log('🔄 使用简化排行榜查询...');
          
          const { data: simpleData, error: simpleError } = await db
            .from('profiles')
            .select('user_id, intimacy, updated_at')
            .order('intimacy', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(limit);
            
          if (simpleError) {
            console.error('❌ 简化排行榜查询也失败:', simpleError);
            throw simpleError;
          }
          
          // 为每个用户补充消息数量（设为0或从sessions表查询）
          const enhancedData = simpleData.map(user => ({
            ...user,
            total_messages: 0 // 默认值，后续可以从sessions表查询
          }));
          
          console.log(`✅ 简化排行榜查询成功，返回${enhancedData.length}条记录`);
          return enhancedData;
        }
        
        throw error;
      }

      console.log(`✅ 排行榜查询成功，返回${data.length}条记录`);
      return data;
    } catch (error) {
      console.error('❌ getLeaderboard异常:', error);
      throw error;
    }
  }

  // 获取用户排名
  static async getUserRank(userId) {
    try {
      console.log(`🎯 获取用户排名: ${userId}`);
      
      // 首先获取用户的亲密度
      const { data: userProfile, error: userError } = await db
        .from('profiles')
        .select('intimacy')
        .eq('user_id', userId)
        .single();

      if (userError || !userProfile) {
        console.log('⚠️  用户档案不存在，无法获取排名');
        return null;
      }

      // 计算排名（比该用户亲密度高的用户数量 + 1）
      const { count, error: countError } = await db
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('intimacy', userProfile.intimacy);

      if (countError) {
        console.error('❌ 排名计算失败:', countError);
        throw countError;
      }

      const rank = (count || 0) + 1;
      console.log(`✅ 用户排名计算成功: 第${rank}名，亲密度${userProfile.intimacy}`);

      return {
        rank,
        intimacy: userProfile.intimacy
      };
    } catch (error) {
      console.error('❌ 获取用户排名失败:', error);
      return null;
    }
  }
}

// 聊天记录相关操作
export class SessionService {
  // 保存聊天记录
  static async saveSession(userId, message, botReply, tokens, het, emotionScore) {
    try {
      console.log(`💾 保存聊天记录: ${userId}`);
      
      const { error } = await db
        .from('sessions')
        .insert({
          user_id: userId,
          msg: message,
          bot_reply: botReply,
          tokens,
          het,
          emotion_score: emotionScore
        });

      if (error) {
        console.error('❌ 聊天记录保存失败:', error);
        throw error;
      }
      
      console.log('✅ 聊天记录保存成功');
    } catch (error) {
      console.error('❌ saveSession异常:', error);
      throw error;
    }
  }

  // 获取用户聊天历史（用于上下文）
  static async getRecentSessions(userId, limit = 10) {
    try {
      console.log(`📖 获取聊天历史: ${userId} (最近${limit}条)`);
      
      const { data, error } = await db
        .from('sessions')
        .select('msg, bot_reply, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ 聊天历史获取失败:', error);
        throw error;
      }
      
      console.log(`✅ 聊天历史获取成功，返回${data.length}条记录`);
      return data.reverse(); // 返回时间正序
    } catch (error) {
      console.error('❌ getRecentSessions异常:', error);
      throw error;
    }
  }
}

// 支付记录相关操作
export class PaymentService {
  // 创建支付记录
  static async createPayment(userId, amount, dolAmount, paymentId) {
    try {
      console.log(`💳 创建支付记录: ${userId}, $${amount}`);
      
      const { data, error } = await db
        .from('payments')
        .insert({
          user_id: userId,
          amount,
          dol_amount: dolAmount,
          payment_id: paymentId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ 支付记录创建失败:', error);
        throw error;
      }
      
      console.log('✅ 支付记录创建成功');
      return data;
    } catch (error) {
      console.error('❌ createPayment异常:', error);
      throw error;
    }
  }

  // 确认支付完成
  static async confirmPayment(paymentId) {
    try {
      console.log(`✅ 确认支付完成: ${paymentId}`);
      
      const { data, error } = await db
        .from('payments')
        .update({ status: 'completed' })
        .eq('payment_id', paymentId)
        .select()
        .single();

      if (error) {
        console.error('❌ 支付确认失败:', error);
        throw error;
      }

      // 给用户增加Dol
      if (data) {
        console.log(`💎 增加用户DOL: ${data.user_id} +${data.dol_amount}`);
        await ProfileService.updateProfile(data.user_id, {
          dolDelta: data.dol_amount
        });
      }

      console.log('✅ 支付确认和DOL发放完成');
      return data;
    } catch (error) {
      console.error('❌ confirmPayment异常:', error);
      throw error;
    }
  }
} 