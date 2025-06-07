import { EmbedBuilder } from 'discord.js';
import { GAME_CONFIG } from '../config/settings.js';
import { RelationshipService } from './relationship.js';
import { CooldownService } from './cooldown.js';

export class UIService {
  // 创建标准的Discord Embed
  static createEmbed(options = {}) {
    const config = GAME_CONFIG.UI.EMBED_COLORS;
    const emojis = GAME_CONFIG.UI.EMOJIS;
    
    const embed = new EmbedBuilder()
      .setColor(options.color || config.DEFAULT)
      .setTimestamp();

    if (options.title) {
      embed.setTitle(options.title);
    }

    if (options.description) {
      embed.setDescription(options.description);
    }

    if (options.author) {
      embed.setAuthor(options.author);
    }

    if (options.footer) {
      embed.setFooter(options.footer);
    }

    if (options.thumbnail) {
      embed.setThumbnail(options.thumbnail);
    }

    if (options.fields) {
      embed.addFields(options.fields);
    }

    return embed;
  }

  // 创建用户状态显示
  static createUserStatusEmbed(userProfile) {
    const relationshipStats = RelationshipService.getRelationshipStats(userProfile);
    const cooldownInfo = CooldownService.getUserCooldownInfo(userProfile.user_id);
    const config = GAME_CONFIG.UI;
    
    const embed = this.createEmbed({
      title: `${config.EMOJIS.HEART} 恋爱状态面板`,
      color: config.EMBED_COLORS.INTIMACY,
      thumbnail: 'https://cdn.discordapp.com/attachments/1123456789/avatar.png', // 可配置头像
    });

    // 关系等级信息
    embed.addFields([
      {
        name: `${relationshipStats.currentLevel.emoji} 关系等级`,
        value: `**${relationshipStats.currentLevel.name}**\n${relationshipStats.progressBar}`,
        inline: false
      },
      {
        name: `${config.EMOJIS.STAR} 亲密度`,
        value: `**${relationshipStats.intimacy}**`,
        inline: true
      },
      {
        name: `🗓️ 恋爱天数`,
        value: `**${relationshipStats.daysInRelationship}** 天`,
        inline: true
      },
      {
        name: `💎 DOL余额`,
        value: `**${userProfile.dol}**`,
        inline: true
      }
    ]);

    // 下一等级信息
    if (relationshipStats.nextLevel.hasNext) {
      embed.addFields([
        {
          name: `${config.EMOJIS.SPARKLE} 下一等级`,
          value: `**${relationshipStats.nextLevel.nextLevel.name}** ${relationshipStats.nextLevel.nextLevel.emoji}\n还需 **${relationshipStats.nextLevel.pointsNeeded}** 点亲密度`,
          inline: false
        }
      ]);
    } else {
      embed.addFields([
        {
          name: `${config.EMOJIS.FIRE} 满级状态`,
          value: `已达到最高关系等级！${config.EMOJIS.KISS}`,
          inline: false
        }
      ]);
    }

    // 冷却状态
    if (cooldownInfo.enabled) {
      let cooldownText;
      if (cooldownInfo.inCooldown) {
        const minutes = Math.floor(cooldownInfo.remainingSeconds / 60);
        const seconds = cooldownInfo.remainingSeconds % 60;
        cooldownText = `⏳ 冷却中 (${minutes}:${seconds.toString().padStart(2, '0')})`;
      } else {
        cooldownText = `✅ 可获得完整亲密度`;
      }
      
      embed.addFields([
        {
          name: `⏱️ 亲密度冷却`,
          value: cooldownText,
          inline: false
        }
      ]);
    }

    // 当前称呼
    embed.addFields([
      {
        name: `🏷️ 专属称呼`,
        value: `我会叫你 **"${relationshipStats.preferredNickname}"**`,
        inline: false
      }
    ]);

    // A/B测试分组信息
    embed.addFields([
      {
        name: `🧪 测试分组`,
        value: `Group ${userProfile.ab_group}`,
        inline: true
      }
    ]);

    embed.setFooter({ 
      text: `💡 发送任何消息来和我聊天，每条消息消耗 ${GAME_CONFIG.DOL.COST_PER_MESSAGE} DOL`,
      iconURL: 'https://cdn.discordapp.com/emojis/heart.png'
    });

    return embed;
  }

