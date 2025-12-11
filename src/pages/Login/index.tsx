import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, HeartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';
import { getErrorMessage } from '../../utils/errorHandler';
import './login.css';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  // 调试：确保组件已加载
  useEffect(() => {
    console.log('Login component mounted');
  }, []);

  const onFinish = async (values: { identifier: string; password: string; rememberMe?: boolean }) => {
    setLoading(true);
    try {
      const result = await authService.login(values.identifier, values.password);

      // 验证返回的数据
      if (!result) {
        throw new Error('登录失败：服务器无响应');
      }

      if (!result.token) {
        console.error('Login: Token is missing', { result });
        throw new Error('登录失败：服务器返回数据格式错误（缺少 token）');
      }

      if (!result.user) {
        console.error('Login: User is missing', { result });
        throw new Error('登录失败：服务器返回数据格式错误（缺少用户信息）');
      }

      const { token, user } = result;

      // 验证用户信息
      if (!user || typeof user !== 'object') {
        console.error('Login: User is not an object', { user, result });
        throw new Error('登录失败：用户信息格式错误');
      }

      if (!user.id) {
        console.error('Login: User id is missing', { user });
        throw new Error('登录失败：用户信息不完整（缺少 id）');
      }

      if (!user.role) {
        console.error('Login: User role is missing', { user });
        throw new Error('登录失败：用户信息不完整（缺少 role）');
      }

      // 传递记住密码选项
      setAuth(token, user, values.rememberMe || false);
      message.success('登录成功！');

      // 根据角色跳转
      const role = user.role;
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'board') {
        navigate('/board');
      } else if (role === 'elderCollector') {
        navigate('/collector');
      } else if (role === 'family') {
        navigate('/family');
      } else {
        navigate('/board');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-testid="login-container">
      <Card
        className="login-card"
        title={
          <div className="login-title">
            <div className="login-title-icon">
              <HeartOutlined style={{ fontSize: '24px', color: '#fff' }} />
            </div>
            <span>健康监测系统</span>
          </div>
        }
      >
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          autoComplete="off"
        >
          <Form.Item
            label="用户名/邮箱"
            name="identifier"
            rules={[
              { required: true, message: '请输入用户名或邮箱' },
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              placeholder="请输入用户名或邮箱" 
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '\u00A0\u00A0请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#1890ff' }} />}
              placeholder="请输入密码" 
            />
          </Form.Item>

          <Form.Item name="rememberMe" valuePropName="checked">
            <Checkbox>记住密码</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
              className="login-button"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

      
      </Card>
    </div>
  );
}

