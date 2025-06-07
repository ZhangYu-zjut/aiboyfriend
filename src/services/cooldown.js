import { GAME_CONFIG, FEATURE_FLAGS } from '../config/settings.js';
import { ProfileService } from './database.js';

export class CooldownService {
  static isEnabled = FEATURE_FLAGS.COOLDOWN_SYSTEM;
  static userCooldowns = new Map(); // 内存缓存用户冷却状态

  // 检查用户是否在冷却期
  static async isUserInCooldown(userId) {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const config = GAME_CONFIG.INTIMACY;
      
      // 先检查内存缓存
      const cachedCooldown = this.userCooldowns.get(userId);
      if (cachedCooldown) {
        const now = Date.now();
        if (now < cachedCooldown.expiresAt) {
          console.log(`⏳ 用户 ${userId} 仍在冷却期内 (剩余: ${Math.ceil((cachedCooldown.expiresAt - now) / 1000)}秒)`);
          return true;
        } else {
          // 冷却期已过，清除缓存
          this.userCooldowns.delete(userId);
        }
      }

      // 从数据库查询最后一次有亲密度增长的时间
      const lastIntimacyGainTime = await this.getLastIntimacyGainTime(userId);
      
      if (!lastIntimacyGainTime) {
        console.log(`📊 用户 ${userId} 没有亲密度增长记录，无冷却限制`);
        return false;
      }

      const now = new Date();
      const timeDiff = (now - lastIntimacyGainTime) / 1000; // 秒
      const isInCooldown = timeDiff < config.COOLDOWN_DURATION;

      if (isInCooldown) {
        const remainingTime = config.COOLDOWN_DURATION - timeDiff;
        const expiresAt = Date.now() + (remainingTime * 1000);
        
        // 缓存冷却状态
        this.userCooldowns.set(userId, {
          startTime: lastIntimacyGainTime,
          expiresAt,
          remainingSeconds: Math.ceil(remainingTime)
        });

        console.log(`⏳ 用户 ${userId} 在冷却期内 (剩余: ${Math.ceil(remainingTime)}秒)`);
        return true;
      }

      console.log(`✅ 用户 ${userId} 冷却期已结束`);
      return false;

    } catch (error) {
      console.error(`❌ 检查用户 ${userId} 冷却状态时出错:`, error);
      // 出错时默认不在冷却期，避免影响正常功能
      return false;
    }
  }

  // 应用冷却减成到亲密度增长
  static applyCooldownReduction(userId, originalGain) {
    if (!this.isEnabled || originalGain <= 0) {
      return originalGain;
    }

    const cachedCooldown = this.userCooldowns.get(userId);
    if (cachedCooldown) {
      const config = GAME_CONFIG.INTIMACY;
      const reducedGain = Math.floor(originalGain * config.COOLDOWN_REDUCTION);
      
      console.log(`🔄 冷却减成: 用户 ${userId} 亲密度增长 ${originalGain} → ${reducedGain} (减成系数: ${config.COOLDOWN_REDUCTION})`);
      return reducedGain;
    }

    return originalGain;
  }

  // 设置用户冷却状态
  static setUserCooldown(userId, intimacyGain) {
    if (!this.isEnabled || intimacyGain <= 0) {
      return;
    }

    const config = GAME_CONFIG.INTIMACY;
    const now = Date.now();
    const expiresAt = now + (config.COOLDOWN_DURATION * 1000);

    this.userCooldowns.set(userId, {
      startTime: new Date(),
      expiresAt,
      remainingSeconds: config.COOLDOWN_DURATION,
      lastIntimacyGain: intimacyGain
    });

    console.log(`⏱️  设置用户 ${userId} 冷却状态，持续 ${config.COOLDOWN_DURATION}秒`);
  }

  // 获取用户最后一次亲密度增长时间
  static async getLastIntimacyGainTime(userId) {
    try {
      const { data: lastEvent, error } = await supabase
        .from('ab_events')
        .select('created_at, metadata')
        .eq('user_id', userId)
        .eq('event_type', 'intimacy_gained')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error(`❌ 获取用户 ${userId} 最后亲密度增长时间失败:`, error);
        return null;
      }

      return lastEvent ? new Date(lastEvent.created_at) : null;
    } catch (error) {
      console.error(`❌ 查询用户 ${userId} 最后亲密度增长时间时出错:`, error);
      return null;
    }
  }

  // 记录亲密度增长事件
  static async recordIntimacyGain(userId, gain, het, emotionScore) {
    if (!this.isEnabled || gain <= 0) {
      return;
    }

    try {
      await ProfileService.logABEvent(userId, 'intimacy_gained', 'SYSTEM', {
        intimacy_gain: gain,
        het_value: het,
        emotion_score: emotionScore,
        timestamp: new Date().toISOString(),
        cooldown_applied: this.userCooldowns.has(userId)
      });

      console.log(`📝 记录用户 ${userId} 亲密度增长事件: +${gain}`);
    } catch (error) {
      console.error(`❌ 记录用户 ${userId} 亲密度增长事件失败:`, error);
    }
  }

  // 获取用户冷却状态信息
  static getUserCooldownInfo(userId) {
    if (!this.isEnabled) {
      return {
        inCooldown: false,
        enabled: false
      };
    }

    const cachedCooldown = this.userCooldowns.get(userId);
    
    if (cachedCooldown) {
      const now = Date.now();
      const remainingMs = Math.max(0, cachedCooldown.expiresAt - now);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      
      return {
        inCooldown: remainingMs > 0,
        enabled: true,
        startTime: cachedCooldown.startTime,
        remainingSeconds,
        lastIntimacyGain: cachedCooldown.lastIntimacyGain || 0,
        reductionFactor: GAME_CONFIG.INTIMACY.COOLDOWN_REDUCTION
      };
    }

    return {
      inCooldown: false,
      enabled: true,
      remainingSeconds: 0
    };
  }

  // 清除用户冷却状态（管理员功能）
  static clearUserCooldown(userId) {
    if (this.userCooldowns.has(userId)) {
      this.userCooldowns.delete(userId);
      console.log(`🔧 管理员清除用户 ${userId} 的冷却状态`);
      return true;
    }
    return false;
  }

  // 获取系统冷却统计
  static getCooldownStats() {
    const activeUsers = this.userCooldowns.size;
    const config = GAME_CONFIG.INTIMACY;
    
    return {
      enabled: this.isEnabled,
      activeUsers,
      cooldownDuration: config.COOLDOWN_DURATION,
      reductionFactor: config.COOLDOWN_REDUCTION,
      totalMemoryUsers: this.userCooldowns.size
    };
  }

  // 清理过期的冷却缓存
  static cleanExpiredCooldowns() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, cooldown] of this.userCooldowns.entries()) {
      if (now >= cooldown.expiresAt) {
        this.userCooldowns.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 清理 ${cleanedCount} 个过期的冷却缓存`);
    }

    return cleanedCount;
  }

  // 定期清理过期缓存
  static startCleanupTask() {
    if (!this.isEnabled) {
      return;
    }

    // 每10分钟清理一次过期缓存
    setInterval(() => {
      this.cleanExpiredCooldowns();
    }, 10 * 60 * 1000);

    console.log('🔄 启动冷却缓存清理任务 (每10分钟)');
  }

  // 批量检查多个用户的冷却状态
  static async batchCheckCooldowns(userIds) {
    if (!this.isEnabled) {
      return userIds.map(id => ({ userId: id, inCooldown: false }));
    }

    const results = [];
    
    for (const userId of userIds) {
      const inCooldown = await this.isUserInCooldown(userId);
      results.push({ userId, inCooldown });
    }

    return results;
  }

  // 获取用户冷却历史
  static async getUserCooldownHistory(userId, limit = 10) {
    try {
      const { data: events, error } = await supabase
        .from('ab_events')
        .select('created_at, metadata')
        .eq('user_id', userId)
        .eq('event_type', 'intimacy_gained')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`❌ 获取用户 ${userId} 冷却历史失败:`, error);
        return [];
      }

      return events || [];
    } catch (error) {
      console.error(`❌ 查询用户 ${userId} 冷却历史时出错:`, error);
      return [];
    }
  }
} 