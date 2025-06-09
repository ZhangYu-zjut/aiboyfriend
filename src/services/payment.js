import axios from 'axios';
import { ProfileService } from './database.js';
import { GAME_CONFIG } from '../config/settings.js';
import { EmbedBuilder } from 'discord.js';
import { PaymentFallbackService } from './payment-fallback.js';

// Creem配置
const CREEM_API_URL = 'https://api.creem.io/v1';
const CREEM_API_KEY = process.env.CREEM_API_KEY;
const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET;

// 存储Discord客户端引用
let discordClient = null;

// DOL充值套餐配置 (根据4.5美元最低要求调整)
export const DOL_PACKAGES = {
  'starter': {
    product_id: process.env.CREEM_PRODUCT_ID_STARTER, // 在.env中配置
    amount_usd: 4.50,
    amount_cny: 32.4, // 按7.2汇率计算
    dol: 450,
    name: '新手包',
    description: '450 DOL - 初次体验',
    emoji: '🌟'
  },
  'basic': {
    product_id: process.env.CREEM_PRODUCT_ID_BASIC,
    amount_usd: 9.90,
    amount_cny: 71.3,
    dol: 1000,
    name: '基础包',
    description: '1000 DOL - 畅聊一周',
    emoji: '💝'
  },
  'standard': {
    product_id: process.env.CREEM_PRODUCT_ID_STANDARD,
    amount_usd: 19.90,
    amount_cny: 143.3,
    dol: 2200,
    name: '标准包',
    description: '2200 DOL - 超值优惠10%',
    emoji: '💎'
  },
  'premium': {
    product_id: process.env.CREEM_PRODUCT_ID_PREMIUM,
    amount_usd: 49.90,
    amount_cny: 359.3,
    dol: 6000,
    name: '至尊包',
    description: '6000 DOL - 豪华享受20%',
    emoji: '👑'
  }
};

export class PaymentService {
  
  // 设置Discord客户端引用
  static setDiscordClient(client) {
    discordClient = client;
    // 同时设置备用服务的客户端
    PaymentFallbackService.setDiscordClient(client);
    console.log('✅ PaymentService已连接Discord客户端');
  }

  // 检查是否应该使用备用模式
  static shouldUseFallbackMode() {
    return PaymentFallbackService.shouldUseFallbackMode();
  }

