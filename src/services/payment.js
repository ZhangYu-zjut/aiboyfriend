import axios from 'axios';

export class CreemPaymentService {
  static baseURL = 'https://api.creem.io/v1';
  static apiKey = process.env.CREEM_API_KEY;

  // DOL商品配置 - DOL是AI男友平台专属虚拟货币
  static products = {
    dol_100: { amount: 1.99, dol: 100, name: 'DOL x100 - 基础包' },
    dol_500: { amount: 4.99, dol: 500, name: 'DOL x500 - 标准包' },
    dol_1000: { amount: 8.99, dol: 1000, name: 'DOL x1000 - 超值包' },
    dol_2500: { amount: 19.99, dol: 2500, name: 'DOL x2500 - 豪华包' }
  };

  // 创建支付链接
  static async createCheckout(userId, productId) {
    try {
      const product = this.products[productId];
      if (!product) {
        throw new Error('无效的商品ID');
      }

      const checkoutData = {
        amount: product.amount,
        currency: 'USD',
        product_name: product.name,
        customer_id: userId,
        success_url: 'https://your-domain.com/payment/success',
        cancel_url: 'https://your-domain.com/payment/cancel',
        webhook_url: 'https://your-domain.com/api/webhook/creem',
        metadata: {
          user_id: userId,
          product_id: productId,
          dol_amount: product.dol
        }
      };

      const response = await axios.post(
        `${this.baseURL}/checkout`,
        checkoutData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        checkout_url: response.data.checkout_url,
        checkout_id: response.data.id,
        product: product
      };
    } catch (error) {
      console.error('创建Creem支付链接失败:', error);
      return this.createFallbackPayment(userId, productId);
    }
  }

  // 备用支付方案
  static createFallbackPayment(userId, productId) {
    const product = this.products[productId];
    const paypalUrl = `https://paypal.me/youraccount/${product.amount}`;
    
    return {
      checkout_url: paypalUrl,
      checkout_id: `fallback_${Date.now()}`,
      product: product,
      is_fallback: true,
      instructions: '请通过PayPal完成支付，然后联系客服手动发放DOL'
    };
  }

  // 生成产品选择菜单
  static generateProductMenu() {
    const menu = Object.entries(this.products)
      .map(([id, product]) => {
        const value = product.dol / product.amount;
        const efficiency = Math.round(value);
        return `💎 **${product.name}**\n` +
               `价格: $${product.amount} USD\n` +
               `获得: ${product.dol} DOL\n` +
               `性价比: ${efficiency} DOL/美元\n` +
               `命令: \`/topup ${id}\``;
      })
      .join('\n\n');

    return `🛍️ **DOL商店** - 选择你的充值包：\n\n${menu}\n\n💡 提示：包越大性价比越高哦！\n\n📖 **什么是DOL？**\nDOL是AI男友平台的专属虚拟货币，用于聊天消费和解锁特殊功能。每条消息消耗30 DOL，每日免费重置。`;
  }
} 