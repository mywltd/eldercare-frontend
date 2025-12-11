/**
 * 统一错误处理工具
 * 从API错误响应中提取错误消息
 */
export function getErrorMessage(error: any): string {
  // 如果错误对象有 message 属性（通常是 Error 对象）
  if (error?.message && typeof error.message === 'string') {
    // 排除 axios 的默认错误消息
    if (
      error.message.includes('Request failed with status code') ||
      error.message.includes('Network Error') ||
      error.message.includes('timeout')
    ) {
      // 继续查找 API 返回的错误消息
    } else {
      // 如果是业务错误消息，直接返回
      return error.message;
    }
  }

  // 优先从 response.data.message 获取（后端返回的错误格式）
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // 兼容 response.data.data.message（某些嵌套结构）
  if (error?.response?.data?.data?.message) {
    return error.response.data.data.message;
  }

  // 如果 response.data 本身就是字符串
  if (typeof error?.response?.data === 'string') {
    return error.response.data;
  }

  // 如果 response.data 有 success 和 message 字段（ApiResponse 格式）
  if (error?.response?.data && typeof error?.response?.data === 'object') {
    if (error.response.data.message) {
      return error.response.data.message;
    }
  }

  // 网络错误
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return '网络连接失败，请检查网络设置';
  }

  // 超时错误
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return '请求超时，请稍后重试';
  }

  // 默认错误消息
  return '操作失败，请稍后重试';
}

