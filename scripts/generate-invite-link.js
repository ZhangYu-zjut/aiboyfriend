import 'dotenv/config';

console.log('🔗 Discord机器人邀请链接生成器\n');

function generateInviteLink() {
  const clientId = process.env.CLIENT_ID;
  
  if (!clientId) {
    console.log('❌ 错误：未找到CLIENT_ID');
    console.log('请确保.env文件中配置了CLIENT_ID');
    console.log('CLIENT_ID可以在Discord开发者面板的General Information页面找到');
    return;
  }
  
  // 权限计算（十进制）
  const permissions = {
    VIEW_CHANNELS: 1024,           // 查看频道
    SEND_MESSAGES: 2048,           // 发送消息
    SEND_MESSAGES_IN_THREADS: 274877906944, // 在话题中发送消息
    EMBED_LINKS: 16384,            // 嵌入链接
    ATTACH_FILES: 32768,           // 附加文件
    READ_MESSAGE_HISTORY: 65536,   // 读取消息历史
    ADD_REACTIONS: 64,             // 添加反应
    USE_EXTERNAL_EMOJIS: 262144,   // 使用外部表情
    USE_SLASH_COMMANDS: 2147483648, // 使用斜杠命令
    CHANGE_NICKNAME: 67108864      // 更改昵称
  };
  
  // 计算总权限值
  const totalPermissions = Object.values(permissions).reduce((sum, perm) => sum + perm, 0);
  
  // 生成邀请链接
  const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${totalPermissions}&scope=bot%20applications.commands`;
  
  console.log('✅ 邀请链接生成成功！\n');
  console.log('🔗 邀请链接：');
  console.log(inviteLink);
  console.log('\n📋 使用说明：');
  console.log('1. 复制上方链接到浏览器中打开');
  console.log('2. 选择要添加机器人的Discord服务器');
  console.log('3. 确认权限并点击"授权"');
  console.log('4. 完成后机器人将出现在服务器成员列表中');
  
  console.log('\n🎯 权限说明：');
  console.log('本邀请链接包含以下权限：');
  console.log('- 查看频道');
  console.log('- 发送消息（包括话题）');
  console.log('- 使用斜杠命令');
  console.log('- 嵌入链接和附件');
  console.log('- 读取消息历史');
  console.log('- 添加反应和表情');
  console.log('- 更改昵称');
  
  console.log('\n⚠️  注意事项：');
  console.log('- 机器人添加后会显示离线状态（正常现象）');
  console.log('- 使用 npm start 启动机器人后才会显示在线');
  console.log('- 如果斜杠命令不显示，请等待1小时或重新邀请');
  
  return inviteLink;
}

// 检查环境变量
function checkEnvironment() {
  console.log('🔍 检查环境配置...');
  
  const requiredVars = ['CLIENT_ID', 'BOT_TOKEN'];
  let hasErrors = false;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.startsWith('your_')) {
      console.log(`❌ ${varName}: 未配置`);
      hasErrors = true;
    } else {
      const maskedValue = value.substring(0, 8) + '...';
      console.log(`✅ ${varName}: ${maskedValue}`);
    }
  }
  
  if (hasErrors) {
    console.log('\n🔧 配置指南：');
    console.log('1. 访问 https://discord.com/developers/applications');
    console.log('2. 选择你的应用 → General Information → Application ID');
    console.log('3. 复制 Application ID 到 .env 文件的 CLIENT_ID');
    console.log('4. 在 Bot 页面复制 Token 到 .env 文件的 BOT_TOKEN');
    return false;
  }
  
  console.log('');
  return true;
}

function main() {
  if (checkEnvironment()) {
    generateInviteLink();
  }
}

main(); 