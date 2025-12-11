import type { WebSocketMessage } from '../types';
import { backendConfigManager } from '../utils/backendConfig';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentChannel: 'alerts' | 'board' = 'alerts';

  async connect(userId: string, onMessage: (message: WebSocketMessage) => void, channel: 'alerts' | 'board' = 'alerts') {
    this.currentChannel = channel;
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // 获取后端 WebSocket 地址
    try {
      const wsBaseUrl = await backendConfigManager.getWsUrl();
      
      // 构建 WebSocket URL
      const wsPath = channel === 'board' 
        ? '/ws/board'
        : `/ws/alerts?userId=${userId}`;
      
      // 如果配置的 wsUrl 是完整 URL，直接使用；否则拼接
      const wsUrl = wsBaseUrl.startsWith('ws://') || wsBaseUrl.startsWith('wss://')
        ? `${wsBaseUrl}${wsPath}`
        : `${wsBaseUrl}${wsPath}`;
      
      this.ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to get WebSocket URL, using default:', error);
      // 使用默认配置
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = channel === 'board' 
        ? `${protocol}//${window.location.host}/ws/board`
        : `${protocol}//${window.location.host}/ws/alerts?userId=${userId}`;
      this.ws = new WebSocket(wsUrl);
    }

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        onMessage(message);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(userId, onMessage, this.currentChannel);
    };
  }

  private async attemptReconnect(userId: string, onMessage: (message: WebSocketMessage) => void, channel: 'alerts' | 'board' = 'alerts') {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimer = setTimeout(async () => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      // 清除健康检查缓存，尝试重新选择后端
      backendConfigManager.clearHealthCache();
      await this.connect(userId, onMessage, channel);
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

export const wsService = new WebSocketService();

