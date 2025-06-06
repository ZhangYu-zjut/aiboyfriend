import 'dotenv/config';
import { Client, GatewayIntentBits, Events, REST, Routes, ActivityType, Collection } from 'discord.js';
import { ProfileService, SessionService } from './services/database.js';
import { EmotionService } from './services/emotion.js';
import { AIService } from './services/ai.js';
import { WebhookService } from './services/webhook.js';
import { commands, SlashCommandHandler } from './commands/slashCommands.js';
import { ProxyConfig } from './config/proxy.js';
import { DiscordProxyConfig } from './config/discord-proxy.js';

// 初始化代理配置
const proxyUrl = ProxyConfig.setup();

// 网络连接检查
async function checkNetworkConnection() {
  console.log('🔍 检查网络连接...');
  
  try {
    // 尝试连接Discord API
    const response = await fetch('https://discord.com/api/v10/gateway', {
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      console.log('✅ Discord API连接正常');
      return true;
    } else {
      console.log('❌ Discord API连接失败，状态码:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 网络连接失败:', error.message);
    return false;
  }
}

// 创建Discord客户端（简化且稳定的方案）
async function createDiscordClient() {
  console.log('🤖 创建Discord客户端...');
  
  // 清除所有代理设置，使用纯直连模式
  console.log('\n🌐 使用纯直连模式（最稳定）');
  delete process.env.HTTPS_PROXY;
  delete process.env.HTTP_PROXY;
  delete process.env.https_proxy;
  delete process.env.http_proxy;
  
  // 最基本的客户端配置
const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    ws: {
      timeout: 60000, // 增加到60秒
      compress: false, // 禁用压缩减少复杂性
      large_threshold: 50 // 减少大服务器阈值
    },
    rest: {
      timeout: 30000,
      retries: 5,
      version: '10'
    },
    // 禁用一些可能造成连接问题的功能
    failIfNotExists: false,
    allowedMentions: {
      parse: ['users'],
      repliedUser: false
    }
  });
  
  return client;
}

// 注册斜杠命令
async function registerCommands(client) {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    
    console.log('🔄 开始注册斜杠命令...');
    
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    
    console.log('✅ 斜杠命令注册成功！');
  } catch (error) {
    console.error('❌ 斜杠命令注册失败:', error);
    console.log('💡 这不会影响机器人基本功能，但斜杠命令可能无法使用');
  }
}

