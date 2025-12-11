import { useState, useEffect } from 'react';
import { Form, Input, Button, message, Avatar } from 'antd';
import { MailOutlined, PhoneOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/errorHandler';
import { MobileLayout } from '../../components/MobileLayout';
import './profile.css';

/**
 * 移动端个人信息页面
 */
export default function ProfilePage() {
  const [form] = Form.useForm();
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user, form]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const updated = await authService.updateProfile({
        email: values.email || null,
        phone: values.phone || null,
      });
      updateUser(updated);
      message.success('个人信息更新成功');
      navigate(-1); // 返回上一页
    } catch (error: any) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout>
      <div className="profile-mobile">
        <div className="profile-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginBottom: '16px', padding: 0, height: 'auto' }}
          >
            返回
          </Button>
          <div className="profile-avatar-section">
            <Avatar size={80} style={{ backgroundColor: '#1890ff', marginBottom: '16px' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <div className="profile-username">{user?.username || '用户'}</div>
          </div>
        </div>

        <div className="mobile-card">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="profile-form"
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入邮箱（可选）"
                size="large"
                style={{ borderRadius: '12px' }}
              />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="请输入手机号（可选）"
                size="large"
                style={{ borderRadius: '12px' }}
              />
            </Form.Item>
            <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
                style={{ borderRadius: '12px', height: '48px', fontSize: '16px', fontWeight: 500 }}
              >
                保存
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </MobileLayout>
  );
}

