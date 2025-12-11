import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 构建配置：使用根路径，确保资源正确加载
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 确保构建后的资源路径正确，使用相对路径避免部署路径问题
    rollupOptions: {
      output: {
        // 资源文件命名
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name].[hash].[ext]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name].[hash].[ext]`;
          }
          return `assets/[name].[hash].[ext]`;
        },
        // JS 文件命名
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
        // 确保代码分割正确 - 将所有 React 相关依赖放在一起
        manualChunks: (id) => {
          // 将 node_modules 中的依赖单独打包
          if (id.includes('node_modules')) {
            // 所有依赖 React 的库都必须和 React 放在同一个 chunk
            // 这样可以确保 React 在所有依赖之前加载
            if (
              id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('scheduler') ||
              id.includes('react-router') ||
              id.includes('zustand') ||
              id.includes('use-sync-external-store') ||
              id.includes('antd') ||
              id.includes('@ant-design') ||
              id.includes('@rc-component') ||
              id.includes('rc-') ||
              id.includes('recharts')
            ) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        },
      },
    },
    // 生成 sourcemap（生产环境可选）
    sourcemap: false,
    // 使用 esbuild 进行压缩（不混淆，只压缩）
    minify: 'esbuild',
    // 构建大小警告阈值（KB）
    chunkSizeWarningLimit: 1000,
    // 确保 CSS 代码分割
    cssCodeSplit: true,
    // 清空输出目录
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    // 开发环境代理配置（可选，如果使用独立的前端开发服务器）
    // 注意：生产环境前端独立部署时，不使用代理，而是通过 backend-config.json 配置后端地址
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // Preview 服务器配置（用于预览构建后的前端）
  preview: {
    port: 4173,
    strictPort: false,
    // 配置 historyApiFallback，解决刷新后 404 问题
    // 所有路由都返回 index.html，让前端路由接管
    open: false,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'antd', 'recharts'],
  },
});

