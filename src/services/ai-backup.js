// 备用AI服务 - 支持多个API提供商
import { GAME_CONFIG } from '../config/settings.js';
import { RelationshipService } from './relationship.js';

export class BackupAIService {
  
  // 可用的AI服务提供商列表
  static providers = [
    {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      keyEnv: 'OPENROUTER_API_KEY',
      model: 'openai/gpt-4o-mini',
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'discord.com',
        'X-Title': 'AI-Boyfriend-Bot'
      })
    },
    {
      name: 'Together',
      url: 'https://api.together.xyz/v1/chat/completions',
      keyEnv: 'TOGETHER_API_KEY',
      model: 'meta-llama/Llama-2-7b-chat-hf',
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      })
    },
    {
      name: 'DeepSeek',
      url: 'https://api.deepseek.com/v1/chat/completions',
      keyEnv: 'DEEPSEEK_API_KEY',
      model: 'deepseek-chat',
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      })
    }
  ];

  // 检查可用的AI服务
  static getAvailableProvider() {
    for (const provider of this.providers) {
      const apiKey = process.env[provider.keyEnv];
      if (apiKey && !apiKey.startsWith('your_')) {
        console.log(`✅ 找到可用的AI服务: ${provider.name}`);
        return { ...provider, apiKey };
      }
    }
    
    console.log('❌ 没有找到可用的AI服务');
    return null;
  }

  // 生成AI回复 - 备用版本
  static async generateReply(userMessage, userProfile, chatHistory = []) {
    const provider = this.getAvailableProvider();
    
    if (!provider) {
      // 如果没有可用的AI服务，返回预设回复
      return this.getFallbackReply(userMessage, userProfile);
    }

    try {
      console.log(`🤖 使用 ${provider.name} 生成AI回复...`);
      
      // 生成系统Prompt
      const systemPrompt = RelationshipService.generatePersonalizedPrompt(userProfile);
      
      // 构建消息
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // 添加历史记录
      const maxHistory = GAME_CONFIG.SYSTEM.MAX_CHAT_HISTORY || 3;
      chatHistory.slice(-maxHistory).forEach(session => {
        messages.push(
          { role: 'user', content: session.msg },
          { role: 'assistant', content: session.bot_reply }
        );
      });

      // 添加当前消息
      messages.push({ role: 'user', content: userMessage });

      const requestBody = {
        model: provider.model,
        messages,
        max_tokens: 500,
        temperature: 0.8
      };

      const response = await fetch(provider.url, {
        method: 'POST',
        headers: provider.headers(provider.apiKey),
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${provider.name} API失败: ${response.status} - ${errorText}`);
        throw new Error(`${provider.name} API调用失败`);
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;
      
      console.log(`✅ ${provider.name} API调用成功`);
      
      return {
        reply,
        tokens: data.usage?.total_tokens || 0,
        usage: data.usage || {},
        provider: provider.name,
        relationshipInfo: {
          level: RelationshipService.getRelationshipLevel(userProfile.intimacy),
          nickname: RelationshipService.getNickname(userProfile.intimacy)
        }
      };

    } catch (error) {
      console.error(`❌ ${provider.name} 服务失败:`, error);
      return this.getFallbackReply(userMessage, userProfile);
    }
  }

  // 预设回复（当所有AI服务都不可用时）
  static getFallbackReply(userMessage, userProfile) {
    const nickname = RelationshipService.getNickname(userProfile.intimacy);
    
    const fallbackReplies = [
      `${nickname}，我现在有点累了，让我休息一下好吗？💤`,
      `抱歉${nickname}，我的思绪有些混乱，稍后再聊好吗？😅`,
      `${nickname}，我现在需要一点时间整理思路，等会儿回复你～💭`,
      `我现在有点忙，${nickname}，过一会儿我们再聊天吧！😊`,
      `${nickname}，让我先处理一下其他事情，马上回来找你！⏰`
    ];

    const reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    
    console.log('🔄 使用预设回复');
    
    return {
      reply,
      tokens: 0,
      usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 },
      provider: 'fallback',
      relationshipInfo: {
        level: RelationshipService.getRelationshipLevel(userProfile.intimacy),
        nickname: nickname
      }
    };
  }
} 