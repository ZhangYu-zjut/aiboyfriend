import { ProxyAgent } from 'proxy-agent';
import { setGlobalDispatcher, ProxyAgent as UndiciProxyAgent } from 'undici';

// 代理配置
export class ProxyConfig {
  static setup() {
    // 检查环境变量中的代理设置
    const proxyUrl = process.env.HTTPS_PROXY || 
                     process.env.HTTP_PROXY || 
                     process.env.ALL_PROXY;
    
    if (proxyUrl) {
      console.log(`🌐 配置代理: ${proxyUrl}`);
      
      // 为Node.js设置代理环境变量
      if (!process.env.HTTPS_PROXY) process.env.HTTPS_PROXY = proxyUrl;
      if (!process.env.HTTP_PROXY) process.env.HTTP_PROXY = proxyUrl;
      
      // 设置全局代理 dispatcher
      try {
        const proxyAgent = new UndiciProxyAgent(proxyUrl);
        setGlobalDispatcher(proxyAgent);
        console.log(`✅ 全局代理已配置: ${proxyUrl}`);
      } catch (error) {
        console.log(`⚠️  全局代理配置失败: ${error.message}`);
      }
      
      return proxyUrl;
    }
    
    // 检查是否有本地代理服务
    const commonProxies = [
      'http://127.0.0.1:7890',  // Clash默认端口
      'http://127.0.0.1:1087',  // Shadowsocks默认端口
      'socks5://127.0.0.1:1080', // SOCKS5默认端口
    ];
    
    if (process.env.USE_LOCAL_PROXY === 'true') {
      for (const proxy of commonProxies) {
        console.log(`🌐 尝试配置本地代理: ${proxy}`);
        process.env.HTTPS_PROXY = proxy;
        process.env.HTTP_PROXY = proxy;
        
        try {
          const proxyAgent = new UndiciProxyAgent(proxy);
          setGlobalDispatcher(proxyAgent);
          console.log(`✅ 本地代理已配置: ${proxy}`);
          return proxy;
        } catch (error) {
          console.log(`⚠️  本地代理配置失败: ${error.message}`);
        }
      }
    }
    
    return null;
  }
  
  static getProxyAgent() {
    const proxyUrl = process.env.HTTPS_PROXY || 
                     process.env.HTTP_PROXY || 
                     process.env.ALL_PROXY;
    
    if (proxyUrl) {
      return new ProxyAgent(proxyUrl);
    }
    
    if (process.env.USE_LOCAL_PROXY === 'true') {
      return new ProxyAgent('http://127.0.0.1:7890');
    }
    
    return null;
  }
  
  // Discord.js REST配置
  static getRestOptions() {
    const agent = this.getProxyAgent();
    if (agent) {
      return {
        api: 'https://discord.com/api',
        // Discord.js 14.x 使用 REST 配置
        makeRequest: async (url, init) => {
          return fetch(url, {
            ...init,
            // dispatcher: agent // 使用全局dispatcher替代
          });
        }
      };
    }
    return {};
  }
  
  // 创建支持代理的fetch函数
  static createProxyFetch() {
    const agent = this.getProxyAgent();
    if (agent) {
      return async (url, options = {}) => {
        // 使用全局dispatcher，fetch会自动使用
        return fetch(url, options);
      };
    }
    return fetch;
  }
  
  // 测试代理连接
  static async testProxyConnection() {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (!proxyUrl) {
      return { success: false, error: '未配置代理' };
    }
    
    try {
      const response = await fetch('https://httpbin.org/ip', {
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, ip: data.origin, proxy: proxyUrl };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
} 