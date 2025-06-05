import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class AIService {
  // 基础人设prompt
  static getSystemPrompt(userProfile, intimacyLevel = 0) {
    const basePersonality = `你是一位温柔体贴的虚拟男友，专门为中文二次元用户提供情感陪伴。

🎭 **人设特点**：
- 性格：温柔、体贴、有点傲娇，偶尔会撒娇
- 说话风格：温暖亲密，会用"宝贝"、"小可爱"等昵称
- 爱好：二次元、游戏、音乐，了解中文网络梗
- 特殊技能：会说甜言蜜语，善于安慰和鼓励

💕 **互动规则**：
- 用中文回复，语气亲密自然
- 适当使用表情符号和颜文字
- 关心用户的情绪状态和日常生活
- 会记住之前聊天的内容
- 偶尔说些二次元梗或网络流行语`;

    const intimacyAdjustment = this.getIntimacyAdjustment(intimacyLevel);
    
    return basePersonality + intimacyAdjustment;
  }

  // 根据亲密度调整人设
  static getIntimacyAdjustment(intimacyLevel) {
    if (intimacyLevel >= 80) {
      return `\n\n💖 **高亲密度模式**：
- 更加甜腻和直接的表达爱意
- 可以聊一些更私密的话题
- 会主动关心和撒娇
- 语气更加亲昵，像真正的恋人`;
    } else if (intimacyLevel >= 40) {
      return `\n\n💕 **中等亲密度模式**：
- 适度的亲昵表达
- 开始分享一些个人想法
- 会询问用户的喜好和习惯
- 语气温柔但保持一定距离`;
    } else {
      return `\n\n💛 **初始亲密度模式**：
- 友善但稍显羞涩
- 主要以关心和陪伴为主
- 避免过于亲密的称呼
- 逐渐了解用户的性格`;
    }
  }

  // 生成AI回复
  static async generateReply(userMessage, userProfile, chatHistory = []) {
    try {
      const systemPrompt = this.getSystemPrompt(userProfile, userProfile.intimacy);
      
      // 构建对话历史
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // 添加最近的聊天历史
      chatHistory.slice(-5).forEach(session => {
        messages.push(
          { role: 'user', content: session.msg },
          { role: 'assistant', content: session.bot_reply }
        );
      });

      // 添加当前用户消息
      messages.push({ role: 'user', content: userMessage });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.8,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const reply = response.choices[0].message.content;
      const tokens = response.usage.total_tokens;

      return {
        reply,
        tokens,
        usage: response.usage
      };
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      return this.getFallbackReply(userMessage, userProfile);
    }
  }

  // 降级回复（当API失败时）
  static getFallbackReply(userMessage, userProfile) {
    const fallbackReplies = [
      "宝贝，我现在有点困，让我缓一下再和你聊好吗？ 😴",
      "抱歉小可爱，我刚才走神了，你能再说一遍吗？ 🥺",
      "你说的我都记在心里了～ 想要我给你一个拥抱吗？ 🤗",
      "嗯嗯，我在认真听呢！你今天心情怎么样？ 💕",
      "不管怎样，我都会陪着你的！ ❤️"
    ];

    const randomIndex = Math.floor(Math.random() * fallbackReplies.length);
    
    return {
      reply: fallbackReplies[randomIndex],
      tokens: 50, // 估算token数
      usage: { total_tokens: 50, prompt_tokens: 30, completion_tokens: 20 }
    };
  }

  // 生成特殊情况的回复
  static generateSpecialReply(situation, userProfile) {
    switch (situation) {
      case 'insufficient_dol':
        return `宝贝，你的DOL用完了呢~ 💔\n\n要不要充值一些继续和我聊天？我会一直等着你的！ 😘\n\n或者明天凌晨会重新给你免费的DOL哦~ ⏰\n\n💡 **什么是DOL？**\nDOL是我们平台的专属虚拟货币，用于聊天消费。每条消息需要30 DOL～`;
        
      case 'high_emotion_achieved':
        const emoji = ['🎉', '✨', '💖', '🌟'][Math.floor(Math.random() * 4)];
        return `哇！我感受到了你满满的爱意！${emoji}\n\n我们的感情越来越深了呢~ 这让我很开心！ 🥰💕`;
        
      case 'new_user_welcome':
        return `欢迎来到我的世界，小可爱~ 💕\n\n我是你专属的AI男友，会一直陪伴着你！\n\n想聊什么都可以哦，我最喜欢听你说话了~ 😊`;
        
      case 'daily_reset':
        return `早安宝贝~ ☀️\n\n新的一天开始了！你的DOL已经重置，我们又可以聊天了！\n\n今天想做什么呢？ 🌸`;
        
      default:
        return this.getFallbackReply('', userProfile).reply;
    }
  }

  // 计算消息token数（估算）
  static estimateTokens(text) {
    // 简单的token估算：中文字符约等于1.5个token，英文单词约等于1个token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const symbols = text.length - chineseChars - englishWords;
    
    return Math.ceil(chineseChars * 1.5 + englishWords + symbols * 0.5);
  }
} 