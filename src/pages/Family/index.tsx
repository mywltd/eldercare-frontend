import { useEffect, useState, useRef } from 'react';
import {
  Button,
  Input,
  Tag,
  message,
  Modal,
  Form,
  Switch,
  Popconfirm,
  Select,
  Avatar,
  Divider,
  Empty,
  Skeleton,
  Progress,
} from 'antd';
import { 
  PlusOutlined, 
  SettingOutlined, 
  DeleteOutlined,
  EditOutlined,
  UserOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  DeleteOutlined as ClearOutlined,
  RobotOutlined,
  HeartOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import { wsService } from '../../services/ws';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandler';
import { aiPredictionService } from '../../services/aiPredictionService';
import { useMobile } from '../../hooks/useMobile';
import { MobileLayout } from '../../components/MobileLayout';
import './family.css';

/**
 * 亲属监控页面
 * 支持 PC 端和移动端，功能完全一致
 */
export default function FamilyPage() {
  const [elders, setElders] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [webhookModalVisible, setWebhookModalVisible] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [form] = Form.useForm();
  const [webhookForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [aiPredictionModalVisible, setAiPredictionModalVisible] = useState(false);
  const [selectedElderForPrediction, setSelectedElderForPrediction] = useState<any>(null);
  const [aiPredictions, setAiPredictions] = useState<any[]>([]);
  const [triggeringAi, setTriggeringAi] = useState<string | null>(null);
  const { user, clearAuth, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMobile();

  // 从URL获取当前标签页，默认为'elders'
  const getActiveTabFromUrl = () => {
    const path = location.pathname;
    if (path === '/family' || path === '/family/') {
      return 'elders';
    }
    const match = path.match(/^\/family\/([^/]+)/);
    if (match) {
      const tab = match[1];
      if (['elders', 'webhooks', 'settings'].includes(tab)) {
        return tab;
      }
    }
    return 'elders';
  };

  const activeTab = getActiveTabFromUrl();

  // 处理标签页切换，同时更新URL
  const handleTabChange = (tab: string) => {
    navigate(`/family/${tab}`, { replace: true });
  };

  // 处理默认路由重定向
  useEffect(() => {
    if (location.pathname === '/family' || location.pathname === '/family/') {
      navigate('/family/elders', { replace: true });
    }
  }, [location.pathname, navigate]);

  // 只在组件首次挂载或路径改变时加载数据，避免从详情页返回时重新加载
  const prevPathRef = useRef<string>('');
  const hasLoadedRef = useRef<boolean>(false);
  
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;
    
    // 如果是从详情页返回（之前路径是详情页，当前路径是family列表页），不重新加载
    if (hasLoadedRef.current && prevPath.startsWith('/elder-detail/') && currentPath.startsWith('/family/')) {
      prevPathRef.current = currentPath;
      return;
    }
    
    // 如果路径没有改变，不重新加载
    if (hasLoadedRef.current && prevPath === currentPath && currentPath.startsWith('/family/')) {
      return;
    }
    
    // 标记已加载，并记录当前路径
    hasLoadedRef.current = true;
    prevPathRef.current = currentPath;
    
    // 只在family相关路径时加载数据
    if (currentPath.startsWith('/family/')) {
      loadElders();
      loadWebhooks();
      // 连接 WebSocket 接收实时预警
      if (user?.id) {
        elders.forEach((elder) => {
          wsService.connect(`family-${elder.id}`, (msg) => {
            if (msg.type === 'risk_alert') {
              message.warning(`预警：${msg.message}`);
            }
          });
        });
      }
    }

    return () => {
      wsService.disconnect();
    };
  }, [location.pathname, user?.id]);

  const loadElders = async () => {
    setLoading(true);
    try {
      const response = (await api.get('/family/elders')) as any;
      if (response?.success) {
        setElders(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load elders:', error);
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadWebhooks = async () => {
    try {
      const response = (await api.get('/webhook/configs')) as any;
      if (response?.success) {
        setWebhooks(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load webhooks:', error);
    }
  };

  const handleBind = async (values: any) => {
    try {
      await api.post('/family/bind', { elderUuid: values.elderUuid });
      message.success('绑定成功');
      setBindModalVisible(false);
      form.resetFields();
      loadElders();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleCreateWebhook = async (values: any) => {
    try {
      await api.post('/webhook/configs', values);
      message.success('创建成功');
      setWebhookModalVisible(false);
      webhookForm.resetFields();
      setEditingWebhook(null);
      loadWebhooks();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleUpdateWebhook = async (values: any) => {
    try {
      await api.put(`/webhook/configs/${editingWebhook.id}`, values);
      message.success('更新成功');
      setWebhookModalVisible(false);
      webhookForm.resetFields();
      setEditingWebhook(null);
      loadWebhooks();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await api.delete(`/webhook/configs/${id}`);
      message.success('删除成功');
      loadWebhooks();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleToggleWebhook = async (id: string, enabled: boolean) => {
    try {
      await api.put(`/webhook/configs/${id}`, { enabled });
      message.success(enabled ? '已启用' : '已禁用');
      loadWebhooks();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleTestWebhook = async () => {
    try {
      const values = await webhookForm.validateFields(['url', 'type', 'secret']);
      setTestingWebhook(true);
      setTestResult(null);

      const response = (await api.post('/webhook/test', {
        url: values.url,
        type: values.type,
        secret: values.secret || null,
      })) as any;

      if (response?.success) {
        setTestResult({
          success: response.data.success,
          message: response.data.message,
        });
        if (response.data.success) {
          message.success('测试成功！');
        } else {
          message.error('测试失败');
        }
      } else {
        setTestResult({
          success: false,
          message: response?.message || '测试失败',
        });
        message.error(response?.message || '测试失败');
      }
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      setTestResult({
        success: false,
        message: errorMsg,
      });
      message.error(errorMsg);
    } finally {
      setTestingWebhook(false);
    }
  };

  const getRiskColor = (status: string) => {
    const map: Record<string, string> = {
      low: 'green',
      mid: 'orange',
      high: 'red',
      danger: 'magenta',
    };
    return map[status] || 'default';
  };

  const getRiskText = (status: string) => {
    const map: Record<string, string> = {
      low: '低风险',
      mid: '中风险',
      high: '高风险',
      danger: '严重风险',
    };
    return map[status] || '未知';
  };

  const getRiskIcon = (status: string) => {
    if (status === 'high' || status === 'danger') {
      return <ExclamationCircleOutlined style={{ color: status === 'danger' ? '#eb2f96' : '#ff4d4f' }} />;
    }
    return <HeartOutlined style={{ color: status === 'low' ? '#52c41a' : '#faad14' }} />;
  };

  const handleViewAiPrediction = async (elder: any) => {
    setSelectedElderForPrediction(elder);
    setAiPredictionModalVisible(true);
    try {
      const predictions = await aiPredictionService.getByElderId(elder.id, 5);
      setAiPredictions(predictions);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleTriggerAiAnalysis = async (elder: any) => {
    setTriggeringAi(elder.id);
    try {
      await aiPredictionService.triggerAnalysis(elder.id);
      message.success('AI分析完成');
      // 自动打开预测结果
      setSelectedElderForPrediction(elder);
      setAiPredictionModalVisible(true);
      const predictions = await aiPredictionService.getByElderId(elder.id, 5);
      setAiPredictions(predictions);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    } finally {
      setTriggeringAi(null);
    }
  };

  // 渲染老人卡片（PC和移动端共用）
  const renderElderCard = (elder: any) => {
    const riskScore = elder.latestReport?.score ? (elder.latestReport.score * 100) : 0;
    const riskColor = getRiskColor(elder.status);
    
    return (
      <div
        key={elder.id}
        className="elder-card"
        onClick={() => navigate(`/elder-detail/family/${elder.id}`, { replace: false })}
        style={{ cursor: 'pointer' }}
      >
        <div className="elder-card-header">
          <Avatar 
            size={56} 
            className="elder-avatar"
            style={{ 
              background: `linear-gradient(135deg, ${riskColor === 'green' ? '#52c41a' : riskColor === 'orange' ? '#faad14' : riskColor === 'red' ? '#ff4d4f' : '#eb2f96'} 0%, ${riskColor === 'green' ? '#389e0d' : riskColor === 'orange' ? '#d48806' : riskColor === 'red' ? '#cf1322' : '#c41d7f'} 100%)`,
            }}
          >
            {elder.name?.[0] || '老'}
          </Avatar>
          <div className="elder-info">
            <div className="elder-name-row">
              <div className="elder-name">{elder.name}</div>
              <Tag 
                color={riskColor} 
                icon={getRiskIcon(elder.status)}
                className="risk-tag"
              >
                {getRiskText(elder.status)}
              </Tag>
            </div>
            <div className="elder-uuid">{elder.uuid}</div>
            {elder.age && <div className="elder-age">{elder.age}岁 · {elder.gender === 'M' ? '男' : elder.gender === 'F' ? '女' : ''}</div>}
          </div>
        </div>
        
        {elder.latestReport && (
          <div className="elder-score-section">
            <div className="score-label">健康风险评分</div>
            <Progress 
              percent={riskScore} 
              strokeColor={{
                '0%': riskColor === 'green' ? '#52c41a' : riskColor === 'orange' ? '#faad14' : '#ff4d4f',
                '100%': riskColor === 'green' ? '#389e0d' : riskColor === 'orange' ? '#d48806' : '#cf1322',
              }}
              format={(percent) => `${percent?.toFixed(1)}%`}
              size="small"
            />
          </div>
        )}
        
        <div className="elder-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewAiPrediction(elder)}
            className="action-btn primary"
          >
            查看预测
          </Button>
          <Button
            icon={<ThunderboltOutlined />}
            loading={triggeringAi === elder.id}
            onClick={() => handleTriggerAiAnalysis(elder)}
            className="action-btn"
          >
            AI分析
          </Button>
        </div>
      </div>
    );
  };

  // 渲染 Webhook 卡片（PC和移动端共用）
  const renderWebhookCard = (webhook: any) => (
    <div key={webhook.id} className="webhook-card">
      <div className="webhook-header">
        <div className="webhook-info">
          <div className="webhook-name">
            <BellOutlined style={{ marginRight: 8, color: '#1890ff' }} />
            {webhook.name}
          </div>
          <Tag color={webhook.type === 'dingtalk' ? 'blue' : 'purple'}>
            {webhook.type === 'dingtalk' ? '钉钉' : '自定义'}
          </Tag>
        </div>
        <Switch
          checked={webhook.enabled}
          onChange={(checked) => handleToggleWebhook(webhook.id, checked)}
          checkedChildren="开"
          unCheckedChildren="关"
        />
      </div>
      <div className="webhook-url">{webhook.url}</div>
      <div className="webhook-actions">
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => {
            setEditingWebhook(webhook);
            webhookForm.setFieldsValue(webhook);
            setWebhookModalVisible(true);
          }}
        >
          编辑
        </Button>
        <Popconfirm
          title="确定删除吗？"
          description="删除后将无法收到此渠道的预警推送"
          onConfirm={() => handleDeleteWebhook(webhook.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      </div>
    </div>
  );

  // 渲染设置内容（PC和移动端共用）
  const renderSettingsContent = () => (
    <div className="settings-content">
      <div className="settings-section">
        <div className="settings-section-title">
          <UserOutlined /> 个人信息
        </div>
        <div className="settings-card">
          <div className="info-item">
            <span className="info-label">用户名</span>
            <span className="info-value">{user?.username || '-'}</span>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div className="info-item">
            <span className="info-label">邮箱</span>
            <span className="info-value">{user?.email || '未设置'}</span>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div className="info-item">
            <span className="info-label">手机号</span>
            <span className="info-value">{user?.phone || '未设置'}</span>
          </div>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              profileForm.setFieldsValue({
                email: user?.email || '',
                phone: user?.phone || '',
              });
              setProfileModalVisible(true);
            }}
            block
            className="settings-btn"
          >
            修改个人信息
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          <LockOutlined /> 账户安全
        </div>
        <div className="settings-card">
          <div className="info-item">
            <span className="info-label">密码</span>
            <span className="info-value">••••••••</span>
          </div>
          <Button
            type="primary"
            icon={<LockOutlined />}
            onClick={() => {
              passwordForm.resetFields();
              setPasswordModalVisible(true);
            }}
            block
            className="settings-btn"
          >
            修改密码
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          <SettingOutlined /> 其他操作
        </div>
        <div className="settings-card">
          <Button
            icon={<ClearOutlined />}
            onClick={() => {
              try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                  if (key !== 'auth-storage') {
                    localStorage.removeItem(key);
                  }
                });
                sessionStorage.clear();
                message.success('缓存已清除');
              } catch (error) {
                message.error('清除缓存失败');
              }
            }}
            block
            className="settings-btn"
          >
            清除缓存
          </Button>
          <Button
            danger
            onClick={() => { clearAuth(); navigate('/login'); }}
            block
            className="settings-btn danger"
          >
            退出登录
          </Button>
        </div>
      </div>
    </div>
  );

  // 渲染老人列表内容
  const renderEldersContent = () => (
    <div className="elders-content">
      <div className="content-header">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setBindModalVisible(true)}
          className="add-btn"
        >
          绑定老人
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadElders}
          loading={loading}
        >
          刷新
        </Button>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <Skeleton active avatar paragraph={{ rows: 3 }} />
          <Skeleton active avatar paragraph={{ rows: 3 }} />
        </div>
      ) : elders.length === 0 ? (
        <Empty 
          description="暂无绑定的老人" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => setBindModalVisible(true)}>
            立即绑定
          </Button>
        </Empty>
      ) : (
        <div className="elders-grid">
          {elders.map(renderElderCard)}
        </div>
      )}
    </div>
  );

  // 渲染 Webhook 列表内容
  const renderWebhooksContent = () => (
    <div className="webhooks-content">
      <div className="content-header">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingWebhook(null);
            webhookForm.resetFields();
            setTestResult(null);
            setWebhookModalVisible(true);
          }}
          className="add-btn"
        >
          添加推送
        </Button>
      </div>
      
      {webhooks.length === 0 ? (
        <Empty 
          description="暂无推送配置" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => {
            setEditingWebhook(null);
            webhookForm.resetFields();
            setTestResult(null);
            setWebhookModalVisible(true);
          }}>
            添加推送
          </Button>
        </Empty>
      ) : (
        <div className="webhooks-grid">
          {webhooks.map(renderWebhookCard)}
        </div>
      )}
    </div>
  );

  // 移动端布局
  if (isMobile) {
    return (
      <MobileLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={[
          { key: 'elders', label: '老人', icon: <UserOutlined /> },
          { key: 'webhooks', label: '推送', icon: <BellOutlined /> },
          { key: 'settings', label: '设置', icon: <SettingOutlined /> },
        ]}
      >
        <div className="family-page mobile">
          {activeTab === 'elders' && renderEldersContent()}
          {activeTab === 'webhooks' && renderWebhooksContent()}
          {activeTab === 'settings' && renderSettingsContent()}
        </div>

        {/* 共用模态框 */}
        {renderModals()}
      </MobileLayout>
    );
  }

  // PC端布局
  return (
    <div className="family-page desktop">
      <div className="page-header">
        <div className="page-title">
          <HeartOutlined className="title-icon" />
          <span>亲属监控</span>
        </div>
        <div className="header-actions">
          <span className="welcome-text">欢迎，{user?.username}</span>
          <Button onClick={() => { clearAuth(); navigate('/login'); }}>
            退出登录
          </Button>
        </div>
      </div>

      <div className="page-content">
        <div className="sidebar">
          <div 
            className={`sidebar-item ${activeTab === 'elders' ? 'active' : ''}`}
            onClick={() => handleTabChange('elders')}
          >
            <UserOutlined />
            <span>绑定的老人</span>
            {elders.length > 0 && <span className="badge">{elders.length}</span>}
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'webhooks' ? 'active' : ''}`}
            onClick={() => handleTabChange('webhooks')}
          >
            <BellOutlined />
            <span>推送设置</span>
            {webhooks.length > 0 && <span className="badge">{webhooks.length}</span>}
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <SettingOutlined />
            <span>个人设置</span>
          </div>
        </div>

        <div className="main-content">
          {activeTab === 'elders' && renderEldersContent()}
          {activeTab === 'webhooks' && renderWebhooksContent()}
          {activeTab === 'settings' && renderSettingsContent()}
        </div>
      </div>

      {/* 共用模态框 */}
      {renderModals()}
    </div>
  );

  // 渲染所有模态框
  function renderModals() {
    return (
      <>
        {/* 绑定老人模态框 */}
        <Modal
          title="绑定老人"
          open={bindModalVisible}
          onCancel={() => {
            setBindModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          className="custom-modal"
        >
          <Form form={form} layout="vertical" onFinish={handleBind}>
            <Form.Item
              name="elderUuid"
              label="老人唯一ID"
              rules={[{ required: true, message: '请输入老人唯一ID' }]}
              extra="请向管理员获取老人的唯一ID"
            >
              <Input placeholder="例如: ELD-1234567890-ABC123" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block className="submit-btn">
                确认绑定
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Webhook配置模态框 */}
        <Modal
          title={editingWebhook ? '编辑推送' : '添加推送'}
          open={webhookModalVisible}
          onCancel={() => {
            setWebhookModalVisible(false);
            webhookForm.resetFields();
            setEditingWebhook(null);
            setTestResult(null);
          }}
          footer={null}
          className="custom-modal"
          width={520}
        >
          <Form
            form={webhookForm}
            layout="vertical"
            onFinish={editingWebhook ? handleUpdateWebhook : handleCreateWebhook}
          >
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
              <Input placeholder="例如: 钉钉工作群" />
            </Form.Item>
            <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
              <Select 
                showSearch
                filterOption={(input, option) => {
                  const text = typeof option?.children === 'string' 
                    ? option.children 
                    : String(option?.children || '');
                  return text.toLowerCase().includes(input.toLowerCase());
                }}
              >
                <Select.Option value="dingtalk">钉钉机器人</Select.Option>
                <Select.Option value="custom">自定义Webhook</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item 
              name="url" 
              label="Webhook URL" 
              rules={[
                { required: true, message: '请输入URL' },
                { type: 'url', message: '请输入有效的URL' }
              ]}
            >
              <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx" />
            </Form.Item>
            <Form.Item 
              name="secret" 
              label="加签密钥"
              extra="钉钉机器人需要填写加签密钥"
            >
              <Input.Password placeholder="钉钉机器人的加签密钥" />
            </Form.Item>
            <Form.Item name="enabled" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            
            <div className="form-actions">
              <Button
                onClick={handleTestWebhook}
                loading={testingWebhook}
                className="test-btn"
              >
                测试连接
              </Button>
              <Button type="primary" htmlType="submit" className="submit-btn">
                {editingWebhook ? '保存修改' : '添加'}
              </Button>
            </div>
            
            {testResult && (
              <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? (
                  <CheckCircleOutlined />
                ) : (
                  <CloseCircleOutlined />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </Form>
        </Modal>

        {/* 修改个人信息模态框 */}
        <Modal
          title="修改个人信息"
          open={profileModalVisible}
          onCancel={() => {
            setProfileModalVisible(false);
            profileForm.resetFields();
          }}
          footer={null}
          className="custom-modal"
        >
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={async (values) => {
              try {
                const updated = await authService.updateProfile({
                  email: values.email || null,
                  phone: values.phone || null,
                });
                updateUser(updated);
                message.success('个人信息更新成功');
                setProfileModalVisible(false);
              } catch (error: any) {
                message.error(getErrorMessage(error));
              }
            }}
          >
            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="请输入邮箱（可选）" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="请输入手机号（可选）" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block className="submit-btn">
                保存
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* 修改密码模态框 */}
        <Modal
          title="修改密码"
          open={passwordModalVisible}
          onCancel={() => {
            setPasswordModalVisible(false);
            passwordForm.resetFields();
          }}
          footer={null}
          className="custom-modal"
        >
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={async (values) => {
              try {
                await authService.changePassword(values.oldPassword, values.newPassword);
                message.success('密码修改成功');
                setPasswordModalVisible(false);
                passwordForm.resetFields();
              } catch (error: any) {
                message.error(getErrorMessage(error));
              }
            }}
          >
            <Form.Item
              name="oldPassword"
              label="原密码"
              rules={[{ required: true, message: '请输入原密码' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入原密码" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码（至少6个字符）" />
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
              <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block className="submit-btn">
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* AI预测查看模态框 */}
        <Modal
          title={
            <div className="modal-title-with-icon">
              <RobotOutlined />
              <span>{selectedElderForPrediction?.name || ''} - AI健康预测</span>
            </div>
          }
          open={aiPredictionModalVisible}
          onCancel={() => {
            setAiPredictionModalVisible(false);
            setSelectedElderForPrediction(null);
            setAiPredictions([]);
          }}
          footer={null}
          width={800}
          className="ai-prediction-modal"
        >
          {aiPredictions.length === 0 ? (
            <Empty 
              description="暂无AI预测记录"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button 
                type="primary" 
                onClick={() => selectedElderForPrediction && handleTriggerAiAnalysis(selectedElderForPrediction)}
                loading={triggeringAi === selectedElderForPrediction?.id}
              >
                立即分析
              </Button>
            </Empty>
          ) : (
            <div className="predictions-list">
              {aiPredictions.map((prediction: any, index: number) => {
                // 处理新旧格式兼容
                const healthAnalysis = prediction.healthAnalysis || {};
                const suggestions = Array.isArray(prediction.suggestions) 
                  ? prediction.suggestions.map((s: any) => typeof s === 'string' ? { content: s, urgency: 'regular' } : s)
                  : [];
                const riskFactors = Array.isArray(prediction.riskFactors)
                  ? prediction.riskFactors.map((r: any) => typeof r === 'string' ? { factor: r, severity: 'medium' } : r)
                  : [];
                const nextSteps = Array.isArray(prediction.nextSteps)
                  ? prediction.nextSteps.map((n: any) => typeof n === 'string' ? { step: n, priority: 1 } : n)
                  : [];

                const urgencyColors: Record<string, string> = {
                  immediate: '#ff4d4f',
                  soon: '#ff7a45',
                  regular: '#1890ff',
                  lifestyle: '#52c41a',
                };
                const urgencyTexts: Record<string, string> = {
                  immediate: '立即就医',
                  soon: '尽快就医',
                  regular: '定期监测',
                  lifestyle: '生活方式',
                };
                const severityColors: Record<string, string> = {
                  high: '#ff4d4f',
                  medium: '#ff7a45',
                  low: '#faad14',
                };

                return (
                  <div key={prediction.id || index} className="prediction-card">
                    <div className="prediction-header">
                      <Tag color={prediction.riskLevel === 'critical' ? 'magenta' : prediction.riskLevel === 'high' ? 'red' : prediction.riskLevel === 'medium' ? 'orange' : 'green'}>
                        {prediction.triggerType === 'daily' ? '每日分析' : prediction.triggerType === 'high_risk' ? '高风险触发' : '手动分析'}
                      </Tag>
                      <span className="prediction-time">
                        {new Date(prediction.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>

                    {/* 健康分析 */}
                    {(healthAnalysis.currentStatus || healthAnalysis.trendAnalysis) && (
                      <div className="prediction-section">
                        <h4><HeartOutlined /> 健康分析</h4>
                        {healthAnalysis.currentStatus && (
                          <div className="prediction-content" style={{ marginBottom: '12px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1a1a2e' }}>当前状况</div>
                            <div>{healthAnalysis.currentStatus}</div>
                          </div>
                        )}
                        {healthAnalysis.trendAnalysis && (
                          <div className="prediction-content">
                            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1a1a2e' }}>趋势分析</div>
                            <div>{healthAnalysis.trendAnalysis}</div>
                          </div>
                        )}
                        {healthAnalysis.mainIssues && healthAnalysis.mainIssues.length > 0 && (
                          <div style={{ marginTop: '12px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1a1a2e' }}>主要问题</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {healthAnalysis.mainIssues.map((issue: string, i: number) => (
                                <Tag key={i} color="orange">{issue}</Tag>
                              ))}
                            </div>
                          </div>
                        )}
                        {healthAnalysis.dataSummary && (
                          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(24, 144, 255, 0.05)', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1a1a2e' }}>数据摘要</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                              {healthAnalysis.dataSummary.bloodPressure && (
                                <div>
                                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>血压</div>
                                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                    {healthAnalysis.dataSummary.bloodPressure.trend} / {healthAnalysis.dataSummary.bloodPressure.status}
                                  </div>
                                </div>
                              )}
                              {healthAnalysis.dataSummary.bloodSugar && (
                                <div>
                                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>血糖</div>
                                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                    {healthAnalysis.dataSummary.bloodSugar.trend} / {healthAnalysis.dataSummary.bloodSugar.status}
                                  </div>
                                </div>
                              )}
                              {healthAnalysis.dataSummary.activity && (
                                <div>
                                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>活动量</div>
                                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                    {healthAnalysis.dataSummary.activity.trend} / {healthAnalysis.dataSummary.activity.status}
                                  </div>
                                </div>
                              )}
                              {healthAnalysis.dataSummary.sleep && (
                                <div>
                                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>睡眠</div>
                                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                    {healthAnalysis.dataSummary.sleep.trend} / {healthAnalysis.dataSummary.sleep.status}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 如果没有healthAnalysis，显示旧的analysis */}
                    {!healthAnalysis.currentStatus && prediction.analysis && (
                      <div className="prediction-section">
                        <h4><HeartOutlined /> 综合分析</h4>
                        <div className="prediction-content">{prediction.analysis}</div>
                      </div>
                    )}

                    {/* 健康预测 */}
                    {prediction.predictions && Array.isArray(prediction.predictions) && prediction.predictions.length > 0 && (
                      <div className="prediction-section">
                        <h4><ThunderboltOutlined /> 健康预测</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {prediction.predictions.map((p: any, i: number) => (
                            <div key={i} style={{ 
                              padding: '12px', 
                              background: 'rgba(255, 193, 7, 0.1)', 
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 193, 7, 0.3)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <Tag color="orange">{p.timeRange}</Tag>
                                {p.probability && (
                                  <span style={{ fontSize: '13px', color: '#8c8c8c' }}>
                                    概率: <strong style={{ color: '#ff7a45' }}>{(p.probability * 100).toFixed(0)}%</strong>
                                  </span>
                                )}
                              </div>
                              <div style={{ marginBottom: '4px' }}>
                                {Array.isArray(p.possibleIssues) ? p.possibleIssues.join('、') : p.possibleIssues}
                              </div>
                              {p.description && (
                                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{p.description}</div>
                              )}
                              {p.severity && (
                                <Tag color={severityColors[p.severity] || 'default'} style={{ marginTop: '6px' }}>
                                  {p.severity === 'critical' ? '严重' : p.severity === 'high' ? '高' : p.severity === 'medium' ? '中' : '低'}
                                </Tag>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 处置建议 */}
                    {suggestions.length > 0 && (
                      <div className="prediction-section">
                        <h4><CheckCircleOutlined /> 处置建议</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {suggestions.map((s: any, i: number) => (
                            <div key={i} style={{ 
                              padding: '10px 12px', 
                              background: 'rgba(24, 144, 255, 0.05)', 
                              borderRadius: '8px',
                              borderLeft: `3px solid ${urgencyColors[s.urgency] || '#1890ff'}`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 500 }}>{s.content || s}</span>
                                <Tag color={urgencyColors[s.urgency] || 'default'} style={{ margin: 0 }}>
                                  {urgencyTexts[s.urgency] || '常规'}
                                </Tag>
                              </div>
                              {s.category && (
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>分类: {s.category}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 风险因素 */}
                    {riskFactors.length > 0 && (
                      <div className="prediction-section">
                        <h4><ExclamationCircleOutlined /> 风险因素</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {riskFactors.map((r: any, i: number) => (
                            <div key={i} style={{ 
                              padding: '10px 12px', 
                              background: 'rgba(255, 77, 79, 0.05)', 
                              borderRadius: '8px',
                              borderLeft: `3px solid ${severityColors[r.severity] || '#ff4d4f'}`
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500 }}>{r.factor || r}</span>
                                <Tag color={severityColors[r.severity] || 'default'} style={{ margin: 0 }}>
                                  {r.severity === 'high' ? '高风险' : r.severity === 'medium' ? '中风险' : '低风险'}
                                </Tag>
                              </div>
                              {r.description && (
                                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{r.description}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 后续步骤 */}
                    {nextSteps.length > 0 && (
                      <div className="prediction-section">
                        <h4><ReloadOutlined /> 后续关注</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {nextSteps
                            .sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0))
                            .map((n: any, i: number) => (
                              <div key={i} style={{ 
                                padding: '10px 12px', 
                                background: 'rgba(82, 196, 26, 0.05)', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: '#52c41a',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 600
                                }}>
                                  {n.priority || i + 1}
                                </span>
                                <span style={{ flex: 1 }}>{n.step || n}</span>
                                {n.timeframe && (
                                  <Tag color="green" style={{ margin: 0 }}>{n.timeframe}</Tag>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 置信度 */}
                    {prediction.confidence && (
                      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#8c8c8c' }}>分析置信度</span>
                          <Progress 
                            percent={Math.round(prediction.confidence * 100)} 
                            size="small" 
                            strokeColor={{
                              '0%': '#108ee9',
                              '100%': '#87d068',
                            }}
                            style={{ width: '150px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      </>
    );
  }
}
