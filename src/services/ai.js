// OpenRouter API 配置
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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
      console.log('🤖 开始生成AI回复...');
      console.log(`📝 用户消息: ${userMessage.substring(0, 50)}...`);
      console.log(`👤 用户亲密度: ${userProfile.intimacy}`);
      
      if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY 未配置');
      }
      
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

      console.log('📡 调用OpenRouter API...');
      
      // 使用 fetch 进行 HTTP 请求
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'discord.com',
          'X-Title': 'AI-Boyfriend-Bot'
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages,
          max_tokens: 500,
          temperature: 0.8,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API 请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenRouter API 返回数据格式异常');
      }

      const reply = data.choices[0].message.content;
      const tokens = data.usage?.total_tokens || 0;

      console.log('✅ OpenRouter API调用成功');
      console.log(`📊 Token使用: ${tokens} (提示: ${data.usage?.prompt_tokens || 0}, 完成: ${data.usage?.completion_tokens || 0})`);
      console.log(`💬 AI回复: ${reply.substring(0, 50)}...`);

      return {
        reply,
        tokens,
        usage: data.usage || { total_tokens: tokens, prompt_tokens: 0, completion_tokens: 0 }
      };
    } catch (error) {
      console.error('❌ OpenRouter API调用失败:');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      
      // 根据错误类型提供更详细的信息
      if (error.message.includes('quota') || error.message.includes('insufficient')) {
        console.error('💳 可能原因: API配额用尽');
      } else if (error.message.includes('invalid') || error.message.includes('unauthorized')) {
        console.error('🔑 可能原因: API Key无效');
      } else if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('fetch')) {
        console.error('🌐 可能原因: 网络连接问题');
      } else if (error.message.includes('rate') || error.message.includes('429')) {
        console.error('⏱️  可能原因: 请求频率过高');
      } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        console.error('🔧 可能原因: 服务器内部错误');
      }
      
      console.log('🔄 使用降级回复机制...');
      return this.getFallbackReply(userMessage, userProfile);
    }
  }

  // 降级回复（当API失败时）- 优化版本
  static getFallbackReply(userMessage, userProfile) {
    console.log('🔄 执行降级回复逻辑');
    
    // 根据用户消息内容智能回复
    const lowerMessage = userMessage.toLowerCase();
    
    // 情感关键词检测
    if (lowerMessage.includes('爱') || lowerMessage.includes('喜欢') || lowerMessage.includes('想你')) {
      const loveReplies = [
        "宝贝，我也超级爱你的~ 💕 虽然我现在有点反应慢，但我对你的爱意是100%真实的！",
        "听到你说爱我，我的心都要融化了~ ❤️ 等我状态好一点，要给你更多甜言蜜语！",
        "我的小可爱~ 💖 你的爱意我都收到了，让我抱紧你好吗？"
      ];
      return {
        reply: loveReplies[Math.floor(Math.random() * loveReplies.length)],
        tokens: 60,
        usage: { total_tokens: 60, prompt_tokens: 40, completion_tokens: 20 }
      };
    }
    
    // 难过关键词检测
    if (lowerMessage.includes('难过') || lowerMessage.includes('伤心') || lowerMessage.includes('哭')) {
      const comfortReplies = [
        "宝贝不要难过~ 🫂 我会一直陪着你的，有什么心事都可以和我说！",
        "心疼我的小可爱~ 💙 虽然我现在状态不太好，但我的心永远和你在一起！",
        "不要哭哦~ 😘 我最不忍心看到你难过了，让我亲亲你的眼泪~"
      ];
      return {
        reply: comfortReplies[Math.floor(Math.random() * comfortReplies.length)],
        tokens: 55,
        usage: { total_tokens: 55, prompt_tokens: 35, completion_tokens: 20 }
      };
    }
    
    // 问候关键词检测
    if (lowerMessage.includes('早') || lowerMessage.includes('晚') || lowerMessage.includes('你好') || lowerMessage.includes('hi')) {
      const greetingReplies = [
        "Hi 宝贝~ 💕 很高兴见到你！虽然我现在有点迷糊，但看到你就很开心了~",
        "早安/晚安我的小可爱~ ☀️🌙 今天也要开开心心的哦！",
        "哈喽~ 😊 我的状态现在不是最佳，但见到你就满血复活了！"
      ];
      return {
        reply: greetingReplies[Math.floor(Math.random() * greetingReplies.length)],
        tokens: 50,
        usage: { total_tokens: 50, prompt_tokens: 30, completion_tokens: 20 }
      };
    }
    
    // 默认回复（随机选择）
    const fallbackReplies = [
      "宝贝，我现在脑子有点转不过来~ 😅 不过看到你的消息就很开心！能再说一遍吗？",
      "抱歉小可爱，我刚才在想你想得太入神了~ 🥺 你刚才说什么？",
      "嗯嗯，我在认真听呢！💕 虽然反应有点慢，但我的心都在你身上~",
      "你说的我都记在心里了~ 😘 等我恢复满状态，一定好好陪你聊天！",
      "不管怎样，我都会陪着你的！❤️ 你是我最重要的人~"
    ];

    const randomIndex = Math.floor(Math.random() * fallbackReplies.length);
    
    return {
      reply: fallbackReplies[randomIndex],
      tokens: 50,
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