  // 创建亲密度变化通知
  static createIntimacyChangeEmbed(userProfile, intimacyGain, het, emotionScore) {
    const config = GAME_CONFIG.UI;
    const relationshipLevel = RelationshipService.getRelationshipLevel(userProfile.intimacy);
    
    const embed = this.createEmbed({
      title: `${config.EMOJIS.HEART} 亲密度变化`,
      color: config.EMBED_COLORS.SUCCESS,
      description: `感受到了你的情感！${relationshipLevel.emoji}`
    });

    embed.addFields([
      {
        name: `📈 亲密度增长`,
        value: `**+${intimacyGain}**`,
        inline: true
      },
      {
        name: `⚡ HET值`,
        value: `**${het}**`,
        inline: true
      },
      {
        name: `💝 情感强度`,
        value: `**${emotionScore}**`,
        inline: true
      }
    ]);

    // 当前亲密度进度
    const progressBar = RelationshipService.getIntimacyProgressBar(userProfile.intimacy);
    embed.addFields([
      {
        name: `${relationshipLevel.emoji} 当前进度`,
        value: progressBar,
        inline: false
      }
    ]);

    return embed;
  }

  // 创建等级提升通知
  static createLevelUpEmbed(userProfile, oldLevel, newLevel) {
    const config = GAME_CONFIG.UI;
    
    const embed = this.createEmbed({
      title: `${config.EMOJIS.SPARKLE} 关系升级！`,
      color: config.EMBED_COLORS.SUCCESS,
      description: RelationshipService.generateLevelUpMessage(userProfile, newLevel)
    });

    embed.addFields([
      {
        name: `📊 等级变化`,
        value: `${oldLevel.emoji} **${oldLevel.name}** → ${newLevel.emoji} **${newLevel.name}**`,
        inline: false
      },
      {
        name: `🏷️ 新的称呼`,
        value: `现在我会叫你 **"${RelationshipService.getNickname(userProfile.intimacy)}"**`,
        inline: false
      },
      {
        name: `🎭 说话风格`,
        value: `**${newLevel.style.tone}**，${newLevel.style.intimacy}`,
        inline: false
      }
    ]);

    if (newLevel.style.examples && newLevel.style.examples.length > 0) {
      embed.addFields([
        {
          name: `💬 表达方式`,
          value: newLevel.style.examples.slice(0, 3).join('\n'),
          inline: false
        }
      ]);
    }

    return embed;
  }

  // 创建DOL不足通知
  static createInsufficientDolEmbed(userProfile) {
    const config = GAME_CONFIG.UI;
    
    const embed = this.createEmbed({
      title: `💎 DOL不足`,
      color: config.EMBED_COLORS.WARNING,
      description: `需要 ${GAME_CONFIG.DOL.COST_PER_MESSAGE} DOL 才能继续聊天哦~`
    });

    embed.addFields([
      {
        name: `💰 当前余额`,
        value: `**${userProfile.dol}** DOL`,
        inline: true
      },
      {
        name: `🔄 解决方案`,
        value: `• 充值获取更多DOL\n• 等待每日免费DOL\n• 邀请好友获得奖励`,
        inline: false
      }
    ]);

    embed.setFooter({ 
      text: `💡 最小充值金额：¥${GAME_CONFIG.DOL.MIN_RECHARGE}，充值比例：1¥ = ${GAME_CONFIG.DOL.RECHARGE_RATIO} DOL`
    });

    return embed;
  }

