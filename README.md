# Eldercare AI System

AI驱动的老年人健康监测系统，支持实时风险评分与预警。

## 技术栈

- **后端**: Node.js 22+ (ESM) + TypeScript + Fastify + WebSocket
- **数据库**: MySQL 8.4 + Prisma ORM
- **前端**: React 18 + Vite + TypeScript + Ant Design 6.x + Zustand
- **可视化**: Recharts
- **打包**: Capacitor

## 本地启动步骤

### 前置要求

- Node.js 22+
- npm 10+
- MySQL 8.4 (运行在 127.0.0.1:3306)
- macOS 环境

### 1. 安装依赖

```bash
# 在项目根目录运行（会自动安装所有 workspace 的依赖）
npm install

# 或者只在 backend 目录安装
cd backend
npm install
```

**重要**：确保所有依赖都已安装，特别是 `mysql2` 包（数据库初始化脚本需要）。

### 2. 配置环境变量

在 `backend/` 目录创建 `.env` 文件：

```env
DATABASE_URL="mysql://root:your_password@127.0.0.1:3306/health"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3000
```

**注意**：请将 `your_password` 替换为你的 MySQL root 密码。

### 3. 初始化数据库

**方式一：使用自动化脚本（推荐）**

```bash
cd backend
npm run init:db
```

脚本会自动完成：
- ✅ 测试 MySQL 连接
- ✅ 创建数据库（如果不存在）
- ✅ 生成 Prisma Client
- ✅ 运行数据库 migrations
- ✅ 运行 seed 数据

**方式二：手动初始化**

```bash
# 创建数据库
mysql -u root -p
CREATE DATABASE health CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 初始化
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

更多详情请查看 [backend/scripts/README.md](./backend/scripts/README.md)

### 4. 启动开发服务器

```bash
npm run dev
```

- 后端 API: http://localhost:3000
- 前端应用: http://localhost:5173
- WebSocket: ws://localhost:3000/ws/alerts

### 5. 测试风险评分

```bash
cd backend
npm run risk:demo
```

## 项目结构

```
eldercare-ai-system/
├── backend/          # Fastify 后端服务
├── frontend/         # React 前端应用
├── shared/           # 共享类型定义
└── tests/            # 测试文件
```

## API 文档

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/elders/:elderId/records` - 提交健康记录
- `GET /api/elders/:elderId/reports/latest` - 获取最新风险报告
- `GET /api/dashboard/caregiver/:userId` - 获取看护人仪表盘
- `WS /ws/alerts` - WebSocket 预警推送

## 开发

### Windows PowerShell（推荐）

```powershell
# 方式 1: 使用 PowerShell 脚本（自动启动前后端）
.\start-dev.ps1

# 方式 2: 使用 npm 命令
npm run dev
```

### 手动启动

```bash
# 后端开发
cd backend && npm run dev

# 前端开发（新终端）
cd frontend && npm run dev

# 运行测试
npm test
```

## 生产环境

### 快速启动（推荐）

```bash
# 自动检查并构建前端，然后启动服务端
npm run start
```

这个命令会：
1. ✅ 检查前端是否已构建，未构建则自动构建
2. ✅ 检查后端是否已构建，未构建则自动构建
3. ✅ 启动后端服务（自动服务前端静态文件）

### Windows PowerShell

```powershell
# 构建并启动生产服务（自动编译前端，后端服务静态文件）
.\start-prod.ps1
```

### 手动构建和启动

```bash
# 1. 构建前后端
npm run build

# 2. 启动生产服务
NODE_ENV=production npm run start:prod
```

生产环境启动后：
- 后端 API: http://localhost:3000
- 前端应用: http://localhost:3000（由后端服务静态文件）

## 打包 App

```bash
cd frontend
npm run cap:sync
# 然后使用 Xcode / Android Studio 打开对应平台项目
```

