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

// 用户档案相关操作
export class ProfileService {
  // 获取或创建用户档案
  static async getOrCreateProfile(userId) {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // 创建新用户，进行A/B测试分组
      const abGroup = Math.random() > 0.5 ? 'A' : 'B';
      const dolAmount = abGroup === 'A' ? 300 : 400;
      
      const { data: newProfile, error: createError } = await db
        .from('profiles')
        .insert({
          user_id: userId,
          dol: dolAmount,
          ab_group: abGroup
        })
        .select()
        .single();

      if (createError) throw createError;
      
      // 记录A/B测试事件
      await this.logABEvent(userId, 'user_created', abGroup, {
        initial_dol: dolAmount
      });
      
      return newProfile;
    }

    return data;
  }

  // 更新用户档案
  static async updateProfile(userId, updates) {
    const { error } = await db.rpc('update_profile', {
      u: userId,
      dol_delta: updates.dolDelta || 0,
      intimacy_delta: updates.intimacyDelta || 0
    });

    if (error) throw error;
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

      const stats = {
        user_id: userId,
        intimacy: profile.intimacy || 0,
        dol: profile.dol || 0,
        total_messages: totalMessages,
        total_het: totalHet,
        days_active: daysActive,
        ab_group: profile.ab_group || 'A',
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };

      console.log('✅ 降级查询成功完成');
      console.log(`📈 统计数据: 消息${totalMessages}条, 亲密度${stats.intimacy}, DOL${stats.dol}`);
      
      return stats;
    } catch (error) {
      console.error('❌ 降级查询也失败了:', error);
      return null;
    }
  }

  // 记录A/B测试事件
  static async logABEvent(userId, eventType, groupName, metadata = {}) {
    const { error } = await db
      .from('ab_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        group_name: groupName,
        metadata
      });

    if (error) throw error;
  }

  // 获取亲密度排行榜
  static async getLeaderboard(limit = 10) {
    const { data, error } = await db
      .from('profiles')
      .select('user_id, intimacy, total_messages, updated_at')
      .order('intimacy', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // 获取用户排名
  static async getUserRank(userId) {
    try {
      // 首先获取用户的亲密度
      const { data: userProfile, error: userError } = await db
        .from('profiles')
        .select('intimacy')
        .eq('user_id', userId)
        .single();

      if (userError || !userProfile) {
        return null;
      }

      // 计算排名（比该用户亲密度高的用户数量 + 1）
      const { count, error: countError } = await db
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('intimacy', userProfile.intimacy);

      if (countError) throw countError;

      return {
        rank: (count || 0) + 1,
        intimacy: userProfile.intimacy
      };
    } catch (error) {
      console.error('获取用户排名失败:', error);
      return null;
    }
  }
}

// 聊天记录相关操作
export class SessionService {
  // 保存聊天记录
  static async saveSession(userId, message, botReply, tokens, het, emotionScore) {
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

    if (error) throw error;
  }

  // 获取用户聊天历史（用于上下文）
  static async getRecentSessions(userId, limit = 10) {
    const { data, error } = await db
      .from('sessions')
      .select('msg, bot_reply, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.reverse(); // 返回时间正序
  }
}

// 支付记录相关操作
export class PaymentService {
  // 创建支付记录
  static async createPayment(userId, amount, dolAmount, paymentId) {
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

    if (error) throw error;
    return data;
  }

  // 确认支付完成
  static async confirmPayment(paymentId) {
    const { data, error } = await db
      .from('payments')
      .update({ status: 'completed' })
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // 给用户增加Dol
    if (data) {
      await ProfileService.updateProfile(data.user_id, {
        dolDelta: data.dol_amount
      });
    }

    return data;
  }
} 