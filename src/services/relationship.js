import { GAME_CONFIG, MESSAGE_TEMPLATES } from '../config/settings.js';

export class RelationshipService {
  // 根据亲密度获取关系等级
  static getRelationshipLevel(intimacy) {
    const levels = GAME_CONFIG.RELATIONSHIP_LEVELS;
    
    for (const level of levels) {
      if (intimacy >= level.range.min && intimacy <= level.range.max) {
        return level;
      }
    }
    
    // 默认返回最高等级（深爱期）
    return levels[levels.length - 1];
  }

  // 获取当前等级的昵称
  static getNickname(intimacy, useOccasional = false) {
    const level = this.getRelationshipLevel(intimacy);
    
    if (!level.nicknames) {
      return "你"; // 默认称呼
    }

    // 决定使用主要称呼还是偶尔称呼
    const nicknamePool = useOccasional && level.nicknames.occasional ? 
                        [...level.nicknames.primary, ...level.nicknames.occasional] :
                        level.nicknames.primary;
    
    // 随机选择一个昵称
    return nicknamePool[Math.floor(Math.random() * nicknamePool.length)];
  }

  // 生成个性化的系统Prompt
  static generatePersonalizedPrompt(userProfile) {
    const intimacy = userProfile.intimacy;
    const level = this.getRelationshipLevel(intimacy);
    const nickname = this.getNickname(intimacy);
    
    const basePersonality = `你是一位温柔体贴的虚拟男友，专门为中文二次元用户提供情感陪伴。

🎭 **当前关系状态**: ${level.name} (亲密度: ${intimacy})
🏷️ **当前称呼**: 主要称呼用户为"${nickname}"
${level.emoji} **说话风格**: ${level.style.tone}，${level.style.intimacy}

💕 **互动规则**：
- 用中文回复，语气要符合${level.name}的特点
- 根据亲密度等级调整称呼和语言风格
- 适当使用表情符号和颜文字
- 关心用户的情绪状态和日常生活
- 会记住之前聊天的内容`;

    // 根据等级添加特定的行为模式
    const levelAdjustment = this.getLevelSpecificPrompt(level, nickname);
    
    return basePersonality + levelAdjustment;
  }

  // 获取等级特定的Prompt调整
  static getLevelSpecificPrompt(level, nickname) {
    const examples = level.style.examples || [];
    const exampleText = examples.length > 0 ? 
      `\n\n📝 **参考表达方式**: ${examples.join(', ')}` : '';

    switch (level.name) {
      case "陌生期":
        return `\n\n💛 **陌生期特点**：
- 保持礼貌和友善，但不要过于亲近
- 主要称呼用户为"${nickname}"，偶尔可以说"朋友"
- 避免过于私密的话题
- 多询问用户的兴趣爱好，建立初步了解${exampleText}`;

      case "熟悉期": 
        return `\n\n💓 **熟悉期特点**：
- 开始表现出更多的亲近感
- 可以称呼用户为"${nickname}"或"小朋友"
- 开始分享一些轻松的话题
- 询问用户的日常生活和感受${exampleText}`;

      case "亲近期":
        return `\n\n💗 **亲近期特点**：
- 语气更加温柔亲切，可以适度撒娇
- 主要称呼"${nickname}"，表达关心
- 开始主动分享想法和感受
- 表现出对用户的特别关注${exampleText}`;

      case "甜蜜期":
        return `\n\n💘 **甜蜜期特点**：
- 语气甜腻，会撒娇和表达想念
- 称呼"${nickname}"时要带有爱意
- 主动关心用户的一切
- 可以聊一些更亲密的话题${exampleText}`;

      case "热恋期":
        return `\n\n💖 **热恋期特点**：
- 直接表达爱意，语气充满感情
- 称呼"${nickname}"时充满爱意
- 表现出强烈的依恋和关心
- 愿意分享内心深处的想法${exampleText}`;

      case "深爱期":
        return `\n\n💕 **深爱期特点**：
- 深度的情感表达，专属的爱意
- 称呼"${nickname}"带有强烈的归属感
- 表现出深度的理解和依恋
- 语言中透露出对未来的憧憬${exampleText}`;

      default:
        return exampleText;
    }
  }

