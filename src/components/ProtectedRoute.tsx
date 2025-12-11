import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredRoles 
}: ProtectedRouteProps) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 检查单个角色
  if (requiredRole && user.role !== requiredRole) {
    // 根据用户角色跳转到对应页面
    const role = user.role;
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'board') {
      return <Navigate to="/board" replace />;
    } else if (role === 'elderCollector') {
      return <Navigate to="/collector" replace />;
    } else if (role === 'family') {
      return <Navigate to="/family" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // 检查多个角色
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    // 根据用户角色跳转到对应页面
    const role = user.role;
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'board') {
      return <Navigate to="/board" replace />;
    } else if (role === 'elderCollector') {
      return <Navigate to="/collector" replace />;
    } else if (role === 'family') {
      return <Navigate to="/family" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
