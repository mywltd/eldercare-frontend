import { useState, useEffect, useRef } from 'react';
import {
  Input,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Avatar,
  Tag,
  Row,
  Col,
  Divider,
  Empty,
  Skeleton,
  Progress,
} from 'antd';
import { 
  SearchOutlined, 
  UserOutlined, 
  SettingOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  LockOutlined, 
  DeleteOutlined as ClearOutlined,
  TeamOutlined,
  HeartOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  SafetyOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandler';
import { useMobile } from '../../hooks/useMobile';
import { MobileLayout } from '../../components/MobileLayout';
import './collector.css';

/**
 * 数据采集端页面
 * 支持 PC 端和移动端，功能完全一致
 */
export default function CollectorPage() {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [assignedElders, setAssignedElders] = useState<any[]>([]);
  const [selectedElder, setSelectedElder] = useState<any>(null);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [form] = Form.useForm();
  const [overrideForm] = Form.useForm();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const { user, clearAuth, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMobile();

  // 使用本地状态管理搜索输入框的值（从URL初始化）
  const [searchInputValue, setSearchInputValue] = useState(() => {
    return searchParams.get('q') || '';
  });

  // 从URL获取当前标签页，默认为'assigned'
  const getActiveTabFromUrl = () => {
    const path = location.pathname;
    if (path === '/collector' || path === '/collector/') {
      return 'assigned';
    }
    const match = path.match(/^\/collector\/([^/]+)/);
    if (match) {
      const tab = match[1];
      if (['assigned', 'search', 'settings'].includes(tab)) {
        return tab;
      }
    }
    return 'assigned';
  };

  const activeTab = getActiveTabFromUrl();

  // 处理标签页切换，同时更新URL
  const handleTabChange = (tab: string) => {
    navigate(`/collector/${tab}`, { replace: true });
  };

  // 处理默认路由重定向
  useEffect(() => {
    if (location.pathname === '/collector' || location.pathname === '/collector/') {
      navigate('/collector/assigned', { replace: true });
    }
  }, [location.pathname, navigate]);

  // 只在组件首次挂载或路径改变时加载数据，避免从详情页返回时重新加载
  const prevPathRef = useRef<string>('');
  const hasLoadedRef = useRef<boolean>(false);
  
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;
    
    // 如果是从详情页返回（之前路径是详情页，当前路径是collector列表页），不重新加载
    if (hasLoadedRef.current && prevPath.startsWith('/elder-detail/') && currentPath.startsWith('/collector/')) {
      prevPathRef.current = currentPath;
      return;
    }
    
    // 如果路径没有改变，不重新加载
    if (hasLoadedRef.current && prevPath === currentPath && currentPath.startsWith('/collector/')) {
      return;
    }
    
    // 标记已加载，并记录当前路径
    hasLoadedRef.current = true;
    prevPathRef.current = currentPath;
    
    // 只在collector相关路径时加载数据
    if (currentPath.startsWith('/collector/')) {
      loadAssignedElders();
    }
  }, [location.pathname]);

  const loadAssignedElders = async () => {
    setLoading(true);
    try {
      const response = (await api.get('/collector/assigned-elders')) as any;
      if (response?.success) {
        setAssignedElders(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load assigned elders:', error);
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // 执行搜索
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = (await api.get(`/collector/search?q=${encodeURIComponent(query)}`)) as any;
      if (response?.success) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          message.info('未找到匹配的老人');
        }
      }
    } catch (error: any) {
      message.error(getErrorMessage(error));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // 处理搜索（手动触发：点击搜索按钮或按回车）
  const handleSearch = () => {
    const searchValue = searchInputValue.trim();
    
    if (!searchValue) {
      message.warning('请输入搜索关键词');
      return;
    }

    // 更新URL参数
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('q', searchValue);
    setSearchParams(newSearchParams, { replace: false });
    
    // 执行搜索
    performSearch(searchValue);
  };

  // 当URL中的搜索参数改变时（比如刷新页面或通过链接访问），自动执行搜索
  useEffect(() => {
    if (activeTab === 'search') {
      const urlQuery = searchParams.get('q') || '';
      // 同步输入框的值
      setSearchInputValue(urlQuery);
      if (urlQuery) {
        performSearch(urlQuery);
      } else {
        setSearchResults([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('q'), activeTab]);

  const handleSelectElder = (elder: any, action: 'record' | 'override') => {
    setSelectedElder(elder);
    if (action === 'record') {
      form.resetFields();
      setRecordModalVisible(true);
    } else {
      overrideForm.resetFields();
      setOverrideModalVisible(true);
    }
  };

  const handleSubmitRecord = async (values: any) => {
    try {
      const response = (await api.post('/collector/records', {
        elderUuid: selectedElder.uuid,
        ...values,
      })) as any;
      if (response?.success) {
        message.success('录入成功');
        setRecordModalVisible(false);
        setSelectedElder(null);
        form.resetFields();
        loadAssignedElders();
      }
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleRiskOverride = async (values: any) => {
    try {
      await api.post('/collector/risk-override', {
        elderUuid: selectedElder.uuid,
        ...values,
      });
      message.success('风险状态已更新');
      setOverrideModalVisible(false);
      setSelectedElder(null);
      overrideForm.resetFields();
      loadAssignedElders();
      // 如果搜索结果中也有这个老人，刷新搜索结果
      if (searchResults.length > 0 && searchInputValue.trim()) {
        performSearch(searchInputValue.trim());
      }
    } catch (error: any) {
      message.error(getErrorMessage(error));
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

  // 渲染老人卡片（PC和移动端共用）
  const renderElderCard = (elder: any, showOverride: boolean = true) => {
    const riskScore = elder.latestReport?.score ? (elder.latestReport.score * 100) : 0;
    const riskColor = getRiskColor(elder.status);
    
    return (
      <div
        key={elder.id}
        className="elder-card"
        onClick={() => navigate(`/elder-detail/collector/${elder.id}`, { replace: false })}
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
            <div className="elder-meta">
              {elder.age && <span>{elder.age}岁</span>}
              {elder.gender && <span>{elder.gender === 'M' ? '男' : elder.gender === 'F' ? '女' : ''}</span>}
              {elder.idCard && <span className="id-card">身份证: {elder.idCard.replace(/(\d{4})\d{10}(\d{4})/, '$1****$2')}</span>}
            </div>
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
            icon={<FormOutlined />}
            onClick={() => handleSelectElder(elder, 'record')}
            className="action-btn primary"
          >
            录入数据
          </Button>
          {showOverride && (
            <Button
              icon={<SafetyOutlined />}
              onClick={() => handleSelectElder(elder, 'override')}
              className="action-btn"
            >
              风险调整
            </Button>
          )}
        </div>
      </div>
    );
  };

  // 渲染分配的老人内容
  const renderAssignedContent = () => (
    <div className="assigned-content">
      <div className="content-header">
        <div className="header-title">
          <TeamOutlined />
          <span>分配给您的老人</span>
          <span className="count-badge">{assignedElders.length}</span>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadAssignedElders}
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
      ) : assignedElders.length === 0 ? (
        <Empty 
          description="暂无分配的老人" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <p style={{ color: '#8c8c8c', fontSize: 14 }}>请联系管理员为您分配老人</p>
        </Empty>
      ) : (
        <div className="elders-grid">
          {assignedElders.map(elder => renderElderCard(elder, true))}
        </div>
      )}
    </div>
  );

  // 渲染搜索内容
  const renderSearchContent = () => (
    <div className="search-content">
      <div className="search-box">
        <div className="search-input-group">
          <Input
            placeholder="输入姓名、身份证号或唯一ID搜索"
            value={searchInputValue}
            onChange={(e) => {
              // 只更新本地状态，不触发搜索
              setSearchInputValue(e.target.value);
            }}
            onPressEnter={handleSearch}
            allowClear
            onClear={() => {
              setSearchInputValue('');
              // 清除URL参数和搜索结果
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('q');
              setSearchParams(newSearchParams, { replace: true });
              setSearchResults([]);
            }}
            className="search-input"
          />
          <Button 
            type="primary" 
            icon={<SearchOutlined />} 
            loading={searching}
            onClick={handleSearch}
            className="search-btn"
          >
            搜索
          </Button>
        </div>
        <div className="search-tips">
          支持姓名、身份证号、老人唯一ID模糊搜索
        </div>
      </div>
      
      {searching ? (
        <div className="loading-container">
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </div>
      ) : searchResults.length === 0 ? (
        <Empty 
          description="请搜索老人信息" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div className="elders-grid">
          {searchResults.map(elder => renderElderCard(elder, true))}
        </div>
      )}
    </div>
  );

  // 渲染设置内容
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

  // 移动端布局
  if (isMobile) {
    return (
      <MobileLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={[
          { key: 'assigned', label: '分配', icon: <TeamOutlined /> },
          { key: 'search', label: '搜索', icon: <SearchOutlined /> },
          { key: 'settings', label: '设置', icon: <SettingOutlined /> },
        ]}
      >
        <div className="collector-page mobile">
          {activeTab === 'assigned' && renderAssignedContent()}
          {activeTab === 'search' && renderSearchContent()}
          {activeTab === 'settings' && renderSettingsContent()}
        </div>

        {/* 共用模态框 */}
        {renderModals()}
      </MobileLayout>
    );
  }

  // PC端布局
  return (
    <div className="collector-page desktop">
      <div className="page-header">
        <div className="page-title">
          <FormOutlined className="title-icon" />
          <span>数据采集</span>
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
            className={`sidebar-item ${activeTab === 'assigned' ? 'active' : ''}`}
            onClick={() => handleTabChange('assigned')}
          >
            <TeamOutlined />
            <span>分配的老人</span>
            {assignedElders.length > 0 && <span className="badge">{assignedElders.length}</span>}
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => handleTabChange('search')}
          >
            <SearchOutlined />
            <span>搜索老人</span>
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
          {activeTab === 'assigned' && renderAssignedContent()}
          {activeTab === 'search' && renderSearchContent()}
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
        {/* 录入数据模态框 */}
        <Modal
          title={
            <div className="modal-title-with-icon">
              <FormOutlined />
              <span>录入健康数据 - {selectedElder?.name}</span>
            </div>
          }
          open={recordModalVisible}
          onCancel={() => {
            setRecordModalVisible(false);
            setSelectedElder(null);
            form.resetFields();
          }}
          footer={null}
          className="custom-modal"
          width={600}
        >
          <Form form={form} layout="vertical" onFinish={handleSubmitRecord}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="bloodPressureSys" label="收缩压 (mmHg)">
                  <InputNumber 
                    min={50} 
                    max={250} 
                    style={{ width: '100%' }} 
                    placeholder="如: 120"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bloodPressureDia" label="舒张压 (mmHg)">
                  <InputNumber 
                    min={30} 
                    max={150} 
                    style={{ width: '100%' }} 
                    placeholder="如: 80"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="heartRate" label="心率 (次/分)">
                  <InputNumber 
                    min={30} 
                    max={200} 
                    style={{ width: '100%' }} 
                    placeholder="如: 72"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bloodSugar" label="血糖 (mmol/L)">
                  <InputNumber 
                    min={0} 
                    max={30} 
                    step={0.1} 
                    style={{ width: '100%' }} 
                    placeholder="如: 5.6"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="bloodFat" label="血脂 (mmol/L)">
                  <InputNumber 
                    min={0} 
                    max={20} 
                    step={0.1} 
                    style={{ width: '100%' }} 
                    placeholder="如: 4.5"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="sleepHours" label="睡眠时长 (小时)">
                  <InputNumber 
                    min={0} 
                    max={24} 
                    step={0.5} 
                    style={{ width: '100%' }} 
                    placeholder="如: 7.5"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="steps" label="步数">
              <InputNumber 
                min={0} 
                style={{ width: '100%' }} 
                placeholder="如: 6000"
              />
            </Form.Item>
            <Form.Item name="symptoms" label="身体状况描述">
              <Input.TextArea 
                rows={3} 
                placeholder="描述老人目前的身体状况、不适症状等"
                showCount
                maxLength={500}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block className="submit-btn">
                提交记录
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* 风险调整模态框 */}
        <Modal
          title={
            <div className="modal-title-with-icon">
              <SafetyOutlined />
              <span>风险状态调整 - {selectedElder?.name}</span>
            </div>
          }
          open={overrideModalVisible}
          onCancel={() => {
            setOverrideModalVisible(false);
            setSelectedElder(null);
            overrideForm.resetFields();
          }}
          footer={null}
          className="custom-modal"
        >
          <div className="current-risk-info">
            <span>当前风险状态：</span>
            <Tag color={getRiskColor(selectedElder?.status || 'low')}>
              {getRiskText(selectedElder?.status || 'low')}
            </Tag>
          </div>
          
          <Form form={overrideForm} layout="vertical" onFinish={handleRiskOverride}>
            <Form.Item
              name="overrideTo"
              label="调整为"
              rules={[{ required: true, message: '请选择风险状态' }]}
            >
              <Select 
                showSearch
                placeholder="选择风险状态"
                filterOption={(input, option) => {
                  const text = option?.children as React.ReactNode;
                  const textStr = typeof text === 'string' ? text : 
                    (Array.isArray(text) ? text.map(t => typeof t === 'string' ? t : '').join('') : '');
                  return textStr.toLowerCase().includes(input.toLowerCase());
                }}
              >
                <Select.Option value="low">
                  <Tag color="green">低风险</Tag> - 健康状况良好
                </Select.Option>
                <Select.Option value="mid">
                  <Tag color="orange">中风险</Tag> - 需要关注
                </Select.Option>
                <Select.Option value="high">
                  <Tag color="red">高风险</Tag> - 需要密切监测
                </Select.Option>
                <Select.Option value="danger">
                  <Tag color="magenta">严重风险</Tag> - 需要立即处理
                </Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="reason"
              label="调整原因"
              rules={[{ required: true, message: '请填写调整原因' }]}
              extra="请详细说明为什么需要调整风险状态"
            >
              <Input.TextArea 
                rows={4} 
                placeholder="例如：经过现场核实，老人实际状况良好，系统评估可能存在误差..."
                showCount
                maxLength={500}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block className="submit-btn">
                确认调整
              </Button>
            </Form.Item>
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
      </>
    );
  }
}