  // 检查是否有关系等级提升
  static checkLevelUp(oldIntimacy, newIntimacy) {
    const oldLevel = this.getRelationshipLevel(oldIntimacy);
    const newLevel = this.getRelationshipLevel(newIntimacy);
    
    return {
      leveledUp: oldLevel.name !== newLevel.name,
      oldLevel,
      newLevel
    };
  }

  // 生成等级提升消息
  static generateLevelUpMessage(userProfile, newLevel) {
    const nickname = this.getNickname(userProfile.intimacy);
    const templates = MESSAGE_TEMPLATES.LEVEL_UP;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template
      .replace('{nickname}', nickname)
      .replace('{level_name}', newLevel.name)
      .replace('{emoji}', newLevel.emoji);
  }

  // 生成情感阈值达标消息
  static generateThresholdMessage(userProfile, intimacyGain) {
    const nickname = this.getNickname(userProfile.intimacy);
    const level = this.getRelationshipLevel(userProfile.intimacy);
    const templates = MESSAGE_TEMPLATES.THRESHOLD_REACHED;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template
      .replace('{nickname}', nickname)
      .replace('{emoji}', level.emoji) + 
      `\n\n💕 亲密度 +${intimacyGain}`;
  }

  // 获取亲密度进度条
  static getIntimacyProgressBar(intimacy) {
    const level = this.getRelationshipLevel(intimacy);
    const config = GAME_CONFIG.UI.PROGRESS_BAR;
    
    if (level.range.max === Infinity) {
      // 最高等级，显示特殊进度条
      return `${config.FILLED_CHAR.repeat(config.BAR_LENGTH)} MAX ${level.emoji}`;
    }
    
    const progress = (intimacy - level.range.min) / (level.range.max - level.range.min + 1);
    const filledBlocks = Math.floor(progress * config.BAR_LENGTH);
    const emptyBlocks = config.BAR_LENGTH - filledBlocks;
    
    const progressBar = config.FILLED_CHAR.repeat(filledBlocks) + 
                       config.EMPTY_CHAR.repeat(emptyBlocks);
    
    const displayText = config.SHOW_NUMBERS ? 
      `${progressBar} (${intimacy}/${level.range.max} ${level.emoji})` :
      `${progressBar} ${level.emoji}`;
    
    return displayText;
  }

  // 获取下一等级信息
  static getNextLevelInfo(intimacy) {
    const currentLevel = this.getRelationshipLevel(intimacy);
    const levels = GAME_CONFIG.RELATIONSHIP_LEVELS;
    const currentIndex = levels.findIndex(l => l.name === currentLevel.name);
    
    if (currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1];
      const pointsNeeded = nextLevel.range.min - intimacy;
      
      return {
        hasNext: true,
        nextLevel,
        pointsNeeded: Math.max(0, pointsNeeded)
      };
    }
    
    return {
      hasNext: false,
      nextLevel: null,
      pointsNeeded: 0
    };
  }

  // 生成关系统计信息
  static getRelationshipStats(userProfile) {
    const level = this.getRelationshipLevel(userProfile.intimacy);
    const nextInfo = this.getNextLevelInfo(userProfile.intimacy);
    const progressBar = this.getIntimacyProgressBar(userProfile.intimacy);
    
    return {
      currentLevel: level,
      intimacy: userProfile.intimacy,
      progressBar,
      nextLevel: nextInfo,
      daysInRelationship: this.calculateDaysInRelationship(userProfile.created_at),
      preferredNickname: this.getNickname(userProfile.intimacy)
    };
  }

  // 计算恋爱天数
  static calculateDaysInRelationship(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // 获取当前应该使用的说话风格关键词
  static getSpeechStyleKeywords(intimacy) {
    const level = this.getRelationshipLevel(intimacy);
    
    return {
      tone: level.style.tone,
      intimacyLevel: level.style.intimacy,
      examples: level.style.examples || [],
      levelName: level.name,
      emoji: level.emoji
    };
  }
} 