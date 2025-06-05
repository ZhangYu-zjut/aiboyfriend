import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
    const { data, error } = await db.rpc('get_user_stats', { u: userId });
    if (error) throw error;
    return data[0];
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