import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/useAuthStore';
import { useMobile } from './hooks/useMobile';
import Login from './pages/Login';
import MobileLogin from './pages/Login/MobileLogin';
import Board from './pages/Board';
import Admin from './pages/Admin';
import Family from './pages/Family';
import Collector from './pages/Collector';
import ElderDetail from './pages/ElderDetail';
import DeviceSimulator from './pages/DeviceSimulator';
import DeviceLogs from './pages/DeviceLogs';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { token, user } = useAuthStore();
  const isMobile = useMobile();

  // 根据用户角色决定默认跳转路径
  const getDefaultPath = () => {
    if (!token || !user) return '/login';
    const role = user.role;
    if (role === 'admin') {
      return '/admin/dashboard';
    } else if (role === 'board') {
      return '/board';
    } else if (role === 'elderCollector') {
      return '/collector';
    } else if (role === 'family') {
      return '/family';
    }
    return '/login';
  };

  // 根据设备类型选择登录组件
  const LoginComponent = isMobile ? MobileLogin : Login;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to={getDefaultPath()} replace /> : <LoginComponent />}
        />
        <Route
          path="/board"
          element={
            <ProtectedRoute requiredRole="board">
              <Board />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family/*"
          element={
            <ProtectedRoute requiredRole="family">
              <Family />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collector/*"
          element={
            <ProtectedRoute requiredRole="elderCollector">
              <Collector />
            </ProtectedRoute>
          }
        />
        <Route
          path="/elder-detail/:source/:elderId"
          element={
            <ProtectedRoute>
              <ElderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/device-logs/:deviceId"
          element={
            <ProtectedRoute requiredRole="admin">
              <DeviceLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/device-simulator"
          element={<DeviceSimulator />}
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={getDefaultPath()} replace />}
        />
        {/* 404页面 - 必须是最后一个路由 */}
        <Route
          path="*"
          element={
            token && user ? (
              <ProtectedRoute>
                <NotFound />
              </ProtectedRoute>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

