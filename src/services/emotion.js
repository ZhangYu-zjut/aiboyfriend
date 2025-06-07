import { HfInference } from '@huggingface/inference';
import { GAME_CONFIG } from '../config/settings.js';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export class EmotionService {
  // 使用HuggingFace API进行情感分析
  static async analyzeEmotion(text) {
    try {
      // 检测是否为中文文本
      const isChinese = /[\u4e00-\u9fa5]/.test(text);
      
      // 直接使用英文情感分析模型（更稳定）
      let result;
      try {
        console.log('尝试英文情感分析模型...');
        result = await hf.textClassification({
          model: 'j-hartmann/emotion-english-distilroberta-base',
          inputs: text
        });
        console.log('HuggingFace英文模型结果:', result);
        
        // 如果是中文文本且模型主要识别为neutral，直接降级到关键词检测
        if (isChinese && result.length > 0) {
          const topResult = result[0];
          const neutralScore = result.find(r => r.label.toLowerCase() === 'neutral')?.score || 0;
          
          // 如果中性得分过高且没有明确的情感倾向，降级到关键词检测
          if (neutralScore > 0.6) {
            console.log(`中文文本中性得分过高(${neutralScore.toFixed(3)})，降级到关键词检测`);
            return this.fallbackEmotionAnalysis(text);
          }
        }
      } catch (englishModelError) {
        console.log('英文模型不可用，API认证可能有问题:', englishModelError.message);
        // 直接降级到关键词检测
        console.log('降级到关键词检测');
        return this.fallbackEmotionAnalysis(text);
      }

      // 计算情感得分 - 改进版本
      const positiveEmotions = ['joy', 'love', 'surprise', 'caring', 'positive', 'happy', 'excitement', 'optimism'];
      const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust', 'negative', 'disappointment', 'pessimism'];
      const neutralEmotions = ['neutral'];
      
      let positiveScore = 0;
      let negativeScore = 0;
      let neutralScore = 0;

      result.forEach(emotion => {
        const label = emotion.label.toLowerCase();
        console.log(`检查情感标签: ${label}, 得分: ${emotion.score}`);
        if (positiveEmotions.includes(label)) {
          positiveScore += emotion.score;
        } else if (negativeEmotions.includes(label)) {
          negativeScore += emotion.score;
        } else if (neutralEmotions.includes(label)) {
          neutralScore += emotion.score;
        }
      });

      console.log(`正面得分: ${positiveScore}, 负面得分: ${negativeScore}, 中性得分: ${neutralScore}`);
      
      // 改进的情感得分计算
      let emotionScore;
      if (positiveScore > 0 || negativeScore > 0) {
        // 有明确情感倾向时，计算相对得分
        emotionScore = (positiveScore - negativeScore) / (positiveScore + negativeScore + neutralScore);
      } else if (neutralScore > 0.5) {
        // 主要为中性时，得分为0
        emotionScore = 0;
      } else {
        // 无法确定情感时，降级到关键词检测
        console.log('英文模型无明确情感识别，降级到关键词检测');
        return this.fallbackEmotionAnalysis(text);
      }
      
      console.log(`最终情感得分: ${emotionScore}`);
      
      // 如果得分异常（中文文本但得到负面结果），降级到关键词检测
      if (isChinese && emotionScore < 0 && text.includes('好') || text.includes('开心') || text.includes('心情很好')) {
        console.log('检测到中文正面词汇但英文模型给出负面结果，降级到关键词检测');
        return this.fallbackEmotionAnalysis(text);
      }
      
      console.log('✅ 英文模型分析成功');
      return {
        emotions: result,
        score: emotionScore,
        isPositive: emotionScore > 0.1,
        source: 'huggingface-english'
      };
    } catch (error) {
      console.error('HuggingFace情感分析失败:', error);
      // 降级到简单关键词检测
      console.log('完全降级到关键词检测');
      return this.fallbackEmotionAnalysis(text);
    }
  }

  // 降级情感分析（基于关键词）- 优化中文支持和语境识别
  static fallbackEmotionAnalysis(text) {
    console.log(`🔍 关键词情感分析: "${text}"`);
    
    // 🆕 增加语境检测 - 疑问句和否定句
    const isQuestion = /[？?]/.test(text) || 
                       text.includes('什么') || text.includes('怎么') || text.includes('为什么') ||
                       text.includes('哪里') || text.includes('谁') || text.includes('如何') ||
                       text.includes('吗') || text.includes('呢');
                       
    const isNegation = text.includes('不') || text.includes('没') || text.includes('别') || 
                      text.includes('无') || text.includes('非');
                      
    console.log(`语境检测: 疑问句=${isQuestion}, 否定句=${isNegation}`);
    
    // 如果是疑问句，降低情感强度权重（但不完全消除）
    const questionPenalty = isQuestion ? 0.5 : 1.0;
    // 如果是否定句，需要特殊处理
    const negationModifier = isNegation ? -0.5 : 1.0;

    const positiveWords = [
      // 高强度正面情感
      '爱死了', '超爱', '最爱', '深爱', '疯狂喜欢', '太棒了', '完美', '无敌', '超级棒',
      // 中等强度正面情感
      '爱', '喜欢', '开心', '高兴', '快乐', '温柔', '甜蜜', '幸福', '满足', '舒服',
      '激动', '兴奋', '惊喜', '感动', '温暖', '安心', '放松', '愉快', '美好', '棒',
      '好', '不错', '很好', '真好', '太好了', '挺好', '非常好', '特别好', '相当好',
      // 🆕 增强的正面表达
      '天气不错', '心情好', '心情很好', '心情不错', '心情愉快', '心情开朗', '心情舒畅',
      '感觉不错', '还不错', '挺不错', '相当不错', '真不错', '蛮好的', '还好',
      // 亲密表达
      '抱抱', '亲亲', '宝贝', '老公', '想你', '爱你', '心动', '撒娇', '粘人', '依赖',
      '么么哒', '亲爱的', '小可爱', '小宝贝', '心肝', '甜心', '乖乖', '宠爱',
      // 表情符号
      '❤️', '💕', '💖', '💗', '💘', '💝', '😘', '🥰', '😍', '🤗', '😊', '😄', '😆', '🥳',
      '✨', '🌟', '💫', '🌸', '🌺', '🌹', '🎉', '🎊', '👍', '🙌', '💪',
      // 英文（保留原有）
      'love', 'happy', 'sweet', 'miss', 'cute', 'darling', 'amazing', 'perfect', 'wonderful'
    ];

    const negativeWords = [
      // 高强度负面情感
      '恨死了', '讨厌死了', '气死了', '崩溃', '绝望', '痛苦', '折磨', '煎熬', '抑郁',
      // 中等强度负面情感
      '难过', '伤心', '生气', '讨厌', '烦躁', '焦虑', '失望', '孤独', '寂寞', '空虚',
      '疲惫', '累', '烦', '郁闷', '沮丧', '低落', '无聊', '害怕', '担心', '紧张',
      '委屈', '心疼', '难受', '不舒服', '压抑', '烦心', '心烦', '闹心',
      // 🆕 增强的负面表达
      '好难过', '很难过', '特别难过', '超级难过', '太难过了', '难过死了',
      '好伤心', '很伤心', '超伤心', '心情差', '心情不好', '心情糟糕',
      // 哭泣表达
      '哭', '眼泪', '流泪', '啜泣', '呜呜', '嘤嘤', '😭😭', '泪奔',
      // 表情符号
      '😢', '😭', '😔', '😞', '😩', '😫', '😤', '😡', '🤬', '😰', '😨', '😱',
      '💔', '💀', '😵', '🙄', '😒', '😑', '🥺', '😪', '😴',
      // 英文（保留原有）
      'sad', 'angry', 'hate', 'cry', 'hurt', 'lonely', 'depressed', 'upset', 'disappointed'
    ];

    // 增加网络用语和二次元表达
    const internetSlang = {
      positive: ['awsl', 'yyds', '绝绝子', '爱了爱了', 'omo', '嘻嘻', '哈哈', '哇塞', '牛逼', '666', '赞', '👍'],
      negative: ['emo了', '破防了', '心态崩了', '裂开', '麻了', '无语', '醉了', '服了', '败了']
    };

    // 🆕 强情感表达词组（优先级最高，不受疑问句影响）
    const strongEmotionPhrases = {
      positive: [
        '我爱你', '爱死你了', '想死你了', '超级爱你', '最爱你', '心动了',
        '好开心啊', '开心死了', '太棒了', '完美', '无敌了', '超级棒',
        '感觉很幸福', '好幸福', '太幸福了', '心情超好', '心情特别好',
        '今天天气不错', '天气真不错', '天气很好', '天气挺好'
      ],
      negative: [
        '我难过', '好难过', '很难过', '伤心死了', '心碎了', '想哭', '好痛苦',
        '心情很差', '心情不好', '感觉糟透了', '烦死了', '气死了',
        '超级难过', '特别难过', '太难过了', '难过死了'
      ]
    };

    // 🆕 中性疑问词组（应该被识别为中性）
    const neutralQuestions = [
      '你喜欢什么', '喜欢什么', '你爱什么', '爱什么',
      '什么好', '什么不错', '怎么样', '如何',
      '你觉得呢', '你认为呢', '你说呢'
    ];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    let positiveIntensity = 0;
    let negativeIntensity = 0;
    let hasStrongEmotion = false;

    // 首先检查是否为中性疑问
    let isNeutralQuestion = false;
    neutralQuestions.forEach(phrase => {
      if (text.includes(phrase)) {
        isNeutralQuestion = true;
        console.log(`检测到中性疑问: "${phrase}"`);
      }
    });

    // 如果是中性疑问，直接返回中性结果
    if (isNeutralQuestion) {
      console.log('✅ 识别为中性疑问，返回中性结果');
      return {
        emotions: [],
        score: 0,
        isPositive: false,
        source: 'keyword-neutral-question',
        details: `中性疑问: "${text}"`
      };
    }

    // 检查强情感表达（不受疑问句影响）
    strongEmotionPhrases.positive.forEach(phrase => {
      if (text.includes(phrase)) {
        hasStrongEmotion = true;
        positiveCount += 3;  // 强情感权重更高
        positiveIntensity += 3;
        console.log(`检测到强正面情感: "${phrase}"`);
      }
    });

    strongEmotionPhrases.negative.forEach(phrase => {
      if (text.includes(phrase)) {
        hasStrongEmotion = true;
        negativeCount += 3;
        negativeIntensity += 3;
        console.log(`检测到强负面情感: "${phrase}"`);
      }
    });

    // 检查正面词汇
    positiveWords.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) {
        positiveCount++;
        // 🆕 调整权重分配，增强关键词汇的权重
        if (['爱死了', '超爱', '最爱', '完美', '无敌', '太棒了'].includes(word)) {
          positiveIntensity += 2.5;
        } else if (['爱', '喜欢', '开心', '高兴', '快乐', '不错', '很好'].includes(word)) {
          positiveIntensity += 2.0;
        } else {
          positiveIntensity += 1.5;
        }
        console.log(`检测到正面词汇: "${word}"`);
      }
    });

    // 检查负面词汇
    negativeWords.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) {
        negativeCount++;
        // 🆕 调整权重分配，增强关键词汇的权重
        if (['恨死了', '讨厌死了', '气死了', '崩溃', '绝望', '好难过'].includes(word)) {
          negativeIntensity += 2.5;
        } else if (['难过', '伤心', '生气', '讨厌'].includes(word)) {
          negativeIntensity += 2.0;
        } else {
          negativeIntensity += 1.5;
        }
        console.log(`检测到负面词汇: "${word}"`);
      }
    });

    // 检查网络用语
    internetSlang.positive.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) {
        positiveCount++;
        positiveIntensity += 1.5;
        console.log(`检测到正面网络用语: "${word}"`);
      }
    });

    internetSlang.negative.forEach(word => {
      if (lowerText.includes(word.toLowerCase())) {
        negativeCount++;
        negativeIntensity += 1.5;
        console.log(`检测到负面网络用语: "${word}"`);
      }
    });

    console.log(`统计结果: 正面词汇=${positiveCount}, 负面词汇=${negativeCount}`);
    console.log(`强度统计: 正面强度=${positiveIntensity}, 负面强度=${negativeIntensity}`);
    console.log(`修正系数: 疑问句权重=${questionPenalty}, 否定修正=${negationModifier}, 强情感=${hasStrongEmotion}`);

    // 应用修正系数（强情感表达不受疑问句影响，但权重稍微调整）
    if (!hasStrongEmotion) {
      positiveIntensity *= questionPenalty;
    } else {
      // 强情感表达即使在疑问句中也保持较高权重
      positiveIntensity *= Math.max(questionPenalty, 0.8);
    }

    // 应用否定修正
    if (isNegation) {
      if (positiveIntensity > negativeIntensity) {
        // 否定句中的正面词汇可能被否定
        positiveIntensity *= Math.abs(negationModifier);
      }
    }

    console.log(`修正后强度: 正面强度=${positiveIntensity}, 负面强度=${negativeIntensity}`);

    // 🆕 改进的情感得分计算
    let score = 0;
    
    if (positiveIntensity > 0 || negativeIntensity > 0) {
      const totalIntensity = positiveIntensity + negativeIntensity;
      // 基础得分计算
      score = (positiveIntensity - negativeIntensity) / totalIntensity;
      
      // 🆕 增强有明确情感倾向的得分
      if (Math.abs(score) > 0) {
        // 确保有情感的内容能够达到阈值
        const minThreshold = 0.15; // 最小阈值
        if (score > 0 && score < minThreshold) {
          score = minThreshold;
        } else if (score < 0 && score > -minThreshold) {
          score = -minThreshold;
        }
      }
    }

    // 如果有强情感表达，进一步加强得分
    if (hasStrongEmotion) {
      score = score > 0 ? Math.min(1, score * 1.3) : Math.max(-1, score * 1.3);
    }

    console.log(`最终情感得分: ${score} (${score > 0 ? '正面' : score < 0 ? '负面' : '中性'})`);

    const result = {
      emotions: [],
      score: Number(score.toFixed(3)),
      isPositive: score > 0.1,
      source: 'keyword-fallback',
      details: `正面词汇: ${positiveCount}, 负面词汇: ${negativeCount}, 
                正面强度: ${positiveIntensity.toFixed(2)}, 负面强度: ${negativeIntensity.toFixed(2)}, 
                语境修正: 疑问=${isQuestion}, 否定=${isNegation}, 强情感=${hasStrongEmotion}`
    };

    console.log('✅ 关键词分析完成:', result);
    return result;
  }

  // 🆕 使用配置文件计算HET
  static calculateHET(text, emotionResult, tokenCount) {
    const config = GAME_CONFIG.HET;
    console.log('🎯 =============== HET计算开始 ===============');
    console.log(`📝 输入文本: "${text}"`);
    console.log(`💭 情感结果: 得分=${emotionResult.score}, 正面=${emotionResult.isPositive}, 来源=${emotionResult.source}`);
    console.log(`📊 Token数量: ${tokenCount}`);
    
    let baseHET = 0;
    let multiplier = 1.0;
    let source = emotionResult.source || 'unknown';
    
    // 基础HET值计算（基于情感强度）
    const emotionScore = Math.abs(emotionResult.score);
    console.log(`🔢 情感强度: ${emotionScore}`);
    
    if (emotionScore > 0) {
      // 使用配置的最大基础HET
      baseHET = Math.min(emotionScore * config.MAX_BASE_HET, config.MAX_BASE_HET);
      console.log(`⚡ 基础HET: ${baseHET} (限制在${config.MAX_BASE_HET}以内)`);
    } else {
      console.log(`❌ 无情感强度，基础HET为0`);
    }
    
    // 情感方向乘数
    const directionMultiplier = emotionResult.isPositive ? 
                                config.DIRECTION_MULTIPLIER.POSITIVE : 
                                config.DIRECTION_MULTIPLIER.NEGATIVE;
    console.log(`🎭 情感方向乘数: ${directionMultiplier} (${emotionResult.isPositive ? '正面' : '负面'})`);
    
    // 数据源乘数
    let sourceMultiplier;
    if (source.includes('huggingface')) {
      sourceMultiplier = config.SOURCE_MULTIPLIER.AI_MODEL;
    } else if (source.includes('keyword')) {
      sourceMultiplier = config.SOURCE_MULTIPLIER.KEYWORD;
    } else {
      sourceMultiplier = config.SOURCE_MULTIPLIER.KEYWORD; // 默认
    }
    console.log(`🔍 数据源乘数: ${sourceMultiplier} (来源: ${source})`);
    
    // 计算最终HET
    let finalHET = baseHET * directionMultiplier * sourceMultiplier;
    console.log(`📈 初步计算: ${baseHET} × ${directionMultiplier} × ${sourceMultiplier} = ${finalHET}`);
    
    // 🔒 应用最大值限制
    finalHET = Math.min(finalHET, config.MAX_FINAL_HET);
    finalHET = Math.max(finalHET, 0); // 确保非负
    
    // 四舍五入到整数
    finalHET = Math.round(finalHET);
    
    console.log(`🎯 最终HET: ${finalHET} (限制在0-${config.MAX_FINAL_HET})`);
    console.log('✅ =============== HET计算完成 ===============');
    
    return finalHET;
  }

  // 🆕 使用配置文件检查情感阈值
  static checkEmotionThreshold(het, userGroup = 'A') {
    const config = GAME_CONFIG.INTIMACY;
    const threshold = userGroup === 'A' ? 
                     config.EMOTION_THRESHOLD_A : 
                     config.EMOTION_THRESHOLD_B;
    
    console.log(`🎯 阈值检查: HET=${het}, 分组=${userGroup}, 阈值=${threshold}`);
    
    const thresholdMet = het >= threshold;
    console.log(`📊 阈值${thresholdMet ? '达标' : '未达标'} (${het}/${threshold})`);
    
    return {
      thresholdMet,
      het,
      threshold,
      userGroup
    };
  }

  // 生成情感相关的emoji
  static generateEmotionEmoji(emotionResult, het) {
    const score = emotionResult.score;
    const intensity = Math.abs(score);

    if (score > 0.6) {
      return ['💕', '❤️', '😍', '🥰', '💖'][Math.floor(Math.random() * 5)];
    } else if (score > 0.3) {
      return ['😊', '😄', '🤗', '😘', '✨'][Math.floor(Math.random() * 5)];
    } else if (score > 0.1) {
      return ['😌', '🙂', '😏', '😉', '👍'][Math.floor(Math.random() * 5)];
    } else if (score < -0.3) {
      return ['😢', '😭', '😔', '💔', '😞'][Math.floor(Math.random() * 5)];
    } else if (score < -0.1) {
      return ['😕', '😟', '😤', '😠', '🙄'][Math.floor(Math.random() * 5)];
    } else {
      return ['😐', '🤔', '😶', '😑', '🤷'][Math.floor(Math.random() * 5)];
    }
  }
} 