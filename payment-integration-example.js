// Discord机器人PayPal支付集成示例
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const paypal = require('@paypal/checkout-server-sdk');

// PayPal配置
const Environment = paypal.core.SandboxEnvironment; // 生产环境使用 LiveEnvironment
const paypalClient = new paypal.core.PayPalHttpClient(new Environment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
));

// DOL币价格配置
const DOL_PACKAGES = {
    'small': { amount: 5.00, dol: 500, name: '小额包' },
    'medium': { amount: 10.00, dol: 1200, name: '标准包' },
    'large': { amount: 20.00, dol: 2500, name: '豪华包' },
    'premium': { amount: 50.00, dol: 7000, name: '至尊包' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy-dol')
        .setDescription('购买DOL虚拟货币')
        .addStringOption(option =>
            option.setName('package')
                .setDescription('选择购买套餐')
                .setRequired(true)
                .addChoices(
                    { name: '小额包 - 500 DOL ($5)', value: 'small' },
                    { name: '标准包 - 1200 DOL ($10)', value: 'medium' },
                    { name: '豪华包 - 2500 DOL ($20)', value: 'large' },
                    { name: '至尊包 - 7000 DOL ($50)', value: 'premium' }
                )),

    async execute(interaction) {
        const packageType = interaction.options.getString('package');
        const packageInfo = DOL_PACKAGES[packageType];
        const userId = interaction.user.id;

        try {
            // 创建PayPal订单
            const order = await createPayPalOrder(packageInfo, userId);
            
            // 创建支付嵌入消息
            const paymentEmbed = new EmbedBuilder()
                .setTitle('💎 购买DOL虚拟货币')
                .setDescription(`准备购买 **${packageInfo.name}**`)
                .addFields(
                    { name: '💰 价格', value: `$${packageInfo.amount}`, inline: true },
                    { name: '💎 DOL币数量', value: `${packageInfo.dol} DOL`, inline: true },
                    { name: '🎁 性价比', value: `${(packageInfo.dol / packageInfo.amount).toFixed(0)} DOL/美元`, inline: true },
                    { name: '⚡ 支付方式', value: '安全的PayPal支付' },
                    { name: '🔒 安全提示', value: '点击下方按钮跳转到PayPal安全支付页面' }
                )
                .setColor(0x0099FF)
                .setThumbnail('https://your-domain.com/dol-coin-icon.png')
                .setFooter({ 
                    text: '💡 支付完成后DOL币将自动添加到您的账户', 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            // 创建支付按钮
            const paymentButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('💳 PayPal支付')
                        .setStyle(ButtonStyle.Link)
                        .setURL(order.links.find(link => link.rel === 'approve').href),
                    new ButtonBuilder()
                        .setLabel('❌ 取消')
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId('cancel_payment')
                );

            await interaction.reply({
                embeds: [paymentEmbed],
                components: [paymentButton],
                ephemeral: true // 只有用户自己能看到
            });

            // 保存订单信息到数据库
            await savePaymentRecord(userId, order.id, packageInfo);

        } catch (error) {
            console.error('PayPal支付创建失败:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ 支付创建失败')
                .setDescription('抱歉，无法创建支付订单，请稍后重试。')
                .setColor(0xFF0000);

            await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
    }
};

// 创建PayPal订单
async function createPayPalOrder(packageInfo, userId) {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
            amount: {
                currency_code: 'USD',
                value: packageInfo.amount.toFixed(2)
            },
            description: `AI男友DOL币购买 - ${packageInfo.name}`,
            custom_id: userId, // 用于识别用户
            soft_descriptor: 'AI_BOYFRIEND_DOL'
        }],
        application_context: {
            return_url: `${process.env.WEBSITE_URL}/payment/success`,
            cancel_url: `${process.env.WEBSITE_URL}/payment/cancel`,
            brand_name: 'AI虚拟男友',
            locale: 'zh-CN',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW'
        }
    });

    const order = await paypalClient.execute(request);
    return order.result;
}

// 保存支付记录到数据库
async function savePaymentRecord(userId, paypalOrderId, packageInfo) {
    // 这里连接到你的Supabase数据库
    const { supabase } = require('../services/database');
    
    await supabase
        .from('payment_records')
        .insert({
            user_id: userId,
            paypal_order_id: paypalOrderId,
            package_type: packageInfo.name,
            amount_usd: packageInfo.amount,
            dol_amount: packageInfo.dol,
            status: 'pending',
            created_at: new Date().toISOString()
        });
}

// PayPal Webhook处理器（用于确认支付完成）
async function handlePayPalWebhook(req, res) {
    const event = req.body;
    
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const orderId = event.resource.supplementary_data.related_ids.order_id;
        const userId = event.resource.purchase_units[0].custom_id;
        
        // 更新数据库状态
        await supabase
            .from('payment_records')
            .update({ 
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('paypal_order_id', orderId);
        
        // 添加DOL币到用户账户
        const paymentRecord = await supabase
            .from('payment_records')
            .select('dol_amount')
            .eq('paypal_order_id', orderId)
            .single();
        
        if (paymentRecord.data) {
            await addDolToUser(userId, paymentRecord.data.dol_amount);
            
            // 发送确认消息到Discord
            const user = await client.users.fetch(userId);
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ 支付成功！')
                .setDescription(`恭喜！您的DOL币已到账`)
                .addFields(
                    { name: '💎 获得DOL币', value: `${paymentRecord.data.dol_amount} DOL`, inline: true },
                    { name: '💳 订单号', value: orderId, inline: true }
                )
                .setColor(0x00FF00);
            
            await user.send({ embeds: [confirmEmbed] });
        }
    }
    
    res.status(200).send('OK');
}

// 添加DOL币到用户账户
async function addDolToUser(userId, dolAmount) {
    const { supabase } = require('../services/database');
    
    // 更新用户余额
    await supabase.rpc('add_dol_balance', {
        user_id: userId,
        amount: dolAmount
    });
}

module.exports = { handlePayPalWebhook }; 