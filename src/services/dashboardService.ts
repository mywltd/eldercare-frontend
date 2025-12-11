import api from './api';
import type { ApiResponse, CaregiverDashboard } from '../types';

/**
 * 仪表盘服务层
 */
export class DashboardService {
  /**
   * 获取看护人仪表盘数据
   */
  async getCaregiverDashboard(userId: string): Promise<CaregiverDashboard> {
    const response = (await api.get(`/dashboard/caregiver/${userId}`)) as ApiResponse<CaregiverDashboard>;

    if (!response.success || !response.data) {
      throw new Error(response.message || '获取仪表盘数据失败');
    }

    return response.data;
  }

  /**
   * 获取数据总览
   */
  async getOverview(): Promise<any> {
    const response = (await api.get('/dashboard/overview')) as ApiResponse<any>;

    if (!response.success || !response.data) {
      throw new Error(response.message || '获取总览数据失败');
    }

    return response.data;
  }
}

export const dashboardService = new DashboardService();

