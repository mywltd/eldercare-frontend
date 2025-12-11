import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { backendConfigManager } from '../utils/backendConfig';

// 创建 axios 实例，baseURL 将在初始化时设置
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// 初始化 API baseURL
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function initializeApi() {
  // 如果正在初始化，等待完成
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // 如果已经初始化，直接返回
  if (isInitialized) {
    return;
  }
  
  // 创建初始化 Promise
  initializationPromise = (async () => {
    try {
      const apiUrl = await backendConfigManager.getApiUrl();
      console.log('Initializing API with url:', apiUrl);
      
      // 确保 baseURL 包含 /api 前缀
      // 如果 apiUrl 是完整 URL（如 http://localhost:3000），则添加 /api
      // 如果 apiUrl 已经是 /api，则直接使用
      let baseURL = apiUrl;
      if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
        // 完整 URL，确保以 /api 结尾
        baseURL = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
      } else if (!apiUrl.startsWith('/api')) {
        // 相对路径，确保以 /api 开头
        baseURL = apiUrl.startsWith('/') ? `/api${apiUrl}` : `/api/${apiUrl}`;
      }
      
      api.defaults.baseURL = baseURL;
      isInitialized = true;
      console.log('API initialized with backend:', {
        originalUrl: apiUrl,
        finalBaseURL: baseURL,
        fullExample: `${baseURL}/auth/login`,
      });
    } catch (error) {
      console.error('Failed to initialize API:', error);
      // 使用默认值
      api.defaults.baseURL = '/api';
      isInitialized = true;
      console.warn('API using default baseURL: /api');
    } finally {
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
}

// 在首次请求前初始化（必须放在第一个，确保 baseURL 在请求前设置）
api.interceptors.request.use(async (config) => {
  // 确保在请求前初始化 baseURL
  if (!isInitialized) {
    await initializeApi();
  }
  
  // 如果 baseURL 还没有设置，再次尝试初始化
  if (!config.baseURL) {
    await initializeApi();
    // 更新 config 的 baseURL
    config.baseURL = api.defaults.baseURL;
  }
  
  // 验证 baseURL 是否正确（应该包含 /api）
  if (config.baseURL && !config.baseURL.includes('/api') && config.url && !config.url.startsWith('/api')) {
    console.warn('API Request: baseURL may be incorrect', {
      baseURL: config.baseURL,
      url: config.url,
      fullURL: `${config.baseURL || ''}${config.url || ''}`,
    });
  }
  
  // 添加请求日志（仅开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL || ''}${config.url || ''}`,
      isInitialized,
    });
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 请求拦截器：添加 JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => {
    const rawData = response.data;
    
    // 检测 HTML 响应（说明请求被路由到了静态文件）
    if (typeof rawData === 'string' && (rawData.trim().startsWith('<!DOCTYPE') || rawData.trim().startsWith('<!doctype') || rawData.trim().startsWith('<html'))) {
      console.error('API Response Error: Received HTML instead of JSON', {
        url: response.config.url,
        baseURL: response.config.baseURL,
        fullURL: `${response.config.baseURL || ''}${response.config.url || ''}`,
        status: response.status,
        contentType: response.headers['content-type'],
        dataPreview: rawData.substring(0, 200),
      });
      
      return Promise.reject({
        success: false,
        message: `API 请求失败：服务器返回了 HTML 页面而不是 JSON 数据。请检查 API 地址配置是否正确。\n请求 URL: ${response.config.baseURL || ''}${response.config.url || ''}`,
        isHtmlResponse: true,
        url: response.config.url,
        baseURL: response.config.baseURL,
      });
    }
    
    // 添加响应日志（仅开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response Interceptor:', {
        status: response.status,
        url: response.config.url,
        baseURL: response.config.baseURL,
        fullURL: `${response.config.baseURL || ''}${response.config.url || ''}`,
        rawDataType: typeof rawData,
        isObject: typeof rawData === 'object' && rawData !== null,
        isArray: Array.isArray(rawData),
        isString: typeof rawData === 'string',
        hasSuccess: rawData && typeof rawData === 'object' && 'success' in rawData,
        hasData: rawData && typeof rawData === 'object' && 'data' in rawData,
        keys: rawData && typeof rawData === 'object' ? Object.keys(rawData) : [],
      });
    }
    
    // 后端返回格式：{ success: true, data: {...} } 或 { success: false, message: '...' }
    // axios 的 response.data 就是后端返回的 JSON 对象
    
    // 如果 response.data 是对象且包含 success 字段，说明已经是 ApiResponse 格式
    if (rawData && typeof rawData === 'object' && rawData !== null && !Array.isArray(rawData)) {
      if ('success' in rawData) {
        // 已经是 ApiResponse 格式，直接返回
        if (process.env.NODE_ENV === 'development') {
          console.log('API Response: Returning ApiResponse format', {
            success: rawData.success,
            hasData: 'data' in rawData,
            dataKeys: rawData.data && typeof rawData.data === 'object' ? Object.keys(rawData.data) : [],
          });
        }
        return rawData;
      }
    }
    
    // 如果响应是字符串但不是 HTML，尝试解析为 JSON
    if (typeof rawData === 'string') {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed && typeof parsed === 'object' && 'success' in parsed) {
          return parsed;
        }
        return {
          success: true,
          data: parsed,
        };
      } catch (e) {
        // 不是有效的 JSON，返回错误
        return Promise.reject({
          success: false,
          message: '服务器返回了无效的响应格式',
          rawData: rawData.substring(0, 200),
        });
      }
    }
    
    // 否则包装成 ApiResponse 格式
    const wrappedResponse = {
      success: true,
      data: rawData,
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response: Wrapping as ApiResponse', {
        wrapped: wrappedResponse,
        originalType: typeof rawData,
      });
    }
    
    return wrappedResponse;
  },
  (error) => {
    // 添加错误日志
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      responseData: error.response?.data,
    });
    
    // 处理错误响应
    if (error.response) {
      // 服务器返回了错误响应
      const status = error.response.status;
      const errorData = error.response.data || {};
      
      // 401 未授权，清除认证信息并跳转登录（但登录接口的 401 不应该跳转）
      if (status === 401 && !error.config?.url?.includes('/auth/login')) {
        useAuthStore.getState().clearAuth();
        // 避免在登录页面重复跳转
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      
      // 如果后端返回的是 ApiResponse 格式，直接返回
      if (typeof errorData === 'object' && ('success' in errorData || 'message' in errorData)) {
        return Promise.reject({
          success: false,
          ...errorData,
          message: errorData.message || error.message || '请求失败',
        });
      }
      
      // 否则包装成 ApiResponse 格式
      return Promise.reject({
        success: false,
        message: errorData.message || error.message || '请求失败',
      });
    }
    
    // 网络错误或其他错误
    return Promise.reject({
      success: false,
      message: error.message || '网络错误，请检查网络连接',
    });
  }
);

export default api;

