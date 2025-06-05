import express from 'express';
import { ProfileService, PaymentService } from './database.js';

const app = express();
app.use(express.json());

export class WebhookService {
  static startWebhookServer() {
    const port = process.env.PORT || 3000;

    // Creem支付回调
    app.post('/api/webhook/creem', async (req, res) => {
      try {
        const { event_type, data } = req.body;
        
        if (event_type === 'payment.completed') {
          const { customer_id, metadata, amount } = data;
          const userId = customer_id || metadata.user_id;
          const dolAmount = parseInt(metadata.dol_amount);
          const paymentId = data.id;

          // 确认支付并发放DOL
          await PaymentService.confirmPayment(paymentId);
          
          console.log(`✅ 支付完成: 用户 ${userId} 获得 ${dolAmount} DOL`);
          
          // 记录A/B测试事件
          const profile = await ProfileService.getOrCreateProfile(userId);
          await ProfileService.logABEvent(userId, 'payment_completed', profile.ab_group, {
            amount,
            dol_amount: dolAmount,
            payment_id: paymentId
          });
        }

        res.status(200).json({ status: 'success' });
      } catch (error) {
        console.error('处理Creem webhook失败:', error);
        res.status(500).json({ status: 'error', message: error.message });
      }
    });

    // 健康检查端点
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // 支付成功页面
    app.get('/payment/success', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>支付成功</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; font-size: 24px; }
            .info { color: #6c757d; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="success">
            ✅ 支付成功！
          </div>
          <div class="info">
            你的DOL已经自动发放到账户中<br>
            现在可以回到Discord继续和AI男友聊天了~ 💕
          </div>
        </body>
        </html>
      `);
    });

    // 支付取消页面
    app.get('/payment/cancel', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>支付取消</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .cancel { color: #dc3545; font-size: 24px; }
            .info { color: #6c757d; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="cancel">
            ❌ 支付已取消
          </div>
          <div class="info">
            没关系，你随时可以重新购买DOL<br>
            回到Discord使用 /shop 命令查看所有选项
          </div>
        </body>
        </html>
      `);
    });

    app.listen(port, () => {
      console.log(`🌐 Webhook服务器运行在端口 ${port}`);
    });

    return app;
  }

  // 处理每日重置任务
  static setupDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    // 设置首次重置
    setTimeout(() => {
      this.performDailyReset();
      
      // 之后每24小时重置一次
      setInterval(() => {
        this.performDailyReset();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    console.log(`⏰ 每日重置将在 ${tomorrow.toLocaleString()} 执行`);
  }

  // 执行每日重置
  static async performDailyReset() {
    try {
      console.log('🔄 开始执行每日重置...');
      
      // 这里可以添加重置逻辑，比如：
      // 1. 重置用户的免费DOL额度
      // 2. 清理过期的支付记录
      // 3. 生成每日统计报告
      
      // 示例：给所有用户重置基础DOL（如果少于基础额度）
      // await db.rpc('daily_reset_dol');
      
      console.log('✅ 每日重置完成');
    } catch (error) {
      console.error('❌ 每日重置失败:', error);
    }
  }
} 