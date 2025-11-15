const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = 5000;

const API_HISTORY = 'https://hitclub-pre.onrender.com/api/history';

let predictionHistory = [];
let learningData = {
  patternWeights: {
    cauBet: 1.0,
    cauDao: 1.0,
    cau22: 1.0,
    cau313: 1.0,
    cauBet321: 1.0,
    cauBet123: 1.0,
    cau121: 1.0,
    cau31: 1.0,
    cauNghieng: 1.0,
    cauChay: 1.0,
    cauGay: 1.0,
    dicePattern: 1.0,
    momentum: 1.0,
    frequency: 1.0,
    cau131: 1.0,
    cau23: 1.0,
    cau32: 1.0,
    cauLap4: 1.0,
    cauKep: 1.0,
    cauTamGiac: 1.0,
    cauDayChuyền: 1.0,
    cauXoayVong: 1.0,
    diceSumPattern: 1.0,
    entropyAnalysis: 1.0,
    bayesianProb: 1.0,
    correlationPattern: 1.0,
    timeBasedPattern: 1.0,
    advancedMomentum: 1.0,
    metaPattern: 1.0
  },
  stats: {
    totalPredictions: 0,
    correctPredictions: 0,
    taiWins: 0,
    xiuWins: 0,
    recentAccuracy: []
  },
  patternCorrelation: {},
  learningRate: 1.0,
  confidenceHistory: []
};

class TaiXiuPredictor {
  constructor() {
    this.currentSession = null;
    this.historyData = [];
    this.currentPhienHienTai = null;
  }

