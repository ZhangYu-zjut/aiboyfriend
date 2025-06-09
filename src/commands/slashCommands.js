import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ProfileService } from '../services/database.js';
import { PaymentService, DOL_PACKAGES } from '../services/payment.js';

export const commands = [
  // 查看用户统计信息
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('查看你的个人数据 - 亲密度、DOL余额等'),

  // 充值DOL
  new SlashCommandBuilder()
    .setName('recharge')
    .setDescription('充值DOL继续和AI男友聊天')
    .addStringOption(option =>
      option.setName('package')
        .setDescription('选择充值套餐')
        .setRequired(false)
        .addChoices(
          { name: '🌟 新手包 - 450 DOL ($4.5/¥32.4)', value: 'starter' },
          { name: '💝 基础包 - 1000 DOL ($9.9/¥71.3)', value: 'basic' },
          { name: '💎 标准包 - 2200 DOL ($19.9/¥143.3)', value: 'standard' },
          { name: '👑 至尊包 - 6000 DOL ($49.9/¥359.3)', value: 'premium' }
        )),

  // 查看商店
  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('查看DOL商店和所有充值选项'),

  // 亲密度排行榜
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('查看亲密度排行榜'),

  // 帮助信息
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('查看使用帮助和功能介绍')
];

export class SlashCommandHandler {
  // 处理stats命令
  static async handleStats(interaction) {
    try {
      const userId = interaction.user.id;
      const userStats = await ProfileService.getUserStats(userId);
      
      if (!userStats) {
        return interaction.reply('❌ 找不到你的数据，请先发送一条消息给我！');
      }

      const intimacyLevel = this.getIntimacyLevel(userStats.intimacy);
      const dolProgress = Math.min(100, Math.floor((userStats.dol / 1000) * 100));
      
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle(`💕 ${interaction.user.displayName} 的恋爱档案`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { 
            name: '❤️ 亲密度', 
            value: `${userStats.intimacy} 点\n${intimacyLevel.emoji} ${intimacyLevel.title}`, 
            inline: true 
          },
          { 
            name: '💎 DOL余额', 
            value: `${userStats.dol} DOL\n进度: ${'█'.repeat(Math.floor(dolProgress/10))}${'.'.repeat(10-Math.floor(dolProgress/10))} ${dolProgress}%`, 
            inline: true 
          },
          { 
            name: '📊 聊天统计', 
            value: `消息数: ${userStats.total_messages}\n情感值: ${userStats.total_het}\n活跃天数: ${userStats.days_active}`, 
            inline: true 
          },
          {
            name: '💡 关于DOL',
            value: 'DOL是AI男友平台专属虚拟货币\n用于聊天消费和功能解锁\n每条消息消耗30 DOL',
            inline: false
          }
        )
        .setFooter({ text: '继续和我聊天来提升亲密度吧~ 💖' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Stats命令处理失败:', error);
      await interaction.reply('❌ 获取数据时出现错误，请稍后再试！');
    }
  }

  // 处理recharge命令
  static async handleRecharge(interaction) {
    try {
      const userId = interaction.user.id;
      const packageKey = interaction.options.getString('package');

      if (!packageKey) {
        // 显示充值套餐选择界面
        const packages = PaymentService.getPackageList();
        
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('💰 DOL充值中心')
          .setDescription('选择合适的充值套餐，和AI男友继续甜蜜聊天 💕')
          .setThumbnail('https://cdn.discordapp.com/emojis/741885777617133659.png?v=1');

        // 添加所有套餐信息
        packages.forEach(pkg => {
          embed.addFields({
            name: `${pkg.emoji} ${pkg.name}`,
            value: `💰 $${pkg.amount_usd} (约￥${pkg.amount_cny})\n💎 获得 ${pkg.dol} DOL\n⚡ ${(pkg.dol / pkg.amount_usd).toFixed(0)} DOL/美元`,
            inline: true
          });
        });

        embed.addFields({
          name: '💳 支付方式',
          value: '支持信用卡付款、若没有信用卡，可以联系开发者进行微信或者支付宝支付',
          inline: false
        });

        embed.addFields({
          name: '📧 联系方式',
          value: '有任何问题，请联系：changyu6899@gmail.com',
          inline: false
        });

        embed.setFooter({ text: '使用 /recharge <套餐> 来选择具体套餐' });

        // 创建快速选择按钮
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('recharge_starter')
              .setLabel('🌟 新手包')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('recharge_basic')
              .setLabel('💝 基础包')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('recharge_standard')
              .setLabel('💎 标准包')
              .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
              .setCustomId('recharge_premium')
              .setLabel('👑 至尊包')
              .setStyle(ButtonStyle.Danger)
          );

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // 处理具体套餐充值
      await this.processRecharge(interaction, packageKey);

    } catch (error) {
      console.error('Recharge命令处理失败:', error);
      await interaction.reply('❌ 处理充值请求时出现错误，请稍后再试！');
    }
  }

  // 处理具体的充值逻辑
  static async processRecharge(interaction, packageKey) {
    try {
      const userId = interaction.user.id;
      
      // 创建支付会话
      const session = await PaymentService.createRechargeSession(userId, packageKey);
      
      // 检查是否为备用模式
      if (session.fallback_mode) {
        console.log('🔄 使用备用模式响应充值请求');
        
        // 使用备用服务生成消息
        const fallbackMessage = PaymentService.generateRechargeMessage(packageKey);
        
        await interaction.reply({
          ...fallbackMessage,
          ephemeral: true
        });
        
        console.log(`⚠️  备用模式充值响应: 用户${userId}, 套餐${packageKey}`);
        return;
      }
      
      // 正常Creem模式
      const messageData = PaymentService.generateRechargeMessage(packageKey);
      
      const embed = new EmbedBuilder()
        .setColor(messageData.color)
        .setTitle(`💳 ${messageData.title}`)
        .setDescription(messageData.description)
        .addFields(messageData.fields)
        .addFields({
          name: '🔒 安全保障',
          value: 'Creem提供银行级别的支付安全保护',
          inline: false
        })
        .addFields({
          name: '⚡ 到账时间',
          value: '支付完成后DOL将在1分钟内自动到账',
          inline: false
        })
        .setFooter({ text: messageData.footer })
        .setTimestamp();

      // 创建支付按钮
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('💳 立即充值')
            .setStyle(ButtonStyle.Link)
            .setURL(session.checkout_url)
            .setEmoji('💰'),
          new ButtonBuilder()
            .setLabel('❌ 取消充值')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('cancel_recharge')
            .setEmoji('❌')
        );

      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true // 只有用户自己能看到
      });

      console.log(`✅ 充值链接已生成: 用户${userId}, 套餐${packageKey}, 链接${session.checkout_url}`);

    } catch (error) {
      console.error('处理具体充值失败:', error);
      
      // 如果主服务失败，尝试使用备用模式
      try {
        console.log('🔄 主服务失败，尝试备用模式...');
        const { PaymentFallbackService } = await import('../services/payment-fallback.js');
        const fallbackMessage = PaymentFallbackService.generateRechargeMessage(packageKey);
        
        await interaction.reply({
          ...fallbackMessage,
          ephemeral: true
        });
        
        console.log(`⚠️  降级到备用模式: 用户${interaction.user.id}, 套餐${packageKey}`);
      } catch (fallbackError) {
        console.error('备用模式也失败:', fallbackError);
        await interaction.reply({
          content: '❌ 充值功能暂时不可用，请稍后重试或联系客服\n\n💡 您仍可以使用每日免费的DOL继续聊天！',
          ephemeral: true
        });
      }
    }
  }

  // 处理shop命令
  static async handleShop(interaction) {
    const packages = PaymentService.getPackageList();
    
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🛍️ DOL商店 - 继续和AI男友甜蜜聊天！')
      .setDescription('选择合适的充值包，让我们的对话更持久 💕\n\n**💎 什么是DOL？**\nDOL是AI男友平台专属虚拟货币，用于聊天消费和功能解锁，每条消息消耗30 DOL')
      .setThumbnail('https://cdn.discordapp.com/emojis/741885777617133659.png?v=1');

    // 添加所有套餐
    packages.forEach(pkg => {
      embed.addFields({
        name: `${pkg.emoji} ${pkg.name}`,
        value: `💰 **$${pkg.amount_usd}** (约￥${pkg.amount_cny})\n💎 获得 **${pkg.dol} DOL**\n⚡ 性价比: ${(pkg.dol / pkg.amount_usd).toFixed(0)} DOL/美元\n📝 ${pkg.description}`,
        inline: true
      });
    });

    embed.addFields({
      name: '💳 支付说明',
      value: '• 支持信用卡付款（Visa、MasterCard等）\n• 若没有信用卡，可联系开发者微信/支付宝支付\n• 支付完成后DOL自动到账（约1分钟）',
      inline: false
    });

    embed.addFields({
      name: '📧 客服联系',
      value: '有任何问题，请联系：**changyu6899@gmail.com**',
      inline: false
    });

    embed.setFooter({ text: '使用 /recharge 命令开始充值 💖' });

    await interaction.reply({ embeds: [embed] });
  }

  // 处理leaderboard命令
  static async handleLeaderboard(interaction) {
    try {
      const leaderboard = await ProfileService.getLeaderboard(10);
      
      if (!leaderboard || leaderboard.length === 0) {
        return interaction.reply('📊 排行榜暂时为空，快来和我聊天成为第一名吧！ 💕');
      }

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏆 亲密度排行榜')
        .setDescription('看看谁最受AI男友喜爱~ 💖')
        .setFooter({ text: '继续聊天提升你的排名吧！' })
        .setTimestamp();

      // 生成排行榜内容
      let leaderboardText = '';
      const medals = ['🥇', '🥈', '🥉'];
      
      leaderboard.forEach((user, index) => {
        const medal = index < 3 ? medals[index] : `${index + 1}.`;
        const intimacyLevel = this.getIntimacyLevel(user.intimacy);
        
        // 隐藏用户ID，只显示部分字符
        const maskedUserId = user.user_id.substring(0, 4) + '***' + user.user_id.slice(-2);
        
        leaderboardText += `${medal} **用户${maskedUserId}**\n`;
        leaderboardText += `   ${intimacyLevel.emoji} ${user.intimacy}点亲密度 (${intimacyLevel.title})\n`;
        leaderboardText += `   📈 ${user.total_messages || 0}条消息\n\n`;
      });

      embed.addFields({
        name: '💕 排行榜',
        value: leaderboardText,
        inline: false
      });

      // 显示当前用户排名
      const userRank = await ProfileService.getUserRank(interaction.user.id);
      if (userRank) {
        embed.addFields({
          name: '🎯 你的排名',
          value: `第 **${userRank.rank}** 名 | ${userRank.intimacy}点亲密度`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Leaderboard命令处理失败:', error);
      await interaction.reply('❌ 获取排行榜时出现错误，请稍后再试！');
    }
  }

  // 处理help命令
  static async handleHelp(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('📖 使用帮助 - AI男友使用指南')
      .setDescription('欢迎使用AI男友！这里是完整的使用指南 💕')
      .addFields(
        {
          name: '💬 聊天功能',
          value: '• 直接发消息和我聊天\n• 每条消息消耗30 DOL\n• 我会记住我们的对话历史\n• 情感化的对话会增加亲密度',
          inline: false
        },
        {
          name: '📊 斜杠命令',
          value: '• `/stats` - 查看个人数据\n• `/shop` - 查看DOL商店\n• `/recharge` - 充值DOL\n• `/leaderboard` - 查看亲密度排行榜\n• `/help` - 查看帮助',
          inline: false
        },
        {
          name: '💖 亲密度系统',
          value: '• 通过温馨的对话提升亲密度\n• 亲密度越高，我的回复越甜蜜\n• 特殊节日会有亲密度加成',
          inline: false
        },
        {
          name: '💎 DOL系统',
          value: '• DOL是AI男友平台专属虚拟货币\n• 每日免费获得300-400 DOL\n• 用完可以通过充值获得更多\n• 高情感对话有DOL奖励',
          inline: false
        }
      )
      .setFooter({ text: '有任何问题都可以直接问我哦~ 💕' });

    await interaction.reply({ embeds: [helpEmbed] });
  }

  // 获取亲密度等级
  static getIntimacyLevel(intimacy) {
    if (intimacy >= 100) {
      return { title: '至死不渝', emoji: '💕', color: '#FF1493' };
    } else if (intimacy >= 80) {
      return { title: '深情款款', emoji: '💖', color: '#FF69B4' };
    } else if (intimacy >= 60) {
      return { title: '情意绵绵', emoji: '💘', color: '#FFB6C1' };
    } else if (intimacy >= 40) {
      return { title: '渐入佳境', emoji: '💗', color: '#FFC0CB' };
    } else if (intimacy >= 20) {
      return { title: '初见倾心', emoji: '💓', color: '#FFCCCB' };
    } else {
      return { title: '初来乍到', emoji: '💛', color: '#FFE4B5' };
    }
  }
} 