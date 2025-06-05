import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ProfileService } from '../services/database.js';
import { CreemPaymentService } from '../services/payment.js';

export const commands = [
  // 查看用户统计信息
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('查看你的个人数据 - 亲密度、DOL余额等'),

  // 充值DOL
  new SlashCommandBuilder()
    .setName('topup')
    .setDescription('购买DOL继续聊天')
    .addStringOption(option =>
      option.setName('package')
        .setDescription('选择充值包')
        .setRequired(false)
        .addChoices(
          { name: '基础包 - 100 DOL ($1.99)', value: 'dol_100' },
          { name: '标准包 - 500 DOL ($4.99)', value: 'dol_500' },
          { name: '超值包 - 1000 DOL ($8.99)', value: 'dol_1000' },
          { name: '豪华包 - 2500 DOL ($19.99)', value: 'dol_2500' }
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

  // 处理topup命令
  static async handleTopup(interaction) {
    try {
      const userId = interaction.user.id;
      const packageId = interaction.options.getString('package');

      if (!packageId) {
        // 显示商店选项
        const shopEmbed = new EmbedBuilder()
          .setColor('#00D2FF')
          .setTitle('🛍️ DOL商店')
          .setDescription(CreemPaymentService.generateProductMenu())
          .setFooter({ text: '使用 /topup <包名> 来购买对应的包' });

        return interaction.reply({ embeds: [shopEmbed] });
      }

      // 创建支付链接
      const checkout = await CreemPaymentService.createCheckout(userId, packageId);
      
      const paymentEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('💳 支付链接已生成')
        .setDescription(`**商品**: ${checkout.product.name}\n**价格**: $${checkout.product.amount} USD\n**获得**: ${checkout.product.dol} DOL`)
        .addFields(
          { name: '支付链接', value: `[点击这里支付](${checkout.checkout_url})` },
          { name: '注意事项', value: '• 支付完成后DOL会自动发放\n• 如有问题请联系客服\n• 支付链接30分钟内有效' }
        );

      if (checkout.is_fallback) {
        paymentEmbed.addFields({
          name: '⚠️ 备用支付方式',
          value: checkout.instructions
        });
      }

      await interaction.reply({ embeds: [paymentEmbed], ephemeral: true });
    } catch (error) {
      console.error('Topup命令处理失败:', error);
      await interaction.reply('❌ 创建支付链接时出现错误，请稍后再试！');
    }
  }

  // 处理shop命令
  static async handleShop(interaction) {
    const shopEmbed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🛍️ DOL商店 - 继续和我聊天吧！')
      .setDescription('选择合适的充值包，让我们的对话更持久 💕')
      .addFields(
        {
          name: '💎 基础包 - $1.99',
          value: '100 DOL\n适合轻度聊天用户\n`/topup dol_100`',
          inline: true
        },
        {
          name: '🌟 标准包 - $4.99',
          value: '500 DOL\n最受欢迎的选择\n`/topup dol_500`',
          inline: true
        },
        {
          name: '✨ 超值包 - $8.99',
          value: '1000 DOL\n高性价比推荐\n`/topup dol_1000`',
          inline: true
        },
        {
          name: '👑 豪华包 - $19.99',
          value: '2500 DOL\n土豪专享\n`/topup dol_2500`',
          inline: true
        },
        {
          name: '💡 关于DOL',
          value: 'DOL是AI男友平台专属虚拟货币\n每条消息消耗30 DOL\n每日凌晨免费重置\n高情感对话有额外奖励',
          inline: false
        }
      )
      .setFooter({ text: '💖 支持我们，让AI男友变得更好！' });

    await interaction.reply({ embeds: [shopEmbed] });
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
          value: '• `/stats` - 查看个人数据\n• `/shop` - 查看DOL商店\n• `/topup` - 购买DOL\n• `/help` - 查看帮助',
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