// 机器人就绪事件
function setupBotEvents(client) {
  client.on(Events.ClientReady, async () => {
    console.log(`🎉 AI男友机器人已上线: ${client.user.tag}`);
    
    // 注册斜杠命令
    await registerCommands(client);
    
    // 启动webhook服务器
    WebhookService.startWebhookServer();
    
    // 设置每日重置任务
    WebhookService.setupDailyReset();
    
    // 设置机器人状态
    client.user.setActivity('和小可爱们聊天 💕', { type: 'PLAYING' });
  });

  // 处理普通消息
  client.on(Events.MessageCreate, async (message) => {
    // 忽略机器人消息和系统消息
    if (message.author.bot || message.system) return;
    
    try {
      const userId = message.author.id;
      const userMessage = message.content;
      
      console.log('\n🔄 ==================== 新消息处理开始 ====================');
      console.log(`👤 用户ID: ${userId}`);
      console.log(`💬 用户消息: "${userMessage}"`);
      console.log('📊 步骤1: 获取用户档案...');
      
      // 获取或创建用户档案
      const userProfile = await ProfileService.getOrCreateProfile(userId);
      console.log('✅ 用户档案获取成功:');
      console.log(`   🆔 用户ID: ${userProfile.user_id}`);
      console.log(`   💎 DOL余额: ${userProfile.dol}`);
      console.log(`   💕 亲密度: ${userProfile.intimacy}`);
      console.log(`   🧪 A/B组: ${userProfile.ab_group}`);
      console.log(`   📅 创建时间: ${userProfile.created_at}`);
      
      // 检查是否为新用户 - 修复逻辑
      console.log('📊 步骤2: 检查是否为新用户...');
      const expectedInitialDOL = userProfile.ab_group === 'A' ? 300 : 400;
      console.log(`   预期初始DOL: ${expectedInitialDOL}`);
      console.log(`   当前DOL: ${userProfile.dol}`);
      console.log(`   当前亲密度: ${userProfile.intimacy}`);
      
      // 检查用户是否有聊天记录来判断是否为新用户
      console.log('   🔍 检查用户聊天历史...');
      const userSessions = await SessionService.getRecentSessions(userId, 1);
      const hasSessionHistory = userSessions.length > 0;
      console.log(`   📝 历史聊天记录数: ${userSessions.length}`);
      
      // 新用户判断逻辑：DOL等于初始值 且 亲密度为0 且 没有聊天记录
      const isNewUser = userProfile.dol === expectedInitialDOL && 
                       userProfile.intimacy === 0 && 
                       !hasSessionHistory;
      console.log(`   是否为新用户: ${isNewUser ? '是' : '否'} (DOL=${userProfile.dol}/${expectedInitialDOL}, 亲密度=${userProfile.intimacy}, 有记录=${hasSessionHistory})`);
      
      if (isNewUser) {
        console.log('🎊 新用户检测到，发送欢迎消息');
        const welcomeMessage = AIService.generateSpecialReply('new_user_welcome', userProfile);
        console.log(`📤 欢迎消息: "${welcomeMessage}"`);
        await message.reply(welcomeMessage);
        console.log('✅ 欢迎消息发送完成');
        
        // 重要：为新用户创建一条初始会话记录，避免下次仍被识别为新用户
        console.log('📝 为新用户创建初始会话记录...');
        await SessionService.saveSession(
          userId,
          userMessage,
          welcomeMessage,
          0, // 欢迎消息不消费token
          0, // 初始HET值
          0.5 // 中性情感得分
        );
        console.log('✅ 初始会话记录创建完成');
        return;
      }
      
      console.log('📊 步骤3: 检查DOL余额...');
      // 检查DOL余额
      if (userProfile.dol < 30) {
        console.log('💔 DOL余额不足，发送充值提醒');
        const insufficientMessage = AIService.generateSpecialReply('insufficient_dol', userProfile);
        console.log(`📤 余额不足消息: "${insufficientMessage.substring(0, 50)}..."`);
        await message.reply(insufficientMessage);
        console.log('✅ 余额不足消息发送完成');
        return;
      }
      console.log('✅ DOL余额充足，继续处理');
      
      // 显示打字状态
      await message.channel.sendTyping();
      console.log('⌨️  显示打字状态');
      
      console.log('📊 步骤4: 获取聊天历史...');
      // 获取聊天历史
      const chatHistory = await SessionService.getRecentSessions(userId, 5);
      console.log(`✅ 获取到${chatHistory.length}条历史记录`);
      
      console.log('📊 步骤5: 调用AI生成回复...');
      console.log(`🔧 OpenRouter API密钥状态: ${process.env.OPENROUTER_API_KEY ? '已配置' : '未配置'}`);
      
      // 生成AI回复
      try {
        const aiResponse = await AIService.generateReply(userMessage, userProfile, chatHistory);
        console.log('✅ AI回复生成成功:');
        console.log(`   📝 回复内容: "${aiResponse.reply}"`);
        console.log(`   🔢 Token使用: ${aiResponse.tokens}`);
        console.log(`   📊 使用详情: 输入${aiResponse.usage.prompt_tokens}, 输出${aiResponse.usage.completion_tokens}`);
        
        console.log('📊 步骤6: 进行情感分析...');
        // 进行情感分析
        const emotionResult = await EmotionService.analyzeEmotion(userMessage);
        console.log('✅ 情感分析完成:');
        console.log(`   💯 情感得分: ${emotionResult.score}`);
        console.log(`   😊 是否正面: ${emotionResult.isPositive}`);
        console.log(`   🔍 数据来源: ${emotionResult.source}`);
        
        console.log('📊 步骤7: 计算HET和亲密度...');
        // 计算HET
        const het = EmotionService.calculateHET(userMessage, emotionResult, aiResponse.tokens);
        console.log(`⚡ HET值: ${het}`);
        
        // 检查情感阈值
        const thresholdCheck = EmotionService.checkEmotionThreshold(het, userProfile.ab_group);
        console.log(`🎯 情感阈值检查: ${thresholdCheck.reached ? '达标' : '未达标'} (${(thresholdCheck.progress * 100).toFixed(1)}%)`);
        
        // 🆕 修复亲密度计算公式 - 避免数值爆炸
        console.log('💕 计算亲密度增长:');
        console.log(`   当前HET值: ${het}`);
        
        // 基础亲密度增长：更合理的公式
        let intimacyGain = 0;
        
        if (het > 0) {
          // 🆕 新的计算公式：根据HET范围给出不同的增长
          if (het >= 80) {
            intimacyGain = 5; // 高情感：5点亲密度
          } else if (het >= 50) {
            intimacyGain = 3; // 中高情感：3点亲密度
          } else if (het >= 20) {
            intimacyGain = 2; // 中等情感：2点亲密度
          } else if (het >= 5) {
            intimacyGain = 1; // 低情感：1点亲密度
          } else {
            intimacyGain = 0; // 极低或无情感：0点亲密度
          }
        }
        
        // 阈值达标奖励
        if (thresholdCheck.reached) {
          intimacyGain += 2; // 阈值奖励改为+2（原来是+5）
          console.log(`   阈值达标奖励: +2`);
        }
        
        // 🆕 限制单次增长上限，避免数值爆炸
        intimacyGain = Math.min(intimacyGain, 10); // 单次最多增长10点
        
        console.log(`   基础增长计算: HET=${het} → 亲密度+${intimacyGain}`);
        console.log(`   计算依据: ${het >= 80 ? '高情感' : het >= 50 ? '中高情感' : het >= 20 ? '中等情感' : het >= 5 ? '低情感' : '无明显情感'}`);
        console.log(`💕 最终亲密度增长: +${intimacyGain}`);
        
        console.log('📊 步骤8: 更新用户数据...');
        // 更新用户档案
        await ProfileService.updateProfile(userId, {
          dolDelta: -30,
          intimacyDelta: intimacyGain
        });
        console.log('✅ 用户档案更新完成 (DOL -30, 亲密度 +' + intimacyGain + ')');
        
        // 保存聊天记录
        await SessionService.saveSession(
          userId,
          userMessage,
          aiResponse.reply,
          aiResponse.tokens,
          het,
          emotionResult.score
        );
        console.log('✅ 聊天记录保存完成');
        
        // 记录A/B测试事件
        await ProfileService.logABEvent(userId, 'message_sent', userProfile.ab_group, {
          het,
          intimacy_gain: intimacyGain,
          threshold_reached: thresholdCheck.reached,
          tokens: aiResponse.tokens
        });
        console.log('✅ A/B测试事件记录完成');
        
        console.log('📊 步骤9: 构建最终回复...');
        // 构建回复消息
        let replyMessage = aiResponse.reply;
        
        // 添加情感反馈
        if (thresholdCheck.reached) {
          const emoji = EmotionService.generateEmotionEmoji(emotionResult, het);
          replyMessage += `\n\n${emoji} 感受到你满满的爱意！亲密度 +${intimacyGain}`;
          console.log('💖 添加情感达标反馈');
          
          // 特殊情感达标消息
          if (het >= 150) {
            const specialMessage = AIService.generateSpecialReply('high_emotion_achieved', userProfile);
            console.log('🌟 发送特殊情感达标消息');
            await message.reply(specialMessage);
            return;
          }
        }
        
        // 添加亲密度进度提示（随机显示）
        if (Math.random() < 0.1 && intimacyGain > 0) {
          const updatedProfile = await ProfileService.getOrCreateProfile(userId);
          replyMessage += `\n\n💕 亲密度: ${updatedProfile.intimacy} (+${intimacyGain})`;
          console.log('📈 添加亲密度进度提示');
        }
        
        console.log('📊 步骤10: 发送最终回复...');
        console.log(`📤 最终回复: "${replyMessage}"`);
        
        // 发送回复
        await message.reply(replyMessage);
        console.log('✅ 回复发送成功');
        
      } catch (aiError) {
        console.error('❌ AI回复生成失败:', aiError);
        console.log('🔄 尝试使用降级回复...');
        
        // 使用降级回复
        const fallbackResponse = AIService.getFallbackReply(userMessage, userProfile);
        console.log(`📤 降级回复: "${fallbackResponse.reply}"`);
        await message.reply(fallbackResponse.reply);
        console.log('✅ 降级回复发送成功');
      }
      
      console.log('🎉 ==================== 消息处理完成 ====================\n');
      
    } catch (error) {
      console.error('❌ 处理消息时出错:', error);
      console.error('错误堆栈:', error.stack);
      await message.reply('抱歉宝贝，我现在有点困，让我休息一下再和你聊~ 😴');
    }
  });

  // 处理斜杠命令
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    try {
      switch (interaction.commandName) {
        case 'stats':
          await SlashCommandHandler.handleStats(interaction);
          break;
        case 'topup':
          await SlashCommandHandler.handleTopup(interaction);
          break;
        case 'shop':
          await SlashCommandHandler.handleShop(interaction);
          break;
        case 'leaderboard':
          await SlashCommandHandler.handleLeaderboard(interaction);
          break;
        case 'help':
          await SlashCommandHandler.handleHelp(interaction);
          break;
        default:
          await interaction.reply('❌ 未知命令！使用 `/help` 查看所有可用命令。');
      }
    } catch (error) {
      console.error('处理斜杠命令时出错:', error);
      if (!interaction.replied) {
        await interaction.reply('❌ 命令执行时出现错误，请稍后再试！');
      }
    }
  });

  // 错误处理
  client.on(Events.Error, (error) => {
    console.error('Discord客户端错误:', error);
  });

  // WebSocket连接错误处理
  client.on(Events.Disconnect, () => {
    console.log('🔌 WebSocket连接断开，尝试重连...');
  });

  client.on(Events.Reconnecting, () => {
    console.log('🔄 正在重连到Discord...');
  });
}

