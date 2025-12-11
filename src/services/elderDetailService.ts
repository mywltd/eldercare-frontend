import api from './api';
import type { ApiResponse } from '../../../shared/types';

export interface ElderDetail {
  elder: {
    id: string;
    uuid: string;
    name: string;
    gender?: string;
    age?: number;
    status: string;
  };
  healthRecords: Array<{
    id: string;
    createdAt: string;
    source: 'manual' | 'device';
    bloodPressureSys?: number;
    bloodPressureDia?: number;
    heartRate?: number;
    bloodSugar?: number;
    bloodFat?: number;
    sleepHours?: number;
    steps?: number;
    symptoms?: string;
    dynamicFields?: Record<string, any>;
  }>;
  riskReports: Array<{
    id: string;
    reportTime: string;
    overallRisk: string;
    score: number;
    dimensionScores: Record<string, number>;
    recommendations: string[];
    explain?: string;
  }>;
}

/**
 * 老人详情服务层
 */
export class ElderDetailService {
  /**
   * 获取老人详细信息（亲属端）
   */
  async getFamilyElderDetail(elderId: string): Promise<ElderDetail> {
    const response = (await api.get(`/family/elders/${elderId}/detail`)) as ApiResponse<ElderDetail>;
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取老人详情失败');
    }
    return response.data;
  }

  /**
   * 获取老人详细信息（采集端）
   */
  async getCollectorElderDetail(elderId: string): Promise<ElderDetail> {
    const response = (await api.get(`/collector/elders/${elderId}/detail`)) as ApiResponse<ElderDetail>;
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取老人详情失败');
    }
    return response.data;
  }
}

export const elderDetailService = new ElderDetailService();