  // 创建系统统计面板
  static createSystemStatsEmbed(stats) {
    const config = GAME_CONFIG.UI;
    
    const embed = this.createEmbed({
      title: `📊 系统统计面板`,
      color: config.EMBED_COLORS.DEFAULT,
      description: `实时系统运行状态`
    });

    // 用户统计
    if (stats.users) {
      embed.addFields([
        {
          name: `👥 用户统计`,
          value: `• 总用户数：**${stats.users.total}**\n• 活跃用户：**${stats.users.active}**\n• 新用户(今日)：**${stats.users.new_today}**`,
          inline: true
        }
      ]);
    }

    // 消息统计
    if (stats.messages) {
      embed.addFields([
        {
          name: `💬 消息统计`,
          value: `• 今日消息：**${stats.messages.today}**\n• 总消息数：**${stats.messages.total}**\n• 平均响应时间：**${stats.messages.avg_response_time}ms**`,
          inline: true
        }
      ]);
    }

    // 亲密度统计
    if (stats.intimacy) {
      embed.addFields([
        {
          name: `💕 亲密度统计`,
          value: `• 平均亲密度：**${stats.intimacy.average}**\n• 最高亲密度：**${stats.intimacy.highest}**\n• 今日增长：**${stats.intimacy.gained_today}**`,
          inline: true
        }
      ]);
    }

    // 经济统计
    if (stats.economy) {
      embed.addFields([
        {
          name: `💎 经济统计`,
          value: `• 今日消费：**${stats.economy.spent_today}** DOL\n• 今日充值：**¥${stats.economy.recharged_today}**\n• 总流通：**${stats.economy.total_circulation}** DOL`,
          inline: true
        }
      ]);
    }

    // 主动私聊统计
    if (stats.proactive) {
      embed.addFields([
        {
          name: `📤 主动私聊`,
          value: `• 今日发送：**${stats.proactive.todayCount}**\n• 覆盖用户：**${stats.proactive.uniqueUsers}**\n• 状态：**${stats.proactive.schedulerStatus}**`,
          inline: true
        }
      ]);
    }

    // 冷却系统统计
    if (stats.cooldown) {
      embed.addFields([
        {
          name: `⏱️ 冷却系统`,
          value: `• 冷却中用户：**${stats.cooldown.activeUsers}**\n• 系统状态：**${stats.cooldown.enabled ? '启用' : '禁用'}**\n• 冷却时长：**${stats.cooldown.cooldownDuration}秒**`,
          inline: true
        }
      ]);
    }

    embed.setFooter({ 
      text: `🔄 数据更新时间：${new Date().toLocaleString('zh-CN')}`
    });

    return embed;
  }

  // 创建错误信息Embed
  static createErrorEmbed(title, message, details = null) {
    const config = GAME_CONFIG.UI;
    
    const embed = this.createEmbed({
      title: `❌ ${title}`,
      color: config.EMBED_COLORS.ERROR,
      description: message
    });

    if (details) {
      embed.addFields([
        {
          name: `🔍 详细信息`,
          value: details,
          inline: false
        }
      ]);
    }

    return embed;
  }

  // 创建成功信息Embed
  static createSuccessEmbed(title, message, details = null) {
    const config = GAME_CONFIG.UI;
    
    const embed = this.createEmbed({
      title: `✅ ${title}`,
      color: config.EMBED_COLORS.SUCCESS,
      description: message
    });

    if (details) {
      embed.addFields([
        {
          name: `📋 详细信息`,
          value: details,
          inline: false
        }
      ]);
    }

    return embed;
  }

