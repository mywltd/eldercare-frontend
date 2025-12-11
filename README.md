# Eldercare AI System

AI驱动的老年人健康监测系统，支持实时风险评分与预警。
本项目由阿里云ESA提供加速、计算和保护
![图片](https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png)

## 📋 目录

- [技术栈](#技术栈)
- [功能特性](#功能特性)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [开发指南](#开发指南)
- [构建部署](#构建部署)
- [移动端打包](#移动端打包)
- [环境配置](#环境配置)
- [常见问题](#常见问题)

## 🛠 技术栈

- **框架**: React 18.2+ (Hooks)
- **构建工具**: Vite 5.0+
- **语言**: TypeScript 5.3+
- **UI 框架**: Ant Design 6.0+
- **路由**: React Router 6.21+
- **状态管理**: Zustand 4.4+
- **图表库**: Recharts 2.10+
- **HTTP 客户端**: Axios 1.6+
- **日期处理**: Day.js 1.11+
- **移动端**: Capacitor 5.5+
- **代码规范**: ESLint + TypeScript ESLint

## ✨ 功能特性

### 用户角色
- **管理员 (Admin)**: 系统管理、用户管理
- **社区管理员 (Board)**: 社区老人管理、数据统计
- **数据采集员 (Elder Collector)**: 录入老人健康数据
- **家属 (Family)**: 查看老人健康报告、接收预警

### 核心功能
- 🔐 **用户认证**: 登录、注册、密码修改
- 👴 **老人管理**: 老人信息录入、查看、编辑
- 📊 **健康数据**: 血压、血糖、心率、步数、睡眠等数据录入
- 🎯 **风险评分**: AI 驱动的健康风险评分系统
- 📈 **数据可视化**: 健康趋势图表、多维度分析
- 🔔 **实时预警**: WebSocket 实时推送风险预警
- 🤖 **AI 预测**: 基于历史数据的健康趋势预测
- 📱 **移动端支持**: 响应式设计，支持移动端和 App 打包

## 📁 项目结构

```
frontend/
├── public/                 # 静态资源
│   └── backend-config.json # 后端服务配置
├── src/
│   ├── components/         # 公共组件
│   │   ├── ErrorBoundary.tsx
│   │   ├── MobileLayout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── hooks/            # 自定义 Hooks
│   │   └── useMobile.ts
│   ├── pages/            # 页面组件
│   │   ├── Admin/        # 管理员页面
│   │   ├── Board/        # 社区管理员页面
│   │   ├── CaregiverDashboard/  # 家属看板
│   │   ├── Collector/    # 数据采集员页面
│   │   ├── ElderInput/   # 老人数据录入
│   │   ├── ElderDetail/  # 老人详情
│   │   ├── Family/       # 家属页面
│   │   ├── Login/        # 登录页面
│   │   └── ...
│   ├── services/         # API 服务
│   │   ├── api.ts        # Axios 配置
│   │   ├── authService.ts
│   │   ├── elderService.ts
│   │   ├── dashboardService.ts
│   │   ├── ws.ts         # WebSocket 服务
│   │   └── ...
│   ├── stores/           # 状态管理
│   │   └── useAuthStore.ts
│   ├── types.ts          # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   │   ├── backendConfig.ts
│   │   └── errorHandler.ts
│   ├── App.tsx           # 根组件
│   └── main.tsx          # 入口文件
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js 22.0+ (推荐使用 LTS 版本)
- npm 10.0+ 或 yarn 1.22+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn
yarn install
```

### 开发运行

```bash
# 启动开发服务器（默认端口 5173）
npm run dev

# 或指定端口
npm run dev -- --port 3001
```

开发服务器启动后，访问 `http://localhost:5173`

### 预览构建结果

```bash
# 构建生产版本
npm run build

# 预览构建结果（默认端口 4173）
npm run preview
```

## 💻 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用函数式组件 + Hooks
- 使用 Ant Design 组件库
- 文件命名：小写连字符或驼峰命名

### 添加新页面

1. 在 `src/pages/` 下创建页面目录
2. 创建页面组件文件
3. 在 `src/App.tsx` 中添加路由配置

示例：

```typescript
// src/pages/NewPage/index.tsx
import { Card } from 'antd';

export default function NewPage() {
  return (
    <Card title="新页面">
      {/* 页面内容 */}
    </Card>
  );
}
```

### API 服务调用

所有 API 调用通过 `services` 目录下的服务文件：

```typescript
import { elderService } from '@/services/elderService';

// 获取老人列表
const elders = await elderService.getElders();

// 创建健康记录
await elderService.createRecord({
  elderId: 'xxx',
  recordDate: '2024-01-01',
  systolic: 120,
  diastolic: 80,
  // ...
});
```

### WebSocket 使用

```typescript
import { wsService } from '@/services/ws';

// 连接 WebSocket
wsService.connect();

// 监听消息
wsService.onMessage((message) => {
  if (message.type === 'risk_alert') {
    // 处理风险预警
  }
});

// 断开连接
wsService.disconnect();
```

### 状态管理

使用 Zustand 进行状态管理：

```typescript
import { useAuthStore } from '@/stores/useAuthStore';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  
  // 使用状态和方法
}
```

## 🏗 构建部署

### 生产构建

```bash
# 构建生产版本
npm run build
```

构建产物输出到 `dist/` 目录。

### 部署到阿里云 Page

1. 将代码推送到 Git 仓库
2. 在阿里云 Page 中创建站点
3. 配置构建命令：`npm install && npm run build`
4. 配置发布目录：`dist`
5. 配置 Node.js 版本：22.x

### 静态文件部署

构建后的 `dist/` 目录可以部署到任何静态文件服务器：

- Nginx
- Apache
- 阿里云 OSS
- 腾讯云 COS
- GitHub Pages
- Vercel
- Netlify

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📱 移动端打包

### 使用 Capacitor

本项目支持通过 Capacitor 打包成 iOS/Android App。

#### 初始化移动端项目

```bash
# Android
npm run android:init

# iOS (需要 macOS)
npm run cap:ios
```

#### 同步 Web 代码到移动端

```bash
npm run cap:sync
```

#### 构建移动端应用

```bash
# 构建并同步
npm run cap:build

# Android 构建
npm run android:build:debug      # Debug 版本
npm run android:build:release    # Release 版本
npm run android:build:bundle     # App Bundle

# iOS 构建（需要 macOS 和 Xcode）
npm run cap:build:ios
```

详细说明请参考：
- [Android 构建指南](./ANDROID_BUILD.md)
- [Android 快速开始](./ANDROID_QUICKSTART.md)
- [移动端快速开始](./MOBILE_QUICKSTART.md)

## ⚙️ 环境配置

### 后端服务配置

前端通过 `public/backend-config.json` 配置后端服务地址：

```json
{
  "backends": [
    {
      "name": "生产服务器",
      "apiUrl": "https://api.example.com",
      "wsUrl": "wss://api.example.com",
      "priority": 1,
      "enabled": true
    }
  ],
  "healthCheckEndpoint": "/health",
  "healthCheckTimeout": 3000,
  "autoSelect": true
}
```

### 开发环境代理

开发环境可通过 `vite.config.ts` 配置代理：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### 环境变量（可选）

如需使用环境变量，创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 🔧 常见问题

### 1. 构建时 TypeScript 错误

确保所有类型定义正确，运行类型检查：

```bash
npx tsc --noEmit
```

### 2. 路由刷新后 404

确保服务器配置了 SPA 路由支持（所有路由返回 `index.html`）。

### 3. WebSocket 连接失败

检查：
- 后端服务是否正常运行
- `backend-config.json` 中的 WebSocket URL 是否正确
- 防火墙/代理设置

### 4. 移动端打包问题

- Android: 确保已安装 Android Studio 和 SDK
- iOS: 需要 macOS 和 Xcode
- 运行 `npm run cap:sync` 同步代码

### 5. 依赖安装失败

尝试清除缓存：

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 6. 构建产物过大

- 使用代码分割（已配置）
- 启用 Gzip 压缩
- 使用 CDN 加载大型库

## 📚 相关文档

- [构建配置说明](./BUILD_CONFIG.md)
- [Android 构建指南](./ANDROID_BUILD.md)
- [移动端快速开始](./MOBILE_QUICKSTART.md)
- [代码分割优化](./CHUNK_FIX.md)

## 📄 许可证

本项目为竞赛演示项目。

## 👥 贡献

欢迎提交 Issue 和 Pull Request。

---

**注意**: 本项目仅用于竞赛演示，生产环境使用前请进行充分测试和安全评估。

