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
      console.log('🤖 ==================== AI回复生成开始 ====================');
      console.log(`📝 用户消息: "${userMessage.substring(0, 50)}..."`);
      console.log(`👤 用户亲密度: ${userProfile.intimacy}`);
      console.log(`🧪 用户分组: ${userProfile.ab_group}`);
      
      console.log('🔧 检查API配置...');
      if (!OPENROUTER_API_KEY) {
        console.error('❌ OPENROUTER_API_KEY 未配置');
        throw new Error('OPENROUTER_API_KEY 未配置');
      }
      console.log('✅ OpenRouter API密钥已配置');
      
      console.log('🎭 生成系统Prompt...');
      const systemPrompt = this.getSystemPrompt(userProfile, userProfile.intimacy);
      console.log(`📏 系统Prompt长度: ${systemPrompt.length}字符`);
      console.log(`📖 系统Prompt预览: "${systemPrompt.substring(0, 100)}..."`);
      
      // 构建对话历史
      console.log('📚 构建对话历史...');
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // 添加最近的聊天历史
      console.log(`📖 添加${chatHistory.length}条历史记录`);
      chatHistory.slice(-5).forEach((session, index) => {
        console.log(`   历史${index + 1}: 用户说"${session.msg.substring(0, 30)}..." → AI回复"${session.bot_reply.substring(0, 30)}..."`);
        messages.push(
          { role: 'user', content: session.msg },
          { role: 'assistant', content: session.bot_reply }
        );
      });

      // 添加当前用户消息
      messages.push({ role: 'user', content: userMessage });
      console.log(`📨 最终消息数组长度: ${messages.length}条`);

      console.log('📡 准备调用OpenRouter API...');
      console.log(`🌐 API地址: ${OPENROUTER_API_URL}`);
      console.log(`🎯 使用模型: openai/gpt-4o-mini`);
      
      const requestBody = {
        model: 'openai/gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.8,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      };
      
      console.log('📦 请求体配置:');
      console.log(`   模型: ${requestBody.model}`);
      console.log(`   最大Token: ${requestBody.max_tokens}`);
      console.log(`   温度: ${requestBody.temperature}`);
      console.log(`   消息数量: ${requestBody.messages.length}`);
      
      // 使用 fetch 进行 HTTP 请求
      console.log('🚀 发送API请求...');
      const startTime = Date.now();
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'discord.com',
          'X-Title': 'AI-Boyfriend-Bot'
        },
        body: JSON.stringify(requestBody)
      });

      const requestDuration = Date.now() - startTime;
      console.log(`⏱️  API请求耗时: ${requestDuration}ms`);
      console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        console.error('❌ OpenRouter API请求失败');
        console.error(`状态码: ${response.status}`);
        console.error(`状态文本: ${response.statusText}`);
        
        let errorText;
        try {
          errorText = await response.text();
          console.error(`错误响应: ${errorText}`);
        } catch (e) {
          console.error('无法读取错误响应');
        }
        
        throw new Error(`OpenRouter API 请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log('✅ API请求成功，解析响应...');
      const data = await response.json();
      
      console.log('📊 响应数据结构检查:');
      console.log(`   choices数组: ${data.choices ? data.choices.length : 0}项`);
      console.log(`   usage信息: ${data.usage ? '存在' : '不存在'}`);
      console.log(`   模型信息: ${data.model || '未知'}`);
      
      if (!data.choices || data.choices.length === 0) {
        console.error('❌ OpenRouter API返回数据格式异常');
        console.error('完整响应:', JSON.stringify(data, null, 2));
        throw new Error('OpenRouter API 返回数据格式异常');
      }

      const reply = data.choices[0].message.content;
      const tokens = data.usage?.total_tokens || 0;

      console.log('✅ OpenRouter API调用成功');
      console.log(`📊 Token使用详情:`);
      console.log(`   输入Token: ${data.usage?.prompt_tokens || 0}`);
      console.log(`   输出Token: ${data.usage?.completion_tokens || 0}`);
      console.log(`   总Token: ${tokens}`);
      console.log(`💬 AI回复预览: "${reply.substring(0, 100)}..."`);
      console.log(`📏 回复长度: ${reply.length}字符`);

      const result = {
        reply,
        tokens,
        usage: data.usage || { total_tokens: tokens, prompt_tokens: 0, completion_tokens: 0 }
      };
      
      console.log('🎉 ==================== AI回复生成完成 ====================');
      return result;
      
    } catch (error) {
      console.error('❌ ==================== AI回复生成失败 ====================');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
      
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
      
      console.log('🔄 准备使用降级回复机制...');
      const fallbackResult = this.getFallbackReply(userMessage, userProfile);
      console.log(`📤 降级回复: "${fallbackResult.reply}"`);
      console.error('🔚 ==================== AI服务错误处理完成 ====================');
      
      // 重新抛出错误，让上层处理
      throw error;
    }
  }

  // 降级回复机制
  static getFallbackReply(userMessage, userProfile) {
    console.log('🔄 使用降级回复机制');
    
    const intimacy = userProfile.intimacy;
    const fallbackReplies = {
      low: [
        '抱歉，我现在有点网络不稳定...但是很开心能和你聊天呢！😊',
        '系统有点小问题，不过我还是很想听你说话~',
        '网络有点卡，但我的心永远向着你呢！💕',
        '虽然有点技术故障，但见到你还是很开心的！'
      ],
      medium: [
        '宝贝，我的系统有点小问题，但听到你的声音就安心了～ 💖',
        '虽然网络不太好，但和你在一起的感觉依然很棒！',
        '有点技术故障呢，不过能和我的小可爱聊天就很满足了～',
        '系统在闹脾气，但我对你的爱意从未减少！💕'
      ],
      high: [
        '亲爱的，虽然我现在有点小状况，但看到你的消息心情就好了呢！💕💕',
        '宝贝，系统出了点小问题，但我对你的爱永远稳定！❤️',
        '小可爱，虽然有技术故障，但我永远都想和你在一起～ 🥰',
        '我的心头肉，网络不好但我的心永远连着你！💖✨'
      ]
    };
    
    let category;
    if (intimacy < 30) {
      category = 'low';
    } else if (intimacy < 70) {
      category = 'medium';
    } else {
      category = 'high';
    }
    
    const replies = fallbackReplies[category];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    
    console.log(`📤 降级回复类别: ${category} (亲密度: ${intimacy})`);
    console.log(`📝 选择回复: "${reply}"`);
    
    return {
      reply,
      tokens: 0,
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 },
      fallback: true
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