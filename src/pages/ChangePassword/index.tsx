import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../utils/errorHandler';
import { MobileLayout } from '../../components/MobileLayout';
import './change-password.css';

/**
 * 移动端修改密码页面
 */
export default function ChangePasswordPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await authService.changePassword(values.oldPassword, values.newPassword);
      message.success('密码修改成功');
      form.resetFields();
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        navigate(-1);
      }, 1000);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout>
      <div className="change-password-mobile">
        <div className="change-password-header">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginBottom: '16px', padding: 0, height: 'auto' }}
          >
            返回
          </Button>
          <h2 className="change-password-title">修改密码</h2>
        </div>

        <div className="mobile-card">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="change-password-form"
          >
            <Form.Item
              name="oldPassword"
              label="原密码"
              rules={[{ required: true, message: '请输入原密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入原密码"
                size="large"
                style={{ borderRadius: '12px' }}
              />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码（至少6个字符）"
                size="large"
                style={{ borderRadius: '12px' }}
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入新密码"
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
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </MobileLayout>
  );
}

