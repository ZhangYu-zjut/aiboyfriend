import express from 'express';
import { ProfileService } from './database.js';
import { PaymentService } from './payment.js';
import { GAME_CONFIG } from '../config/settings.js';

const app = express();
app.use(express.json());

export class WebhookService {
  static startWebhookServer() {
    // Railway要求使用$PORT环境变量，本地开发使用3001
    const port = process.env.PORT || process.env.WEBHOOK_PORT || 3001;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
    const baseUrl = process.env.APP_URL || (isProduction ? 'https://aiboyfriend-production.up.railway.app' : 'http://localhost:3000');

    // Creem支付回调 - 修正路由路径
    app.post('/webhook/creem', async (req, res) => {
      try {
        console.log('🎯 收到Creem webhook:', req.body);
        
        const { event_type, data } = req.body;
        
        // 验证webhook签名（如果有配置密钥）
        const signature = req.headers['creem-signature'] || req.headers['x-creem-signature'];
        if (process.env.CREEM_WEBHOOK_SECRET && signature) {
          const isValid = await PaymentService.verifyWebhookSignature(req.body, signature);
          if (!isValid) {
            console.error('❌ Webhook签名验证失败');
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }
        
        if (event_type === 'checkout.completed' || event_type === 'payment.completed') {
          // 支付成功处理
          console.log('✅ 处理支付成功事件...');
          const result = await PaymentService.handlePaymentSuccess(req.body);
          
          if (result.success) {
            console.log(`✅ 用户 ${result.userId} 充值成功: +${result.dolAmount} DOL`);
          }
          
        } else if (event_type === 'checkout.failed' || event_type === 'payment.failed') {
          // 支付失败处理
          console.log('❌ 处理支付失败事件...');
          const result = await PaymentService.handlePaymentFailure(req.body);
          
          if (result.userId) {
            console.log(`❌ 用户 ${result.userId} 充值失败: ${result.reason}`);
          }
          
        } else {
          console.log(`ℹ️  未处理的事件类型: ${event_type}`);
        }

        res.status(200).json({ status: 'success', received: true });
        
      } catch (error) {
        console.error('❌ 处理Creem webhook失败:', error);
        res.status(500).json({ status: 'error', message: error.message });
      }
    });

    // 健康检查端点
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'AI男友 Webhook服务器',
        port: port
      });
    });

    // 支付成功页面
    app.get('/payment/success', (req, res) => {
      const requestId = req.query.request_id;
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>支付成功 - AI男友</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            .success { 
              color: #4ade80; 
              font-size: 48px; 
              margin-bottom: 20px;
            }
            .title {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .info { 
              font-size: 18px; 
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .note {
              font-size: 14px;
              opacity: 0.8;
              background: rgba(255, 255, 255, 0.1);
              padding: 15px;
              border-radius: 10px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <div class="title">支付成功！</div>
            <div class="info">
              🎉 恭喜！你的DOL已经自动发放到账户中<br>
              💕 现在可以回到Discord继续和AI男友聊天了~
            </div>
            ${requestId ? `<div class="note">充值单号: ${requestId.slice(-8)}</div>` : ''}
            <div class="note">
              📱 请返回Discord查看充值通知<br>
              💎 使用 /stats 命令查看最新余额
            </div>
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
          <title>支付取消 - AI男友</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            .cancel { 
              color: #fbbf24; 
              font-size: 48px; 
              margin-bottom: 20px;
            }
            .title {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 15px;
            }
            .info { 
              font-size: 18px; 
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .note {
              font-size: 14px;
              opacity: 0.8;
              background: rgba(255, 255, 255, 0.1);
              padding: 15px;
              border-radius: 10px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="cancel">💔</div>
            <div class="title">支付已取消</div>
            <div class="info">
              😊 没关系，你随时可以重新购买DOL<br>
              💫 回到Discord继续和AI男友愉快聊天
            </div>
            <div class="note">
              💰 使用 /recharge 命令重新充值<br>
              🛍️ 使用 /shop 命令查看所有套餐选项
            </div>
          </div>
        </body>
        </html>
      `);
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`🌐 Webhook服务器运行在端口 ${port}`);
      
      if (isProduction) {
        console.log(`📍 Creem Webhook URL: ${baseUrl}/webhook/creem`);
        console.log(`🔗 健康检查: ${baseUrl}/health`);
      } else {
        console.log(`📍 Creem Webhook URL: http://localhost:${port}/webhook/creem`);
        console.log(`🔗 健康检查: http://localhost:${port}/health`);
      }
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
      const { db } = await import('./database.js');
      const { data, error } = await db.rpc('daily_reset_dol', {
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
      await ProfileService.logABEvent('SYSTEM', 'daily_reset_completed', 'S', {
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

// 导出startWebhookServer函数以便在其他文件中使用
export function startWebhookServer() {
  return WebhookService.startWebhookServer();
} 