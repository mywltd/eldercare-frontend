import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  user: {
    id: string;
    username: string;
    email?: string;
    phone?: string;
    role: string;
  } | null;
  rememberMe: boolean;
  setAuth: (token: string, user: any, rememberMe?: boolean) => void;
  clearAuth: () => void;
  updateUser: (user: any) => void;
}

// 检测是否是移动设备
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// 自定义存储，支持localStorage（PC端7天，移动端永久）和sessionStorage（会话）
const createAuthStorage = () => {
  const STORAGE_KEY = 'auth-storage';
  const EXPIRY_KEY = 'auth-expiry';
  const REMEMBER_KEY = 'auth-remember';
  const SESSION_KEY = 'auth-session-storage';
  const IS_MOBILE_KEY = 'auth-is-mobile';

  return {
    getItem: (name: string): string | null => {
      if (name !== STORAGE_KEY) return null;
      
      // 先检查localStorage是否有记住密码的token
      const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';
      
      if (rememberMe) {
        const isMobile = localStorage.getItem(IS_MOBILE_KEY) === 'true';
        
        // 移动端永久有效，不检查过期时间
        if (isMobile) {
          return localStorage.getItem(STORAGE_KEY);
        }
        
        // PC端检查是否过期
        const expiry = localStorage.getItem(EXPIRY_KEY);
        if (expiry) {
          const expiryTime = parseInt(expiry, 10);
          if (Date.now() > expiryTime) {
            // 已过期，清除数据
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(EXPIRY_KEY);
            localStorage.removeItem(REMEMBER_KEY);
            localStorage.removeItem(IS_MOBILE_KEY);
            return null;
          }
        }
        return localStorage.getItem(STORAGE_KEY);
      } else {
        // 使用sessionStorage
        return sessionStorage.getItem(SESSION_KEY);
      }
    },
    setItem: (name: string, value: string): void => {
      if (name !== STORAGE_KEY) return;
      
      // 从localStorage读取rememberMe状态
      const rememberMe = localStorage.getItem(REMEMBER_KEY) === 'true';
      const isMobile = isMobileDevice();
      
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, value);
        localStorage.setItem(IS_MOBILE_KEY, isMobile ? 'true' : 'false');
        
        // 只有PC端设置过期时间，移动端永久有效
        if (!isMobile) {
          const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天后
          localStorage.setItem(EXPIRY_KEY, expiryTime.toString());
        } else {
          // 移动端清除过期时间
          localStorage.removeItem(EXPIRY_KEY);
        }
      } else {
        sessionStorage.setItem(SESSION_KEY, value);
        // 清除localStorage中的相关数据
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        localStorage.removeItem(IS_MOBILE_KEY);
      }
    },
    removeItem: (name: string): void => {
      if (name !== STORAGE_KEY) return;
      
      // 清除所有存储
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(IS_MOBILE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    },
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      rememberMe: false,
      setAuth: (token, user, rememberMe = false) => {
        // 先清除旧的存储
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('auth-expiry');
        sessionStorage.removeItem('auth-session-storage');
        
        // 设置记住密码状态
        localStorage.setItem('auth-remember', rememberMe ? 'true' : 'false');
        
        set({ token, user, rememberMe });
      },
      clearAuth: () => {
        // 清除所有存储
        localStorage.removeItem('auth-storage');
        localStorage.removeItem('auth-expiry');
        localStorage.removeItem('auth-remember');
        localStorage.removeItem('auth-is-mobile');
        sessionStorage.removeItem('auth-session-storage');
        set({ token: null, user: null, rememberMe: false });
      },
      updateUser: (user) => set((state) => ({ user: state.user ? { ...state.user, ...user } : null })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => createAuthStorage()),
    }
  )
);