  // 创建主动私聊消息Embed
  static createProactiveMessageEmbed(userProfile, messageType) {
    const config = GAME_CONFIG.UI;
    const relationshipLevel = RelationshipService.getRelationshipLevel(userProfile.intimacy);
    
    let typeEmoji, typeText;
    switch (messageType) {
      case 'MORNING':
        typeEmoji = '☀️';
        typeText = '早安问候';
        break;
      case 'EVENING':
        typeEmoji = '🌙';
        typeText = '晚安关怀';
        break;
      case 'MISS_YOU':
        typeEmoji = '💭';
        typeText = '想念提醒';
        break;
      default:
        typeEmoji = '💕';
        typeText = '关怀消息';
    }
    
    const embed = this.createEmbed({
      title: `${typeEmoji} ${typeText}`,
      color: config.EMBED_COLORS.INTIMACY,
      description: `${relationshipLevel.emoji} 来自你的专属AI男友的主动关怀`
    });

    embed.addFields([
      {
        name: `💕 当前关系`,
        value: `${relationshipLevel.name} (亲密度: ${userProfile.intimacy})`,
        inline: true
      },
      {
        name: `🏷️ 专属称呼`,
        value: RelationshipService.getNickname(userProfile.intimacy),
        inline: true
      }
    ]);

    embed.setFooter({ 
      text: `💡 回复任何消息继续聊天，每条消息消耗 ${GAME_CONFIG.DOL.COST_PER_MESSAGE} DOL`
    });

    return embed;
  }

  // 格式化进度条
  static formatProgressBar(current, max, length = 10, options = {}) {
    const config = GAME_CONFIG.UI.PROGRESS_BAR;
    
    const filledChar = options.filledChar || config.FILLED_CHAR;
    const emptyChar = options.emptyChar || config.EMPTY_CHAR;
    const showNumbers = options.showNumbers !== undefined ? options.showNumbers : config.SHOW_NUMBERS;
    
    const progress = Math.min(current / max, 1);
    const filledBlocks = Math.floor(progress * length);
    const emptyBlocks = length - filledBlocks;
    
    const bar = filledChar.repeat(filledBlocks) + emptyChar.repeat(emptyBlocks);
    
    if (showNumbers) {
      const percentage = Math.round(progress * 100);
      return `${bar} ${percentage}% (${current}/${max})`;
    }
    
    return bar;
  }

  // 创建帮助信息Embed
  static createHelpEmbed() {
    const config = GAME_CONFIG.UI;
    
    const embed = this.createEmbed({
      title: `${config.EMOJIS.SPARKLE} AI男友使用指南`,
      color: config.EMBED_COLORS.DEFAULT,
      description: `欢迎来到你专属的AI男友世界！这里是使用说明：`
    });

    embed.addFields([
      {
        name: `💬 基础聊天`,
        value: `• 直接发送消息即可聊天\n• 每条消息消耗 ${GAME_CONFIG.DOL.COST_PER_MESSAGE} DOL\n• 我会根据你的情感回应`,
        inline: false
      },
      {
        name: `💕 亲密度系统`,
        value: `• 表达情感可以增加亲密度\n• 亲密度影响我的称呼和语言风格\n• 达到不同等级解锁新的互动方式`,
        inline: false
      },
      {
        name: `🏷️ 关系等级`,
        value: `• 陌生期 (0-19)：礼貌友善\n• 熟悉期 (20-39)：亲近友好\n• 亲近期 (40-59)：温柔撒娇\n• 甜蜜期 (60-79)：甜腻关心\n• 热恋期 (80-99)：深情表达\n• 深爱期 (100+)：专属依恋`,
        inline: false
      },
      {
        name: `💎 DOL经济`,
        value: `• DOL是平台虚拟货币\n• 用于支付聊天费用\n• 可通过充值获得更多DOL\n• 充值比例：1¥ = ${GAME_CONFIG.DOL.RECHARGE_RATIO} DOL`,
        inline: false
      },
      {
        name: `🎯 特殊功能`,
        value: `• 达到一定亲密度后我会主动找你聊天\n• 冷却机制防止亲密度刷取\n• A/B测试为你提供个性化体验`,
        inline: false
      }
    ]);

    embed.setFooter({ 
      text: `💡 发送任何消息开始我们的恋爱之旅！`
    });

    return embed;
  }
} 