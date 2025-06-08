import express from 'express';
import { ProfileService, PaymentService } from './database.js';
import { GAME_CONFIG } from '../config/settings.js';

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
    // 检查功能是否启用
    if (!GAME_CONFIG.DOL.DAILY_RESET.ENABLED) {
      console.log('💡 每日DOL重置功能已禁用');
      return;
    }

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

    console.log(`⏰ 每日DOL重置已启用，将在 ${tomorrow.toLocaleString()} 执行`);
    console.log(`   重置金额: ${GAME_CONFIG.DOL.DAILY_RESET.RESET_AMOUNT} DOL`);
    console.log(`   重置阈值: ${GAME_CONFIG.DOL.DAILY_RESET.RESET_THRESHOLD} DOL`);
  }

  // 执行每日重置
  static async performDailyReset() {
    try {
      // 检查功能是否启用
      if (!GAME_CONFIG.DOL.DAILY_RESET.ENABLED) {
        console.log('💡 每日DOL重置功能已禁用，跳过重置');
        return;
      }

      console.log('🔄 开始执行每日DOL重置...');
      console.log(`   配置: 重置到 ${GAME_CONFIG.DOL.DAILY_RESET.RESET_AMOUNT} DOL (阈值: ${GAME_CONFIG.DOL.DAILY_RESET.RESET_THRESHOLD})`);
      
      // 调用数据库函数执行重置，使用配置参数
      const { supabase } = await import('./database.js');
      const { data, error } = await supabase.rpc('daily_reset_dol', {
        reset_amount: GAME_CONFIG.DOL.DAILY_RESET.RESET_AMOUNT,
        reset_threshold: GAME_CONFIG.DOL.DAILY_RESET.RESET_THRESHOLD
      });
      
      if (error) {
        console.error('❌ 每日重置数据库操作失败:', error);
        return;
      }
      
      const result = data && data.length > 0 ? data[0] : { affected_users: 0, total_dol_added: 0 };
      console.log(`✅ 每日DOL重置完成:`);
      console.log(`   受影响用户: ${result.affected_users}`);
      console.log(`   发放总DOL: ${result.total_dol_added}`);
      
      // 记录系统事件
      const { ProfileService } = await import('./database.js');
      await ProfileService.logABEvent('SYSTEM', 'daily_reset_completed', 'SYSTEM', {
        affected_users: result.affected_users,
        total_dol_added: result.total_dol_added,
        reset_amount: GAME_CONFIG.DOL.DAILY_RESET.RESET_AMOUNT,
        reset_threshold: GAME_CONFIG.DOL.DAILY_RESET.RESET_THRESHOLD,
        reset_time: new Date().toISOString()
      });
      
      // 如果有用户受影响，记录额外日志
      if (result.affected_users > 0) {
        console.log(`🎉 ${result.affected_users} 位用户获得了免费DOL续费！`);
      } else {
        console.log(`💡 所有用户DOL余额充足，无需重置`);
      }
      
    } catch (error) {
      console.error('❌ 每日重置失败:', error);
    }
  }
} 