  async fetchHistory() {
    try {
      const response = await axios.get(API_HISTORY);
      const data = response.data.taixiumd5 || response.data.taixiu || [];
      this.historyData = data;
      
      if (data.length > 0 && data[0].phien_hien_tai) {
        this.currentPhienHienTai = data[0].phien_hien_tai;
      }
      
      return data;
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error.message);
      return [];
    }
  }

  detectPatternCauBet(history, length = 5) {
    if (history.length < length) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, length);
    const allSame = recent.every(r => r.Ket_qua === recent[0].Ket_qua);
    
    if (allSame) {
      const result = recent[0].Ket_qua;
      const streakLength = this.getStreakLength(history, result);
      
      if (streakLength >= 5) {
        return {
          pattern: 'cauBet',
          nextPrediction: result === 'Tài' ? 'Xỉu' : 'Tài',
          confidence: Math.min(0.85, 0.5 + (streakLength * 0.07)),
          reason: `Cầu bệt ${result} đã ra ${streakLength} phiên liên tiếp`
        };
      }
      
      return {
        pattern: 'cauBet',
        nextPrediction: result,
        confidence: 0.55 + (streakLength * 0.05),
        reason: `Cầu đang chạy ${result} (${streakLength} phiên)`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPatternCauDao(history, length = 6) {
    if (history.length < length) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, length);
    let isDao = true;
    
    for (let i = 0; i < recent.length - 1; i++) {
      if (recent[i].Ket_qua === recent[i + 1].Ket_qua) {
        isDao = false;
        break;
      }
    }
    
    if (isDao) {
      const lastResult = recent[0].Ket_qua;
      return {
        pattern: 'cauDao',
        nextPrediction: lastResult === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.65,
        reason: 'Cầu đảo đang chạy, kết quả đổi chiều liên tục'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPattern22(history) {
    if (history.length < 4) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 4);
    if (recent[0].Ket_qua === recent[1].Ket_qua &&
        recent[2].Ket_qua === recent[3].Ket_qua &&
        recent[0].Ket_qua !== recent[2].Ket_qua) {
      
      const lastPair = recent[0].Ket_qua;
      return {
        pattern: 'cau22',
        nextPrediction: lastPair === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.70,
        reason: 'Cầu 2-2 xuất hiện (2 Tài, 2 Xỉu)'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPattern313(history) {
    if (history.length < 7) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 7);
    const pattern313 = 
      recent[0].Ket_qua === recent[1].Ket_qua &&
      recent[1].Ket_qua === recent[2].Ket_qua &&
      recent[3].Ket_qua !== recent[0].Ket_qua &&
      recent[4].Ket_qua === recent[5].Ket_qua &&
      recent[5].Ket_qua === recent[6].Ket_qua &&
      recent[4].Ket_qua !== recent[3].Ket_qua;
    
    if (pattern313) {
      const lastGroup = recent[0].Ket_qua;
      return {
        pattern: 'cau313',
        nextPrediction: lastGroup === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.75,
        reason: 'Cầu 3-1-3 đang hoạt động'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPatternBet321(history) {
    if (history.length < 6) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 6);
    const pattern321 =
      recent[0].Ket_qua === recent[1].Ket_qua &&
      recent[1].Ket_qua === recent[2].Ket_qua &&
      recent[3].Ket_qua === recent[4].Ket_qua &&
      recent[3].Ket_qua !== recent[0].Ket_qua &&
      recent[5].Ket_qua !== recent[3].Ket_qua;
    
    if (pattern321) {
      const lastResult = recent[0].Ket_qua;
      return {
        pattern: 'cauBet321',
        nextPrediction: lastResult === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.68,
        reason: 'Cầu bệt 3-2-1 phát hiện'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPatternBet123(history) {
    if (history.length < 6) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 6);
    const pattern123 =
      recent[5].Ket_qua !== recent[4].Ket_qua &&
      recent[3].Ket_qua === recent[4].Ket_qua &&
      recent[0].Ket_qua === recent[1].Ket_qua &&
      recent[1].Ket_qua === recent[2].Ket_qua &&
      recent[0].Ket_qua !== recent[3].Ket_qua;
    
    if (pattern123) {
      const lastResult = recent[0].Ket_qua;
      return {
        pattern: 'cauBet123',
        nextPrediction: lastResult,
        confidence: 0.72,
        reason: 'Cầu bệt 1-2-3 đang phát triển'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeMomentum(history, window = 10) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    const taiCount = recent.filter(r => r.Ket_qua === 'Tài').length;
    const xiuCount = window - taiCount;
    
    const ratio = Math.abs(taiCount - xiuCount) / window;
    
    if (ratio > 0.6) {
      const dominant = taiCount > xiuCount ? 'Tài' : 'Xỉu';
      return {
        pattern: 'momentum',
        nextPrediction: dominant,
        confidence: 0.50 + (ratio * 0.2),
        reason: `Xu hướng ${dominant} chiếm ưu thế (${dominant === 'Tài' ? taiCount : xiuCount}/${window})`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeFrequency(history, window = 20) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    const taiCount = recent.filter(r => r.Ket_qua === 'Tài').length;
    const xiuCount = window - taiCount;
    
    const lessFrequent = taiCount < xiuCount ? 'Tài' : 'Xỉu';
    const difference = Math.abs(taiCount - xiuCount);
    
    if (difference >= 6) {
      return {
        pattern: 'frequency',
        nextPrediction: lessFrequent,
        confidence: 0.55 + (difference * 0.02),
        reason: `${lessFrequent} đã lâu không về, có thể bù lại`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPattern121(history) {
    if (history.length < 4) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 4);
    if (recent[0].Ket_qua !== recent[1].Ket_qua &&
        recent[1].Ket_qua === recent[2].Ket_qua &&
        recent[2].Ket_qua !== recent[3].Ket_qua &&
        recent[0].Ket_qua === recent[3].Ket_qua) {
      
      const nextPrediction = recent[0].Ket_qua === 'Tài' ? 'Xỉu' : 'Tài';
      return {
        pattern: 'cau121',
        nextPrediction: nextPrediction,
        confidence: 0.73,
        reason: `Cầu nhịp 1-2-1 hoàn thành, dự đoán chuyển sang ${nextPrediction}`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPattern31(history) {
    if (history.length < 4) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 4);
    
    if (recent[0].Ket_qua === recent[1].Ket_qua && 
        recent[1].Ket_qua === recent[2].Ket_qua &&
        recent[3].Ket_qua !== recent[0].Ket_qua) {
      
      const dominant = recent[0].Ket_qua;
      const minority = recent[3].Ket_qua;
      
      return {
        pattern: 'cau31',
        nextPrediction: dominant,
        confidence: 0.68,
        reason: `Cầu 3-1 phát hiện (3 ${dominant}, 1 ${minority}), tiếp tục ${dominant}`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauNghieng(history, window = 5) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    const taiCount = recent.filter(r => r.Ket_qua === 'Tài').length;
    const xiuCount = window - taiCount;
    
    const ratio = Math.max(taiCount, xiuCount) / window;
    
    if (ratio >= 0.7) {
      const dominant = taiCount > xiuCount ? 'Tài' : 'Xỉu';
      return {
        pattern: 'cauNghieng',
        nextPrediction: dominant,
        confidence: 0.60 + (ratio * 0.15),
        reason: `Cầu nghiêng ${dominant} (${Math.max(taiCount, xiuCount)}/${window})`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauChay(history, window = 10) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    const taiCount = recent.filter(r => r.Ket_qua === 'Tài').length;
    const xiuCount = window - taiCount;
    
    const last3 = recent.slice(0, 3);
    const last3Tai = last3.filter(r => r.Ket_qua === 'Tài').length;
    
    if (Math.abs(taiCount - xiuCount) >= 4 && last3Tai >= 2) {
      return {
        pattern: 'cauChay',
        nextPrediction: 'Tài',
        confidence: 0.64,
        reason: 'Cầu chạy Tài đang diễn ra'
      };
    } else if (Math.abs(taiCount - xiuCount) >= 4 && last3Tai <= 1) {
      return {
        pattern: 'cauChay',
        nextPrediction: 'Xỉu',
        confidence: 0.64,
        reason: 'Cầu chạy Xỉu đang diễn ra'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauGay(history) {
    if (history.length < 6) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 6);
    const streakResult = recent[1].Ket_qua;
    let streakCount = 1;
    
    for (let i = 2; i < recent.length; i++) {
      if (recent[i].Ket_qua === streakResult) {
        streakCount++;
      } else {
        break;
      }
    }
    
    if (streakCount >= 3 && recent[0].Ket_qua !== streakResult) {
      return {
        pattern: 'cauGay',
        nextPrediction: recent[0].Ket_qua,
        confidence: 0.78,
        reason: `Cầu ${streakResult} vừa gãy, xu hướng đảo chiều mạnh`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeDicePattern(history) {
    if (history.length < 5) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 5);
    let highDiceCount = 0;
    let lowDiceCount = 0;
    
    recent.forEach(r => {
      const dices = [r.Xuc_xac_1, r.Xuc_xac_2, r.Xuc_xac_3];
      const highDices = dices.filter(d => d >= 4).length;
      const lowDices = dices.filter(d => d <= 3).length;
      
      if (highDices >= 2) highDiceCount++;
      if (lowDices >= 2) lowDiceCount++;
    });
    
    if (highDiceCount >= 4) {
      return {
        pattern: 'dicePattern',
        nextPrediction: 'Tài',
        confidence: 0.62,
        reason: 'Xúc xắc cao (4-5-6) xuất hiện nhiều, xu hướng về Tài'
      };
    } else if (lowDiceCount >= 4) {
      return {
        pattern: 'dicePattern',
        nextPrediction: 'Xỉu',
        confidence: 0.62,
        reason: 'Xúc xắc thấp (1-2-3) xuất hiện nhiều, xu hướng về Xỉu'
      };
    }
    
    const lastDices = [recent[0].Xuc_xac_1, recent[0].Xuc_xac_2, recent[0].Xuc_xac_3];
    const allSame = lastDices[0] === lastDices[1] && lastDices[1] === lastDices[2];
    
    if (allSame) {
      const opposite = recent[0].Ket_qua === 'Tài' ? 'Xỉu' : 'Tài';
      return {
        pattern: 'dicePattern',
        nextPrediction: opposite,
        confidence: 0.69,
        reason: `3 xúc xắc cùng số ${lastDices[0]} vừa ra, có thể đảo chiều`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  getStreakLength(history, result) {
    let streak = 0;
    for (const item of history) {
      if (item.Ket_qua === result) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  detectPattern131(history) {
    if (history.length < 5) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 5);
    const pattern131 = 
      recent[0].Ket_qua !== recent[1].Ket_qua &&
      recent[1].Ket_qua === recent[2].Ket_qua &&
      recent[2].Ket_qua === recent[3].Ket_qua &&
      recent[4].Ket_qua !== recent[1].Ket_qua &&
      recent[0].Ket_qua === recent[4].Ket_qua;
    
    if (pattern131) {
      const middle = recent[1].Ket_qua;
      return {
        pattern: 'cau131',
        nextPrediction: middle,
        confidence: 0.74,
        reason: `Cầu 1-3-1 hoàn thành, có thể lặp lại ${middle}`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPattern23(history) {
    if (history.length < 5) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 5);
    if (recent[0].Ket_qua === recent[1].Ket_qua &&
        recent[2].Ket_qua === recent[3].Ket_qua &&
        recent[2].Ket_qua === recent[4].Ket_qua &&
        recent[0].Ket_qua !== recent[2].Ket_qua) {
      
      const lastGroup = recent[2].Ket_qua;
      return {
        pattern: 'cau23',
        nextPrediction: lastGroup === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.69,
        reason: 'Cầu 2-3 xuất hiện, có thể đảo chiều'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectPattern32(history) {
    if (history.length < 5) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 5);
    if (recent[0].Ket_qua === recent[1].Ket_qua &&
        recent[1].Ket_qua === recent[2].Ket_qua &&
        recent[3].Ket_qua === recent[4].Ket_qua &&
        recent[0].Ket_qua !== recent[3].Ket_qua) {
      
      const firstGroup = recent[0].Ket_qua;
      return {
        pattern: 'cau32',
        nextPrediction: firstGroup === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.67,
        reason: 'Cầu 3-2 phát hiện (3 same, 2 opposite), có thể đảo chiều'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauLap4(history) {
    if (history.length < 4) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 4);
    const allSame = recent.every(r => r.Ket_qua === recent[0].Ket_qua);
    
    if (allSame) {
      const result = recent[0].Ket_qua;
      return {
        pattern: 'cauLap4',
        nextPrediction: result === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.76,
        reason: `Cầu lặp 4 lần ${result}, rất cao tỷ lệ đảo chiều`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauKep(history) {
    if (history.length < 8) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 8);
    const pattern1 = `${recent[6].Ket_qua}-${recent[7].Ket_qua}`;
    const pattern2 = `${recent[4].Ket_qua}-${recent[5].Ket_qua}`;
    const pattern3 = `${recent[2].Ket_qua}-${recent[3].Ket_qua}`;
    const pattern4 = `${recent[0].Ket_qua}-${recent[1].Ket_qua}`;
    
    if (pattern1 === pattern2 && pattern2 === pattern3 && pattern3 === pattern4) {
      return {
        pattern: 'cauKep',
        nextPrediction: recent[0].Ket_qua === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.77,
        reason: 'Cầu kép lặp lại 4 lần, sắp phá vỡ chu kỳ'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauTamGiac(history) {
    if (history.length < 6) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, 6);
    const isTamGiac = 
      recent[5].Ket_qua !== recent[4].Ket_qua &&
      recent[3].Ket_qua === recent[4].Ket_qua &&
      recent[2].Ket_qua === recent[3].Ket_qua &&
      recent[1].Ket_qua === recent[2].Ket_qua &&
      recent[0].Ket_qua !== recent[1].Ket_qua;
    
    if (isTamGiac) {
      const peak = recent[1].Ket_qua;
      return {
        pattern: 'cauTamGiac',
        nextPrediction: peak === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.71,
        reason: 'Cầu tam giác (1-3-1) hoàn thành, xu hướng tiếp tục đảo'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauDayChuyền(history, window = 12) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    let segments = [];
    let currentSegment = { result: recent[recent.length - 1].Ket_qua, count: 1 };
    
    for (let i = recent.length - 2; i >= 0; i--) {
      if (recent[i].Ket_qua === currentSegment.result) {
        currentSegment.count++;
      } else {
        segments.push(currentSegment);
        currentSegment = { result: recent[i].Ket_qua, count: 1 };
      }
    }
    segments.push(currentSegment);
    
    if (segments.length >= 4) {
      const segmentPattern = segments.slice(0, 4).map(s => s.count).join('-');
      if (segmentPattern.match(/^[1-3]-[1-3]-[1-3]-[1-3]$/)) {
        return {
          pattern: 'cauDayChuyền',
          nextPrediction: segments[0].result === 'Tài' ? 'Xỉu' : 'Tài',
          confidence: 0.66,
          reason: `Cầu dây chuyền pattern ${segmentPattern}, có nhịp độ ổn định`
        };
      }
    }
    
    return { pattern: null, confidence: 0 };
  }

  detectCauXoayVong(history, window = 9) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    const pattern1 = recent.slice(6, 9).map(r => r.Ket_qua).join('');
    const pattern2 = recent.slice(3, 6).map(r => r.Ket_qua).join('');
    const pattern3 = recent.slice(0, 3).map(r => r.Ket_qua).join('');
    
    if (pattern1 === pattern2 && pattern2 === pattern3) {
      const lastResult = recent[0].Ket_qua;
      return {
        pattern: 'cauXoayVong',
        nextPrediction: lastResult,
        confidence: 0.73,
        reason: 'Cầu xoay vòng 3-3-3 lặp lại, tiếp tục chu kỳ'
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeDiceSum(history, window = 10) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    let highSumCount = 0;
    let lowSumCount = 0;
    
    recent.forEach(r => {
      const sum = r.Xuc_xac_1 + r.Xuc_xac_2 + r.Xuc_xac_3;
      if (sum >= 11) highSumCount++;
      else lowSumCount++;
    });
    
    const lastSum = recent[0].Xuc_xac_1 + recent[0].Xuc_xac_2 + recent[0].Xuc_xac_3;
    
    if (highSumCount >= 7) {
      return {
        pattern: 'diceSumPattern',
        nextPrediction: 'Xỉu',
        confidence: 0.63,
        reason: `Tổng điểm cao (≥11) xuất hiện ${highSumCount}/${window} lần, có thể cân bằng`
      };
    } else if (lowSumCount >= 7) {
      return {
        pattern: 'diceSumPattern',
        nextPrediction: 'Tài',
        confidence: 0.63,
        reason: `Tổng điểm thấp (<11) xuất hiện ${lowSumCount}/${window} lần, có thể cân bằng`
      };
    } else if (lastSum === 10 || lastSum === 11) {
      return {
        pattern: 'diceSumPattern',
        nextPrediction: 'Tài',
        confidence: 0.58,
        reason: `Tổng điểm biên ${lastSum}, xu hướng dao động`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeEntropy(history, window = 15) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    let changes = 0;
    
    for (let i = 0; i < recent.length - 1; i++) {
      if (recent[i].Ket_qua !== recent[i + 1].Ket_qua) {
        changes++;
      }
    }
    
    const changeRatio = changes / (window - 1);
    
    if (changeRatio < 0.3) {
      const dominant = recent.filter(r => r.Ket_qua === 'Tài').length > window / 2 ? 'Tài' : 'Xỉu';
      return {
        pattern: 'entropyAnalysis',
        nextPrediction: dominant === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.68,
        reason: `Entropy thấp (${(changeRatio * 100).toFixed(0)}%), pattern quá đơn điệu, sắp thay đổi`
      };
    } else if (changeRatio > 0.7) {
      const lastResult = recent[0].Ket_qua;
      return {
        pattern: 'entropyAnalysis',
        nextPrediction: lastResult === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.61,
        reason: `Entropy cao (${(changeRatio * 100).toFixed(0)}%), pattern rất random, tiếp tục đảo`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeBayesianProbability(history, window = 20) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    const taiCount = recent.filter(r => r.Ket_qua === 'Tài').length;
    const xiuCount = window - taiCount;
    
    const taiProb = taiCount / window;
    const xiuProb = xiuCount / window;
    
    const lastResult = recent[0].Ket_qua;
    const consecutiveSame = this.getStreakLength(recent, lastResult);
    
    let adjustedTaiProb = taiProb;
    let adjustedXiuProb = xiuProb;
    
    if (lastResult === 'Tài' && consecutiveSame >= 2) {
      adjustedXiuProb *= (1 + consecutiveSame * 0.1);
      adjustedTaiProb *= (1 - consecutiveSame * 0.05);
    } else if (lastResult === 'Xỉu' && consecutiveSame >= 2) {
      adjustedTaiProb *= (1 + consecutiveSame * 0.1);
      adjustedXiuProb *= (1 - consecutiveSame * 0.05);
    }
    
    const total = adjustedTaiProb + adjustedXiuProb;
    adjustedTaiProb /= total;
    adjustedXiuProb /= total;
    
    const prediction = adjustedTaiProb > adjustedXiuProb ? 'Tài' : 'Xỉu';
    const confidence = Math.max(adjustedTaiProb, adjustedXiuProb);
    
    if (Math.abs(adjustedTaiProb - adjustedXiuProb) > 0.15) {
      return {
        pattern: 'bayesianProb',
        nextPrediction: prediction,
        confidence: Math.min(0.72, 0.50 + confidence * 0.3),
        reason: `Bayesian: ${prediction} có xác suất ${(confidence * 100).toFixed(1)}% (streak=${consecutiveSame})`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzePatternCorrelation(history) {
    if (history.length < 10) return { pattern: null, confidence: 0 };
    
    const detectedPatterns = [];
    if (this.detectPatternCauBet(history).pattern) detectedPatterns.push('cauBet');
    if (this.detectPatternCauDao(history).pattern) detectedPatterns.push('cauDao');
    if (this.detectCauGay(history).pattern) detectedPatterns.push('cauGay');
    if (this.detectPattern22(history).pattern) detectedPatterns.push('cau22');
    
    if (detectedPatterns.includes('cauBet') && detectedPatterns.includes('cauGay')) {
      const lastResult = history[0].Ket_qua;
      return {
        pattern: 'correlationPattern',
        nextPrediction: lastResult === 'Tài' ? 'Xỉu' : 'Tài',
        confidence: 0.81,
        reason: 'Phát hiện cầu bệt VÀ cầu gãy cùng lúc - tín hiệu đảo chiều rất mạnh'
      };
    }
    
    if (detectedPatterns.includes('cauDao') && history.length >= 8) {
      const recent = history.slice(0, 8);
      let daoCount = 0;
      for (let i = 0; i < recent.length - 1; i++) {
        if (recent[i].Ket_qua !== recent[i + 1].Ket_qua) daoCount++;
      }
      if (daoCount >= 6) {
        const lastResult = recent[0].Ket_qua;
        return {
          pattern: 'correlationPattern',
          nextPrediction: lastResult === 'Tài' ? 'Xỉu' : 'Tài',
          confidence: 0.75,
          reason: 'Cầu đảo kéo dài, correlation cao, tiếp tục đảo chiều'
        };
      }
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeTimeBasedPattern(history) {
    if (history.length < 20) return { pattern: null, confidence: 0 };
    
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    const recent10 = history.slice(0, 10);
    const taiCount = recent10.filter(r => r.Ket_qua === 'Tài').length;
    
    if (hour >= 6 && hour < 12) {
      if (taiCount >= 6) {
        return {
          pattern: 'timeBasedPattern',
          nextPrediction: 'Xỉu',
          confidence: 0.59,
          reason: `Buổi sáng - Tài đang mạnh (${taiCount}/10), có thể điều chỉnh`
        };
      }
    } else if (hour >= 18 && hour < 24) {
      if (taiCount <= 4) {
        return {
          pattern: 'timeBasedPattern',
          nextPrediction: 'Tài',
          confidence: 0.58,
          reason: `Buổi tối - Xỉu đang mạnh (${10-taiCount}/10), có thể điều chỉnh`
        };
      }
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeAdvancedMomentum(history, window = 15) {
    if (history.length < window) return { pattern: null, confidence: 0 };
    
    const recent = history.slice(0, window);
    const weights = [];
    for (let i = 0; i < window; i++) {
      weights.push(window - i);
    }
    
    let taiWeightedScore = 0;
    let xiuWeightedScore = 0;
    let totalWeight = 0;
    
    recent.forEach((r, idx) => {
      const weight = weights[idx];
      totalWeight += weight;
      if (r.Ket_qua === 'Tài') {
        taiWeightedScore += weight;
      } else {
        xiuWeightedScore += weight;
      }
    });
    
    const taiMomentum = taiWeightedScore / totalWeight;
    const xiuMomentum = xiuWeightedScore / totalWeight;
    
    if (taiMomentum > 0.6) {
      return {
        pattern: 'advancedMomentum',
        nextPrediction: 'Tài',
        confidence: 0.50 + (taiMomentum - 0.5) * 0.4,
        reason: `Momentum nâng cao: Tài có lực đà ${(taiMomentum * 100).toFixed(1)}% (weighted)`
      };
    } else if (xiuMomentum > 0.6) {
      return {
        pattern: 'advancedMomentum',
        nextPrediction: 'Xỉu',
        confidence: 0.50 + (xiuMomentum - 0.5) * 0.4,
        reason: `Momentum nâng cao: Xỉu có lực đà ${(xiuMomentum * 100).toFixed(1)}% (weighted)`
      };
    }
    
    return { pattern: null, confidence: 0 };
  }

  analyzeMetaPattern(history) {
    if (history.length < 30) return { pattern: null, confidence: 0 };
    
    const segments = [];
    for (let i = 0; i < Math.min(30, history.length); i += 10) {
      const segment = history.slice(i, i + 10);
      const taiCount = segment.filter(r => r.Ket_qua === 'Tài').length;
      segments.push({ taiCount, dominant: taiCount >= 5 ? 'Tài' : 'Xỉu' });
    }
    
    if (segments.length >= 3) {
      const trend = segments.map(s => s.dominant).join('-');
      
      if (trend === 'Tài-Tài-Tài') {
        return {
          pattern: 'metaPattern',
          nextPrediction: 'Xỉu',
          confidence: 0.70,
          reason: 'Meta-pattern: 3 segment liên tiếp thiên về Tài, đến lúc cân bằng'
        };
      } else if (trend === 'Xỉu-Xỉu-Xỉu') {
        return {
          pattern: 'metaPattern',
          nextPrediction: 'Tài',
          confidence: 0.70,
          reason: 'Meta-pattern: 3 segment liên tiếp thiên về Xỉu, đến lúc cân bằng'
        };
      } else if (trend === 'Tài-Xỉu-Tài' || trend === 'Xỉu-Tài-Xỉu') {
        const lastSegmentDominant = segments[0].dominant;
        return {
          pattern: 'metaPattern',
          nextPrediction: lastSegmentDominant === 'Tài' ? 'Xỉu' : 'Tài',
          confidence: 0.65,
          reason: `Meta-pattern: Chu kỳ đảo chiều ${trend}, tiếp tục pattern`
        };
      }
    }
    
    return { pattern: null, confidence: 0 };
  }

  resolveConflicts(predictions) {
    if (predictions.length === 0) return predictions;

    const conflictGroups = [
      ['cauBet', 'cauDao'],
      ['cauBet', 'cauGay'],
      ['momentum', 'frequency'],
      ['cauChay', 'cauGay'],
      ['cauNghieng', 'cauDao']
    ];

    let resolved = [...predictions];

    conflictGroups.forEach(group => {
      const conflictingPreds = resolved.filter(p => group.includes(p.pattern));
      
      if (conflictingPreds.length > 1) {
        const differentPredictions = new Set(conflictingPreds.map(p => p.nextPrediction));
        
        if (differentPredictions.size > 1) {
          const strongest = conflictingPreds.reduce((max, p) => 
            p.weightedConfidence > max.weightedConfidence ? p : max
          );
          
          const weakerOnes = conflictingPreds.filter(p => p.pattern !== strongest.pattern);
          weakerOnes.forEach(weak => {
            const index = resolved.findIndex(p => p.pattern === weak.pattern);
            if (index !== -1) {
              resolved[index].weightedConfidence *= 0.7;
              resolved[index].conflictResolved = true;
            }
          });
          
          console.log(`⚠️ Xung đột: ${group.join(' vs ')} - Ưu tiên ${strongest.pattern} (${strongest.weightedConfidence.toFixed(2)})`);
        }
      }
    });

    const highConfidencePatterns = resolved.filter(p => p.weightedConfidence > 0.75);
    if (highConfidencePatterns.length > 0) {
      const taiHighConf = highConfidencePatterns.filter(p => p.nextPrediction === 'Tài').length;
      const xiuHighConf = highConfidencePatterns.filter(p => p.nextPrediction === 'Xỉu').length;
      
      if (Math.abs(taiHighConf - xiuHighConf) >= 2) {
        const dominant = taiHighConf > xiuHighConf ? 'Tài' : 'Xỉu';
        resolved.forEach(p => {
          if (p.nextPrediction === dominant && p.weightedConfidence > 0.6) {
            p.weightedConfidence *= 1.15;
            p.boosted = true;
          }
        });
        console.log(`🔥 Consensus boost: ${dominant} nhận được boost do nhiều high-confidence patterns`);
      }
    }

    return resolved;
  }

  async predictNext() {
    await this.fetchHistory();
    
    if (this.historyData.length === 0 || !this.currentPhienHienTai) {
      return {
        Phien: 0,
        du_doan: 'Xỉu',
        ti_le: '50%',
        ket_qua: 'dang_doi',
        ly_do: 'Không có dữ liệu lịch sử'
      };
    }

    const currentPhien = this.currentPhienHienTai;

    const predictions = [
      this.detectPatternCauBet(this.historyData),
      this.detectPatternCauDao(this.historyData),
      this.detectPattern22(this.historyData),
      this.detectPattern313(this.historyData),
      this.detectPatternBet321(this.historyData),
      this.detectPatternBet123(this.historyData),
      this.detectPattern121(this.historyData),
      this.detectPattern31(this.historyData),
      this.detectCauNghieng(this.historyData),
      this.detectCauChay(this.historyData),
      this.detectCauGay(this.historyData),
      this.analyzeDicePattern(this.historyData),
      this.analyzeMomentum(this.historyData),
      this.analyzeFrequency(this.historyData),
      this.detectPattern131(this.historyData),
      this.detectPattern23(this.historyData),
      this.detectPattern32(this.historyData),
      this.detectCauLap4(this.historyData),
      this.detectCauKep(this.historyData),
      this.detectCauTamGiac(this.historyData),
      this.detectCauDayChuyền(this.historyData),
      this.detectCauXoayVong(this.historyData),
      this.analyzeDiceSum(this.historyData),
      this.analyzeEntropy(this.historyData),
      this.analyzeBayesianProbability(this.historyData),
      this.analyzePatternCorrelation(this.historyData),
      this.analyzeTimeBasedPattern(this.historyData),
      this.analyzeAdvancedMomentum(this.historyData),
      this.analyzeMetaPattern(this.historyData)
    ].filter(p => p.pattern !== null);

    predictions.forEach(p => {
      const weight = learningData.patternWeights[p.pattern] || 1.0;
      const dynamicLearningRate = learningData.learningRate || 1.0;
      p.weightedConfidence = p.confidence * weight * dynamicLearningRate;
    });

    const resolvedPredictions = this.resolveConflicts(predictions);

    resolvedPredictions.sort((a, b) => b.weightedConfidence - a.weightedConfidence);

    let finalPrediction = 'Xỉu';
    let finalConfidence = 0.50;
    let reasons = [];
    let topPatterns = [];

    if (resolvedPredictions.length > 0) {
      const taiVotes = { total: 0, weight: 0, patterns: [] };
      const xiuVotes = { total: 0, weight: 0, patterns: [] };

      resolvedPredictions.forEach(p => {
        if (p.nextPrediction === 'Tài') {
          taiVotes.total++;
          taiVotes.weight += p.weightedConfidence;
          taiVotes.patterns.push(p.pattern);
        } else {
          xiuVotes.total++;
          xiuVotes.weight += p.weightedConfidence;
          xiuVotes.patterns.push(p.pattern);
        }
        reasons.push(p.reason);
      });

      const totalWeight = taiVotes.weight + xiuVotes.weight;
      const taiProb = totalWeight > 0 ? taiVotes.weight / totalWeight : 0.5;
      const xiuProb = totalWeight > 0 ? xiuVotes.weight / totalWeight : 0.5;

      const consensusBonus = Math.abs(taiVotes.total - xiuVotes.total) / resolvedPredictions.length * 0.1;

      if (taiVotes.weight > xiuVotes.weight) {
        finalPrediction = 'Tài';
        finalConfidence = Math.min(0.95, taiProb + consensusBonus);
        topPatterns = taiVotes.patterns.slice(0, 5);
      } else {
        finalPrediction = 'Xỉu';
        finalConfidence = Math.min(0.95, xiuProb + consensusBonus);
        topPatterns = xiuVotes.patterns.slice(0, 5);
      }

      if (resolvedPredictions.length >= 3) {
        const top3 = resolvedPredictions.slice(0, 3);
        const top3Consensus = top3.filter(p => p.nextPrediction === finalPrediction).length;
        if (top3Consensus === 3) {
          finalConfidence = Math.min(0.98, finalConfidence + 0.08);
        }
      }
    }

    const overallAccuracy = learningData.stats.totalPredictions > 0 
      ? learningData.stats.correctPredictions / learningData.stats.totalPredictions 
      : 0.5;

    const recentAccuracy = learningData.stats.recentAccuracy.length > 0
      ? learningData.stats.recentAccuracy.reduce((a, b) => a + b, 0) / learningData.stats.recentAccuracy.length
      : 0.5;

    const avgAccuracy = learningData.stats.totalPredictions > 5 
      ? (overallAccuracy * 0.4 + recentAccuracy * 0.6)
      : 0.5;

    let calibratedConfidence = finalConfidence;
    let minConfidence = 0.51;
    let maxConfidence = 0.95;

    if (learningData.stats.totalPredictions >= 10) {
      maxConfidence = Math.min(0.95, avgAccuracy + 0.15);
      calibratedConfidence = Math.min(finalConfidence, maxConfidence);
      
      if (avgAccuracy >= 0.40) {
        minConfidence = Math.max(0.51, avgAccuracy - 0.05);
      } else {
        minConfidence = Math.max(0.35, avgAccuracy - 0.05);
      }
      
      calibratedConfidence = Math.max(minConfidence, calibratedConfidence);
    } else if (learningData.stats.totalPredictions >= 3) {
      const earlyAccuracy = learningData.stats.totalPredictions > 0
        ? learningData.stats.correctPredictions / learningData.stats.totalPredictions
        : 0.5;
      
      maxConfidence = Math.min(0.95, earlyAccuracy + 0.15);
      calibratedConfidence = Math.min(finalConfidence, Math.max(0.60, maxConfidence));
      
      if (earlyAccuracy >= 0.45) {
        minConfidence = Math.max(0.51, earlyAccuracy - 0.05);
      } else {
        minConfidence = Math.max(0.35, earlyAccuracy - 0.05);
      }
      
      calibratedConfidence = Math.max(minConfidence, calibratedConfidence);
    } else {
      calibratedConfidence = Math.min(finalConfidence, 0.65);
      minConfidence = 0.51;
    }

    calibratedConfidence = Math.max(minConfidence, Math.min(maxConfidence, calibratedConfidence));

    const prediction = {
      Phien: currentPhien,
      du_doan: finalPrediction,
      ti_le: `${Math.round(calibratedConfidence * 100)}%`,
      ket_qua: 'dang_doi',
      ly_do: reasons.slice(0, 3).join(' | ') || 'Phân tích tổng hợp',
      timestamp: new Date().toISOString(),
      analysis_depth: 'SIÊU PHÂN TÍCH',
      total_patterns_detected: resolvedPredictions.length,
      top_patterns: topPatterns,
      confidence_level: calibratedConfidence >= 0.80 ? 'RẤT CAO' : 
                        calibratedConfidence >= 0.70 ? 'CAO' : 
                        calibratedConfidence >= 0.60 ? 'TRUNG BÌNH' : 'THẤP',
      algorithm_version: '2.0-ADVANCED',
      accuracy_info: learningData.stats.totalPredictions >= 5 ? {
        overall_accuracy: `${Math.round(overallAccuracy * 100)}%`,
        recent_accuracy: `${Math.round(recentAccuracy * 100)}%`,
        confidence_calibrated: finalConfidence !== calibratedConfidence
      } : undefined
    };

    this.currentSession = prediction;
    predictionHistory.unshift(prediction);

    if (predictionHistory.length > 100) {
      predictionHistory = predictionHistory.slice(0, 100);
    }

    return prediction;
  }

  async checkAndUpdateResult() {
    if (!this.currentSession || this.currentSession.ket_qua !== 'dang_doi') {
      return;
    }

    await this.fetchHistory();
    
    const completedSession = this.historyData.find(
      h => h.Phien === this.currentSession.Phien
    );

    if (completedSession) {
      const wasCorrect = completedSession.Ket_qua === this.currentSession.du_doan;
      this.currentSession.ket_qua = wasCorrect ? 'thang' : 'thua';
      this.currentSession.ket_qua_thuc_te = completedSession.Ket_qua;

      const index = predictionHistory.findIndex(
        p => p.Phien === this.currentSession.Phien
      );
      if (index !== -1) {
        predictionHistory[index] = { ...this.currentSession };
      }

      learningData.stats.totalPredictions++;
      if (wasCorrect) {
        learningData.stats.correctPredictions++;
      }

      if (completedSession.Ket_qua === 'Tài') {
        learningData.stats.taiWins++;
      } else {
        learningData.stats.xiuWins++;
      }

      this.adjustWeights(wasCorrect);

      console.log(`✅ Phiên ${this.currentSession.Phien}: Dự đoán ${this.currentSession.du_doan} - Thực tế ${completedSession.Ket_qua} - ${wasCorrect ? 'THẮNG' : 'THUA'}`);
    }
  }

  adjustWeights(wasCorrect) {
    if (!this.historyData || this.historyData.length === 0) return;

    learningData.stats.recentAccuracy.push(wasCorrect ? 1 : 0);
    if (learningData.stats.recentAccuracy.length > 10) {
      learningData.stats.recentAccuracy = learningData.stats.recentAccuracy.slice(-10);
    }

    const recentAccuracyRate = learningData.stats.recentAccuracy.reduce((a, b) => a + b, 0) / learningData.stats.recentAccuracy.length;

    let dynamicAdjustmentFactor = wasCorrect ? 1.05 : 0.95;
    
    if (recentAccuracyRate < 0.4) {
      dynamicAdjustmentFactor = wasCorrect ? 1.08 : 0.92;
      learningData.learningRate = Math.min(1.2, learningData.learningRate * 1.05);
      console.log('📉 Accuracy thấp - Tăng learning rate để điều chỉnh nhanh hơn');
    } else if (recentAccuracyRate > 0.7) {
      dynamicAdjustmentFactor = wasCorrect ? 1.03 : 0.97;
      learningData.learningRate = Math.max(0.9, learningData.learningRate * 0.98);
      console.log('📈 Accuracy cao - Giảm learning rate để ổn định');
    }

    const patterns = [
      this.detectPatternCauBet(this.historyData),
      this.detectPatternCauDao(this.historyData),
      this.detectPattern22(this.historyData),
      this.detectPattern313(this.historyData),
      this.detectPatternBet321(this.historyData),
      this.detectPatternBet123(this.historyData),
      this.detectPattern121(this.historyData),
      this.detectPattern31(this.historyData),
      this.detectCauNghieng(this.historyData),
      this.detectCauChay(this.historyData),
      this.detectCauGay(this.historyData),
      this.analyzeDicePattern(this.historyData),
      this.analyzeMomentum(this.historyData),
      this.analyzeFrequency(this.historyData),
      this.detectPattern131(this.historyData),
      this.detectPattern23(this.historyData),
      this.detectPattern32(this.historyData),
      this.detectCauLap4(this.historyData),
      this.detectCauKep(this.historyData),
      this.detectCauTamGiac(this.historyData),
      this.detectCauDayChuyền(this.historyData),
      this.detectCauXoayVong(this.historyData),
      this.analyzeDiceSum(this.historyData),
      this.analyzeEntropy(this.historyData),
      this.analyzeBayesianProbability(this.historyData),
      this.analyzePatternCorrelation(this.historyData),
      this.analyzeTimeBasedPattern(this.historyData),
      this.analyzeAdvancedMomentum(this.historyData),
      this.analyzeMetaPattern(this.historyData)
    ].filter(p => p.pattern !== null);

    patterns.forEach(p => {
      if (p.pattern in learningData.patternWeights) {
        const oldWeight = learningData.patternWeights[p.pattern];
        learningData.patternWeights[p.pattern] *= dynamicAdjustmentFactor;
        learningData.patternWeights[p.pattern] = Math.max(0.3, Math.min(2.0, learningData.patternWeights[p.pattern]));
        
        const change = learningData.patternWeights[p.pattern] - oldWeight;
        if (Math.abs(change) > 0.05) {
          console.log(`   ${p.pattern}: ${oldWeight.toFixed(2)} → ${learningData.patternWeights[p.pattern].toFixed(2)} (${change > 0 ? '+' : ''}${(change * 100).toFixed(1)}%)`);
        }
      }
    });

    learningData.confidenceHistory.push({
      timestamp: new Date().toISOString(),
      wasCorrect,
      accuracy: recentAccuracyRate,
      learningRate: learningData.learningRate
    });

    if (learningData.confidenceHistory.length > 50) {
      learningData.confidenceHistory = learningData.confidenceHistory.slice(-50);
    }

    console.log(`🔄 Weights điều chỉnh | Accuracy: ${(recentAccuracyRate * 100).toFixed(1)}% | Learning Rate: ${learningData.learningRate.toFixed(2)}`);
  }
}

const predictor = new TaiXiuPredictor();

app.get('/', (req, res) => {
  const recentAcc = learningData.stats.recentAccuracy.length > 0
    ? (learningData.stats.recentAccuracy.reduce((a, b) => a + b, 0) / learningData.stats.recentAccuracy.length * 100).toFixed(1)
    : 'N/A';

  res.json({
    api: 'hit.club',
    game: 'tai_xiu_md5',
    version: '2.0-ADVANCED',
    analysis_level: 'SIÊU PHÂN TÍCH',
    total_algorithms: 29,
    endpoints: {
      'GET /': 'API info và stats tổng quan',
      'GET /du_doan': 'Dự đoán phiên mới (SIÊU PHÂN TÍCH)',
      'GET /lich_su?limit=N': 'Lịch sử dự đoán (mặc định 50)',
      'GET /stats': 'Thống kê chi tiết và learning weights',
      'GET /algorithms': 'Danh sách tất cả 29 thuật toán'
    },
    api_by: 'nhayy',
    telegram: '@mryanhdz',
    stats: {
      total_predictions: learningData.stats.totalPredictions,
      accuracy_overall: learningData.stats.totalPredictions > 0 
        ? `${Math.round((learningData.stats.correctPredictions / learningData.stats.totalPredictions) * 100)}%`
        : '0%',
      accuracy_recent_10: `${recentAcc}%`,
      tai_wins: learningData.stats.taiWins,
      xiu_wins: learningData.stats.xiuWins,
      learning_rate: learningData.learningRate.toFixed(2)
    },
    features: [
      'Conflict Resolution System',
      'Dynamic Learning Rate',
      'Consensus Boost',
      'Weighted Ensemble',
      'Meta-Pattern Analysis',
      'Bayesian Probability',
      'Entropy Analysis'
    ],
    top_patterns: Object.entries(learningData.patternWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, weight]) => ({ name, weight: weight.toFixed(2) }))
  });
});

app.get('/du_doan', async (req, res) => {
  try {
    const prediction = await predictor.predictNext();
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi dự đoán', message: error.message });
  }
});

app.get('/lich_su', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    total: predictionHistory.length,
    history: predictionHistory.slice(0, limit)
  });
});

app.get('/stats', (req, res) => {
  const accuracy = learningData.stats.totalPredictions > 0
    ? (learningData.stats.correctPredictions / learningData.stats.totalPredictions) * 100
    : 0;

  const recentAcc = learningData.stats.recentAccuracy.length > 0
    ? (learningData.stats.recentAccuracy.reduce((a, b) => a + b, 0) / learningData.stats.recentAccuracy.length * 100)
    : 0;

  res.json({
    total_predictions: learningData.stats.totalPredictions,
    correct_predictions: learningData.stats.correctPredictions,
    accuracy_overall: `${accuracy.toFixed(2)}%`,
    accuracy_recent_10: `${recentAcc.toFixed(1)}%`,
    tai_wins: learningData.stats.taiWins,
    xiu_wins: learningData.stats.xiuWins,
    learning_rate: learningData.learningRate,
    pattern_weights: learningData.patternWeights,
    recent_predictions: predictionHistory.slice(0, 10),
    confidence_history: learningData.confidenceHistory.slice(-10)
  });
});

app.get('/algorithms', (req, res) => {
  res.json({
    total_algorithms: 29,
    version: '2.0-ADVANCED',
    categories: {
      basic_patterns: {
        count: 14,
        algorithms: [
          { name: 'cauBet', description: 'Cầu bệt - Streak detection (5+ lần giống nhau)', weight: learningData.patternWeights.cauBet },
          { name: 'cauDao', description: 'Cầu đảo 1-1 - Alternating pattern', weight: learningData.patternWeights.cauDao },
          { name: 'cau22', description: 'Cầu 2-2 - Pattern 2 Tài, 2 Xỉu', weight: learningData.patternWeights.cau22 },
          { name: 'cau313', description: 'Cầu 3-1-3 - Pattern 3-1-3 sequence', weight: learningData.patternWeights.cau313 },
          { name: 'cauBet321', description: 'Cầu bệt 3-2-1 - Decreasing streak', weight: learningData.patternWeights.cauBet321 },
          { name: 'cauBet123', description: 'Cầu bệt 1-2-3 - Increasing streak', weight: learningData.patternWeights.cauBet123 },
          { name: 'cau121', description: 'Cầu 1-2-1 - Rhythm pattern', weight: learningData.patternWeights.cau121 },
          { name: 'cau31', description: 'Cầu 3-1 - 3 same, 1 different', weight: learningData.patternWeights.cau31 },
          { name: 'cauNghieng', description: 'Cầu nghiêng - Tilted pattern (70%+ một bên)', weight: learningData.patternWeights.cauNghieng },
          { name: 'cauChay', description: 'Cầu chạy - Running pattern', weight: learningData.patternWeights.cauChay },
          { name: 'cauGay', description: 'Cầu gãy - Break detection', weight: learningData.patternWeights.cauGay },
          { name: 'dicePattern', description: 'Dice pattern - Phân tích xúc xắc 1-2-3', weight: learningData.patternWeights.dicePattern },
          { name: 'momentum', description: 'Momentum - Xu hướng dominance', weight: learningData.patternWeights.momentum },
          { name: 'frequency', description: 'Frequency - Compensation analysis', weight: learningData.patternWeights.frequency }
        ]
      },
      advanced_patterns: {
        count: 15,
        algorithms: [
          { name: 'cau131', description: 'Cầu 1-3-1 - Mirror pattern', weight: learningData.patternWeights.cau131 },
          { name: 'cau23', description: 'Cầu 2-3 - 2 then 3 pattern', weight: learningData.patternWeights.cau23 },
          { name: 'cau32', description: 'Cầu 3-2 - 3 then 2 pattern', weight: learningData.patternWeights.cau32 },
          { name: 'cauLap4', description: 'Cầu lặp 4 - 4x consecutive same', weight: learningData.patternWeights.cauLap4 },
          { name: 'cauKep', description: 'Cầu kép - Double repeating pattern', weight: learningData.patternWeights.cauKep },
          { name: 'cauTamGiac', description: 'Cầu tam giác - Triangular 1-3-1 pattern', weight: learningData.patternWeights.cauTamGiac },
          { name: 'cauDayChuyền', description: 'Cầu dây chuyền - Chain pattern with rhythm', weight: learningData.patternWeights.cauDayChuyền },
          { name: 'cauXoayVong', description: 'Cầu xoay vòng - Cyclic 3-3-3 repetition', weight: learningData.patternWeights.cauXoayVong },
          { name: 'diceSumPattern', description: 'Dice sum - Phân tích tổng điểm xúc xắc', weight: learningData.patternWeights.diceSumPattern },
          { name: 'entropyAnalysis', description: 'Entropy - Phát hiện randomness level', weight: learningData.patternWeights.entropyAnalysis },
          { name: 'bayesianProb', description: 'Bayesian - Xác suất có điều kiện thông minh', weight: learningData.patternWeights.bayesianProb },
          { name: 'correlationPattern', description: 'Correlation - Phát hiện xung đột patterns', weight: learningData.patternWeights.correlationPattern },
          { name: 'timeBasedPattern', description: 'Time-based - Phân tích theo giờ trong ngày', weight: learningData.patternWeights.timeBasedPattern },
          { name: 'advancedMomentum', description: 'Advanced Momentum - Weighted momentum analysis', weight: learningData.patternWeights.advancedMomentum },
          { name: 'metaPattern', description: 'Meta-pattern - Patterns of patterns analysis', weight: learningData.patternWeights.metaPattern }
        ]
      }
    },
    features: {
      conflict_resolution: 'Tự động phát hiện và giải quyết xung đột giữa các thuật toán',
      dynamic_learning: 'Learning rate tự điều chỉnh theo accuracy',
      consensus_boost: 'Tăng confidence khi nhiều patterns đồng thuận',
      weighted_ensemble: 'Kết hợp thông minh với trọng số động'
    }
  });
});

cron.schedule('*/30 * * * * *', async () => {
  await predictor.checkAndUpdateResult();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Dự Đoán Tài Xỉu MD5 đang chạy tại port ${PORT}`);
  console.log(`📊 ═══════════════════════════════════════════════════════════`);
  console.log(`🧠 HỆ THỐNG SIÊU PHÂN TÍCH v2.0 - 29 THUẬT TOÁN TỰ HỌC`);
  console.log(`📊 ═══════════════════════════════════════════════════════════`);
  console.log(`🎯 CÁC PATTERN CƠ BẢN (14):`);
  console.log(`   ✓ Cầu bệt, Cầu đảo 1-1, Cầu 2-2`);
  console.log(`   ✓ Cầu 3-1-3, 3-2-1, 1-2-3, 1-2-1, 3-1`);
  console.log(`   ✓ Cầu nghiêng, Cầu chạy, Cầu gãy`);
  console.log(`   ✓ Dice pattern, Momentum, Frequency`);
  console.log(``);
  console.log(`🔥 CÁC PATTERN NÂNG CAO MỚI (15):`);
  console.log(`   ✓ Cầu 1-3-1, 2-3, 3-2, Lặp 4`);
  console.log(`   ✓ Cầu kép, Tam giác, Dây chuyền, Xoay vòng`);
  console.log(`   ✓ Dice Sum, Entropy Analysis`);
  console.log(`   ✓ Bayesian Probability`);
  console.log(`   ✓ Correlation Pattern (phát hiện xung đột)`);
  console.log(`   ✓ Time-based Pattern`);
  console.log(`   ✓ Advanced Momentum (weighted)`);
  console.log(`   ✓ Meta-Pattern (patterns of patterns)`);
  console.log(``);
  console.log(`⚡ TÍNH NĂNG ĐỘT PHÁ:`);
  console.log(`   • Conflict Resolution - Tự động giải quyết xung đột`);
  console.log(`   • Dynamic Learning Rate - Học thích ứng`);
  console.log(`   • Consensus Boost - Tăng cường khi nhiều patterns đồng thuận`);
  console.log(`   • Weighted Ensemble - Kết hợp thông minh`);
  console.log(`📊 ═══════════════════════════════════════════════════════════`);
});