  // 创建充值结账会话（带备用模式支持）
  static async createRechargeSession(userId, packageKey) {
    // 首先检查是否应该直接使用备用模式
    if (this.shouldUseFallbackMode()) {
      console.log('🔄 自动启用备用模式：Creem配置不完整或为测试环境');
      return await PaymentFallbackService.createRechargeSession(userId, packageKey);
    }

    try {
      const packageInfo = DOL_PACKAGES[packageKey];
      if (!packageInfo) {
        throw new Error('无效的充值套餐');
      }

      const requestId = `aiboyfriend_${userId}_${Date.now()}`;
      
      console.log('🔄 尝试创建Creem checkout session...');
      
      // 确定正确的回调URL
      const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
      const baseUrl = process.env.APP_URL || (isProduction ? 'https://aiboyfriend-production.up.railway.app' : 'http://localhost:3000');
      
      // 创建Creem checkout session
      const response = await axios.post(`${CREEM_API_URL}/checkouts`, {
        product_id: packageInfo.product_id,
        request_id: requestId,
        success_url: `${baseUrl}/payment/success?request_id=${requestId}`,
        metadata: {
          discord_user_id: userId,
          package_key: packageKey,
          dol_amount: packageInfo.dol.toString(),
          app_name: 'AI男友'
        },
        customer: {
          email: `user${userId}@aiboyfriend.app` // 生成临时邮箱
        }
      }, {
        headers: {
          'x-api-key': CREEM_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10秒超时
      });

      // 保存充值记录到数据库
      await this.saveRechargeRecord(userId, requestId, packageInfo, 'pending');

      console.log('✅ Creem checkout session创建成功');
      return {
        checkout_url: response.data.checkout_url,
        session_id: response.data.checkout_id,
        request_id: requestId,
        packageInfo: packageInfo,
        creem_mode: true
      };

    } catch (error) {
      console.error('❌ Creem checkout session创建失败:', error.response?.data || error.message);
      
      // 如果是403错误或其他API问题，自动切换到备用模式
      if (error.response?.status === 403 || error.response?.status === 401 || error.code === 'ECONNABORTED') {
        console.log('🔄 Creem API不可用，自动切换到备用模式');
        return await PaymentFallbackService.createRechargeSession(userId, packageKey);
      }
      
      throw new Error('创建支付会话失败，请稍后重试');
    }
  }

  // 保存充值记录到数据库
  static async saveRechargeRecord(userId, requestId, packageInfo, status) {
    try {
      // 使用现有的ProfileService记录事件
      await ProfileService.logABEvent(userId, 'recharge_initiated', 'P', {
        request_id: requestId,
        package_name: packageInfo.name,
        amount_usd: packageInfo.amount_usd,
        amount_cny: packageInfo.amount_cny,
        dol_amount: packageInfo.dol,
        status: status,
        created_at: new Date().toISOString()
      });

      console.log(`充值记录已保存: 用户${userId}, 金额$${packageInfo.amount_usd}, DOL${packageInfo.dol}`);
    } catch (error) {
      console.error('保存充值记录失败:', error);
      throw error;
    }
  }

  // 处理支付成功webhook
  static async handlePaymentSuccess(webhookData) {
    try {
      console.log('🔍 分析支付成功webhook数据结构...');
      console.log('📊 原始数据:', JSON.stringify(webhookData, null, 2));
      
      // 兼容不同的数据格式
      let paymentData;
      if (webhookData.data) {
        // 标准格式: { event_type: 'xxx', data: { ... } }
        paymentData = webhookData.data;
        console.log('✅ 使用标准格式: webhookData.data');
      } else {
        // 直接格式: { id: 'xxx', metadata: { ... }, ... }
        paymentData = webhookData;
        console.log('✅ 使用直接格式: webhookData');
      }
      
      // 提取关键字段
      const request_id = paymentData.request_id || paymentData.id;
      const metadata = paymentData.metadata;
      const amount = paymentData.amount;
      
      console.log('🔍 提取的字段:');
      console.log(`📋 request_id: ${request_id}`);
      console.log(`👤 metadata: ${JSON.stringify(metadata)}`);
      console.log(`💰 amount: ${amount}`);
      
      if (!metadata || !metadata.discord_user_id) {
        console.error('❌ 缺少必要的metadata信息');
        console.error('📄 完整数据:', JSON.stringify(webhookData, null, 2));
        throw new Error('Missing required metadata');
      }
      
      const userId = metadata.discord_user_id;
      const packageKey = metadata.package_key;
      const dolAmount = parseInt(metadata.dol_amount);

      console.log(`📋 处理支付成功: 用户${userId}, DOL${dolAmount}, 套餐${packageKey}`);

      // 1. 更新用户DOL余额
      console.log(`💰 更新用户DOL余额: ${userId} +${dolAmount}`);
      await ProfileService.updateProfile(userId, {
        dolDelta: dolAmount
      });

      // 2. 记录支付成功事件
      console.log(`📝 记录支付事件到数据库`);
      await ProfileService.logABEvent(userId, 'payment_completed', 'P', {
        request_id: request_id,
        package_key: packageKey,
        dol_amount: dolAmount,
        amount_usd: amount,
        completed_at: new Date().toISOString(),
        status: 'completed'
      });

      // 3. 发送Discord通知
      console.log(`📱 发送Discord通知给用户 ${userId}`);
      await this.sendPaymentSuccessNotification(userId, dolAmount, packageKey, request_id);

      console.log(`✅ 用户 ${userId} 充值处理完成: +${dolAmount} DOL`);
      
      return {
        success: true,
        userId: userId,
        dolAmount: dolAmount,
        requestId: request_id
      };

    } catch (error) {
      console.error('❌ 处理支付成功失败:', error);
      console.error('📄 webhook数据:', JSON.stringify(webhookData, null, 2));
      throw error;
    }
  }

  // 处理支付失败webhook
  static async handlePaymentFailure(webhookData) {
    try {
      const { request_id, metadata, failure_reason } = webhookData.data;
      const userId = metadata.discord_user_id;
      const packageKey = metadata.package_key;

      console.log(`收到支付失败webhook: 用户${userId}, 原因: ${failure_reason}`);

      // 记录支付失败事件
      await ProfileService.logABEvent(userId, 'payment_failed', 'P', {
        request_id: request_id,
        package_key: packageKey,
        failure_reason: failure_reason,
        failed_at: new Date().toISOString(),
        status: 'failed'
      });

      // 发送Discord失败通知
      await this.sendPaymentFailureNotification(userId, packageKey, failure_reason, request_id);

      console.log(`❌ 用户 ${userId} 充值失败: ${failure_reason}`);
      
      return {
        success: false,
        userId: userId,
        requestId: request_id,
        reason: failure_reason
      };

    } catch (error) {
      console.error('处理支付失败失败:', error);
      throw error;
    }
  }

  // 发送支付成功通知到Discord
  static async sendPaymentSuccessNotification(userId, dolAmount, packageKey, requestId) {
    try {
      if (!discordClient) {
        console.warn('⚠️  Discord客户端未设置，跳过用户通知');
        return;
      }

      const packageInfo = DOL_PACKAGES[packageKey];
      const user = await discordClient.users.fetch(userId);
      
      // 获取用户最新资料
      const userProfile = await ProfileService.getOrCreateProfile(userId);
      
      const successEmbed = new EmbedBuilder()
        .setTitle('🎉 充值成功！')
        .setDescription('恭喜！你的DOL已经成功到账，可以继续和AI男友愉快聊天了~')
        .setColor(0x00D084)
        .setThumbnail('https://cdn.discordapp.com/emojis/741885777617133659.png?v=1')
        .addFields(
          { 
            name: `${packageInfo?.emoji || '💎'} 充值套餐`, 
            value: packageInfo?.name || '未知套餐', 
            inline: true 
          },
          { 
            name: '💰 支付金额', 
            value: `$${packageInfo?.amount_usd || 'N/A'} (约￥${packageInfo?.amount_cny || 'N/A'})`, 
            inline: true 
          },
          { 
            name: '💎 获得DOL', 
            value: `+${dolAmount} DOL`, 
            inline: true 
          },
          { 
            name: '🏦 当前余额', 
            value: `${userProfile.dol} DOL`, 
            inline: true 
          },
          { 
            name: '🆔 充值单号', 
            value: requestId.slice(-8), 
            inline: true 
          },
          { 
            name: '⏰ 到账时间', 
            value: new Date().toLocaleString('zh-CN'), 
            inline: true 
          }
        )
        .setFooter({ 
          text: '感谢你的支持！继续享受与AI男友的甜蜜时光吧 💕',
          iconURL: user.displayAvatarURL()
        })
        .setTimestamp();

      await user.send({ embeds: [successEmbed] });
      console.log(`✅ 支付成功通知已发送给用户 ${userId}`);

    } catch (error) {
      console.error(`❌ 发送支付成功通知失败 (用户${userId}):`, error.message);
      // 不抛出错误，避免影响主要的支付处理流程
    }
  }

  // 发送支付失败通知到Discord
  static async sendPaymentFailureNotification(userId, packageKey, failureReason, requestId) {
    try {
      if (!discordClient) {
        console.warn('⚠️  Discord客户端未设置，跳过用户通知');
        return;
      }

      const packageInfo = DOL_PACKAGES[packageKey];
      const user = await discordClient.users.fetch(userId);
      
      // 根据失败原因定制消息
      let failureMessage = '充值失败，请重试或联系客服';
      let troubleshooting = '请检查网络连接或稍后重试';
      let color = 0xDC3545;

      if (failureReason) {
        const reason = failureReason.toLowerCase();
        if (reason.includes('card') || reason.includes('credit')) {
          failureMessage = '信用卡验证失败';
          troubleshooting = '请检查卡号、有效期和CVV是否正确\n或尝试使用其他信用卡';
        } else if (reason.includes('insufficient') || reason.includes('balance')) {
          failureMessage = '余额不足';
          troubleshooting = '请确保信用卡有足够的可用额度';
        } else if (reason.includes('declined') || reason.includes('reject')) {
          failureMessage = '银行拒绝了此次交易';
          troubleshooting = '请联系银行确认或尝试其他支付方式';
        } else if (reason.includes('network') || reason.includes('timeout')) {
          failureMessage = '网络连接问题';
          troubleshooting = '请检查网络连接后重试';
        }
      }

      const failureEmbed = new EmbedBuilder()
        .setTitle('💔 充值失败')
        .setDescription('很抱歉，你的充值未能成功完成。请按照下方建议重试。')
        .setColor(color)
        .addFields(
          { 
            name: `${packageInfo?.emoji || '💎'} 充值套餐`, 
            value: packageInfo?.name || '未知套餐', 
            inline: true 
          },
          { 
            name: '💰 充值金额', 
            value: `$${packageInfo?.amount_usd || 'N/A'} (约￥${packageInfo?.amount_cny || 'N/A'})`, 
            inline: true 
          },
          { 
            name: '❌ 失败原因', 
            value: failureMessage, 
            inline: false 
          },
          { 
            name: '🔧 解决建议', 
            value: troubleshooting, 
            inline: false 
          },
          { 
            name: '🆔 充值单号', 
            value: requestId.slice(-8), 
            inline: true 
          },
          { 
            name: '⏰ 失败时间', 
            value: new Date().toLocaleString('zh-CN'), 
            inline: true 
          }
        )
        .addFields({
          name: '💡 其他充值方式',
          value: '📧 如果继续遇到问题，请联系客服：changyu6899@gmail.com\n💳 支持微信和支付宝付款（需联系客服）\n🔄 你也可以稍后重试或选择其他套餐',
          inline: false
        })
        .setFooter({ 
          text: '我们会帮助你解决充值问题 💪',
          iconURL: user.displayAvatarURL()
        })
        .setTimestamp();

      await user.send({ embeds: [failureEmbed] });
      console.log(`📨 支付失败通知已发送给用户 ${userId}`);

    } catch (error) {
      console.error(`❌ 发送支付失败通知失败 (用户${userId}):`, error.message);
      // 不抛出错误，避免影响主要的支付处理流程
    }
  }

  // 生成充值消息内容
  static generateRechargeMessage(packageKey) {
    // 检查是否应该使用备用模式
    if (this.shouldUseFallbackMode()) {
      return PaymentFallbackService.generateRechargeMessage(packageKey);
    }

    const packageInfo = DOL_PACKAGES[packageKey];
    if (!packageInfo) return null;

    return {
      title: `${packageInfo.emoji} ${packageInfo.name}`,
      description: packageInfo.description,
      fields: [
        {
          name: '💰 价格',
          value: `$${packageInfo.amount_usd} (约￥${packageInfo.amount_cny})`,
          inline: true
        },
        {
          name: '💎 获得DOL',
          value: `${packageInfo.dol} DOL`,
          inline: true
        },
        {
          name: '⚡ 性价比',
          value: `${(packageInfo.dol / packageInfo.amount_usd).toFixed(0)} DOL/美元`,
          inline: true
        }
      ],
      footer: `支持信用卡付款、若没有信用卡，可以联系开发者进行微信或者支付宝支付，有任何问题，请联系：changyu6899@gmail.com`,
      color: 0xFF69B4
    };
  }

  // 获取用户充值历史
  static async getUserRechargeHistory(userId, limit = 10) {
    try {
      // 这里可以查询ab_events表中的充值记录
      // 暂时返回模拟数据
      return {
        total_recharged_usd: 0,
        total_recharged_dol: 0,
        recharge_count: 0,
        last_recharge: null,
        history: []
      };
    } catch (error) {
      console.error('获取充值历史失败:', error);
      return null;
    }
  }

  // 验证webhook签名
  static async verifyWebhookSignature(payload, signature) {
    try {
      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', CREEM_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return `sha256=${expectedSignature}` === signature;
    } catch (error) {
      console.error('验证webhook签名失败:', error);
      return false;
    }
  }

  // 获取充值套餐列表
  static getPackageList() {
    return Object.entries(DOL_PACKAGES).map(([key, packageInfo]) => ({
      key: key,
      name: packageInfo.name,
      emoji: packageInfo.emoji,
      amount_usd: packageInfo.amount_usd,
      amount_cny: packageInfo.amount_cny,
      dol: packageInfo.dol,
      description: packageInfo.description
    }));
  }
} 