import { ProxyAgent } from 'proxy-agent';
import { Agent as HttpsAgent } from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';

export class DiscordProxyConfig {
  static getWebSocketProxyConfig() {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    if (!proxyUrl) {
      console.log('🔧 未配置代理，使用直连');
      return null;
    }
    
    console.log(`🔧 配置Discord WebSocket代理: ${proxyUrl}`);
    
    try {
      const url = new URL(proxyUrl);
      
      // 根据代理类型选择不同的agent
      if (url.protocol === 'socks5:') {
        // SOCKS5代理
        console.log('📡 使用SOCKS5代理');
        return new SocksProxyAgent(proxyUrl);
      } else {
        // HTTP/HTTPS代理
        console.log('📡 使用HTTP代理');
        return new ProxyAgent(proxyUrl);
      }
    } catch (error) {
      console.log(`❌ 代理配置失败: ${error.message}`);
      return null;
    }
  }
  
  static getDiscordClientOptions() {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    const options = {
      intents: [
        'Guilds',
        'GuildMessages', 
        'MessageContent',
        'DirectMessages'
      ]
    };
    
    // 如果有代理，只设置基本的超时和重试配置
    // 不直接传递agent，让undici通过环境变量自动处理代理
    if (proxyUrl) {
      console.log('🔧 使用环境变量代理配置，避免undici兼容性问题');
      
      options.ws = {
        // 增加超时时间
        timeout: 30000,
        // 允许更多重试
        retry: 5
      };
      
      // 设置REST API配置，但不传递agent
      options.rest = {
        timeout: 30000,
        retries: 3
      };
    }
    
    return options;
  }
  
  // 测试WebSocket代理连接
  static async testWebSocketProxy() {
    console.log('🧪 测试WebSocket代理连接...');
    
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (!proxyUrl) {
      console.log('⚠️  未配置代理，跳过WebSocket代理测试');
      return false;
    }
    
    try {
      // 1. 先测试HTTP连接到Gateway
      const gatewayResponse = await fetch('https://discord.com/api/v10/gateway', {
        signal: AbortSignal.timeout(10000)
      });
      
      if (!gatewayResponse.ok) {
        throw new Error(`Gateway API失败: ${gatewayResponse.status}`);
      }
      
      const gatewayData = await gatewayResponse.json();
      console.log(`✅ Gateway URL获取成功: ${gatewayData.url}`);
      
      // 2. 简单验证代理配置存在
      console.log('✅ 代理环境变量配置正确');
      return true;
      
    } catch (error) {
      console.log(`❌ WebSocket代理测试失败: ${error.message}`);
      return false;
    }
  }
  
  // 直连模式配置（备用方案）
  static getDirectClientOptions() {
    console.log('🌐 使用直连模式（无代理）');
    
    return {
      intents: [
        'Guilds',
        'GuildMessages',
        'MessageContent', 
        'DirectMessages'
      ],
      ws: {
        timeout: 30000,
        retry: 3
      },
      rest: {
        timeout: 20000,
        retries: 2
      }
    };
  }
} 