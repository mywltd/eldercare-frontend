import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Space,
  Spin,
  Switch,
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  UserAddOutlined,
  TeamOutlined,
  WarningOutlined,
  FileTextOutlined,
  RobotOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
  DatabaseOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import NotFound from '../NotFound';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '../../stores/useAuthStore';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandler';
import { medicalHistoryService } from '../../services/medicalHistoryService';
import { aiPredictionService } from '../../services/aiPredictionService';
import { dynamicFieldService } from '../../services/dynamicFieldService';

// 图表颜色配置
const COLORS = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  purple: '#722ed1',
  cyan: '#13c2c2',
};

const RISK_COLORS = {
  low: '#52c41a',
  mid: '#faad14',
  high: '#ff4d4f',
  danger: '#722ed1',
};

/**
 * 管理后台页面
 */
export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [elders, setElders] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [collectorAssignments, setCollectorAssignments] = useState<any[]>([]);
  const [elderModalVisible, setElderModalVisible] = useState(false);
  const [editingElder, setEditingElder] = useState<any>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [medicalHistoryModalVisible, setMedicalHistoryModalVisible] = useState(false);
  const [selectedElderForHistory, setSelectedElderForHistory] = useState<any>(null);
  const [medicalHistoryList, setMedicalHistoryList] = useState<any[]>([]);
  const [aiPredictionModalVisible, setAiPredictionModalVisible] = useState(false);
  const [selectedElderForPrediction, setSelectedElderForPrediction] = useState<any>(null);
  const [aiPredictions, setAiPredictions] = useState<any[]>([]);
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const [editingField, setEditingField] = useState<any>(null);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [elderForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const [deviceForm] = Form.useForm();
  const [assignmentForm] = Form.useForm();
  const [historyForm] = Form.useForm();
  const [fieldForm] = Form.useForm();
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadData();
    loadDynamicFields();
  }, []);

  const loadDynamicFields = async () => {
    try {
      const fields = await dynamicFieldService.getAll();
      setDynamicFields(fields);
    } catch (error: any) {
      console.error('Failed to load dynamic fields:', error);
    }
  };

  const loadMedicalHistory = async (elderId: string) => {
    try {
      const history = await medicalHistoryService.getByElderId(elderId);
      setMedicalHistoryList(history);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const loadAiPredictions = async (elderId: string) => {
    try {
      const predictions = await aiPredictionService.getByElderId(elderId, 10);
      setAiPredictions(predictions);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleViewMedicalHistory = (elder: any) => {
    setSelectedElderForHistory(elder);
    setMedicalHistoryModalVisible(true);
    loadMedicalHistory(elder.id);
  };

  const handleViewAiPrediction = (elder: any) => {
    setSelectedElderForPrediction(elder);
    setAiPredictionModalVisible(true);
    loadAiPredictions(elder.id);
  };

  const [triggeringAi, setTriggeringAi] = useState<string | null>(null);

  const handleTriggerAiAnalysis = async (elder: any) => {
    setTriggeringAi(elder.id);
    try {
      await aiPredictionService.triggerAnalysis(elder.id);
      message.success('AI分析完成');
      // 自动打开预测结果
      setSelectedElderForPrediction(elder);
      setAiPredictionModalVisible(true);
      loadAiPredictions(elder.id);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    } finally {
      setTriggeringAi(null);
    }
  };

  const handleCreateMedicalHistory = async (values: any) => {
    try {
      await medicalHistoryService.create({
        elderId: selectedElderForHistory.id,
        ...values,
      });
      message.success('创建成功');
      historyForm.resetFields();
      loadMedicalHistory(selectedElderForHistory.id);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDeleteMedicalHistory = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条病史记录吗？',
      onOk: async () => {
        try {
          await medicalHistoryService.delete(id);
          message.success('删除成功');
          loadMedicalHistory(selectedElderForHistory.id);
        } catch (error: any) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const handleUpdateField = async (values: any) => {
    try {
      await dynamicFieldService.update(editingField.fieldName, values);
      message.success('更新成功');
      setFieldModalVisible(false);
      setEditingField(null);
      fieldForm.resetFields();
      loadDynamicFields();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, eldersRes, usersRes, devicesRes, assignmentsRes] = await Promise.all([
        api.get('/admin/statistics'),
        api.get('/admin/elders'),
        api.get('/admin/users'),
        api.get('/admin/devices'),
        api.get('/admin/collector-assignments'),
      ]) as any[];

      if (statsRes?.success) {
        setStatistics(statsRes.data);
      }

      if (eldersRes?.success) {
        setElders(eldersRes.data || []);
      } else {
        setElders([]);
      }

      if (usersRes?.success) {
        setAllUsers(usersRes.data || []);
      } else {
        setAllUsers([]);
      }

      if (devicesRes?.success) {
        setDevices(devicesRes.data || []);
      } else {
        setDevices([]);
      }

      if (assignmentsRes?.success) {
        setCollectorAssignments(assignmentsRes.data || []);
      } else {
        setCollectorAssignments([]);
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateElder = async (values: any) => {
    try {
      await api.post('/admin/elders', values);
      message.success('创建成功');
      setElderModalVisible(false);
      elderForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleEditElder = (elder: any) => {
    setEditingElder(elder);
    elderForm.setFieldsValue(elder);
    setElderModalVisible(true);
  };

  const handleUpdateElder = async (values: any) => {
    try {
      await api.put(`/admin/elders/${editingElder.id}`, values);
      message.success('更新成功');
      setElderModalVisible(false);
      setEditingElder(null);
      elderForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDeleteElder = async (elder: any) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除老人 "${elder.name}" 吗？此操作将同时删除相关的健康记录和风险报告。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/elders/${elder.id}`);
          message.success('删除成功');
          loadData();
        } catch (error: any) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const handleCreateUser = async (values: any) => {
    try {
      await api.post('/admin/users', values);
      message.success('创建成功');
      setUserModalVisible(false);
      userForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    userForm.setFieldsValue({
      ...user,
      password: undefined, // 不显示密码
    });
    setUserModalVisible(true);
  };

  const handleUpdateUser = async (values: any) => {
    try {
      // 如果密码为空，则不更新密码
      if (!values.password) {
        delete values.password;
      }
      await api.put(`/admin/users/${editingUser.id}`, values);
      message.success('更新成功');
      setUserModalVisible(false);
      setEditingUser(null);
      userForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDeleteUser = async (user: any) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除用户 "${user.username}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/users/${user.id}`);
          message.success('删除成功');
          loadData();
        } catch (error: any) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const handleCreateDevice = async (values: any) => {
    try {
      await api.post('/admin/devices', values);
      message.success('创建成功');
      setDeviceModalVisible(false);
      deviceForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleEditDevice = (device: any) => {
    setEditingDevice(device);
    deviceForm.setFieldsValue({
      ...device,
      elderId: device.elder?.id || null,
    });
    setDeviceModalVisible(true);
  };

  const handleUpdateDevice = async (values: any) => {
    try {
      await api.put(`/admin/devices/${editingDevice.id}`, values);
      message.success('更新成功');
      setDeviceModalVisible(false);
      setEditingDevice(null);
      deviceForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDeleteDevice = async (device: any) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除设备 "${device.sn}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/devices/${device.id}`);
          message.success('删除成功');
          loadData();
        } catch (error: any) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const handleCreateAssignment = async (values: any) => {
    try {
      await api.post('/admin/collector-assignments', values);
      message.success('分配成功');
      setAssignmentModalVisible(false);
      assignmentForm.resetFields();
      loadData();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDeleteAssignment = async (userId: string, elderId: string) => {
    Modal.confirm({
      title: '确认取消分配',
      content: '确定要取消此分配吗？',
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/collector-assignments?userId=${userId}&elderId=${elderId}`);
          message.success('取消分配成功');
          loadData();
        } catch (error: any) {
          message.error(getErrorMessage(error));
        }
      },
    });
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

  // 准备健康风险分布饼图数据
  const healthDistributionData = statistics?.healthDistribution
    ? Object.entries(statistics.healthDistribution).map(([key, value]) => ({
        name: getRiskText(key),
        value: value as number,
        color: RISK_COLORS[key as keyof typeof RISK_COLORS] || COLORS.primary,
      }))
    : [];

  // 准备设备状态数据
  const deviceStatusData = statistics?.deviceStats
    ? [
        { name: '已激活', value: statistics.deviceStats.active, color: COLORS.success },
        { name: '未激活', value: statistics.deviceStats.inactive, color: COLORS.danger },
      ]
    : [];

  const elderColumns = [
    {
      title: '唯一ID',
      dataIndex: 'uuid',
      key: 'uuid',
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender: string) => {
        const map: Record<string, string> = { M: '男', F: '女', Other: '其他' };
        return map[gender] || '-';
      },
    },
    {
      title: '身份证号',
      dataIndex: 'idCard',
      key: 'idCard',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '风险状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getRiskColor(status)}>{getRiskText(status)}</Tag>
      ),
    },
    {
      title: '添加时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditElder(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewMedicalHistory(record)}
          >
            病史
          </Button>
          <Button
            type="link"
            icon={<RobotOutlined />}
            onClick={() => handleViewAiPrediction(record)}
          >
            AI预测
          </Button>
          <Button
            type="link"
            icon={<RobotOutlined />}
            loading={triggeringAi === record.id}
            onClick={() => handleTriggerAiAnalysis(record)}
          >
            触发分析
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteElder(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 菜单配置
  const menuItems = [
    { key: 'dashboard', label: '数据概览', icon: <DashboardOutlined />, path: '/admin/dashboard' },
    { key: 'elders', label: '老人管理', icon: <TeamOutlined />, path: '/admin/elders' },
    { key: 'users', label: '用户管理', icon: <UserOutlined />, path: '/admin/users' },
    { key: 'devices', label: '设备管理', icon: <SettingOutlined />, path: '/admin/devices' },
    { key: 'assignments', label: '采集端分配', icon: <UsergroupAddOutlined />, path: '/admin/assignments' },
    { key: 'dynamicFields', label: '动态字段管理', icon: <DatabaseOutlined />, path: '/admin/dynamic-fields' },
  ];

  // 根据当前路径获取激活的菜单项
  const getActiveMenu = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/') {
      return 'dashboard';
    }
    const menuItem = menuItems.find(item => path === item.path);
    return menuItem?.key || null;
  };

  const activeMenu = getActiveMenu();

  // 检查是否为404
  const is404 = activeMenu === null;

  // 处理默认路由重定向
  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  // 渲染内容区域
  const renderContent = () => {
    // 如果是404，显示404页面
    if (is404) {
      return null; // 将在外层渲染404
    }

    const menuKey = activeMenu || 'dashboard';

    switch (menuKey) {
      case 'dashboard':
        return (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
              </div>
            ) : statistics ? (
              <>
                {/* 核心指标卡片 - macOS风格 */}
                <Row gutter={[20, 20]} style={{ marginBottom: '32px' }}>
                  <Col xs={24} sm={12} lg={6}>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(24, 144, 255, 0.05) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 8px 32px 0 rgba(24, 144, 255, 0.15)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 48px 0 rgba(24, 144, 255, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(24, 144, 255, 0.15)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                            marginRight: '16px',
                          }}
                        >
                          <UserOutlined style={{ fontSize: '28px', color: '#fff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px', fontWeight: 500 }}>
                            总用户数
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: 700, color: '#1890ff', lineHeight: 1 }}>
                            {statistics.totalUsers}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(82, 196, 26, 0.05) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 8px 32px 0 rgba(82, 196, 26, 0.15)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 48px 0 rgba(82, 196, 26, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(82, 196, 26, 0.15)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
                            marginRight: '16px',
                          }}
                        >
                          <UserAddOutlined style={{ fontSize: '28px', color: '#fff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px', fontWeight: 500 }}>
                            今日注册
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: 700, color: '#52c41a', lineHeight: 1 }}>
                            {statistics.todayUsers}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(114, 46, 209, 0.1) 0%, rgba(114, 46, 209, 0.05) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 8px 32px 0 rgba(114, 46, 209, 0.15)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 48px 0 rgba(114, 46, 209, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(114, 46, 209, 0.15)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(114, 46, 209, 0.3)',
                            marginRight: '16px',
                          }}
                        >
                          <TeamOutlined style={{ fontSize: '28px', color: '#fff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px', fontWeight: 500 }}>
                            老人数量
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: 700, color: '#722ed1', lineHeight: 1 }}>
                            {statistics.totalElders}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, rgba(255, 77, 79, 0.05) 100%)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '20px',
                        padding: '24px',
                        boxShadow: '0 8px 32px 0 rgba(255, 77, 79, 0.15)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 12px 48px 0 rgba(255, 77, 79, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(255, 77, 79, 0.15)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(255, 77, 79, 0.3)',
                            marginRight: '16px',
                          }}
                        >
                          <WarningOutlined style={{ fontSize: '28px', color: '#fff' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px', fontWeight: 500 }}>
                            高风险人数
                          </div>
                          <div style={{ fontSize: '32px', fontWeight: 700, color: '#ff4d4f', lineHeight: 1 }}>
                            {statistics.healthDistribution?.high || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>

                {/* 图表区域 */}
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  {/* 用户增长趋势 */}
                  <Col span={12}>
                    <Card title="用户增长趋势（近30天）">
                      {statistics.userTrendData && statistics.userTrendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <AreaChart data={statistics.userTrendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString('zh-CN');
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="count"
                              stroke={COLORS.primary}
                              fill={COLORS.primary}
                              fillOpacity={0.6}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                          暂无数据
                        </div>
                      )}
                    </Card>
                  </Col>

                  {/* 健康记录趋势 */}
                  <Col span={12}>
                    <Card title="健康记录趋势（近30天）">
                      {statistics.healthRecordTrend && statistics.healthRecordTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <LineChart data={statistics.healthRecordTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                              }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              labelFormatter={(value) => {
                                const date = new Date(value);
                                return date.toLocaleDateString('zh-CN');
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke={COLORS.success}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                          暂无数据
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>

                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  {/* 健康风险分布 */}
                  <Col span={12}>
                    <Card title="健康风险分布">
                      {healthDistributionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie
                              data={healthDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {healthDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                          暂无数据
                        </div>
                      )}
                    </Card>
                  </Col>

                  {/* 年龄分布 */}
                  <Col span={12}>
                    <Card title="年龄分布">
                      {statistics.ageDistribution && statistics.ageDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={statistics.ageDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill={COLORS.cyan} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                          暂无数据
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>

                {/* 设备状态统计 */}
                {statistics.deviceStats && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Card title="设备状态分布">
                        {deviceStatusData.length > 0 && deviceStatusData.some(d => d.value > 0) ? (
                          <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                              <Pie
                                data={deviceStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {deviceStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                            暂无数据
                          </div>
                        )}
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card title="设备绑定情况">
                        <Row gutter={16}>
                          <Col span={12}>
                            <Statistic
                              title="总设备数"
                              value={statistics.deviceStats.total}
                              valueStyle={{ color: COLORS.primary }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="已绑定"
                              value={statistics.deviceStats.bound}
                              valueStyle={{ color: COLORS.success }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="未绑定"
                              value={statistics.deviceStats.unbound}
                              valueStyle={{ color: COLORS.warning }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="激活设备"
                              value={statistics.deviceStats.active}
                              valueStyle={{ color: COLORS.success }}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <p>暂无数据</p>
              </div>
            )}
          </>
        );
      case 'elders':
        return (
          <>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingElder(null);
                elderForm.resetFields();
                setElderModalVisible(true);
              }}
              style={{ marginBottom: '16px' }}
            >
              添加老人
            </Button>
            <Table
              columns={elderColumns}
              dataSource={elders}
              rowKey="id"
              loading={loading}
              locale={{
                emptyText: elders.length === 0 && !loading ? '暂无数据，请运行数据库种子脚本生成测试数据' : '暂无数据',
              }}
            />
          </>
        );
      case 'users':
        return (
          <>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                userForm.resetFields();
                setUserModalVisible(true);
              }}
              style={{ marginBottom: '16px' }}
            >
              添加用户
            </Button>
            <Table
              columns={[
                { title: '用户名', dataIndex: 'username', key: 'username' },
                {
                  title: '角色',
                  dataIndex: 'role',
                  key: 'role',
                  render: (role: string) => {
                    const roleMap: Record<string, string> = {
                      admin: '管理员',
                      board: '大屏用户',
                      elderCollector: '数据采集员',
                      family: '亲属用户',
                    };
                    return <Tag color="blue">{roleMap[role] || role}</Tag>;
                  },
                },
                { title: '邮箱', dataIndex: 'email', key: 'email', render: (email: string) => email || '-' },
                { title: '手机号', dataIndex: 'phone', key: 'phone', render: (phone: string) => phone || '-' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'enabled' ? 'green' : 'red'}>
                      {status === 'enabled' ? '启用' : '禁用'}
                    </Tag>
                  ),
                },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: any) => (
                    <Space>
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEditUser(record)}
                      >
                        编辑
                      </Button>
                      {record.role !== 'admin' && (
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteUser(record)}
                        >
                          删除
                        </Button>
                      )}
                    </Space>
                  ),
                },
              ]}
              dataSource={allUsers}
              rowKey="id"
              loading={loading}
            />
          </>
        );
      case 'assignments':
        return (
          <>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setAssignmentModalVisible(true);
                assignmentForm.resetFields();
              }}
              style={{ marginBottom: '16px' }}
            >
              分配老人
            </Button>
            <Table
              columns={[
                {
                  title: '采集端用户',
                  key: 'user',
                  render: (_: any, record: any) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{record.user.username}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{record.user.email || '-'}</div>
                    </div>
                  ),
                },
                {
                  title: '老人信息',
                  key: 'elder',
                  render: (_: any, record: any) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{record.elder.name}</div>
                      <div style={{ fontSize: '12px', color: '#999' }}>{record.elder.uuid}</div>
                    </div>
                  ),
                },
                {
                  title: '分配时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (date: string) => new Date(date).toLocaleString('zh-CN'),
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: any) => (
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteAssignment(record.userId, record.elderId)}
                    >
                      取消分配
                    </Button>
                  ),
                },
              ]}
              dataSource={collectorAssignments}
              rowKey={(record) => `${record.userId}-${record.elderId}`}
              loading={loading}
            />
          </>
        );
      case 'devices':
        return (
          <>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingDevice(null);
                deviceForm.resetFields();
                setDeviceModalVisible(true);
              }}
              style={{ marginBottom: '16px' }}
            >
              添加设备
            </Button>
            <Table
              columns={[
                {
                  title: 'SN号',
                  dataIndex: 'sn',
                  key: 'sn',
                  render: (sn: string, record: any) => (
                    <Button
                      type="link"
                      onClick={() => navigate(`/admin/device-logs/${record.id}`)}
                      style={{ padding: 0 }}
                    >
                      {sn}
                    </Button>
                  ),
                },
                {
                  title: '绑定老人',
                  dataIndex: 'elder',
                  key: 'elder',
                  render: (elder: any) => elder?.name || '-',
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'active' ? 'green' : 'red'}>
                      {status === 'active' ? '启用' : '禁用'}
                    </Tag>
                  ),
                },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: any) => (
                    <Space>
                      <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEditDevice(record)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteDevice(record)}
                      >
                        删除
                      </Button>
                    </Space>
                  ),
                },
              ]}
              dataSource={devices}
              rowKey="id"
              loading={loading}
            />
          </>
        );
      case 'dynamicFields':
        return (
          <Table
              columns={[
                { title: '字段名', dataIndex: 'fieldName', key: 'fieldName' },
                { title: '显示名称', dataIndex: 'displayName', key: 'displayName' },
                { title: '单位', dataIndex: 'unit', key: 'unit', render: (unit: string) => unit || '-' },
                { title: '描述', dataIndex: 'description', key: 'description', render: (desc: string) => desc || '-' },
                {
                  title: '状态',
                  dataIndex: 'enabled',
                  key: 'enabled',
                  render: (enabled: boolean) => (
                    <Tag color={enabled ? 'green' : 'red'}>
                      {enabled ? '启用' : '禁用'}
                    </Tag>
                  ),
                },
                {
                  title: '创建时间',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: any) => (
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditingField(record);
                        fieldForm.setFieldsValue({
                          displayName: record.displayName,
                          unit: record.unit || '',
                          description: record.description || '',
                          enabled: record.enabled,
                        });
                        setFieldModalVisible(true);
                      }}
                    >
                      编辑
                    </Button>
                  ),
                },
              ]}
              dataSource={dynamicFields}
              rowKey="fieldName"
              loading={loading}
            />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      backgroundAttachment: 'fixed',
      display: 'flex',
    }}>
      {/* 左侧菜单栏 */}
      <div
        style={{
          width: menuCollapsed ? '80px' : '240px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.4)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 菜单头部 */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1890ff',
              opacity: menuCollapsed ? 0 : 1,
              maxWidth: menuCollapsed ? 0 : '200px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            管理后台
          </div>
          <Button
            type="text"
            icon={menuCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setMenuCollapsed(!menuCollapsed)}
            style={{
              color: '#1890ff',
              fontSize: '18px',
              flexShrink: 0,
            }}
          />
        </div>

        {/* 菜单项 */}
        <div style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
          {menuItems.map((item) => (
            <div
              key={item.key}
              onClick={() => navigate(item.path)}
              style={{
                padding: menuCollapsed ? '16px' : '16px 20px',
                marginBottom: '8px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: activeMenu === item.key
                  ? 'linear-gradient(135deg, rgba(24, 144, 255, 0.15) 0%, rgba(24, 144, 255, 0.1) 100%)'
                  : 'transparent',
                border: activeMenu === item.key ? '1px solid rgba(24, 144, 255, 0.3)' : '1px solid transparent',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: activeMenu === item.key ? '#1890ff' : '#333',
                fontWeight: activeMenu === item.key ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (activeMenu !== item.key) {
                  e.currentTarget.style.background = 'rgba(24, 144, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeMenu !== item.key) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ fontSize: '20px', minWidth: '24px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  opacity: menuCollapsed ? 0 : 1,
                  maxWidth: menuCollapsed ? 0 : '200px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  marginLeft: menuCollapsed ? 0 : '4px',
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* 菜单底部 - 退出登录 */}
        <div style={{ padding: '16px 8px', borderTop: '1px solid rgba(255, 255, 255, 0.3)' }}>
          <div
            onClick={() => { clearAuth(); navigate('/login'); }}
            style={{
              padding: menuCollapsed ? '16px' : '16px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#ff4d4f',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogoutOutlined style={{ fontSize: '20px', minWidth: '24px', display: 'flex', justifyContent: 'center', flexShrink: 0 }} />
            <span
              style={{
                fontSize: '14px',
                opacity: menuCollapsed ? 0 : 1,
                maxWidth: menuCollapsed ? 0 : '200px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginLeft: menuCollapsed ? 0 : '4px',
              }}
            >
              退出登录
            </span>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div
        style={{
          flex: 1,
          marginLeft: menuCollapsed ? '80px' : '240px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '32px',
        }}
      >
        {is404 ? (
          <NotFound />
        ) : (
          <Card
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '20px',
              boxShadow: '0 8px 32px 0 rgba(24, 144, 255, 0.15)',
              minHeight: 'calc(100vh - 64px)',
            }}
          >
            {renderContent()}
          </Card>
        )}
      </div>

      {/* 老人管理模态框 */}
      <Modal
        title={editingElder ? '编辑老人' : '添加老人'}
        open={elderModalVisible}
        onCancel={() => {
          setElderModalVisible(false);
          setEditingElder(null);
          elderForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={elderForm}
          layout="vertical"
          onFinish={editingElder ? handleUpdateElder : handleCreateElder}
        >
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Select showSearch filterOption={(input, option) => {
              const text = typeof option?.children === 'string' 
                ? option.children 
                : String(option?.children || '');
              return text.toLowerCase().includes(input.toLowerCase());
            }}>
              <Select.Option value="M">男</Select.Option>
              <Select.Option value="F">女</Select.Option>
              <Select.Option value="Other">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="idCard"
            label="身份证号"
            rules={[
              {
                validator: (_: any, value: string) => {
                  if (!value) {
                    return Promise.resolve();
                  }
                  const trimmed = value.trim();
                  // 必须是18位
                  if (trimmed.length !== 18) {
                    return Promise.reject(new Error('身份证号必须是18位'));
                  }
                  // 前17位必须是数字
                  const first17 = trimmed.substring(0, 17);
                  if (!/^\d{17}$/.test(first17)) {
                    return Promise.reject(new Error('身份证号前17位必须是数字'));
                  }
                  // 第18位可以是数字或字母X
                  const lastChar = trimmed.substring(17, 18);
                  if (!/^[0-9Xx]$/.test(lastChar)) {
                    return Promise.reject(new Error('身份证号第18位必须是数字或字母X'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="请输入18位身份证号" maxLength={18} />
          </Form.Item>
          <Form.Item
            name="age"
            label="年龄"
            dependencies={['idCard']}
            rules={[
              {
                validator: (_: any, value: number) => {
                  if (!value && !elderForm.getFieldValue('idCard')) {
                    return Promise.resolve();
                  }
                  const idCard = elderForm.getFieldValue('idCard');
                  if (idCard && value) {
                    // 从身份证号计算年龄
                    try {
                      const birthYear = parseInt(idCard.substring(6, 10));
                      const birthMonth = parseInt(idCard.substring(10, 12));
                      const birthDay = parseInt(idCard.substring(12, 14));
                      const today = new Date();
                      let calculatedAge = today.getFullYear() - birthYear;
                      const monthDiff = today.getMonth() - (birthMonth - 1);
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
                        calculatedAge--;
                      }
                      // 允许±1岁误差
                      if (Math.abs(calculatedAge - value) > 1) {
                        return Promise.reject(
                          new Error(`身份证号计算的年龄为${calculatedAge}岁，与输入的年龄不匹配（允许±1岁误差）`)
                        );
                      }
                    } catch (error) {
                      return Promise.reject(new Error('无法从身份证号计算年龄，请检查身份证号是否正确'));
                    }
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input type="number" placeholder="请输入年龄" />
          </Form.Item>
          {editingElder && (
            <Form.Item name="status" label="风险状态">
              <Select showSearch filterOption={(input, option) => {
                const text = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '');
                return text.toLowerCase().includes(input.toLowerCase());
              }}>
                <Select.Option value="low">低风险</Select.Option>
                <Select.Option value="mid">中风险</Select.Option>
                <Select.Option value="high">高风险</Select.Option>
                <Select.Option value="danger">严重风险</Select.Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingElder ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户管理模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={userModalVisible}
        onCancel={() => {
          setUserModalVisible(false);
          setEditingUser(null);
          userForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={editingUser ? handleUpdateUser : handleCreateUser}
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item 
            name="password" 
            label={editingUser ? '新密码（留空不修改）' : '密码'} 
            rules={editingUser ? [] : [{ required: true, min: 6, message: '密码至少6位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select 
              disabled={!!editingUser} 
              showSearch 
              filterOption={(input, option) => {
                const text = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '');
                return text.toLowerCase().includes(input.toLowerCase());
              }}
            >
              <Select.Option value="admin">管理员</Select.Option>
              <Select.Option value="board">大屏用户</Select.Option>
              <Select.Option value="elderCollector">数据采集员</Select.Option>
              <Select.Option value="family">亲属用户</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select showSearch filterOption={(input, option) => {
              const text = typeof option?.children === 'string' 
                ? option.children 
                : String(option?.children || '');
              return text.toLowerCase().includes(input.toLowerCase());
            }}>
              <Select.Option value="enabled">启用</Select.Option>
              <Select.Option value="disabled">禁用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingUser ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 设备管理模态框 */}
      <Modal
        title={editingDevice ? '编辑设备' : '添加设备'}
        open={deviceModalVisible}
        onCancel={() => {
          setDeviceModalVisible(false);
          setEditingDevice(null);
          deviceForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={deviceForm}
          layout="vertical"
          onFinish={editingDevice ? handleUpdateDevice : handleCreateDevice}
        >
          <Form.Item name="sn" label="SN号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="elderId" label="绑定老人">
            <Select 
              allowClear 
              showSearch
              placeholder="选择老人（可选）"
              filterOption={(input, option) => {
                const text = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '');
                return text.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {elders.map((elder) => (
                <Select.Option key={elder.id} value={elder.id}>
                  {elder.name} ({elder.uuid})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select showSearch filterOption={(input, option) => {
              const text = typeof option?.children === 'string' 
                ? option.children 
                : String(option?.children || '');
              return text.toLowerCase().includes(input.toLowerCase());
            }}>
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="inactive">禁用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingDevice ? '更新' : '创建'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 采集端分配模态框 */}
      <Modal
        title="分配老人给采集端"
        open={assignmentModalVisible}
        onCancel={() => {
          setAssignmentModalVisible(false);
          assignmentForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={assignmentForm}
          layout="vertical"
          onFinish={handleCreateAssignment}
        >
          <Form.Item
            name="userId"
            label="采集端用户"
            rules={[{ required: true, message: '请选择采集端用户' }]}
          >
            <Select 
              showSearch
              placeholder="选择采集端用户"
              filterOption={(input, option) => {
                const text = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '');
                return text.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {allUsers
                .filter((u) => u.role === 'elderCollector')
                .map((user) => (
                  <Select.Option key={user.id} value={user.id}>
                    {user.username} {user.email ? `(${user.email})` : ''}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="elderId"
            label="老人"
            rules={[{ required: true, message: '请选择老人' }]}
          >
            <Select 
              showSearch
              placeholder="选择老人"
              filterOption={(input, option) => {
                const text = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '');
                return text.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {elders.map((elder) => (
                <Select.Option key={elder.id} value={elder.id}>
                  {elder.name} ({elder.uuid})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              分配
            </Button>
          </Form.Item>
          </Form>
      </Modal>

      {/* 病史管理模态框 */}
      <Modal
        title={`${selectedElderForHistory?.name || ''} - 病史管理`}
        open={medicalHistoryModalVisible}
        onCancel={() => {
          setMedicalHistoryModalVisible(false);
          setSelectedElderForHistory(null);
          setMedicalHistoryList([]);
          historyForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => historyForm.resetFields()}
          style={{ marginBottom: '16px' }}
        >
          添加病史
        </Button>
        <Form
          form={historyForm}
          layout="vertical"
          onFinish={handleCreateMedicalHistory}
          style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}
        >
          <Form.Item name="diseaseName" label="疾病名称" rules={[{ required: true }]}>
            <Input placeholder="请输入疾病名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="diagnosisDate" label="确诊日期">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="严重程度">
                <Select 
                  showSearch
                  placeholder="请选择"
                  filterOption={(input, option) => {
                    const text = typeof option?.children === 'string' 
                      ? option.children 
                      : String(option?.children || '');
                    return text.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  <Select.Option value="轻度">轻度</Select.Option>
                  <Select.Option value="中度">中度</Select.Option>
                  <Select.Option value="重度">重度</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="currentStatus" label="当前状态">
            <Select 
              showSearch
              placeholder="请选择"
              filterOption={(input, option) => {
                const text = typeof option?.children === 'string' 
                  ? option.children 
                  : String(option?.children || '');
                return text.toLowerCase().includes(input.toLowerCase());
              }}
            >
              <Select.Option value="已治愈">已治愈</Select.Option>
              <Select.Option value="控制良好">控制良好</Select.Option>
              <Select.Option value="需要关注">需要关注</Select.Option>
              <Select.Option value="恶化">恶化</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="medications" label="用药情况">
            <Input.TextArea rows={2} placeholder="请输入用药情况" />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              添加
            </Button>
          </Form.Item>
        </Form>
        <Table
          columns={[
            { title: '疾病名称', dataIndex: 'diseaseName', key: 'diseaseName' },
            { title: '确诊日期', dataIndex: 'diagnosisDate', key: 'diagnosisDate', render: (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-' },
            { title: '严重程度', dataIndex: 'severity', key: 'severity', render: (s: string) => s || '-' },
            { title: '当前状态', dataIndex: 'currentStatus', key: 'currentStatus', render: (s: string) => s || '-' },
            { title: '用药情况', dataIndex: 'medications', key: 'medications', render: (m: string) => m || '-' },
            { title: '备注', dataIndex: 'notes', key: 'notes', render: (n: string) => n || '-' },
            {
              title: '操作',
              key: 'action',
              render: (_: any, record: any) => (
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteMedicalHistory(record.id)}
                >
                  删除
                </Button>
              ),
            },
          ]}
          dataSource={medicalHistoryList}
          rowKey="id"
          pagination={false}
        />
      </Modal>

      {/* AI预测查看模态框 */}
      <Modal
        title={`${selectedElderForPrediction?.name || ''} - AI预测结果`}
        open={aiPredictionModalVisible}
        onCancel={() => {
          setAiPredictionModalVisible(false);
          setSelectedElderForPrediction(null);
          setAiPredictions([]);
        }}
        footer={null}
        width={900}
      >
        {aiPredictions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
            暂无AI预测记录
          </div>
        ) : (
          <div>
            {aiPredictions.map((prediction: any, index: number) => (
              <Card
                key={prediction.id || index}
                title={
                  <Space>
                    <Tag color={prediction.riskLevel === 'critical' ? 'red' : prediction.riskLevel === 'high' ? 'orange' : 'blue'}>
                      {prediction.triggerType === 'daily' ? '每日分析' : '高风险触发'}
                    </Tag>
                    <span>{new Date(prediction.createdAt).toLocaleString('zh-CN')}</span>
                  </Space>
                }
                style={{ marginBottom: '16px' }}
              >
                {(() => {
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
                    <>
                      {/* 健康分析 */}
                      {(healthAnalysis.currentStatus || healthAnalysis.trendAnalysis) ? (
                        <div style={{ marginBottom: '16px' }}>
                          <h4>健康分析</h4>
                          {healthAnalysis.currentStatus && (
                            <div style={{ marginBottom: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                              <div style={{ fontWeight: 600, marginBottom: '8px' }}>当前状况</div>
                              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{healthAnalysis.currentStatus}</div>
                            </div>
                          )}
                          {healthAnalysis.trendAnalysis && (
                            <div style={{ marginBottom: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                              <div style={{ fontWeight: 600, marginBottom: '8px' }}>趋势分析</div>
                              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>{healthAnalysis.trendAnalysis}</div>
                            </div>
                          )}
                          {healthAnalysis.mainIssues && healthAnalysis.mainIssues.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                              <div style={{ fontWeight: 600, marginBottom: '8px' }}>主要问题</div>
                              <Space wrap>
                                {healthAnalysis.mainIssues.map((issue: string, i: number) => (
                                  <Tag key={i} color="orange">{issue}</Tag>
                                ))}
                              </Space>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ marginBottom: '16px' }}>
                          <h4>综合分析</h4>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
                            {prediction.analysis}
                          </div>
                        </div>
                      )}

                      {/* 健康预测 */}
                      {prediction.predictions && Array.isArray(prediction.predictions) && prediction.predictions.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4>健康预测</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {prediction.predictions.map((p: any, i: number) => (
                              <div key={i} style={{ 
                                padding: '12px', 
                                background: '#fffbe6', 
                                borderRadius: '8px',
                                border: '1px solid #ffe58f'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <Tag color="orange">{p.timeRange}</Tag>
                                  {p.probability && (
                                    <span style={{ fontSize: '13px', color: '#666' }}>
                                      概率: <strong style={{ color: '#ff7a45' }}>{(p.probability * 100).toFixed(0)}%</strong>
                                    </span>
                                  )}
                                </div>
                                <div>{Array.isArray(p.possibleIssues) ? p.possibleIssues.join('、') : p.possibleIssues}</div>
                                {p.description && (
                                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{p.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 处置建议 */}
                      {suggestions.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4>处置建议</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {suggestions.map((s: any, i: number) => (
                              <div key={i} style={{ 
                                padding: '10px 12px', 
                                background: '#e6f7ff', 
                                borderRadius: '8px',
                                borderLeft: `3px solid ${urgencyColors[s.urgency] || '#1890ff'}`
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{s.content || s}</span>
                                  <Tag color={urgencyColors[s.urgency] || 'default'} style={{ margin: 0 }}>
                                    {urgencyTexts[s.urgency] || '常规'}
                                  </Tag>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 风险因素 */}
                      {riskFactors.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <h4>风险因素</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {riskFactors.map((r: any, i: number) => (
                              <div key={i} style={{ 
                                padding: '10px 12px', 
                                background: '#fff1f0', 
                                borderRadius: '8px',
                                borderLeft: `3px solid ${severityColors[r.severity] || '#ff4d4f'}`
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{r.factor || r}</span>
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
                        <div>
                          <h4>后续关注</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {nextSteps
                              .sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0))
                              .map((n: any, i: number) => (
                                <div key={i} style={{ 
                                  padding: '10px 12px', 
                                  background: '#f6ffed', 
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
                    </>
                  );
                })()}
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* 动态字段编辑模态框 */}
      <Modal
        title="编辑字段配置"
        open={fieldModalVisible}
        onCancel={() => {
          setFieldModalVisible(false);
          setEditingField(null);
          fieldForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={fieldForm}
          layout="vertical"
          onFinish={handleUpdateField}
        >
          <Form.Item label="字段名">
            <Input value={editingField?.fieldName} disabled />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true }]}>
            <Input placeholder="请输入中文显示名称" />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input placeholder="如：℃、kg、次/分等" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="请输入字段描述" />
          </Form.Item>
          <Form.Item name="enabled" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
