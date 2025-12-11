import api from './api';
import type { MedicalHistory } from '../types';

/**
 * 病史信息服务
 */
export class MedicalHistoryService {
  /**
   * 获取老人的病史列表
   */
  async getByElderId(elderId: string): Promise<MedicalHistory[]> {
    const response = (await api.get(`/medical-history/${elderId}`)) as any;
    if (response?.success) {
      return response.data;
    }
    throw new Error(response?.message || '获取病史失败');
  }

  /**
   * 创建病史记录
   */
  async create(data: {
    elderId: string;
    diseaseName: string;
    diagnosisDate?: string;
    severity?: string;
    currentStatus?: string;
    medications?: string;
    notes?: string;
  }): Promise<MedicalHistory> {
    const response = (await api.post('/medical-history', data)) as any;
    if (response?.success) {
      return response.data;
    }
    throw new Error(response?.message || '创建病史失败');
  }

  /**
   * 更新病史记录
   */
  async update(id: string, data: {
    diseaseName?: string;
    diagnosisDate?: string;
    severity?: string;
    currentStatus?: string;
    medications?: string;
    notes?: string;
  }): Promise<MedicalHistory> {
    const response = (await api.put(`/medical-history/${id}`, data)) as any;
    if (response?.success) {
      return response.data;
    }
    throw new Error(response?.message || '更新病史失败');
  }

  /**
   * 删除病史记录
   */
  async delete(id: string): Promise<void> {
    const response = (await api.delete(`/medical-history/${id}`)) as any;
    if (!response?.success) {
      throw new Error(response?.message || '删除病史失败');
    }
  }
}

export const medicalHistoryService = new MedicalHistoryService();

