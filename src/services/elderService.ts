import api from './api';
import type { ApiResponse, CreateRecordRequest, RiskReport } from '../../../shared/types';

/**
 * 老人服务层
 */
export class ElderService {
  /**
   * 根据用户ID获取关联的老人ID
   */
  async getElderIdByUserId(userId: string): Promise<string> {
    const response = (await api.get(`/elders/user/${userId}`)) as ApiResponse<{
      elderId: string;
    }>;

    if (!response.success || !response.data) {
      throw new Error(response.message || '获取老人ID失败');
    }

    return response.data.elderId;
  }

  /**
   * 创建健康记录
   */
  async createRecord(
    elderId: string,
    recordData: CreateRecordRequest
  ): Promise<{ record: any; riskReport?: RiskReport }> {
    const response = (await api.post(`/elders/${elderId}/records`, recordData)) as ApiResponse<{
      record: any;
      riskReport?: RiskReport;
    }>;

    if (!response.success || !response.data) {
      throw new Error(response.message || '创建记录失败');
    }

    return response.data;
  }

  /**
   * 获取最新风险报告
   */
  async getLatestRiskReport(elderId: string): Promise<RiskReport> {
    const response = (await api.get(`/elders/${elderId}/reports/latest`)) as ApiResponse<RiskReport>;

    if (!response.success || !response.data) {
      throw new Error(response.message || '获取风险报告失败');
    }

    return response.data;
  }
}

export const elderService = new ElderService();

