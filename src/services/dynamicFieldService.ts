import api from './api';
import type { DynamicFieldConfig } from '../../../shared/types';

/**
 * 动态字段服务
 */
export class DynamicFieldService {
  /**
   * 获取所有动态字段配置
   */
  async getAll(): Promise<DynamicFieldConfig[]> {
    const response = (await api.get('/dynamic-fields')) as any;
    if (response?.success) {
      return response.data;
    }
    throw new Error(response?.message || '获取字段配置失败');
  }

  /**
   * 更新字段配置
   */
  async update(fieldName: string, data: {
    displayName?: string;
    unit?: string | null;
    description?: string | null;
    enabled?: boolean;
  }): Promise<DynamicFieldConfig> {
    const response = (await api.put(`/dynamic-fields/${fieldName}`, data)) as any;
    if (response?.success) {
      return response.data;
    }
    throw new Error(response?.message || '更新字段配置失败');
  }
}

export const dynamicFieldService = new DynamicFieldService();

