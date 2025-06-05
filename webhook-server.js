// Creem Webhook服务器
const express = require('express');
const { handleCreemWebhook } = require('./creem-payment-integration');
const app = express();

// 中间件配置
app.use(express.raw({ type: 'application/json' })); // 用于webhook签名验证
app.use(express.json()); // JSON解析

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'creem-webhook-handler'
    });
});

// Creem Webhook端点
app.post('/webhook/creem', handleCreemWebhook);

// 支付成功页面（用户支付完成后跳转）
app.get('/payment/success', (req, res) => {
    const { request_id } = req.query;
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>充值成功 - AI虚拟男友</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 400px;
                    width: 100%;
                }
                .success-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #2d3748;
                    margin-bottom: 10px;
                    font-size: 24px;
                }
                .subtitle {
                    color: #718096;
                    margin-bottom: 30px;
                    font-size: 16px;
                }
                .order-id {
                    background: #f7fafc;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    font-family: monospace;
                    color: #4a5568;
                }
                .discord-button {
                    background: #5865f2;
                    color: white;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                    transition: background 0.2s;
                }
                .discord-button:hover {
                    background: #4752c4;
                }
                .note {
                    margin-top: 20px;
                    font-size: 14px;
                    color: #718096;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>充值成功！</h1>
                <p class="subtitle">您的DOL币将在1-2分钟内到账</p>
                
                ${request_id ? `<div class="order-id">订单号: ${request_id.slice(-8)}</div>` : ''}
                
                <a href="https://discord.com/channels/@me" class="discord-button">
                    返回Discord查看余额
                </a>
                
                <p class="note">
                    💡 您可以在Discord中使用 <code>/stats</code> 命令查看最新余额
                </p>
                
                <script>
                    // 5秒后自动关闭页面
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
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
            <meta charset="UTF-8">
            <title>充值取消 - AI虚拟男友</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    margin: 0;
                    padding: 20px;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 400px;
                    width: 100%;
                }
                .cancel-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #2d3748;
                    margin-bottom: 10px;
                    font-size: 24px;
                }
                .subtitle {
                    color: #718096;
                    margin-bottom: 30px;
                    font-size: 16px;
                }
                .discord-button {
                    background: #5865f2;
                    color: white;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                    transition: background 0.2s;
                    margin: 5px;
                }
                .discord-button:hover {
                    background: #4752c4;
                }
                .retry-button {
                    background: #48bb78;
                }
                .retry-button:hover {
                    background: #38a169;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="cancel-icon">❌</div>
                <h1>充值已取消</h1>
                <p class="subtitle">您可以随时重新发起充值</p>
                
                <a href="https://discord.com/channels/@me" class="discord-button">
                    返回Discord
                </a>
                
                <script>
                    // 3秒后自动关闭页面
                    setTimeout(() => {
                        window.close();
                    }, 3000);
                </script>
            </div>
        </body>
        </html>
    `);
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('Webhook服务器错误:', error);
    res.status(500).json({ 
        error: 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.WEBHOOK_PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 Creem Webhook服务器运行在端口 ${PORT}`);
    console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook/creem`);
    console.log(`✅ 成功页面: http://localhost:${PORT}/payment/success`);
});

module.exports = app; 