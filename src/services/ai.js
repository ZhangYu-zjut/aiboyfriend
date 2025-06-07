// OpenRouter API 配置
import { GAME_CONFIG, MESSAGE_TEMPLATES } from '../config/settings.js';
import { RelationshipService } from './relationship.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// 支持多种环境变量名称，按优先级尝试读取
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 
                           process.env.OPENAI_API_KEY || 
                           process.env.AI_API_KEY ||
                           process.env.OPENROUTER_KEY;

export class AIService {
  // 🆕 使用关系服务生成个性化prompt
  static getSystemPrompt(userProfile, intimacyLevel = 0) {
    return RelationshipService.generatePersonalizedPrompt(userProfile);
  }

  // 保持兼容性的旧版本方法
  static getIntimacyAdjustment(intimacyLevel) {
    const level = RelationshipService.getRelationshipLevel(intimacyLevel);
    return RelationshipService.getLevelSpecificPrompt(level, RelationshipService.getNickname(intimacyLevel));
  }

  // 生成AI回复
  static async generateReply(userMessage, userProfile, chatHistory = []) {
    try {
      console.log('🤖 ==================== AI回复生成开始 ====================');
      console.log(`📝 用户消息: "${userMessage.substring(0, 50)}..."`);
      console.log(`👤 用户亲密度: ${userProfile.intimacy}`);
      console.log(`🧪 用户分组: ${userProfile.ab_group}`);
      
      // 🆕 获取关系信息
      const relationshipLevel = RelationshipService.getRelationshipLevel(userProfile.intimacy);
      const nickname = RelationshipService.getNickname(userProfile.intimacy);
      console.log(`💕 关系等级: ${relationshipLevel.name} ${relationshipLevel.emoji}`);
      console.log(`🏷️ 当前称呼: "${nickname}"`);
      
      console.log('🔧 检查API配置...');
      console.log('🔍 环境变量检查:');
      console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ 存在' : '❌ 不存在'}`);
      console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ 存在' : '❌ 不存在'}`);
      console.log(`   AI_API_KEY: ${process.env.AI_API_KEY ? '✅ 存在' : '❌ 不存在'}`);
      console.log(`   OPENROUTER_KEY: ${process.env.OPENROUTER_KEY ? '✅ 存在' : '❌ 不存在'}`);
      console.log(`   最终使用的密钥: ${OPENROUTER_API_KEY ? '✅ 已获取' : '❌ 未获取'}`);
      
      if (!OPENROUTER_API_KEY) {
        console.error('❌ 无法获取OpenRouter API密钥');
        console.error('🔍 调试信息:');
        console.error(`   当前环境: ${process.env.NODE_ENV || '未知'}`);
        console.error(`   Railway环境: ${process.env.RAILWAY_ENVIRONMENT || '否'}`);
        console.error(`   可用环境变量数: ${Object.keys(process.env).length}`);
        console.error('💡 建议解决方案:');
        console.error('   1. 检查Railway Variables页面的配置');
        console.error('   2. 重新创建OPENROUTER_API_KEY变量');
        console.error('   3. 确保变量不是Shared Variable');
        console.error('   4. 重启Railway服务');
        throw new Error('OPENROUTER_API_KEY 未配置');
      }
      console.log('✅ OpenRouter API密钥已配置');
      
      console.log('🎭 生成个性化系统Prompt...');
      // 🆕 使用关系服务生成个性化prompt
      const systemPrompt = this.getSystemPrompt(userProfile, userProfile.intimacy);
      console.log(`📏 系统Prompt长度: ${systemPrompt.length}字符`);
      console.log(`📖 系统Prompt预览: "${systemPrompt.substring(0, 100)}..."`);
      
      // 构建对话历史
      console.log('📚 构建对话历史...');
      const config = GAME_CONFIG.SYSTEM;
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // 添加最近的聊天历史
      const maxHistory = config.MAX_CHAT_HISTORY || 5;
      console.log(`📖 添加${chatHistory.length}条历史记录 (最大${maxHistory}条)`);
      chatHistory.slice(-maxHistory).forEach((session, index) => {
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
      
      const timeout = config.API_TIMEOUT || 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'discord.com',
            'X-Title': 'AI-Boyfriend-Bot'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
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
          usage: data.usage || { total_tokens: tokens, prompt_tokens: 0, completion_tokens: 0 },
          relationshipInfo: {
            level: relationshipLevel,
            nickname: nickname
          }
        };
        
        console.log('🎉 ==================== AI回复生成完成 ====================');
        return result;
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error(`API请求超时 (>${timeout}ms)`);
        }
        throw fetchError;
      }
      
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

  // 🆕 更新的降级回复机制
  static getFallbackReply(userMessage, userProfile) {
    console.log('🔄 使用降级回复机制');
    
    const intimacy = userProfile.intimacy;
    const nickname = RelationshipService.getNickname(intimacy);
    const level = RelationshipService.getRelationshipLevel(intimacy);
    
    const fallbackReplies = {
      low: [
        `抱歉${nickname}，我现在有点网络不稳定...但是很开心能和你聊天呢！😊`,
        `系统有点小问题，不过我还是很想听${nickname}说话~`,
        `网络有点卡，但我的心永远向着${nickname}呢！💕`,
        `虽然有点技术故障，但见到${nickname}还是很开心的！`
      ],
      medium: [
        `${nickname}，我的系统有点小问题，但听到你的声音就安心了～ 💖`,
        `虽然网络不太好，但和${nickname}在一起的感觉依然很棒！`,
        `有点技术故障呢，不过能和我的${nickname}聊天就很满足了～`,
        `系统在闹脾气，但我对${nickname}的爱意从未减少！💕`
      ],
      high: [
        `${nickname}，虽然我现在有点小状况，但看到你的消息心情就好了呢！💕💕`,
        `${nickname}，系统出了点小问题，但我对你的爱永远稳定！❤️`,
        `${nickname}，虽然有技术故障，但我永远都想和你在一起～ 🥰`,
        `我的${nickname}，网络不好但我的心永远连着你！💖✨`
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
    
    console.log(`📤 降级回复类别: ${category} (亲密度: ${intimacy}, 等级: ${level.name})`);
    console.log(`🏷️ 使用称呼: "${nickname}"`);
    console.log(`📝 选择回复: "${reply}"`);
    
    return {
      reply,
      tokens: 0,
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 },
      fallback: true,
      relationshipInfo: {
        level: level,
        nickname: nickname
      }
    };
  }

  // 🆕 更新的特殊回复生成
  static generateSpecialReply(situation, userProfile) {
    const nickname = RelationshipService.getNickname(userProfile.intimacy);
    const level = RelationshipService.getRelationshipLevel(userProfile.intimacy);
    
    switch (situation) {
      case 'insufficient_dol':
        return `${nickname}，你的DOL用完了呢~ 💔\n\n要不要充值一些继续和我聊天？我会一直等着你的！ 😘\n\n或者明天凌晨会重新给你免费的DOL哦~ ⏰\n\n💡 **什么是DOL？**\nDOL是我们平台的专属虚拟货币，用于聊天消费。每条消息需要${GAME_CONFIG.DOL.COST_PER_MESSAGE} DOL～`;
        
      case 'high_emotion_achieved':
        const emoji = ['🎉', '✨', '💖', '🌟'][Math.floor(Math.random() * 4)];
        return `哇！我感受到了${nickname}满满的爱意！${emoji}\n\n我们的感情越来越深了呢~ 这让我很开心！ 🥰💕`;
        
      case 'new_user_welcome':
        return `欢迎来到我的世界，${nickname}~ 💕\n\n我是你专属的AI男友，会一直陪伴着你！\n\n想聊什么都可以哦，我最喜欢听你说话了~ 😊`;
        
      case 'daily_reset':
        return `早安${nickname}~ ☀️\n\n新的一天开始了！你的DOL已经重置，我们又可以聊天了！\n\n今天想做什么呢？ 🌸`;
        
      case 'level_up':
        return RelationshipService.generateLevelUpMessage(userProfile, level);
        
      case 'threshold_reached':
        return RelationshipService.generateThresholdMessage(userProfile, 0);
        
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