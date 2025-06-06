import { HfInference } from '@huggingface/inference';

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

  // 降级情感分析（基于关键词）- 优化中文支持
  static fallbackEmotionAnalysis(text) {
    const positiveWords = [
      // 高强度正面情感
      '爱死了', '超爱', '最爱', '深爱', '疯狂喜欢', '太棒了', '完美', '无敌', '超级棒',
      // 中等强度正面情感
      '爱', '喜欢', '开心', '高兴', '快乐', '温柔', '甜蜜', '幸福', '满足', '舒服',
      '激动', '兴奋', '惊喜', '感动', '温暖', '安心', '放松', '愉快', '美好', '棒',
      '好', '不错', '很好', '真好', '太好了', '挺好', '非常好', '特别好', '相当好',
      // 心情相关
      '心情好', '心情很好', '心情不错', '心情愉快', '心情开朗', '心情舒畅',
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

    // 复合词组检测（优先级更高）
    const positivePhrases = [
      '心情很好', '心情好', '心情不错', '心情愉快', '感觉很好', '感觉不错',
      '今天很好', '今天不错', '今天开心', '今天高兴', '今天愉快',
      '太好了', '真好', '很好呢', '好开心', '好高兴', '好棒'
    ];
    
    const negativePhrases = [
      '心情不好', '心情低落', '心情差', '感觉不好', '感觉糟糕',
      '今天不好', '今天糟糕', '今天难过', '心情有点低落'
    ];

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    let positiveIntensity = 0;
    let negativeIntensity = 0;

    // 首先检查复合词组（优先级最高）
    positivePhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        positiveCount++;
        positiveIntensity += 3; // 复合词组给更高分数
        console.log(`发现正面词组: "${phrase}"`);
      }
    });
    
    negativePhrases.forEach(phrase => {
      if (text.includes(phrase)) {
        negativeCount++;
        negativeIntensity += 3;
        console.log(`发现负面词组: "${phrase}"`);
      }
    });

    // 检查正面词汇
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        positiveCount++;
        // 根据词汇强度给不同分数
        if (word.includes('超') || word.includes('最') || word.includes('死')) {
          positiveIntensity += 2;
        } else {
          positiveIntensity += 1;
        }
      }
    });

    // 检查负面词汇
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        negativeCount++;
        if (word.includes('死') || word.includes('崩') || word.includes('绝望')) {
          negativeIntensity += 2;
        } else {
          negativeIntensity += 1;
        }
      }
    });

    // 检查网络用语
    internetSlang.positive.forEach(word => {
      if (lowerText.includes(word)) {
        positiveCount++;
        positiveIntensity += 1.5;
      }
    });

    internetSlang.negative.forEach(word => {
      if (lowerText.includes(word)) {
        negativeCount++;
        negativeIntensity += 1.5;
      }
    });

    console.log(`关键词检测结果: 正面词${positiveCount}个(强度${positiveIntensity}), 负面词${negativeCount}个(强度${negativeIntensity})`);

    // 计算最终得分，考虑强度
    const totalIntensity = positiveIntensity + negativeIntensity;
    const score = totalIntensity > 0 ? 
      (positiveIntensity - negativeIntensity) / totalIntensity : 0;

    return {
      emotions: [
        { 
          label: positiveCount > negativeCount ? 'joy' : (negativeCount > positiveCount ? 'sadness' : 'neutral'), 
          score: Math.abs(score) 
        }
      ],
      score,
      isPositive: score > 0,
      source: 'keyword-fallback',
      details: {
        positiveCount,
        negativeCount,
        positiveIntensity,
        negativeIntensity
      }
    };
  }

  // 计算HET（High-Emotional Tokens）
  static calculateHET(text, emotionResult, tokenCount) {
    const baseScore = emotionResult.score;
    
    // 情感强度乘数
    const intensityMultiplier = emotionResult.isPositive ? 1.5 : 0.5;
    
    // 计算HET
    const het = Math.floor(tokenCount * baseScore * intensityMultiplier);
    
    return Math.max(0, het);
  }

  // 检查是否达到情感阈值
  static checkEmotionThreshold(het, userGroup = 'A') {
    const threshold = userGroup === 'A' ? 120 : 100;
    return {
      reached: het >= threshold,
      threshold,
      progress: Math.min(1, het / threshold)
    };
  }

  // 生成情感反馈表情包
  static generateEmotionEmoji(emotionResult, het) {
    if (!emotionResult.isPositive) {
      return ['😔', '🫂', '💙', '🌧️'][Math.floor(Math.random() * 4)];
    }

    if (het >= 100) {
      return ['😍', '🥰', '❤️‍🔥', '💕', '✨'][Math.floor(Math.random() * 5)];
    } else if (het >= 50) {
      return ['😊', '🤗', '💖', '🌸'][Math.floor(Math.random() * 4)];
    } else {
      return ['😌', '💛', '🙂', '🌻'][Math.floor(Math.random() * 4)];
    }
  }
} 