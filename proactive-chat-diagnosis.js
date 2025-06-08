#!/usr/bin/env node

import 'dotenv/config';
import { GAME_CONFIG, FEATURE_FLAGS } from './src/config/settings.js';

console.log('🔍 ==================== 主动私聊功能诊断 ====================');

// 诊断功能配置
function diagnoseConfiguration() {
    console.log('\n📋 配置检查：');
    
    const config = GAME_CONFIG.PROACTIVE_CHAT;
    const flags = FEATURE_FLAGS;
    
    console.log(`✅ 功能开关: ${flags.PROACTIVE_CHAT ? '启用' : '❌ 禁用'}`);
    console.log(`✅ 检查间隔: ${config.CHECK_INTERVAL} (每2分钟)`);
    console.log(`✅ 最低亲密度要求: ${config.MIN_INTIMACY_REQUIRED}`);
    console.log(`✅ 冷却时间: ${config.COOLDOWN_HOURS} 小时`);
    console.log(`✅ 非活跃时间要求: ${config.INACTIVE_HOURS} 小时`);
    console.log(`✅ 每日最大消息数: ${config.MAX_DAILY_MESSAGES}`);
    console.log(`✅ 基础概率: ${config.PROBABILITY_BASE}`);
    
    return flags.PROACTIVE_CHAT;
}

// 模拟用户条件检查
function simulateUserCheck(userProfile) {
    console.log('\n🧪 模拟用户条件检查：');
    console.log(`📊 用户亲密度: ${userProfile.intimacy}`);
    
    const config = GAME_CONFIG.PROACTIVE_CHAT;
    const results = {
        intimacyCheck: false,
        inactiveCheck: false,
        cooldownCheck: false,
        dailyLimitCheck: false
    };
    
    // 1. 亲密度检查
    results.intimacyCheck = userProfile.intimacy >= config.MIN_INTIMACY_REQUIRED;
    console.log(`${results.intimacyCheck ? '✅' : '❌'} 亲密度检查: ${userProfile.intimacy} >= ${config.MIN_INTIMACY_REQUIRED}`);
    
    // 2. 非活跃时间检查（模拟）
    const now = new Date();
    const lastActiveTime = userProfile.lastActiveTime || new Date(now.getTime() - 1000 * 60 * 60); // 假设1小时前活跃
    const hoursSinceActive = (now - lastActiveTime) / (1000 * 60 * 60);
    results.inactiveCheck = hoursSinceActive >= config.INACTIVE_HOURS;
    console.log(`${results.inactiveCheck ? '✅' : '❌'} 非活跃时间检查: ${hoursSinceActive.toFixed(1)}小时 >= ${config.INACTIVE_HOURS}小时`);
    
    // 3. 冷却时间检查（模拟）
    const lastProactiveTime = userProfile.lastProactiveTime || null;
    let cooldownResult = true;
    if (lastProactiveTime) {
        const hoursSinceProactive = (now - lastProactiveTime) / (1000 * 60 * 60);
        cooldownResult = hoursSinceProactive >= config.COOLDOWN_HOURS;
        console.log(`${cooldownResult ? '✅' : '❌'} 冷却时间检查: ${hoursSinceProactive.toFixed(1)}小时 >= ${config.COOLDOWN_HOURS}小时`);
    } else {
        console.log(`✅ 冷却时间检查: 首次发送，无冷却限制`);
    }
    results.cooldownCheck = cooldownResult;
    
    // 4. 每日限额检查（模拟）
    const todayMessageCount = userProfile.todayMessageCount || 0;
    results.dailyLimitCheck = todayMessageCount < config.MAX_DAILY_MESSAGES;
    console.log(`${results.dailyLimitCheck ? '✅' : '❌'} 每日限额检查: ${todayMessageCount} < ${config.MAX_DAILY_MESSAGES}`);
    
    return results;
}

