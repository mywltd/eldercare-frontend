import api from './api';
import type { RegisterRequest, User, ApiResponse } from '../../../shared/types';

/**
 * 认证服务层
 */
export class AuthService {
  /**
   * 用户登录
   */
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    try {
      console.log('AuthService: Starting login request', { identifier });
      
      let rawResponse: any = await api.post('/auth/login', { identifier, password });
      
      // 检测 HTML 响应或无效响应
      if (typeof rawResponse === 'string') {
        const htmlStr = rawResponse as string;
        if (htmlStr.trim().startsWith('<!DOCTYPE') || htmlStr.trim().startsWith('<!doctype') || htmlStr.trim().startsWith('<html')) {
          console.error('AuthService: Received HTML response instead of JSON');
          throw new Error('API 请求失败：服务器返回了 HTML 页面。请检查 API 地址配置是否正确。');
        }
        // 尝试解析为 JSON
        try {
          const parsed = JSON.parse(htmlStr);
          if (parsed && typeof parsed === 'object' && 'success' in parsed) {
            rawResponse = parsed;
          } else {
            throw new Error('服务器返回了无效的 JSON 格式');
          }
        } catch (e) {
          console.error('AuthService: Failed to parse response as JSON', { rawResponse: htmlStr.substring(0, 200) });
          throw new Error('服务器返回了无效的响应格式');
        }
      }
      
      // 确保响应格式正确
      let response: ApiResponse<{ token: string; user: User }>;
      
      // 如果响应已经是 ApiResponse 格式，直接使用
      if (rawResponse && typeof rawResponse === 'object' && rawResponse !== null && 'success' in rawResponse) {
        response = rawResponse as ApiResponse<{ token: string; user: User }>;
      } else {
        // 否则包装成 ApiResponse 格式
        response = {
          success: true,
          data: rawResponse as any,
        };
      }

      // 详细的响应日志
      console.log('AuthService: Login response received', { 
        success: response?.success,
        hasData: !!response?.data,
        message: response?.message,
        dataKeys: response?.data ? Object.keys(response.data) : [],
        dataType: typeof response?.data,
        rawResponseType: typeof rawResponse,
        rawResponseKeys: rawResponse && typeof rawResponse === 'object' ? Object.keys(rawResponse) : [],
      });

      // 检查响应数据结构
      if (response?.data) {
        console.log('AuthService: Response data structure', {
          hasToken: 'token' in response.data,
          hasUser: 'user' in response.data,
          tokenType: typeof response.data.token,
          userType: typeof response.data.user,
          userValue: response.data.user,
          dataStructure: response.data,
        });
      }

      // 检查响应格式
      if (!response) {
        console.error('AuthService: No response received');
        throw new Error('服务器无响应');
      }

      // 如果响应是错误格式（success: false），抛出错误
      if (!response.success) {
        const errorMessage = response.message || '登录失败';
        console.error('AuthService: Login failed', { errorMessage, response });
        throw new Error(errorMessage);
      }

      // 检查数据是否存在
      if (!response.data) {
        console.error('AuthService: Response data is missing', { response });
        throw new Error('服务器返回数据格式错误');
      }

      // 检查 token 和 user 是否存在
      if (!response.data.token) {
        console.error('AuthService: Token is missing', { data: response.data });
        throw new Error('服务器返回数据格式错误：缺少 token');
      }

      if (!response.data.user) {
        console.error('AuthService: User data is missing', { data: response.data });
        throw new Error('服务器返回数据格式错误：缺少用户信息');
      }

      // 验证 user 对象的必要字段
      if (!response.data.user.id || !response.data.user.role) {
        console.error('AuthService: User data incomplete', { 
          user: response.data.user,
          hasId: !!response.data.user.id,
          hasRole: !!response.data.user.role,
        });
        throw new Error('服务器返回数据格式错误：用户信息不完整');
      }

      console.log('AuthService: Login successful', { 
        userId: response.data.user.id,
        role: response.data.user.role,
        username: response.data.user.username,
      });

      return response.data;
    } catch (error: any) {
      console.error('AuthService: Login error caught', {
        error,
        message: error?.message,
        response: error?.response,
        responseData: error?.response?.data,
      });
      
      // 如果已经是 Error 对象，直接抛出
      if (error instanceof Error) {
        throw error;
      }
      
      // 否则尝试从错误对象中提取消息
      const errorMessage = 
        error?.message || 
        error?.response?.data?.message || 
        '登录失败，请稍后重试';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<{ token: string; user: User }> {
    const response = (await api.post('/auth/register', data)) as ApiResponse<{
      token: string;
      user: User;
    }>;

    if (!response.success || !response.data) {
      throw new Error(response.message || '注册失败');
    }

    return response.data;
  }

  /**
   * 更新个人信息
   */
  async updateProfile(data: { email?: string | null; phone?: string | null }): Promise<User> {
    const response = (await api.put('/auth/profile', data)) as ApiResponse<User>;

    if (!response.success || !response.data) {
      throw new Error(response.message || '更新个人信息失败');
    }

    return response.data;
  }

  /**
   * 修改密码
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const response = (await api.post('/auth/change-password', {
      oldPassword,
      newPassword,
    })) as ApiResponse;

    if (!response.success) {
      throw new Error(response.message || '修改密码失败');
    }
  }
}

export const authService = new AuthService();

