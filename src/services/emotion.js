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
    
    // 如果是疑问句，降低情感强度权重
    const questionPenalty = isQuestion ? 0.3 : 1.0;
    // 如果是否定句，需要特殊处理
    const negationModifier = isNegation ? -0.5 : 1.0;

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

    // 🆕 强情感表达词组（优先级最高，不受疑问句影响）
    const strongEmotionPhrases = {
      positive: [
        '我爱你', '爱死你了', '想死你了', '超级爱你', '最爱你', '心动了',
        '好开心啊', '开心死了', '太棒了', '完美', '无敌了', '超级棒',
        '感觉很幸福', '好幸福', '太幸福了', '心情超好', '心情特别好'
      ],
      negative: [
        '我难过', '好难过', '伤心死了', '心碎了', '想哭', '好痛苦',
        '心情很差', '心情不好', '感觉糟透了', '烦死了', '气死了'
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
        emotions: [{ label: 'neutral', score: 0.8 }],
        score: 0,
        isPositive: false,
        source: 'keyword-fallback-neutral',
        details: {
          positiveCount: 0,
          negativeCount: 0,
          positiveIntensity: 0,
          negativeIntensity: 0,
          neutralQuestion: true
        }
      };
    }

    // 检查强情感表达（不受疑问句影响）
    strongEmotionPhrases.positive.forEach(phrase => {
      if (text.includes(phrase)) {
        positiveCount++;
        positiveIntensity += 4; // 强情感给最高分数
        hasStrongEmotion = true;
        console.log(`发现强正面情感: "${phrase}"`);
      }
    });
    
    strongEmotionPhrases.negative.forEach(phrase => {
      if (text.includes(phrase)) {
        negativeCount++;
        negativeIntensity += 4;
        hasStrongEmotion = true;
        console.log(`发现强负面情感: "${phrase}"`);
      }
    });

    // 只有在没有强情感表达时，才应用疑问句和否定句的权重调整
    const emotionModifier = hasStrongEmotion ? 1.0 : (questionPenalty * negationModifier);

    // 检查普通正面词汇
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) {
        positiveCount++;
        // 根据词汇强度给不同分数
        let intensity = 1;
        if (word.includes('超') || word.includes('最') || word.includes('死')) {
          intensity = 2;
        }
        positiveIntensity += intensity * emotionModifier;
        console.log(`发现正面词汇: "${word}", 强度: ${intensity * emotionModifier}`);
      }
    });

    // 检查负面词汇
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) {
        negativeCount++;
        let intensity = 1;
        if (word.includes('死') || word.includes('崩') || word.includes('绝望')) {
          intensity = 2;
        }
        negativeIntensity += intensity * Math.abs(emotionModifier);
        console.log(`发现负面词汇: "${word}", 强度: ${intensity * Math.abs(emotionModifier)}`);
      }
    });

    // 检查网络用语
    internetSlang.positive.forEach(word => {
      if (lowerText.includes(word)) {
        positiveCount++;
        positiveIntensity += 1.5 * emotionModifier;
      }
    });

    internetSlang.negative.forEach(word => {
      if (lowerText.includes(word)) {
        negativeCount++;
        negativeIntensity += 1.5 * Math.abs(emotionModifier);
      }
    });

    console.log(`关键词检测结果: 正面词${positiveCount}个(强度${positiveIntensity.toFixed(2)}), 负面词${negativeCount}个(强度${negativeIntensity.toFixed(2)})`);
    console.log(`语境修正: 疑问句权重=${questionPenalty}, 否定修正=${negationModifier}, 强情感=${hasStrongEmotion}`);

    // 🆕 改进的得分计算 - 限制数值范围
    const totalIntensity = positiveIntensity + negativeIntensity;
    let score = 0;
    
    if (totalIntensity > 0) {
      // 计算相对得分，范围在-1到1之间
      score = (positiveIntensity - negativeIntensity) / totalIntensity;
      
      // 🆕 限制得分范围，避免极端值
      score = Math.max(-0.8, Math.min(0.8, score));
      
      // 🆕 如果总强度很低（说明情感不明显），进一步降低得分
      if (totalIntensity < 2) {
        score = score * 0.5;
      }
    }

    console.log(`最终情感得分: ${score.toFixed(3)} (总强度: ${totalIntensity.toFixed(2)})`);

    return {
      emotions: [
        { 
          label: positiveIntensity > negativeIntensity ? 'joy' : (negativeIntensity > positiveIntensity ? 'sadness' : 'neutral'), 
          score: Math.abs(score) 
        }
      ],
      score,
      isPositive: score > 0.1, // 提高正面情感判定阈值
      source: 'keyword-fallback',
      details: {
        positiveCount,
        negativeCount,
        positiveIntensity: Number(positiveIntensity.toFixed(2)),
        negativeIntensity: Number(negativeIntensity.toFixed(2)),
        isQuestion,
        isNegation,
        hasStrongEmotion,
        questionPenalty,
        emotionModifier: Number(emotionModifier.toFixed(2))
      }
    };
  }

  // 🆕 修复HET计算，确保数值合理
  static calculateHET(text, emotionResult, tokenCount) {
    console.log('🧮 HET计算开始:');
    console.log(`   输入Token数: ${tokenCount}`);
    console.log(`   情感得分: ${emotionResult.score}`);
    console.log(`   是否正面: ${emotionResult.isPositive}`);
    
    const baseScore = Math.abs(emotionResult.score);
    
    // 🆕 更合理的HET计算公式
    // 基础HET = Token数 × 情感强度 × 方向乘数
    const directionMultiplier = emotionResult.isPositive ? 1.2 : 0.8;
    
    // 🆕 限制基础HET的最大值，避免数值爆炸
    const maxBaseHET = 50; // 单条消息最大基础HET
    let baseHET = tokenCount * baseScore * directionMultiplier;
    baseHET = Math.min(baseHET, maxBaseHET);
    
    // 🆕 根据情感来源调整（API结果 vs 关键词检测）
    const sourceMultiplier = emotionResult.source === 'huggingface-english' ? 1.0 : 0.7;
    
    // 🆕 最终HET计算
    let finalHET = Math.floor(baseHET * sourceMultiplier);
    
    // 🆕 强制限制HET范围
    finalHET = Math.max(0, Math.min(finalHET, 100)); // HET范围：0-100
    
    console.log(`   计算过程:`);
    console.log(`     基础HET = ${tokenCount} × ${baseScore.toFixed(3)} × ${directionMultiplier} = ${(tokenCount * baseScore * directionMultiplier).toFixed(2)}`);
    console.log(`     限制后基础HET = ${baseHET.toFixed(2)}`);
    console.log(`     来源乘数 = ${sourceMultiplier}`);
    console.log(`     最终HET = ${finalHET}`);
    
    return finalHET;
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