// 概率计算模拟
function simulateProbability(userProfile) {
    console.log('\n🎲 概率计算模拟：');
    
    const config = GAME_CONFIG.PROACTIVE_CHAT;
    const baseProb = config.PROBABILITY_BASE;
    const intimacyBonus = userProfile.intimacy * config.INTIMACY_BONUS_FACTOR;
    const totalProb = Math.min(baseProb + intimacyBonus, 1.0);
    
    console.log(`📊 基础概率: ${baseProb}`);
    console.log(`💕 亲密度奖励: ${userProfile.intimacy} × ${config.INTIMACY_BONUS_FACTOR} = ${intimacyBonus.toFixed(3)}`);
    console.log(`🎯 总概率: ${totalProb.toFixed(3)} (${(totalProb * 100).toFixed(1)}%)`);
    
    // 模拟10次概率检查
    console.log(`\n🔄 模拟10次检查结果:`);
    let successCount = 0;
    for (let i = 1; i <= 10; i++) {
        const roll = Math.random();
        const success = roll <= totalProb;
        if (success) successCount++;
        console.log(`  第${i}次: ${roll.toFixed(3)} ${success ? '✅ 通过' : '❌ 未通过'} (需要 <= ${totalProb.toFixed(3)})`);
    }
    console.log(`📈 模拟成功率: ${successCount}/10 (${successCount * 10}%)`);
    
    return totalProb;
}

// 常见问题解答
function showTroubleshooting() {
    console.log('\n🔧 ==================== 常见问题解答 ====================');
    
    console.log('\n❓ 为什么我没有收到主动私信？');
    console.log('可能的原因：');
    console.log('1. 📱 您最近刚和机器人聊过天（需要间隔2小时以上）');
    console.log('2. ⏰ 今天已经收到过3条主动消息了');
    console.log('3. 🎲 概率因素（并非100%触发）');
    console.log('4. 🔒 Discord私信权限被关闭');
    console.log('5. 🛠️ 机器人未正常运行或功能被禁用');
    
    console.log('\n💡 建议操作：');
    console.log('1. 🕒 等待2小时以上不发送任何消息');
    console.log('2. 📬 检查Discord私信设置，确保允许接收私信');
    console.log('3. 🔄 耐心等待，系统每2分钟检查一次');
    console.log('4. 📞 联系管理员确认机器人运行状态');
    
    console.log('\n⚙️ 调整参数建议（开发者）：');
    console.log('• 降低非活跃时间要求: INACTIVE_HOURS: 1');
    console.log('• 提高触发概率: PROBABILITY_BASE: 0.3');
    console.log('• 缩短检查间隔: CHECK_INTERVAL: "0 */1 * * * *"');
}

// 主函数
function main() {
    // 1. 配置检查
    const isEnabled = diagnoseConfiguration();
    
    if (!isEnabled) {
        console.log('\n❌ 主动私聊功能已禁用！请联系管理员启用。');
        return;
    }
    
    // 2. 模拟用户检查（以您的53亲密度为例）
    const yourProfile = {
        intimacy: 53,
        lastActiveTime: new Date(Date.now() - 1000 * 60 * 60), // 1小时前活跃
        lastProactiveTime: null, // 假设从未收到过主动消息
        todayMessageCount: 0 // 今日收到0条主动消息
    };
    
    const checkResults = simulateUserCheck(yourProfile);
    
    // 3. 概率计算
    const probability = simulateProbability(yourProfile);
    
    // 4. 综合判断
    console.log('\n🎯 ==================== 综合诊断结果 ====================');
    
    const allChecksPassed = Object.values(checkResults).every(result => result);
    
    if (allChecksPassed) {
        console.log('✅ 所有基础条件都满足！');
        console.log(`🎲 每次检查有 ${(probability * 100).toFixed(1)}% 的概率发送消息`);
        console.log(`⏰ 机器人每2分钟检查一次，平均需要等待 ${Math.round(2 / probability)} 分钟`);
        
        if (probability < 0.2) {
            console.log('⚠️  触发概率较低，建议耐心等待或联系管理员调整参数');
        }
        
        console.log('\n📋 概率机制说明：');
        console.log('✅ 概率判断功能已修复实现');
        console.log('🎲 每2分钟检查时，满足所有基础条件后进行概率判断');
        console.log(`🎯 您的概率: ${(probability * 100).toFixed(1)}% = 10%基础概率 + ${yourProfile.intimacy} × 0.2%亲密度奖励`);
        console.log('📊 概率越高的用户越容易收到主动消息');
        
    } else {
        console.log('❌ 部分条件不满足，无法接收主动私信');
        console.log('🔍 请检查以上失败的条件项目');
    }
    
    // 5. 故障排除建议
    showTroubleshooting();
    
    console.log('\n🏁 ==================== 诊断完成 ====================');
}

// 运行诊断
main(); 