// 启动机器人
async function startBot() {
  console.log('🚀 正在启动AI男友机器人...');
  
  // 简化的网络检查
  console.log('🔍 检查Discord连接...');
  try {
    const response = await fetch('https://discord.com/api/v10/gateway', {
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Discord Gateway可访问: ${data.url}`);
    } else {
      console.log('⚠️  Discord Gateway访问异常，但将尝试连接...');
    }
  } catch (error) {
    console.log('⚠️  Discord Gateway预检失败，但将尝试连接...');
  }
  
  try {
    // 创建客户端
    const client = await createDiscordClient();
    
    // 设置事件处理
    setupBotEvents(client);
    
    // 尝试登录
    console.log('\n🔑 尝试登录Discord...');
    console.log('📝 提示：如果连接时间较长，请耐心等待...');
    
    await client.login(process.env.BOT_TOKEN);
    
    console.log('🎉 机器人启动成功！');
    
  } catch (error) {
    console.error('❌ 机器人启动失败:', error);
    
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      console.log('\n💡 连接超时解决方案:');
      console.log('1. 网络环境可能不稳定，建议多次重试');
      console.log('2. 考虑使用海外VPS部署机器人');
      console.log('3. 如果有稳定代理，可以尝试修改代理配置');
      console.log('4. 使用云端部署命令: node deploy/deploy-cloud.js');
    } else if (error.message.includes('Invalid token')) {
      console.log('\n💡 Token错误解决方案:');
      console.log('1. 检查.env文件中的BOT_TOKEN');
      console.log('2. 确认Token格式正确');
      console.log('3. 在Discord开发者平台重新生成Token');
    } else if (error.message.includes('rate limit')) {
      console.log('\n💡 速率限制解决方案:');
      console.log('1. 等待5-10分钟后重试');
      console.log('2. 检查是否有其他程序在使用相同Token');
    }
    
    console.log('\n🔄 可以尝试重新运行: npm start');
    process.exit(1);
  }
}

// 优雅关闭
process.on('unhandledRejection', (error) => {
  console.error('未处理的Promise拒绝:', error);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('🔄 正在关闭机器人...');
  process.exit(0);
});

startBot();

