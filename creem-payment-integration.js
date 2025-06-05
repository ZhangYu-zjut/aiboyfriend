// Discord机器人Creem支付集成
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const { supabase } = require('../services/database');

// Creem配置
const CREEM_API_URL = 'https://api.creem.io/v1';
const CREEM_API_KEY = process.env.CREEM_API_KEY; // 你的Creem API密钥

// DOL币充值套餐配置
const DOL_PACKAGES = {
    'small': { 
        product_id: 'prod_small_dol_package', // 在Creem后台创建的产品ID
        amount: 5.00, 
        dol: 500, 
        name: '小额包',
        description: '500 DOL币 - 新手推荐'
    },
    'medium': { 
        product_id: 'prod_medium_dol_package',
        amount: 10.00, 
        dol: 1200, 
        name: '标准包',
        description: '1200 DOL币 - 最受欢迎'
    },
    'large': { 
        product_id: 'prod_large_dol_package',
        amount: 20.00, 
        dol: 2500, 
        name: '豪华包',
        description: '2500 DOL币 - 超值优惠'
    },
    'premium': { 
        product_id: 'prod_premium_dol_package',
        amount: 50.00, 
        dol: 7000, 
        name: '至尊包',
        description: '7000 DOL币 - 土豪专享'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recharge')
        .setDescription('充值DOL虚拟货币')
        .addStringOption(option =>
            option.setName('package')
                .setDescription('选择充值套餐')
                .setRequired(true)
                .addChoices(
                    { name: '💰 小额包 - 500 DOL ($5)', value: 'small' },
                    { name: '💎 标准包 - 1200 DOL ($10)', value: 'medium' },
                    { name: '🔥 豪华包 - 2500 DOL ($20)', value: 'large' },
                    { name: '👑 至尊包 - 7000 DOL ($50)', value: 'premium' }
                )),

    async execute(interaction) {
        const packageType = interaction.options.getString('package');
        const package = DOL_PACKAGES[packageType];
        const userId = interaction.user.id;
        const userName = interaction.user.username;

        try {
            // 生成唯一的请求ID
            const requestId = `dol_${userId}_${Date.now()}`;
            
            // 创建Creem checkout session
            const checkoutSession = await createCreemCheckoutSession(package, userId, userName, requestId);
            
            // 保存充值记录到数据库
            await saveRechargeRecord(userId, requestId, package, 'pending');
            
            // 创建充值嵌入消息
            const rechargeEmbed = new EmbedBuilder()
                .setTitle('💳 充值DOL虚拟货币')
                .setDescription(`🎯 准备充值 **${package.name}**`)
                .addFields(
                    { name: '💰 价格', value: `$${package.amount}`, inline: true },
                    { name: '💎 DOL币数量', value: `${package.dol} DOL`, inline: true },
                    { name: '🎁 性价比', value: `${(package.dol / package.amount).toFixed(0)} DOL/美元`, inline: true },
                    { name: '🔒 支付方式', value: 'Visa、MasterCard、American Express等信用卡' },
                    { name: '⚡ 安全保障', value: 'Creem提供银行级别的支付安全保护' },
                    { name: '💡 温馨提示', value: '支付完成后DOL币将在1分钟内自动到账' }
                )
                .setColor(0x6C5CE7)
                .setThumbnail('https://your-domain.com/assets/dol-coin.png')
                .setFooter({ 
                    text: `充值ID: ${requestId.slice(-8)}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            // 创建支付按钮
            const paymentButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('💳 立即充值')
                        .setStyle(ButtonStyle.Link)
                        .setURL(checkoutSession.checkout_url)
                        .setEmoji('💰'),
                    new ButtonBuilder()
                        .setLabel('❌ 取消充值')
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId('cancel_recharge')
                        .setEmoji('❌')
                );

            await interaction.reply({
                embeds: [rechargeEmbed],
                components: [paymentButton],
                ephemeral: true // 只有用户自己能看到
            });

            // 发送跟进提示
            setTimeout(async () => {
                try {
                    const followUpEmbed = new EmbedBuilder()
                        .setTitle('⏰ 充值提醒')
                        .setDescription('如果您已完成支付，DOL币将在1-2分钟内到账\n如遇问题请联系客服')
                        .setColor(0x74B9FF);
                    
                    await interaction.followUp({
                        embeds: [followUpEmbed],
                        ephemeral: true
                    });
                } catch (error) {
                    console.log('Follow-up message failed:', error.message);
                }
            }, 30000); // 30秒后发送提醒

        } catch (error) {
            console.error('Creem充值创建失败:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ 充值失败')
                .setDescription('抱歉，无法创建充值订单，请稍后重试。')
                .addFields(
                    { name: '🔧 可能原因', value: '- 网络连接问题\n- 服务暂时不可用\n- 系统维护中' },
                    { name: '💡 解决方案', value: '请稍后重试或联系客服' }
                )
                .setColor(0xFF6B6B);

            await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
    }
};

// 创建Creem checkout session
async function createCreemCheckoutSession(package, userId, userName, requestId) {
    try {
        const response = await axios.post(`${CREEM_API_URL}/checkouts`, {
            product_id: package.product_id,
            request_id: requestId,
            success_url: `${process.env.WEBSITE_URL}/payment/success?request_id=${requestId}`,
            metadata: {
                discord_user_id: userId,
                discord_username: userName,
                package_type: package.name,
                dol_amount: package.dol.toString()
            },
            customer: {
                email: `${userId}@discord.aiboyfriend.app` // 生成唯一邮箱
            }
        }, {
            headers: {
                'x-api-key': CREEM_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('Creem API错误:', error.response?.data || error.message);
        throw new Error('创建支付会话失败');
    }
}

// 保存充值记录到数据库
async function saveRechargeRecord(userId, requestId, package, status) {
    try {
        const { error } = await supabase
            .from('recharge_records')
            .insert({
                user_id: userId,
                request_id: requestId,
                package_type: package.name,
                amount_usd: package.amount,
                dol_amount: package.dol,
                status: status,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('保存充值记录失败:', error);
            throw error;
        }
    } catch (error) {
        console.error('数据库操作失败:', error);
        throw error;
    }
}

// Creem Webhook处理器
async function handleCreemWebhook(req, res) {
    try {
        const event = req.body;
        console.log('收到Creem webhook:', event);

        // 验证webhook签名（推荐添加）
        // const signature = req.headers['creem-signature'];
        // if (!verifyWebhookSignature(req.body, signature)) {
        //     return res.status(401).send('Invalid signature');
        // }

        if (event.event_type === 'checkout.completed') {
            // 支付成功分支
            await handlePaymentSuccess(event);
        } else if (event.event_type === 'checkout.failed') {
            // 支付失败分支
            await handlePaymentFailure(event);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook处理错误:', error);
        res.status(500).send('Internal Server Error');
    }
}

// 处理支付成功（分支1）
async function handlePaymentSuccess(event) {
    const { request_id, metadata } = event.data;
    const userId = metadata.discord_user_id;
    const dolAmount = parseInt(metadata.dol_amount);

    try {
        // 更新充值记录状态
        await supabase
            .from('recharge_records')
            .update({ 
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('request_id', request_id);

        // 添加DOL币到用户账户
        await addDolToUser(userId, dolAmount);

        // 发送成功通知到Discord
        const user = await client.users.fetch(userId);
        const successEmbed = new EmbedBuilder()
            .setTitle('✅ 充值成功！')
            .setDescription('🎉 恭喜！您的DOL币已成功到账')
            .addFields(
                { name: '💎 获得DOL币', value: `+${dolAmount} DOL`, inline: true },
                { name: '🆔 充值单号', value: request_id.slice(-8), inline: true },
                { name: '⏰ 到账时间', value: new Date().toLocaleString('zh-CN'), inline: true },
                { name: '💰 当前余额', value: '输入 `/stats` 查看最新余额' }
            )
            .setColor(0x00D084)
            .setThumbnail('https://your-domain.com/assets/success.png');

        await user.send({ embeds: [successEmbed] });

        console.log(`用户 ${userId} 充值成功: +${dolAmount} DOL`);

    } catch (error) {
        console.error('处理支付成功失败:', error);
    }
}

// 处理支付失败（分支2）
async function handlePaymentFailure(event) {
    const { request_id, metadata, failure_reason } = event.data;
    const userId = metadata.discord_user_id;

    try {
        // 更新充值记录状态
        await supabase
            .from('recharge_records')
            .update({ 
                status: 'failed',
                failure_reason: failure_reason || 'Unknown error',
                updated_at: new Date().toISOString()
            })
            .eq('request_id', request_id);

        // 发送失败通知到Discord
        const user = await client.users.fetch(userId);
        
        // 根据失败原因定制消息
        let failureMessage = '充值失败，请重试或联系客服';
        let troubleshooting = '请检查网络连接或稍后重试';

        if (failure_reason) {
            if (failure_reason.includes('card')) {
                failureMessage = '信用卡验证失败';
                troubleshooting = '请检查卡号、有效期和CVV是否正确';
            } else if (failure_reason.includes('insufficient')) {
                failureMessage = '余额不足';
                troubleshooting = '请确保信用卡有足够的可用额度';
            } else if (failure_reason.includes('declined')) {
                failureMessage = '银行拒绝了此次交易';
                troubleshooting = '请联系银行或尝试其他支付方式';
            }
        }

        const failureEmbed = new EmbedBuilder()
            .setTitle('❌ 充值失败')
            .setDescription(`💔 ${failureMessage}`)
            .addFields(
                { name: '🚫 失败原因', value: troubleshooting },
                { name: '🆔 充值单号', value: request_id.slice(-8), inline: true },
                { name: '⏰ 失败时间', value: new Date().toLocaleString('zh-CN'), inline: true },
                { name: '💡 解决方案', value: '1. 检查信用卡信息\n2. 确认卡内余额充足\n3. 尝试其他支付方式\n4. 联系客服寻求帮助' }
            )
            .setColor(0xFF6B6B)
            .setThumbnail('https://your-domain.com/assets/failure.png');

        await user.send({ embeds: [failureEmbed] });

        console.log(`用户 ${userId} 充值失败: ${failure_reason}`);

    } catch (error) {
        console.error('处理支付失败失败:', error);
    }
}

// 添加DOL币到用户账户
async function addDolToUser(userId, dolAmount) {
    try {
        // 更新用户余额
        const { error } = await supabase.rpc('add_dol_balance', {
            user_id: userId,
            amount: dolAmount
        });

        if (error) {
            console.error('添加DOL余额失败:', error);
            throw error;
        }

        console.log(`成功为用户 ${userId} 添加 ${dolAmount} DOL币`);
    } catch (error) {
        console.error('更新用户余额失败:', error);
        throw error;
    }
}

// 验证webhook签名（安全性考虑）
function verifyWebhookSignature(payload, signature) {
    // 实现webhook签名验证逻辑
    // 参考Creem文档的签名验证方法
    return true; // 临时返回true，实际部署时需要实现真实验证
}

module.exports = {
    handleCreemWebhook,
    createCreemCheckoutSession,
    saveRechargeRecord
}; 