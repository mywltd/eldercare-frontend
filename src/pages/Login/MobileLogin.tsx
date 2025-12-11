import { useState } from 'react';
import { Form, Input, Button, message, Tabs, Checkbox } from 'antd';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Role } from '../../types';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';
import { getErrorMessage } from '../../utils/errorHandler';
import './mobile-login.css';

export default function MobileLogin() {
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  const onLogin = async (values: { identifier: string; password: string; rememberMe?: boolean }) => {
    setLoading(true);
    try {
      const { token, user } = await authService.login(values.identifier, values.password);

      // 限制只能登录family和elderCollector账号
      if (user.role !== 'family' && user.role !== 'elderCollector') {
        message.error('此设备仅支持亲属用户和采集端用户登录');
        return;
      }

      // 传递记住密码选项
      setAuth(token, user, values.rememberMe || false);
      message.success('登录成功！');

      // 根据角色跳转
      if (user.role === 'elderCollector') {
        navigate('/collector');
      } else if (user.role === 'family') {
        navigate('/family');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: {
    username: string;
    email?: string;
    phone?: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setRegisterLoading(true);
    try {
      const { token, user } = await authService.register({
        username: values.username,
        email: values.email || undefined,
        phone: values.phone || undefined,
        password: values.password,
        role: Role.FAMILY, // 只能注册family类型
      });

      setAuth(token, user);
      message.success('注册成功！');
      navigate('/family');
    } catch (error: any) {
      console.error('Register error:', error);
      message.error(getErrorMessage(error));
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="mobile-login-container">
      {/* 背景装饰 */}
      <div className="mobile-login-background">
        <div className="bg-blob bg-blob-1"></div>
        <div className="bg-blob bg-blob-2"></div>
        <div className="bg-blob bg-blob-3"></div>
      </div>

      {/* 主内容区 */}
      <div className="mobile-login-content">
        {/* Logo和标题 */}
        <div className="mobile-login-header">
          <div className="mobile-login-logo">
            <div className="logo-icon">❤️</div>
          </div>
          <h1 className="mobile-login-title">健康监测</h1>
          <p className="mobile-login-subtitle">关爱家人，从健康开始</p>
        </div>

        {/* 登录/注册卡片 */}
        <div className="mobile-login-card">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            className="mobile-login-tabs"
            items={[
              {
                key: 'login',
                label: '登录',
              },
              {
                key: 'register',
                label: '注册',
              },
            ]}
          />

          {/* 登录表单 */}
          {activeTab === 'login' && (
            <Form
              form={loginForm}
              name="mobile-login"
              onFinish={onLogin}
              layout="vertical"
              size="large"
              autoComplete="off"
              className="mobile-login-form"
            >
              <Form.Item
                name="identifier"
                rules={[{ required: true, message: '请输入用户名或邮箱' }]}
              >
                <Input
                  prefix={<UserOutlined className="input-icon" />}
                  placeholder="用户名或邮箱"
                  className="mobile-input"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="input-icon" />}
                  placeholder="密码"
                  className="mobile-input"
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
                  className="mobile-login-button"
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          )}

          {/* 注册表单 */}
          {activeTab === 'register' && (
            <Form
              form={registerForm}
              name="mobile-register"
              onFinish={onRegister}
              layout="vertical"
              size="large"
              autoComplete="off"
              className="mobile-login-form"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="input-icon" />}
                  placeholder="用户名（至少3个字符）"
                  className="mobile-input"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  prefix={<MailOutlined className="input-icon" />}
                  placeholder="邮箱（可选）"
                  className="mobile-input"
                />
              </Form.Item>

              <Form.Item
                name="phone"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
                ]}
              >
                <Input
                  prefix={<PhoneOutlined className="input-icon" />}
                  placeholder="手机号（可选）"
                  className="mobile-input"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="input-icon" />}
                  placeholder="密码（至少6个字符）"
                  className="mobile-input"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined className="input-icon" />}
                  placeholder="确认密码"
                  className="mobile-input"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={registerLoading}
                  block
                  className="mobile-login-button"
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>

        {/* 底部提示 */}
        <div className="mobile-login-footer">
          <p>仅支持亲属用户和采集端用户</p>
        </div>
      </div>
    </div>
  );
}

