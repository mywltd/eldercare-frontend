import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { HomeOutlined, ArrowLeftOutlined, FrownOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/useAuthStore';
import './not-found.css';

export default function NotFound() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();

  // 根据用户角色获取首页路径
  const getHomePath = () => {
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

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-icon">
          <FrownOutlined />
        </div>
        <div className="not-found-title">404</div>
        <div className="not-found-description">
          抱歉，您访问的页面不存在
        </div>
        <div className="not-found-actions">
          <Button
            type="default"
            icon={<ArrowLeftOutlined />}
            size="large"
            onClick={() => navigate(-1)}
            className="not-found-button"
          >
            返回上一页
          </Button>
          <Button
            type="primary"
            icon={<HomeOutlined />}
            size="large"
            onClick={() => navigate(getHomePath())}
            className="not-found-button"
          >
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}

