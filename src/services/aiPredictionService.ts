import api from './api';
import type { AIPrediction } from '../types';

/**
 * AI预测服务
 */
export class AIPredictionService {
  /**
   * 获取老人的AI预测历史
   */
  async getByElderId(elderId: string, limit: number = 10): Promise<AIPrediction[]> {
    const response = (await api.get(`/ai-prediction/${elderId}?limit=${limit}`)) as any;
    if (response?.success) {
      return response.data;
    }
    throw new Error(response?.message || '获取AI预测失败');
  }

  /**
   * 获取最新的AI预测
   */
  async getLatest(elderId: string): Promise<AIPrediction | null> {
    const response = (await api.get(`/ai-prediction/${elderId}/latest`)) as any;
    if (response?.success) {
      return response.data;
    }
    if (response?.code === 404) {
      return null;
    }
    throw new Error(response?.message || '获取最新AI预测失败');
  }

  /**
   * 手动触发AI分析
   */
  async triggerAnalysis(elderId: string): Promise<AIPrediction> {
    const response = (await api.post(`/ai-prediction/${elderId}/trigger`)) as any;
    if (response?.success) {
      return response.data;
    }
    throw new Error(response?.message || '触发AI分析失败');
  }
}

export const aiPredictionService = new AIPredictionService();

