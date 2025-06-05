import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export class EmotionService {
  // 使用HuggingFace API进行情感分析
  static async analyzeEmotion(text) {
    try {
      // 优先尝试中文情感分析模型
      let result;
      try {
        result = await hf.textClassification({
          model: 'uer/roberta-base-finetuned-chinanews-chinese',
          inputs: text
        });
      } catch (chineseModelError) {
        console.log('中文模型不可用，尝试英文模型...');
        // 降级到英文模型
        result = await hf.textClassification({
          model: 'j-hartmann/emotion-english-distilroberta-base',
          inputs: text
        });
      }

      // 计算情感得分 (0-1)
      const positiveEmotions = ['joy', 'love', 'surprise', 'caring', 'positive', 'happy', 'excitement'];
      const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust', 'negative', 'disappointment'];
      
      let positiveScore = 0;
      let negativeScore = 0;

      result.forEach(emotion => {
        const label = emotion.label.toLowerCase();
        if (positiveEmotions.includes(label)) {
          positiveScore += emotion.score;
        } else if (negativeEmotions.includes(label)) {
          negativeScore += emotion.score;
        }
      });

      const emotionScore = positiveScore - negativeScore;
      
      return {
        emotions: result,
        score: emotionScore,
        isPositive: emotionScore > 0.1
      };
    } catch (error) {
      console.error('HuggingFace情感分析失败:', error);
      // 降级到简单关键词检测
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

    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    let positiveIntensity = 0;
    let negativeIntensity = 0;

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