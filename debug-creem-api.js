import 'dotenv/config';
import axios from 'axios';

console.log('🔍 Creem API 调试工具 v2.0');
console.log('============================\n');

// 检查环境变量
console.log('1. 📋 Creem环境变量检查:');
const requiredVars = {
  'CREEM_API_KEY': process.env.CREEM_API_KEY,
  'CREEM_WEBHOOK_SECRET': process.env.CREEM_WEBHOOK_SECRET,
  'CREEM_PRODUCT_ID_STARTER': process.env.CREEM_PRODUCT_ID_STARTER,
  'CREEM_PRODUCT_ID_BASIC': process.env.CREEM_PRODUCT_ID_BASIC,
  'CREEM_PRODUCT_ID_STANDARD': process.env.CREEM_PRODUCT_ID_STANDARD,
  'CREEM_PRODUCT_ID_PREMIUM': process.env.CREEM_PRODUCT_ID_PREMIUM,
  'APP_URL': process.env.APP_URL
};

let isTestEnvironment = false;

for (const [key, value] of Object.entries(requiredVars)) {
  if (value) {
    console.log(`✅ ${key}: 已配置`);
    console.log(`   长度: ${value.length}`);
    console.log(`   预览: ${value.substring(0, 20)}...`);
    
    // 检查是否为测试环境
    if (value.includes('test') || value.includes('_test_')) {
      isTestEnvironment = true;
      console.log(`   🧪 检测到测试环境配置`);
    }
    
    // 检查格式问题
    const issues = [];
    if (value.includes('\n') || value.includes('\r')) {
      issues.push('包含换行符');
    }
    if (value.trim() !== value) {
      issues.push('包含前后空格');
    }
    if (value.includes('"') || value.includes("'")) {
      issues.push('包含引号');
    }
    
    if (issues.length > 0) {
      console.log(`   ⚠️  潜在问题: ${issues.join(', ')}`);
    }
    console.log('');
  } else {
    console.log(`❌ ${key}: 未配置\n`);
  }
}

if (isTestEnvironment) {
  console.log('🧪 检测到测试环境配置');
  console.log('   测试环境可能有功能限制，建议升级到生产环境');
  console.log('');
}

// Creem API配置
const CREEM_API_URL = 'https://api.creem.io/v1';
const CREEM_API_KEY = process.env.CREEM_API_KEY;

if (!CREEM_API_KEY) {
  console.log('❌ 无法进行API测试：CREEM_API_KEY未配置');
  process.exit(1);
}

console.log('\n2. 🧪 测试Creem API连接:');
console.log('========================');

// 创建通用的axios配置
const axiosConfig = {
  timeout: 10000,
  headers: {
    'x-api-key': CREEM_API_KEY,
    'Content-Type': 'application/json',
    'User-Agent': 'AI-Boyfriend-Bot/1.0'
  }
};

// 测试1: 检查API基础连接
console.log('📡 测试1: 检查API基础连接...');

try {
  const pingResponse = await axios.get(`${CREEM_API_URL}/ping`, axiosConfig);
  console.log('✅ API基础连接成功');
  console.log(`响应: ${JSON.stringify(pingResponse.data, null, 2)}`);
} catch (pingError) {
  console.log('❌ API基础连接失败:');
  console.log(`   状态码: ${pingError.response?.status || '无响应'}`);
  console.log(`   错误信息: ${JSON.stringify(pingError.response?.data || pingError.message, null, 2)}`);
  
  // 如果ping都不通，可能是网络问题或API地址错误
  if (!pingError.response) {
    console.log('   可能原因: 网络连接问题或API地址不正确');
  }
}

// 测试2: 尝试不同的认证端点
console.log('\n📡 测试2: 验证API密钥有效性...');

const authEndpoints = ['/me', '/account', '/auth/validate'];

for (const endpoint of authEndpoints) {
  try {
    console.log(`   尝试端点: ${endpoint}`);
    const authResponse = await axios.get(`${CREEM_API_URL}${endpoint}`, axiosConfig);
    console.log(`   ✅ ${endpoint} 成功`);
    console.log(`   账户信息: ${JSON.stringify(authResponse.data, null, 2)}`);
    break; // 如果成功就跳出循环
  } catch (authError) {
    console.log(`   ❌ ${endpoint} 失败: ${authError.response?.status || '无响应'}`);
    if (authError.response?.data) {
      console.log(`   错误详情: ${JSON.stringify(authError.response.data, null, 2)}`);
    }
  }
}

// 测试3: 简化的产品测试
console.log('\n📡 测试3: 获取产品信息...');

