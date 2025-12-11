/**
 * 后端地址配置管理
 * 支持多个后端地址，自动选择可用入口
 */

export interface BackendConfig {
  name: string;
  apiUrl: string;
  wsUrl: string;
  priority: number;
  enabled: boolean;
}

export interface BackendConfigFile {
  backends: BackendConfig[];
  healthCheckEndpoint: string;
  healthCheckTimeout: number;
  autoSelect: boolean;
}

class BackendConfigManager {
  private config: BackendConfigFile | null = null;
  private currentBackend: BackendConfig | null = null;
  private healthCheckCache: Map<string, { available: boolean; lastCheck: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1分钟缓存

  /**
   * 加载后端配置
   */
  async loadConfig(): Promise<BackendConfigFile> {
    if (this.config) {
      return this.config as BackendConfigFile;
    }

    try {
      const response = await fetch('/backend-config.json');
      if (!response.ok) {
        throw new Error(`Failed to load backend config: ${response.statusText}`);
      }
      this.config = await response.json() as BackendConfigFile;
      return this.config;
    } catch (error) {
      console.error('Failed to load backend config, using default:', error);
      // 使用默认配置
      this.config = {
        backends: [
          {
            name: '默认后端',
            apiUrl: '/api',
            wsUrl: window.location.protocol === 'https:' ? 'wss:' : 'ws:' + '//' + window.location.host,
            priority: 1,
            enabled: true,
          },
        ],
        healthCheckEndpoint: '/health',
        healthCheckTimeout: 3000,
        autoSelect: true,
      };
      return this.config;
    }
  }

  /**
   * 检查后端健康状态
   */
  private async checkHealth(backend: BackendConfig): Promise<boolean> {
    const cacheKey = backend.apiUrl;
    const cached = this.healthCheckCache.get(cacheKey);
    const now = Date.now();

    // 使用缓存
    if (cached && now - cached.lastCheck < this.CACHE_DURATION) {
      return cached.available;
    }

    try {
      const config = await this.loadConfig();
      const healthUrl = `${backend.apiUrl}${config.healthCheckEndpoint}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.healthCheckTimeout);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      const available = response.ok;

      // 更新缓存
      this.healthCheckCache.set(cacheKey, {
        available,
        lastCheck: now,
      });

      return available;
    } catch (error) {
      console.warn(`Health check failed for ${backend.name}:`, error);
      this.healthCheckCache.set(cacheKey, {
        available: false,
        lastCheck: now,
      });
      return false;
    }
  }

  /**
   * 自动选择可用的后端
   */
  async selectAvailableBackend(): Promise<BackendConfig> {
    const config = await this.loadConfig();

    if (!config.autoSelect && this.currentBackend) {
      return this.currentBackend;
    }

    // 获取所有启用的后端，按优先级排序
    const enabledBackends = config.backends
      .filter((b) => b.enabled)
      .sort((a, b) => a.priority - b.priority);

    if (enabledBackends.length === 0) {
      throw new Error('没有可用的后端配置');
    }

    // 如果只有一个后端，直接返回
    if (enabledBackends.length === 1) {
      this.currentBackend = enabledBackends[0];
      return this.currentBackend;
    }

    // 并行检查所有后端的健康状态
    const healthChecks = await Promise.all(
      enabledBackends.map(async (backend) => ({
        backend,
        available: await this.checkHealth(backend),
      }))
    );

    // 选择第一个可用的后端
    const availableBackend = healthChecks.find((check) => check.available);

    if (availableBackend) {
      this.currentBackend = availableBackend.backend;
      return this.currentBackend;
    }

    // 如果没有可用的后端，返回优先级最高的（即使不可用）
    console.warn('所有后端健康检查失败，使用优先级最高的后端');
    this.currentBackend = enabledBackends[0];
    return this.currentBackend;
  }

  /**
   * 获取当前后端API地址
   */
  async getApiUrl(): Promise<string> {
    const backend = await this.selectAvailableBackend();
    return backend.apiUrl;
  }

  /**
   * 获取当前后端WebSocket地址
   */
  async getWsUrl(): Promise<string> {
    const backend = await this.selectAvailableBackend();
    return backend.wsUrl;
  }

  /**
   * 获取当前后端配置
   */
  async getCurrentBackend(): Promise<BackendConfig> {
    return await this.selectAvailableBackend();
  }

  /**
   * 清除健康检查缓存
   */
  clearHealthCache() {
    this.healthCheckCache.clear();
  }

  /**
   * 重置配置（用于测试或重新加载）
   */
  reset() {
    this.config = null;
    this.currentBackend = null;
    this.healthCheckCache.clear();
  }
}

export const backendConfigManager = new BackendConfigManager();

