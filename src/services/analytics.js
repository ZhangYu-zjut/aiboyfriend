import { GAME_CONFIG, FEATURE_FLAGS } from '../config/settings.js';
import { ProfileService } from './database.js';
import { ProactiveChatService } from './proactive.js';
import { CooldownService } from './cooldown.js';

export class AnalyticsService {
  // 获取系统总览统计
  static async getSystemOverview() {
    console.log('📊 开始获取系统总览统计...');
    
    try {
      const stats = {
        users: await this.getUserStats(),
        messages: await this.getMessageStats(), 
        intimacy: await this.getIntimacyStats(),
        economy: await this.getEconomyStats(),
        proactive: await this.getProactiveChatStats(),
        cooldown: await this.getCooldownStats(),
        system: this.getSystemStats()
      };

      console.log('✅ 系统统计获取完成');
      return stats;

    } catch (error) {
      console.error('❌ 获取系统统计失败:', error);
      throw error;
    }
  }

  // 用户统计
  static async getUserStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 总用户数
      const { data: totalUsers, error: totalError } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // 今日新用户
      const { data: newUsers, error: newError } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (newError) throw newError;

      // 活跃用户（最近7天有活动）
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: activeUsers, error: activeError } = await supabase
        .from('sessions')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      // A/B分组统计
      const { data: groupStats, error: groupError } = await supabase
        .from('profiles')
        .select('ab_group')
        .order('ab_group');

      if (groupError) throw groupError;

      const groupA = groupStats?.filter(u => u.ab_group === 'A').length || 0;
      const groupB = groupStats?.filter(u => u.ab_group === 'B').length || 0;

      return {
        total: totalUsers?.length || 0,
        new_today: newUsers?.length || 0,
        active: activeUsers?.length || 0,
        groups: {
          A: groupA,
          B: groupB
        }
      };

    } catch (error) {
      console.error('❌ 获取用户统计失败:', error);
      return {
        total: 0,
        new_today: 0,
        active: 0,
        groups: { A: 0, B: 0 }
      };
    }
  }

  // 消息统计
  static async getMessageStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 今日消息数
      const { data: todayMessages, error: todayError } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (todayError) throw todayError;

      // 总消息数
      const { data: totalMessages, error: totalError } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // 计算平均响应时间（基于最近100条记录）
      const { data: recentSessions, error: recentError } = await supabase
        .from('sessions')
        .select('response_time')
        .not('response_time', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      let avgResponseTime = 0;
      if (!recentError && recentSessions && recentSessions.length > 0) {
        const totalTime = recentSessions.reduce((sum, session) => sum + (session.response_time || 0), 0);
        avgResponseTime = Math.round(totalTime / recentSessions.length);
      }

      return {
        today: todayMessages?.length || 0,
        total: totalMessages?.length || 0,
        avg_response_time: avgResponseTime
      };

    } catch (error) {
      console.error('❌ 获取消息统计失败:', error);
      return {
        today: 0,
        total: 0,
        avg_response_time: 0
      };
    }
  }

  // 亲密度统计
  static async getIntimacyStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 平均亲密度和最高亲密度
      const { data: intimacyData, error: intimacyError } = await supabase
        .from('profiles')
        .select('intimacy')
        .order('intimacy', { ascending: false });

      if (intimacyError) throw intimacyError;

      let average = 0;
      let highest = 0;

      if (intimacyData && intimacyData.length > 0) {
        const totalIntimacy = intimacyData.reduce((sum, user) => sum + user.intimacy, 0);
        average = Math.round(totalIntimacy / intimacyData.length);
        highest = intimacyData[0].intimacy;
      }

      // 今日亲密度增长
      const { data: todayGains, error: gainsError } = await supabase
        .from('ab_events')
        .select('metadata')
        .eq('event_type', 'intimacy_gained')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      let gainedToday = 0;
      if (!gainsError && todayGains) {
        gainedToday = todayGains.reduce((sum, event) => {
          const gain = event.metadata?.intimacy_gain || 0;
          return sum + gain;
        }, 0);
      }

      // 关系等级分布
      const levelDistribution = this.calculateLevelDistribution(intimacyData || []);

      return {
        average,
        highest,
        gained_today: gainedToday,
        level_distribution: levelDistribution
      };

    } catch (error) {
      console.error('❌ 获取亲密度统计失败:', error);
      return {
        average: 0,
        highest: 0,
        gained_today: 0,
        level_distribution: {}
      };
    }
  }

  // 计算关系等级分布
  static calculateLevelDistribution(intimacyData) {
    const levels = GAME_CONFIG.RELATIONSHIP_LEVELS;
    const distribution = {};

    // 初始化分布
    levels.forEach(level => {
      distribution[level.name] = 0;
    });

    // 统计每个等级的用户数
    intimacyData.forEach(user => {
      const intimacy = user.intimacy;
      for (const level of levels) {
        if (intimacy >= level.range.min && intimacy <= level.range.max) {
          distribution[level.name]++;
          break;
        }
      }
    });

    return distribution;
  }

  // 经济统计
  static async getEconomyStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // 今日DOL消费
      const { data: todaySpent, error: spentError } = await supabase
        .from('ab_events')
        .select('metadata')
        .eq('event_type', 'dol_consumed')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      let spentToday = 0;
      if (!spentError && todaySpent) {
        spentToday = todaySpent.reduce((sum, event) => {
          const amount = event.metadata?.amount || 0;
          return sum + amount;
        }, 0);
      }

      // 今日充值金额
      const { data: todayRecharge, error: rechargeError } = await supabase
        .from('ab_events')
        .select('metadata')
        .eq('event_type', 'payment_completed')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      let rechargedToday = 0;
      if (!rechargeError && todayRecharge) {
        rechargedToday = todayRecharge.reduce((sum, event) => {
          const amount = event.metadata?.amount_cny || 0;
          return sum + amount;
        }, 0);
      }

      // 总DOL流通量
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('dol');

      let totalCirculation = 0;
      if (!usersError && allUsers) {
        totalCirculation = allUsers.reduce((sum, user) => sum + user.dol, 0);
      }

      return {
        spent_today: spentToday,
        recharged_today: rechargedToday,
        total_circulation: totalCirculation
      };

    } catch (error) {
      console.error('❌ 获取经济统计失败:', error);
      return {
        spent_today: 0,
        recharged_today: 0,
        total_circulation: 0
      };
    }
  }

  // 主动私聊统计
  static async getProactiveChatStats() {
    if (!FEATURE_FLAGS.PROACTIVE_CHAT) {
      return {
        enabled: false,
        todayCount: 0,
        uniqueUsers: 0,
        schedulerStatus: 'disabled'
      };
    }

    try {
      return await ProactiveChatService.getProactiveStats();
    } catch (error) {
      console.error('❌ 获取主动私聊统计失败:', error);
      return {
        enabled: true,
        todayCount: 0,
        uniqueUsers: 0,
        schedulerStatus: 'error'
      };
    }
  }

  // 冷却系统统计
  static getCooldownStats() {
    if (!FEATURE_FLAGS.COOLDOWN_SYSTEM) {
      return {
        enabled: false,
        activeUsers: 0,
        cooldownDuration: 0,
        reductionFactor: 0
      };
    }

    try {
      return CooldownService.getCooldownStats();
    } catch (error) {
      console.error('❌ 获取冷却系统统计失败:', error);
      return {
        enabled: true,
        activeUsers: 0,
        cooldownDuration: GAME_CONFIG.INTIMACY.COOLDOWN_DURATION,
        reductionFactor: GAME_CONFIG.INTIMACY.COOLDOWN_REDUCTION
      };
    }
  }

  // 系统配置统计
  static getSystemStats() {
    const config = GAME_CONFIG;
    return {
      features: {
        proactive_chat: FEATURE_FLAGS.PROACTIVE_CHAT,
        nickname_system: FEATURE_FLAGS.NICKNAME_SYSTEM,
        cooldown_system: FEATURE_FLAGS.COOLDOWN_SYSTEM,
        advanced_analytics: FEATURE_FLAGS.ADVANCED_ANALYTICS,
        payment_integration: FEATURE_FLAGS.PAYMENT_INTEGRATION,
        ab_testing: FEATURE_FLAGS.AB_TESTING
      },
      config: {
        dol_cost_per_message: config.DOL.COST_PER_MESSAGE,
        initial_dol_a: config.DOL.INITIAL_DOL_A,
        initial_dol_b: config.DOL.INITIAL_DOL_B,
        emotion_threshold_a: config.INTIMACY.EMOTION_THRESHOLD_A,
        emotion_threshold_b: config.INTIMACY.EMOTION_THRESHOLD_B,
        cooldown_duration: config.INTIMACY.COOLDOWN_DURATION,
        max_chat_history: config.SYSTEM.MAX_CHAT_HISTORY
      }
    };
  }

  // 获取用户详细分析
  static async getUserAnalysis(userId) {
    try {
      console.log(`📊 开始分析用户 ${userId}...`);

      // 用户基本信息
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // 用户活动历史
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (sessionsError) throw sessionsError;

      // 用户事件历史
      const { data: events, error: eventsError } = await supabase
        .from('ab_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;

      // 分析数据
      const analysis = {
        profile,
        activity: this.analyzeUserActivity(sessions || []),
        intimacy: this.analyzeUserIntimacy(events || []),
        economy: this.analyzeUserEconomy(events || []),
        relationship: this.analyzeUserRelationship(profile),
        engagement: this.analyzeUserEngagement(sessions || [], events || [])
      };

      console.log(`✅ 用户 ${userId} 分析完成`);
      return analysis;

    } catch (error) {
      console.error(`❌ 分析用户 ${userId} 失败:`, error);
      throw error;
    }
  }

  // 分析用户活动模式
  static analyzeUserActivity(sessions) {
    if (!sessions || sessions.length === 0) {
      return {
        total_sessions: 0,
        avg_session_length: 0,
        most_active_hour: null,
        activity_pattern: []
      };
    }

    const hourlyActivity = new Array(24).fill(0);
    let totalLength = 0;

    sessions.forEach(session => {
      const hour = new Date(session.created_at).getHours();
      hourlyActivity[hour]++;
      
      if (session.response_time) {
        totalLength += session.response_time;
      }
    });

    const mostActiveHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const avgSessionLength = sessions.length > 0 ? Math.round(totalLength / sessions.length) : 0;

    return {
      total_sessions: sessions.length,
      avg_session_length: avgSessionLength,
      most_active_hour: mostActiveHour,
      activity_pattern: hourlyActivity
    };
  }

  // 分析用户亲密度变化
  static analyzeUserIntimacy(events) {
    const intimacyEvents = events.filter(e => e.event_type === 'intimacy_gained');
    
    if (intimacyEvents.length === 0) {
      return {
        total_gains: 0,
        avg_gain: 0,
        max_gain: 0,
        growth_rate: 0
      };
    }

    const gains = intimacyEvents.map(e => e.metadata?.intimacy_gain || 0);
    const totalGains = gains.reduce((sum, gain) => sum + gain, 0);
    const avgGain = totalGains / gains.length;
    const maxGain = Math.max(...gains);

    // 计算增长率（最近7天 vs 之前）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentGains = intimacyEvents.filter(e => 
      new Date(e.created_at) >= sevenDaysAgo
    ).reduce((sum, e) => sum + (e.metadata?.intimacy_gain || 0), 0);

    const olderGains = intimacyEvents.filter(e => 
      new Date(e.created_at) < sevenDaysAgo
    ).reduce((sum, e) => sum + (e.metadata?.intimacy_gain || 0), 0);

    const growthRate = olderGains > 0 ? ((recentGains - olderGains) / olderGains * 100) : 0;

    return {
      total_gains: totalGains,
      avg_gain: Math.round(avgGain * 100) / 100,
      max_gain: maxGain,
      growth_rate: Math.round(growthRate * 100) / 100
    };
  }

  // 分析用户经济行为
  static analyzeUserEconomy(events) {
    const dolEvents = events.filter(e => e.event_type === 'dol_consumed');
    const paymentEvents = events.filter(e => e.event_type === 'payment_completed');

    const totalSpent = dolEvents.reduce((sum, e) => sum + (e.metadata?.amount || 0), 0);
    const totalRecharged = paymentEvents.reduce((sum, e) => sum + (e.metadata?.amount_cny || 0), 0);

    return {
      total_spent: totalSpent,
      total_recharged: totalRecharged,
      payment_count: paymentEvents.length,
      spending_frequency: dolEvents.length
    };
  }

  // 分析用户关系状态
  static analyzeUserRelationship(profile) {
    if (!profile) {
      return {
        current_level: null,
        days_together: 0,
        next_milestone: null
      };
    }

    const { RelationshipService } = require('./relationship.js');
    const stats = RelationshipService.getRelationshipStats(profile);

    return {
      current_level: stats.currentLevel,
      days_together: stats.daysInRelationship,
      next_milestone: stats.nextLevel
    };
  }

  // 分析用户参与度
  static analyzeUserEngagement(sessions, events) {
    const now = new Date();
    const last7Days = sessions.filter(s => 
      (now - new Date(s.created_at)) / (1000 * 60 * 60 * 24) <= 7
    ).length;

    const last30Days = sessions.filter(s => 
      (now - new Date(s.created_at)) / (1000 * 60 * 60 * 24) <= 30
    ).length;

    const engagementScore = this.calculateEngagementScore(sessions, events);

    return {
      sessions_last_7_days: last7Days,
      sessions_last_30_days: last30Days,
      engagement_score: engagementScore,
      engagement_level: this.getEngagementLevel(engagementScore)
    };
  }

  // 计算参与度分数
  static calculateEngagementScore(sessions, events) {
    const now = new Date();
    const last7Days = 7 * 24 * 60 * 60 * 1000;

    // 最近7天的活动
    const recentSessions = sessions.filter(s => 
      (now - new Date(s.created_at)) < last7Days
    );

    const recentEvents = events.filter(e => 
      (now - new Date(e.created_at)) < last7Days
    );

    // 计算分数（0-100）
    let score = 0;
    
    // 会话频率 (0-40分)
    score += Math.min(40, recentSessions.length * 2);
    
    // 事件活跃度 (0-30分)
    score += Math.min(30, recentEvents.length);
    
    // 平均响应时间奖励 (0-20分)
    if (recentSessions.length > 0) {
      const avgResponseTime = recentSessions.reduce((sum, s) => 
        sum + (s.response_time || 0), 0) / recentSessions.length;
      
      if (avgResponseTime < 5000) score += 20; // 快速响应
      else if (avgResponseTime < 10000) score += 10;
    }
    
    // 持续性奖励 (0-10分)
    const consistentDays = this.calculateConsistentDays(sessions);
    score += Math.min(10, consistentDays);

    return Math.min(100, score);
  }

  // 计算连续活跃天数
  static calculateConsistentDays(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    const dates = [...new Set(sessions.map(s => 
      new Date(s.created_at).toDateString()
    ))].sort();

    let consistent = 1;
    for (let i = 1; i < dates.length; i++) {
      const current = new Date(dates[i]);
      const previous = new Date(dates[i-1]);
      const dayDiff = (current - previous) / (1000 * 60 * 60 * 24);
      
      if (dayDiff <= 1) {
        consistent++;
      } else {
        break;
      }
    }

    return consistent;
  }

  // 获取参与度等级
  static getEngagementLevel(score) {
    if (score >= 80) return '极高';
    if (score >= 60) return '高';
    if (score >= 40) return '中等';
    if (score >= 20) return '低';
    return '极低';
  }

  // 获取系统健康状态
  static async getSystemHealth() {
    try {
      const health = {
        database: await this.checkDatabaseHealth(),
        apis: await this.checkAPIsHealth(),
        features: this.checkFeaturesHealth(),
        performance: await this.checkPerformanceHealth()
      };

      const overallHealth = this.calculateOverallHealth(health);

      return {
        ...health,
        overall: overallHealth,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 获取系统健康状态失败:', error);
      return {
        overall: 'critical',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 检查数据库健康状态
  static async checkDatabaseHealth() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .limit(1);

      return {
        status: error ? 'unhealthy' : 'healthy',
        error: error?.message,
        response_time: 'normal'
      };
    } catch (error) {
      return {
        status: 'critical',
        error: error.message,
        response_time: 'slow'
      };
    }
  }

  // 检查API健康状态
  static async checkAPIsHealth() {
    const apis = {
      openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'missing',
      huggingface: process.env.HUGGINGFACE_API_KEY ? 'configured' : 'missing',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'missing'
    };

    const healthyCount = Object.values(apis).filter(status => status === 'configured').length;
    const overallStatus = healthyCount === 3 ? 'healthy' : 
                         healthyCount >= 2 ? 'degraded' : 'unhealthy';

    return {
      status: overallStatus,
      apis,
      configured_count: healthyCount
    };
  }

  // 检查功能健康状态
  static checkFeaturesHealth() {
    const features = Object.entries(FEATURE_FLAGS).map(([key, enabled]) => ({
      name: key,
      enabled,
      status: enabled ? 'active' : 'disabled'
    }));

    const activeCount = features.filter(f => f.enabled).length;

    return {
      features,
      active_count: activeCount,
      total_count: features.length,
      status: activeCount > 0 ? 'healthy' : 'degraded'
    };
  }

  // 检查性能健康状态
  static async checkPerformanceHealth() {
    try {
      // 检查最近消息的平均响应时间
      const { data: recentSessions, error } = await supabase
        .from('sessions')
        .select('response_time')
        .not('response_time', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      let avgResponseTime = 0;
      if (recentSessions && recentSessions.length > 0) {
        const totalTime = recentSessions.reduce((sum, s) => sum + s.response_time, 0);
        avgResponseTime = totalTime / recentSessions.length;
      }

      const status = avgResponseTime < 5000 ? 'excellent' :
                     avgResponseTime < 10000 ? 'good' :
                     avgResponseTime < 20000 ? 'slow' : 'critical';

      return {
        status,
        avg_response_time: Math.round(avgResponseTime),
        sample_size: recentSessions?.length || 0
      };

    } catch (error) {
      return {
        status: 'unknown',
        error: error.message,
        avg_response_time: 0,
        sample_size: 0
      };
    }
  }

  // 计算整体健康状态
  static calculateOverallHealth(health) {
    const scores = {
      healthy: 3,
      excellent: 3,
      good: 2,
      degraded: 1,
      slow: 1,
      unhealthy: 0,
      critical: 0,
      unknown: 0
    };

    const dbScore = scores[health.database?.status] || 0;
    const apiScore = scores[health.apis?.status] || 0;
    const featureScore = scores[health.features?.status] || 0;
    const perfScore = scores[health.performance?.status] || 0;

    const totalScore = dbScore + apiScore + featureScore + perfScore;
    const maxScore = 12;

    if (totalScore >= 10) return 'healthy';
    if (totalScore >= 8) return 'degraded';
    if (totalScore >= 4) return 'unhealthy';
    return 'critical';
  }
} 