try {
  const productsResponse = await axios.get(`${CREEM_API_URL}/products`, axiosConfig);
  console.log('✅ 产品列表获取成功');
  console.log(`产品数量: ${productsResponse.data?.length || productsResponse.data?.count || 0}`);
  
  if (Array.isArray(productsResponse.data) && productsResponse.data.length > 0) {
    productsResponse.data.slice(0, 3).forEach((product, index) => {
      console.log(`   产品${index + 1}: ${product.name || product.title || 'Unknown'} (ID: ${product.id})`);
    });
  } else if (productsResponse.data?.products) {
    console.log(`   找到 ${productsResponse.data.products.length} 个产品`);
  }
  
} catch (productsError) {
  console.log('❌ 产品列表获取失败:');
  console.log(`   状态码: ${productsError.response?.status || '无响应'}`);
  console.log(`   错误信息: ${JSON.stringify(productsError.response?.data || productsError.message, null, 2)}`);
  
  // 提供具体的错误分析
  if (productsError.response?.status === 403) {
    console.log('\n   🎯 403错误可能原因:');
    console.log('   - 测试API密钥权限受限');
    console.log('   - 需要升级到生产环境');
    console.log('   - 账户未完成验证流程');
  }
}

// 测试4: 最小化checkout测试
console.log('\n📡 测试4: 创建最小化checkout测试...');

const testProductId = process.env.CREEM_PRODUCT_ID_STARTER || 
                     process.env.CREEM_PRODUCT_ID_BASIC ||
                     process.env.CREEM_PRODUCT_ID_STANDARD ||
                     process.env.CREEM_PRODUCT_ID_PREMIUM;

if (!testProductId) {
  console.log('❌ 无法进行checkout测试：没有配置任何产品ID');
} else {
  console.log(`🎯 使用产品ID: ${testProductId}`);
  
  // 简化的测试负载
  const minimalPayload = {
    product_id: testProductId,
    request_id: `debug_${Date.now()}`,
    success_url: `${process.env.APP_URL || 'https://example.com'}/success`,
    cancel_url: `${process.env.APP_URL || 'https://example.com'}/cancel`,
    customer: {
      email: 'debug@test.com'
    }
  };
  
  console.log('📦 最小化请求负载:');
  console.log(JSON.stringify(minimalPayload, null, 2));
  
  try {
    const checkoutResponse = await axios.post(`${CREEM_API_URL}/checkouts`, minimalPayload, axiosConfig);
    console.log('✅ Checkout session创建成功!');
    console.log(`Checkout URL: ${checkoutResponse.data.checkout_url || checkoutResponse.data.url}`);
    console.log(`Session ID: ${checkoutResponse.data.checkout_id || checkoutResponse.data.id}`);
    
  } catch (checkoutError) {
    console.log('❌ Checkout session创建失败:');
    console.log(`   状态码: ${checkoutError.response?.status || '无响应'}`);
    console.log(`   错误信息: ${JSON.stringify(checkoutError.response?.data || checkoutError.message, null, 2)}`);
    
    if (checkoutError.response?.status === 403) {
      console.log('\n🎯 403 Forbidden错误详细分析:');
      console.log('1. **测试环境限制**: 当前使用测试API密钥，功能受限');
      console.log('2. **账户状态**: 测试账户可能需要升级或验证');
      console.log('3. **产品权限**: 产品ID可能不属于当前API密钥');
      console.log('4. **地理限制**: 某些地区可能无法使用');
    } else if (checkoutError.response?.status === 422) {
      console.log('\n🎯 422错误分析:');
      console.log('1. 检查product_id是否正确');
      console.log('2. 确认URL格式正确');
      console.log('3. 验证必填字段完整性');
    }
  }
}

console.log('\n🎯 问题解决方案:');
console.log('================');

if (isTestEnvironment) {
  console.log('🧪 **测试环境问题**:');
  console.log('1. 当前使用测试API密钥，功能受限');
  console.log('2. 建议联系Creem获取生产环境密钥');
  console.log('3. 或在Creem Dashboard中升级账户');
  console.log('');
}

console.log('🔧 **立即修复步骤**:');
console.log('1. 登录 https://dashboard.creem.io');
console.log('2. 检查账户状态和验证状态');
console.log('3. 确认API密钥权限设置');
console.log('4. 升级到生产环境（如果需要）');
console.log('5. 重新生成API密钥和产品ID');

console.log('\n💡 **临时解决方案**:');
console.log('1. 暂时禁用充值功能，其他功能正常使用');
console.log('2. 使用预设回复替代AI服务（如果OpenRouter也有问题）');
console.log('3. 等待Creem账户问题解决后重新启用');

console.log('\n📞 **获取帮助**:');
console.log('================');
console.log('Creem Dashboard: https://dashboard.creem.io');
console.log('Creem文档: https://docs.creem.io');
console.log('技术支持: support@creem.io');
console.log('社区支持: https://community.creem.io'); 