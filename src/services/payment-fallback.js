// 支付服务备用版本 - 当Creem API不可用时使用
import { EmbedBuilder } from 'discord.js';
import { ProfileService } from './database.js';

// 存储Discord客户端引用
let discordClient = null;

export class PaymentFallbackService {
  
  // 设置Discord客户端引用
  static setDiscordClient(client) {
    discordClient = client;
    console.log('✅ PaymentFallbackService已连接Discord客户端');
  }

  // 备用充值会话创建（显示说明而不是真实支付）
  static async createRechargeSession(userId, packageKey) {
    try {
      console.log('🔄 Creem API不可用，使用备用充值说明');
      
      const packageInfo = this.getPackageInfo(packageKey);
      if (!packageInfo) {
        throw new Error('无效的充值套餐');
      }

      // 返回说明信息而不是真实的支付链接
      return {
        fallback_mode: true,
        package_info: packageInfo,
        message: this.generateFallbackMessage(packageInfo),
        support_contact: 'Discord服务器管理员'
      };

    } catch (error) {
      console.error('备用充值会话创建失败:', error.message);
      throw new Error('充值功能暂时不可用，请稍后重试或联系管理员');
    }
  }

  // 获取套餐信息
  static getPackageInfo(packageKey) {
    const packages = {
      'starter': {
        name: '新手包',
        dol: 450,
        amount_usd: 4.50,
        amount_cny: 32.4,
        description: '450 DOL - 初次体验',
        emoji: '🌟'
      },
      'basic': {
        name: '基础包',
        dol: 1000,
        amount_usd: 9.90,
        amount_cny: 71.3,
        description: '1000 DOL - 畅聊一周',
        emoji: '💝'
      },
      'standard': {
        name: '标准包',
        dol: 2200,
        amount_usd: 19.90,
        amount_cny: 143.3,
        description: '2200 DOL - 超值优惠10%',
        emoji: '💎'
      },
      'premium': {
        name: '至尊包',
        dol: 6000,
        amount_usd: 49.90,
        amount_cny: 359.3,
        description: '6000 DOL - 豪华享受20%',
        emoji: '👑'
      }
    };

    return packages[packageKey] || null;
  }

  // 生成备用充值说明消息
  static generateFallbackMessage(packageInfo) {
    return `💳 **充值功能临时维护中**

🎯 **您选择的套餐**：
${packageInfo.emoji} ${packageInfo.name}
💎 获得DOL：${packageInfo.dol}
💰 价格：$${packageInfo.amount_usd} (约￥${packageInfo.amount_cny})

⚠️ **当前状态**：
充值系统正在维护升级，暂时无法处理支付。

🛠️ **解决方案**：
1. 请稍后重试（通常1-2小时内恢复）
2. 联系Discord服务器管理员手动充值
3. 等待系统维护完成的通知

💡 **提示**：
维护期间您仍可以使用每日免费的DOL继续聊天！

感谢您的耐心等待！ 💕`;
  }

  // 生成充值说明消息（用于斜杠命令）
  static generateRechargeMessage(packageKey) {
    const packageInfo = this.getPackageInfo(packageKey);
    if (!packageInfo) {
      return {
        embeds: [new EmbedBuilder()
          .setTitle('❌ 无效的充值套餐')
          .setDescription('请选择有效的充值套餐')
          .setColor(0xDC3545)]
      };
    }

    const embed = new EmbedBuilder()
      .setTitle('💳 充值功能维护中')
      .setDescription('充值系统正在升级维护，请稍后重试')
      .setColor(0xFFA500)
      .setThumbnail('https://cdn.discordapp.com/emojis/748532998634414140.png?v=1')
      .addFields(
        { 
          name: `${packageInfo.emoji} 套餐信息`, 
          value: `**${packageInfo.name}**\n${packageInfo.description}`, 
          inline: true 
        },
        { 
          name: '💰 价格', 
          value: `$${packageInfo.amount_usd}\n(约￥${packageInfo.amount_cny})`, 
          inline: true 
        },
        { 
          name: '💎 获得DOL', 
          value: `${packageInfo.dol} DOL`, 
          inline: true 
        },
        {
          name: '🛠️ 维护说明',
          value: '支付系统正在升级中，预计1-2小时内恢复\n维护期间请使用每日免费DOL继续聊天',
          inline: false
        }
      )
      .setFooter({ 
        text: '如有紧急需求，请联系服务器管理员 | 感谢您的耐心等待',
        iconURL: 'https://cdn.discordapp.com/emojis/741885777617133659.png?v=1'
      })
      .setTimestamp();

    return {
      embeds: [embed],
      components: [] // 移除支付按钮
    };
  }

  // 处理支付成功webhook（保持兼容性）
  static async handlePaymentSuccess(webhookData) {
    console.log('⚠️  支付成功webhook在备用模式下接收:', webhookData);
    return {
      success: true,
      fallback_mode: true,
      message: 'Webhook已接收，但系统处于维护模式'
    };
  }

  // 处理支付失败webhook（保持兼容性）
  static async handlePaymentFailure(webhookData) {
    console.log('⚠️  支付失败webhook在备用模式下接收:', webhookData);
    return {
      success: false,
      fallback_mode: true,
      message: 'Webhook已接收，但系统处于维护模式'
    };
  }

  // 获取套餐列表
  static getPackageList() {
    return [
      { key: 'starter', info: this.getPackageInfo('starter') },
      { key: 'basic', info: this.getPackageInfo('basic') },
      { key: 'standard', info: this.getPackageInfo('standard') },
      { key: 'premium', info: this.getPackageInfo('premium') }
    ];
  }

  // 检查是否应该使用备用模式
  static shouldUseFallbackMode() {
    // 检查环境变量中是否强制启用备用模式
    if (process.env.FORCE_PAYMENT_FALLBACK === 'true') {
      return true;
    }

    // 检查必要的Creem配置是否缺失
    const requiredCreemVars = [
      'CREEM_API_KEY',
      'CREEM_PRODUCT_ID_STARTER',
      'CREEM_PRODUCT_ID_BASIC',
      'CREEM_PRODUCT_ID_STANDARD',
      'CREEM_PRODUCT_ID_PREMIUM'
    ];

    const missingVars = requiredCreemVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`⚠️  缺少Creem配置，启用备用模式: ${missingVars.join(', ')}`);
      return true;
    }

    // 检查API密钥是否为测试密钥
    if (process.env.CREEM_API_KEY?.includes('test')) {
      console.log('🧪 检测到测试API密钥，建议使用备用模式以避免403错误');
      return true;
    }

    return false;
  }

  // 生成维护通知
  static generateMaintenanceNotification() {
    const embed = new EmbedBuilder()
      .setTitle('🛠️ 充值系统维护通知')
      .setDescription('充值功能正在进行系统升级维护')
      .setColor(0xFFA500)
      .addFields(
        {
          name: '📅 维护时间',
          value: '预计1-2小时',
          inline: true
        },
        {
          name: '🎯 影响范围',
          value: '仅充值功能，聊天正常',
          inline: true
        },
        {
          name: '💡 建议',
          value: '使用每日免费DOL继续聊天',
          inline: true
        }
      )
      .setFooter({ text: '感谢您的理解与支持' })
      .setTimestamp();

    return { embeds: [embed] };
  }
} 