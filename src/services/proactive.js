import { GAME_CONFIG, MESSAGE_TEMPLATES, FEATURE_FLAGS } from '../config/settings.js';
import { ProfileService, SessionService } from './database.js';
import { RelationshipService } from './relationship.js';
import cron from 'node-cron';

export class ProactiveChatService {
  static isEnabled = FEATURE_FLAGS.PROACTIVE_CHAT;
  static scheduledTask = null;

  // 启动主动私聊调度器
  static startScheduler(discordClient) {
    if (!this.isEnabled) {
      console.log('🔇 主动私聊功能已禁用');
      return;
    }

    const config = GAME_CONFIG.PROACTIVE_CHAT;
    console.log(`🔄 启动主动私聊调度器，检查间隔: ${config.CHECK_INTERVAL}`);

    this.scheduledTask = cron.schedule(config.CHECK_INTERVAL, async () => {
      console.log('🕐 执行主动私聊检查...');
      await this.checkAndSendProactiveMessages(discordClient);
    }, {
      scheduled: true,
      timezone: "Asia/Shanghai"
    });

    console.log('✅ 主动私聊调度器启动成功');
  }

  // 停止调度器
  static stopScheduler() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      console.log('🔇 主动私聊调度器已停止');
    }
  }

  // 检查并发送主动消息
  static async checkAndSendProactiveMessages(discordClient) {
    try {
      const config = GAME_CONFIG.PROACTIVE_CHAT;
      console.log('🔍 开始检查需要主动私聊的用户...');

      // 获取符合条件的用户
      const eligibleUsers = await this.getEligibleUsers();
      console.log(`👥 找到 ${eligibleUsers.length} 个符合条件的用户`);

      for (const userProfile of eligibleUsers) {
        try {
          console.log(`📤 准备向用户 ${userProfile.user_id} 发送主动消息`);
          
          // 检查今日是否已发送过主动消息
          const todayMessageCount = await this.getTodayProactiveMessageCount(userProfile.user_id);
          if (todayMessageCount >= config.MAX_DAILY_MESSAGES) {
            console.log(`⏭️  用户 ${userProfile.user_id} 今日已达到最大主动消息数 (${todayMessageCount}/${config.MAX_DAILY_MESSAGES})`);
            continue;
          }

          // 检查冷却时间
          const lastProactiveTime = await this.getLastProactiveMessageTime(userProfile.user_id);
          if (lastProactiveTime && this.isInCooldown(lastProactiveTime, config.COOLDOWN_HOURS)) {
            console.log(`⏳ 用户 ${userProfile.user_id} 仍在冷却时间内`);
            continue;
          }

          // 生成并发送主动消息
          const success = await this.sendProactiveMessage(discordClient, userProfile);
          if (success) {
            console.log(`✅ 成功向用户 ${userProfile.user_id} 发送主动消息`);
            
            // 记录主动消息
            await this.recordProactiveMessage(userProfile.user_id);
            
            // 添加小延迟，避免过于频繁
            await this.sleep(2000);
          } else {
            console.log(`❌ 向用户 ${userProfile.user_id} 发送主动消息失败`);
          }

        } catch (userError) {
          console.error(`❌ 处理用户 ${userProfile.user_id} 时出错:`, userError);
        }
      }

      console.log('✅ 主动私聊检查完成');

    } catch (error) {
      console.error('❌ 主动私聊检查过程中出错:', error);
    }
  }

  // 获取符合主动私聊条件的用户
  static async getEligibleUsers() {
    const config = GAME_CONFIG.PROACTIVE_CHAT;
    
    try {
      // 查询符合条件的用户：亲密度 >= 最低要求 且 最后消息时间超过指定小时数
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          intimacy,
          dol,
          ab_group,
          created_at,
          updated_at
        `)
        .gte('intimacy', config.MIN_INTIMACY);

      if (error) {
        console.error('❌ 查询符合条件的用户失败:', error);
        return [];
      }

      if (!users || users.length === 0) {
        console.log('📭 没有找到符合亲密度要求的用户');
        return [];
      }

      console.log(`📊 找到 ${users.length} 个亲密度符合要求的用户`);

      // 进一步筛选：检查最后活跃时间
      const eligibleUsers = [];
      
      for (const user of users) {
        const lastActiveTime = await this.getLastActiveTime(user.user_id);
        
        if (lastActiveTime && this.isInactive(lastActiveTime, config.INACTIVE_HOURS)) {
          eligibleUsers.push(user);
          console.log(`✅ 用户 ${user.user_id} 符合条件 (亲密度: ${user.intimacy}, 上次活跃: ${lastActiveTime})`);
        }
      }

      return eligibleUsers;

    } catch (error) {
      console.error('❌ 获取符合条件的用户时出错:', error);
      return [];
    }
  }

  // 获取用户最后活跃时间
  static async getLastActiveTime(userId) {
    try {
      const { data: lastSession, error } = await supabase
        .from('sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`❌ 获取用户 ${userId} 最后活跃时间失败:`, error);
        return null;
      }

      return lastSession ? new Date(lastSession.created_at) : null;
    } catch (error) {
      console.error(`❌ 查询用户 ${userId} 最后活跃时间时出错:`, error);
      return null;
    }
  }

  // 检查用户是否处于非活跃状态
  static isInactive(lastActiveTime, inactiveHours) {
    const now = new Date();
    const hoursSinceLastActive = (now - lastActiveTime) / (1000 * 60 * 60);
    return hoursSinceLastActive >= inactiveHours;
  }

  // 检查是否在冷却时间内
  static isInCooldown(lastTime, cooldownHours) {
    const now = new Date();
    const hoursSinceLast = (now - lastTime) / (1000 * 60 * 60);
    return hoursSinceLast < cooldownHours;
  }

  // 获取今日主动消息数量
  static async getTodayProactiveMessageCount(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: events, error } = await supabase
        .from('ab_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'proactive_message_sent')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        console.error(`❌ 查询用户 ${userId} 今日主动消息数失败:`, error);
        return 0;
      }

      return events ? events.length : 0;
    } catch (error) {
      console.error(`❌ 获取用户 ${userId} 今日主动消息数时出错:`, error);
      return 0;
    }
  }

  // 获取最后一次主动消息时间
  static async getLastProactiveMessageTime(userId) {
    try {
      const { data: lastEvent, error } = await supabase
        .from('ab_events')
        .select('created_at')
        .eq('user_id', userId)
        .eq('event_type', 'proactive_message_sent')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ 获取用户 ${userId} 最后主动消息时间失败:`, error);
        return null;
      }

      return lastEvent ? new Date(lastEvent.created_at) : null;
    } catch (error) {
      console.error(`❌ 查询用户 ${userId} 最后主动消息时间时出错:`, error);
      return null;
    }
  }

  // 发送主动消息
  static async sendProactiveMessage(discordClient, userProfile) {
    try {
      // 生成个性化的主动消息
      const message = this.generateProactiveMessage(userProfile);
      console.log(`📝 生成的主动消息: "${message.substring(0, 50)}..."`);

      // 获取用户对象
      const user = await discordClient.users.fetch(userProfile.user_id);
      if (!user) {
        console.error(`❌ 无法找到用户 ${userProfile.user_id}`);
        return false;
      }

      // 发送私信
      await user.send(message);
      console.log(`✅ 成功向用户 ${userProfile.user_id} 发送主动私信`);

      return true;

    } catch (error) {
      console.error(`❌ 向用户 ${userProfile.user_id} 发送主动消息失败:`, error);
      
      // 如果是权限问题，记录但不报错
      if (error.code === 50007) {
        console.log(`🔒 用户 ${userProfile.user_id} 已关闭私信接收`);
      }
      
      return false;
    }
  }

  // 生成个性化的主动消息
  static generateProactiveMessage(userProfile) {
    const hour = new Date().getHours();
    const nickname = RelationshipService.getNickname(userProfile.intimacy);
    const level = RelationshipService.getRelationshipLevel(userProfile.intimacy);
    
    let messageType;
    if (hour >= 6 && hour < 12) {
      messageType = 'MORNING';
    } else if (hour >= 18 && hour < 24) {
      messageType = 'EVENING';  
    } else {
      messageType = 'MISS_YOU';
    }

    const templates = MESSAGE_TEMPLATES.PROACTIVE[messageType];
    const template = templates[Math.floor(Math.random() * templates.length)];

    return template
      .replace('{nickname}', nickname)
      .replace('{emoji}', level.emoji);
  }

  // 记录主动消息事件
  static async recordProactiveMessage(userId) {
    try {
      await ProfileService.logABEvent(userId, 'proactive_message_sent', 'SYSTEM', {
        timestamp: new Date().toISOString(),
        message_type: 'proactive_chat'
      });
    } catch (error) {
      console.error(`❌ 记录用户 ${userId} 主动消息事件失败:`, error);
    }
  }

  // 工具函数：等待指定时间
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 手动触发主动消息检查（用于测试）
  static async triggerManualCheck(discordClient) {
    console.log('🔧 手动触发主动私聊检查...');
    await this.checkAndSendProactiveMessages(discordClient);
  }

  // 获取主动私聊统计信息
  static async getProactiveStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayEvents, error } = await supabase
        .from('ab_events')
        .select('user_id')
        .eq('event_type', 'proactive_message_sent')
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        console.error('❌ 获取主动私聊统计失败:', error);
        return null;
      }

      return {
        todayCount: todayEvents ? todayEvents.length : 0,
        uniqueUsers: todayEvents ? new Set(todayEvents.map(e => e.user_id)).size : 0,
        isEnabled: this.isEnabled,
        schedulerStatus: this.scheduledTask ? 'running' : 'stopped'
      };

    } catch (error) {
      console.error('❌ 获取主动私聊统计时出错:', error);
      return null;
    }
  }
} 