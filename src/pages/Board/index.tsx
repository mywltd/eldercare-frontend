import { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Spin, Alert, Progress, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowUpOutlined, UserOutlined, WarningOutlined, FileTextOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { dashboardService } from '../../services/dashboardService';
import { wsService } from '../../services/ws';
import { useAuthStore } from '../../stores/useAuthStore';
import { getErrorMessage } from '../../utils/errorHandler';
import type { WebSocketMessage } from '../../../../shared/types';

interface OverviewData {
  summary: {
    totalElders: number;
    highRiskCount: number;
    todayRecords: number;
    normalCount: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  trendData: Array<{
    date: string;
    avgSystolic: number;
    avgDiastolic: number;
    avgGlucose: number;
    totalSteps: number;
    recordCount: number;
  }>;
  dimensionStats: {
    bp: { avg: number; max: number; min: number };
    glucose: { avg: number; max: number; min: number };
    activity: { avg: number; max: number; min: number };
    sleep: { avg: number; max: number; min: number };
    symptom: { avg: number; max: number; min: number };
  };
  elders: Array<{
    id: string;
    name: string;
    latestRisk: string;
    latestScore: number;
    recordCount: number;
  }>;
}

interface RealTimeRecord {
  id: string;
  elderId: string;
  elderName: string;
  recordDate: string;
  systolic?: number;
  diastolic?: number;
  bloodGlucose?: number;
  steps?: number;
  sleepHours?: number;
  riskScore?: number;
  riskLevel?: string;
  timestamp: number;
}

const STORAGE_KEY = 'health_board_realtime_records';
const MAX_RECORDS = 100; // 增加缓存记录数

// 从 localStorage 加载缓存数据
const loadCachedRecords = (): RealTimeRecord[] => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const records = JSON.parse(cached) as RealTimeRecord[];
      // 只保留最近7天的记录
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return records.filter((r) => r.timestamp > sevenDaysAgo);
    }
  } catch (error) {
    console.error('Failed to load cached records:', error);
  }
  return [];
};

// 保存数据到 localStorage
const saveCachedRecords = (records: RealTimeRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save cached records:', error);
  }
};

export default function Board() {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [realTimeRecords, setRealTimeRecords] = useState<RealTimeRecord[]>(() => {
    // 初始化时从缓存加载
    return loadCachedRecords();
  });
  const [highRiskModalVisible, setHighRiskModalVisible] = useState(false);
  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
  const highRiskCardRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadOverviewData();
    // 每30秒静默刷新一次数据（不显示加载状态）
    const interval = setInterval(() => {
      loadOverviewData(false); // 静默刷新
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<any>(null);

  // WebSocket 连接，接收实时记录和预警
  useEffect(() => {
    if (user?.id) {
      // 大屏端使用 board WebSocket 频道
      wsService.connect(user.id, (message: WebSocketMessage) => {
        // 忽略心跳消息
        if (message.type === 'heartbeat') {
          return;
        }
        if (message.type === 'new_record' && message.record) {
          const record: RealTimeRecord = {
            id: `${message.record.elderId}-${Date.now()}`,
            elderId: message.record.elderId,
            elderName: message.record.elderName || `老人 ${message.record.elderId}`,
            recordDate: message.record.recordDate,
            systolic: message.record.systolic,
            diastolic: message.record.diastolic,
            bloodGlucose: message.record.bloodGlucose,
            steps: message.record.steps,
            sleepHours: message.record.sleepHours,
            riskScore: message.record.riskScore,
            riskLevel: message.record.riskLevel,
            timestamp: Date.now(),
          };
          setRealTimeRecords((prev) => {
            const newRecords = [record, ...prev];
            // 只保留最近MAX_RECORDS条记录
            const limitedRecords = newRecords.slice(0, MAX_RECORDS);
            // 保存到缓存
            saveCachedRecords(limitedRecords);
            return limitedRecords;
          });

          // 如果是高风险，显示全局弹窗
          if (message.record.riskLevel === 'high' || message.record.riskLevel === 'critical') {
            setCurrentAlert({
              elderName: message.record.elderName || `老人 ${message.record.elderId}`,
              elderId: message.record.elderId,
              riskLevel: message.record.riskLevel,
              riskScore: message.record.riskScore,
              systolic: message.record.systolic,
              diastolic: message.record.diastolic,
              heartRate: undefined,
              bloodGlucose: message.record.bloodGlucose,
              sleepHours: message.record.sleepHours,
              steps: message.record.steps,
            });
            setAlertModalVisible(true);
          }
        } else if (message.type === 'risk_alert') {
          // 处理风险预警消息
          setCurrentAlert({
            elderName: message.elderName || `老人 ${message.elderId}`,
            elderId: message.elderId,
            riskLevel: message.level,
            message: message.message,
          });
          setAlertModalVisible(true);
        }
      }, 'board'); // 使用 board WebSocket 频道
    }

    return () => {
      wsService.disconnect();
    };
  }, [user?.id]);

  const loadOverviewData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const overviewData = await dashboardService.getOverview();
      setOverviewData(overviewData);
    } catch (error: any) {
      console.error('Failed to load overview data:', error);
      if (showLoading) {
        message.error(getErrorMessage(error));
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // 清空实时信息流缓存
  const handleClearCache = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空实时信息流的缓存数据吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        localStorage.removeItem(STORAGE_KEY);
        setRealTimeRecords([]);
      },
    });
  };

  // 获取高风险人员列表
  const getHighRiskElders = () => {
    if (!overviewData) return [];
    return overviewData.elders.filter(
      (elder) => elder.latestRisk === 'high' || elder.latestRisk === 'critical'
    );
  };

  // 处理弹窗关闭
  const handleCloseModal = () => {
    setHighRiskModalVisible(false);
  };

  // 计算弹窗动画样式
  const getModalAnimationStyle = () => {
    if (!highRiskModalVisible) {
      // 关闭时不返回样式，让 Modal 使用默认的关闭动画
      return {};
    }
    
    // 打开动画：从点击位置放大到中心
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const offsetX = clickPosition.x - centerX;
    const offsetY = clickPosition.y - centerY;
    
    // 设置 CSS 变量供动画使用
    if (typeof document !== 'undefined') {
      const style = document.documentElement.style;
      style.setProperty('--modal-start-x', `${offsetX}px`);
      style.setProperty('--modal-start-y', `${offsetY}px`);
    }
    
    return {
      transform: `translate(calc(-50% + var(--modal-start-x, 0px)), calc(-50% + var(--modal-start-y, 0px))) scale(0.1)`,
      opacity: 0,
      animation: 'modalOpen 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
    };
  };

  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'green';
      case 'medium':
        return 'orange';
      case 'high':
        return 'red';
      case 'critical':
        return 'magenta';
      default:
        return 'default';
    }
  };

  const getRiskText = (risk: string) => {
    const map: Record<string, string> = {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      critical: '严重',
    };
    return map[risk] || '未知';
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <Alert message="暂无数据" type="info" />
      </div>
    );
  }

  // 准备风险分布数据（用于人性化展示）
  const totalElders = overviewData.summary.totalElders;
  const riskDistributionData = [
    { 
      name: '低风险', 
      value: overviewData.riskDistribution.low, 
      color: '#52c41a',
      icon: '✓',
      description: '健康状况良好',
    },
    { 
      name: '中风险', 
      value: overviewData.riskDistribution.medium, 
      color: '#faad14',
      icon: '⚠',
      description: '需要关注',
    },
    { 
      name: '高风险', 
      value: overviewData.riskDistribution.high, 
      color: '#ff4d4f',
      icon: '⚠️',
      description: '需要密切监测',
    },
    { 
      name: '严重风险', 
      value: overviewData.riskDistribution.critical, 
      color: '#eb2f96',
      icon: '🚨',
      description: '需要立即处理',
    },
  ].filter((item) => item.value > 0);

  // 格式化实时记录信息
  const formatRecordInfo = (record: RealTimeRecord): string => {
    const parts: string[] = [];
    const date = new Date(record.recordDate);
    parts.push(`[${date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}]`);
    parts.push(`${record.elderName}`);
    
    if (record.systolic && record.diastolic) {
      parts.push(`血压: ${record.systolic}/${record.diastolic}mmHg`);
    }
    if (record.bloodGlucose) {
      parts.push(`血糖: ${record.bloodGlucose}mmol/L`);
    }
    if (record.steps) {
      parts.push(`步数: ${record.steps}`);
    }
    if (record.sleepHours) {
      parts.push(`睡眠: ${record.sleepHours}小时`);
    }
    if (record.riskScore !== undefined) {
      const riskText = record.riskLevel === 'critical' ? '严重' : 
                      record.riskLevel === 'high' ? '高风险' :
                      record.riskLevel === 'medium' ? '中风险' : '低风险';
      parts.push(`风险: ${riskText}(${(record.riskScore * 100).toFixed(1)}%)`);
    }
    
    return parts.join(' | ');
  };

  // 风险等级排序权重
  const getRiskOrder = (risk: string): number => {
    const orderMap: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return orderMap[risk] || 0;
  };

  // 表格列定义
  const columns = [
    {
      title: <span style={{ fontSize: '12px' }}>姓名</span>,
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text: string) => <span style={{ fontSize: '12px' }}>{text}</span>,
    },
    {
      title: <span style={{ fontSize: '12px' }}>风险等级</span>,
      dataIndex: 'latestRisk',
      key: 'latestRisk',
      width: 100,
      render: (risk: string) => (
        <Tag color={getRiskColor(risk)} style={{ fontSize: '11px', padding: '2px 8px' }}>
          {getRiskText(risk)}
        </Tag>
      ),
      sorter: (a: any, b: any) => getRiskOrder(b.latestRisk) - getRiskOrder(a.latestRisk),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: <span style={{ fontSize: '12px' }}>风险评分</span>,
      dataIndex: 'latestScore',
      key: 'latestScore',
      width: 100,
      render: (score: number) => <span style={{ fontSize: '12px' }}>{`${(score * 100).toFixed(1)}%`}</span>,
      sorter: (a: any, b: any) => b.latestScore - a.latestScore,
    },
    {
      title: <span style={{ fontSize: '12px' }}>记录数</span>,
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 80,
      render: (count: number) => <span style={{ fontSize: '12px' }}>{count}</span>,
      sorter: (a: any, b: any) => b.recordCount - a.recordCount,
    },
  ];

  return (
    <div style={{ 
      padding: '12px', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    }}>
      <style>{`
        @keyframes modalOpen {
          0% {
            transform: translate(calc(-50% + var(--modal-start-x, 0px)), calc(-50% + var(--modal-start-y, 0px))) scale(0.1);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        .high-risk-modal-wrapper .ant-modal {
          top: 50% !important;
          left: 50% !important;
          margin: 0 !important;
          padding: 0 !important;
          transform-origin: center center;
        }
        /* 确保关闭时位置不变，防止漂移 */
        .high-risk-modal-wrapper .ant-modal.ant-zoom-leave,
        .high-risk-modal-wrapper .ant-modal.ant-zoom-leave-active {
          transform: translate(-50%, -50%) !important;
        }
        .high-risk-modal-wrapper .ant-modal-content {
          margin: 0 !important;
        }
        /* 风险预警弹窗居中动画 */
        @keyframes alertModalOpen {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        /* 强制居中样式 - 针对 Ant Design 6.x */
        .alert-modal-wrapper {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .alert-modal-wrapper .ant-modal-wrap {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
        }
        .alert-modal-wrapper .ant-modal {
          position: relative !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          margin: 0 auto !important;
          padding-bottom: 0 !important;
          transform: none !important;
          transform-origin: center center !important;
        }
        .alert-modal-wrapper .ant-modal.ant-zoom-enter {
          transform: scale(0.3) !important;
          opacity: 0 !important;
        }
        .alert-modal-wrapper .ant-modal.ant-zoom-enter-active {
          animation: alertModalOpen 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
        }
        .alert-modal-wrapper .ant-modal-content {
          margin: 0 !important;
        }
      `}</style>
      {/* 顶部导航栏 */}
      <div 
        className="glass-effect"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>数据总览</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>欢迎，{user?.username}</span>
          <Button 
            onClick={handleLogout}
            size="small"
            style={{
              borderRadius: '8px',
              fontWeight: '500',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            退出
          </Button>
        </div>
      </div>

      {/* KPI 指标卡片 */}
      <Row gutter={[8, 8]} style={{ marginBottom: '12px' }} justify="center">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="macos-card"
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
              height: '100%',
            }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px' }}>总人数</span>}
              value={overviewData.summary.totalElders}
              prefix={<UserOutlined style={{ fontSize: '18px' }} />}
              valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: '600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div ref={highRiskCardRef}>
            <Card
              className="macos-card"
              bodyStyle={{ padding: '16px', textAlign: 'center', cursor: 'pointer' }}
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
                height: '100%',
                transition: 'all 0.3s ease',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                setClickPosition({ x, y });
                setHighRiskModalVisible(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(255, 77, 79, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px 0 rgba(31, 38, 135, 0.25)';
              }}
            >
              <Statistic
                title={<span style={{ fontSize: '13px' }}>高风险</span>}
                value={overviewData.summary.highRiskCount}
                prefix={<WarningOutlined style={{ fontSize: '18px' }} />}
                valueStyle={{ color: '#ff4d4f', fontSize: '24px', fontWeight: '600' }}
              />
            </Card>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="macos-card"
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
              height: '100%',
            }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px' }}>正常</span>}
              value={overviewData.summary.normalCount}
              prefix={<ArrowUpOutlined style={{ fontSize: '18px' }} />}
              valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: '600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="macos-card"
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
              height: '100%',
            }}
          >
            <Statistic
              title={<span style={{ fontSize: '13px' }}>今日记录</span>}
              value={overviewData.summary.todayRecords}
              prefix={<FileTextOutlined style={{ fontSize: '18px' }} />}
              valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: '600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[8, 8]} style={{ marginBottom: '12px' }}>
        {/* 风险分布 - 人性化展示 */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="macos-card"
            title={<span style={{ fontSize: '14px', fontWeight: '600' }}>风险分布</span>}
            bodyStyle={{ padding: '12px' }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
              height: '100%',
            }}
          >
            <div style={{ padding: '4px 0' }}>
              {riskDistributionData.map((item, index) => {
                const percentage = totalElders > 0 ? (item.value / totalElders) * 100 : 0;
                return (
                  <div
                    key={index}
                    style={{
                      marginBottom: '10px',
                      padding: '10px',
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '8px',
                      border: `1px solid ${item.color}30`,
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateX(2px)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.boxShadow = `0 2px 8px ${item.color}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                        <span style={{ fontSize: '14px' }}>{item.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '8px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: item.color }}>
                          {item.value}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress
                      percent={percentage}
                      strokeColor={{
                        '0%': item.color,
                        '100%': item.color,
                      }}
                      showInfo={false}
                      strokeWidth={6}
                      style={{
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                );
              })}
              {riskDistributionData.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#999', 
                  padding: '20px 0',
                  fontSize: '12px',
                }}>
                  暂无数据
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 实时信息滚动展示 */}
        <Col xs={24} sm={12} lg={18}>
          <Card
            className="macos-card"
            title={<span style={{ fontSize: '14px', fontWeight: '600' }}>实时信息流</span>}
            extra={
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleClearCache}
                style={{
                  fontSize: '12px',
                  color: '#666',
                  padding: '4px 8px',
                }}
              >
                清空
              </Button>
            }
            bodyStyle={{ padding: '12px' }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
              height: '100%',
            }}
          >
            <div
              ref={scrollContainerRef}
              style={{
                height: '420px',
                overflow: 'hidden',
                position: 'relative',
                background: 'rgba(0, 0, 0, 0.02)',
                borderRadius: '8px',
                padding: '8px',
              }}
            >
              {realTimeRecords.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#999', 
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}>
                  等待实时数据...
                </div>
              ) : (
                <div
                  className="realtime-scroll-container"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    height: '100%',
                    animation: realTimeRecords.length > 5 ? 'scrollUp 30s linear infinite' : 'none',
                  }}
                >
                  {realTimeRecords.map((record) => (
                    <div
                      key={record.id}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '8px',
                        border: `1px solid ${getRiskColor(record.riskLevel || 'low')}40`,
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: '#333',
                        transition: 'all 0.3s ease',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(2px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
                        e.currentTarget.style.whiteSpace = 'normal';
                        e.currentTarget.style.zIndex = '10';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.08)';
                        e.currentTarget.style.whiteSpace = 'nowrap';
                        e.currentTarget.style.zIndex = '1';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: getRiskColor(record.riskLevel || 'low'),
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${getRiskColor(record.riskLevel || 'low')}60`,
                          }}
                        />
                        <span style={{ fontWeight: '500', color: '#333', fontSize: '12px' }}>
                          {formatRecordInfo(record)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* 重复显示以实现无缝滚动，确保铺满整个区域 */}
                  {realTimeRecords.length > 5 && realTimeRecords.map((record) => (
                    <div
                      key={`${record.id}-dup`}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '8px',
                        border: `1px solid ${getRiskColor(record.riskLevel || 'low')}40`,
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: '#333',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: getRiskColor(record.riskLevel || 'low'),
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${getRiskColor(record.riskLevel || 'low')}60`,
                          }}
                        />
                        <span style={{ fontWeight: '500', color: '#333', fontSize: '12px' }}>
                          {formatRecordInfo(record)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <style>{`
                @keyframes scrollUp {
                  0% {
                    transform: translateY(0);
                  }
                  100% {
                    transform: translateY(-50%);
                  }
                }
                .realtime-scroll-container:hover {
                  animation-play-state: paused;
                }
              `}</style>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 趋势图表 */}
      <Row gutter={[8, 8]} style={{ marginBottom: '12px' }}>
        {/* 健康指标趋势 */}
        <Col xs={24} sm={12} lg={12}>
          <Card
            className="macos-card"
            title={<span style={{ fontSize: '14px', fontWeight: '600' }}>健康指标趋势（30天）</span>}
            bodyStyle={{ padding: '12px' }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
            }}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={overviewData.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgSystolic"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="平均收缩压"
                  fillOpacity={0.6}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgDiastolic"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="平均舒张压"
                  fillOpacity={0.6}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgGlucose"
                  stroke="#ffc658"
                  name="平均血糖"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 活动量趋势 */}
        <Col xs={24} sm={12} lg={12}>
          <Card
            className="macos-card"
            title={<span style={{ fontSize: '14px', fontWeight: '600' }}>活动量趋势（30天）</span>}
            bodyStyle={{ padding: '12px' }}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
            }}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={overviewData.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="totalSteps"
                  stroke="#ff7300"
                  name="总步数"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="recordCount"
                  stroke="#8884d8"
                  name="记录数"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 数据表格 */}
      <Card
        className="macos-card"
        title={<span style={{ fontSize: '14px', fontWeight: '600' }}>老人数据列表</span>}
        bodyStyle={{ padding: '12px' }}
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
        }}
      >
        <Table
          columns={columns}
          dataSource={overviewData.elders}
          rowKey="id"
          pagination={{ pageSize: 8, size: 'small' }}
          size="small"
          scroll={{ y: 300 }}
        />
      </Card>

      {/* 高风险人员弹窗 */}
      <Modal
        open={highRiskModalVisible}
        onCancel={handleCloseModal}
        afterClose={() => {
          // Modal 完全关闭后的回调，可以在这里清理状态
        }}
        footer={null}
        width={800}
        maskStyle={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        style={{
          top: '50%',
          left: '50%',
          margin: 0,
          padding: 0,
          maxWidth: '90vw',
          maxHeight: '90vh',
          ...(highRiskModalVisible ? getModalAnimationStyle() : {}),
        }}
        wrapClassName="high-risk-modal-wrapper"
        styles={{
          body: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '20px',
            padding: 0,
            overflow: 'hidden',
          },
        }}
        closeIcon={
          <CloseOutlined
            style={{
              color: '#666',
              fontSize: '16px',
              padding: '8px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.05)',
            }}
          />
        }
      >
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: '#ff4d4f' }}>
            <WarningOutlined style={{ marginRight: '8px' }} />
            高风险人员列表
          </h2>
          {getHighRiskElders().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无高风险人员
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {getHighRiskElders().map((elder, index) => (
                <Card
                  key={elder.id}
                  style={{
                    marginBottom: '12px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    border: `2px solid ${getRiskColor(elder.latestRisk)}40`,
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${getRiskColor(elder.latestRisk)}20, ${getRiskColor(elder.latestRisk)}40)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: '600',
                            color: getRiskColor(elder.latestRisk),
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            {elder.name}
                          </div>
                          <Tag color={getRiskColor(elder.latestRisk)} style={{ fontSize: '12px' }}>
                            {getRiskText(elder.latestRisk)}
                          </Tag>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: '12px', color: '#999', marginRight: '8px' }}>风险评分:</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: getRiskColor(elder.latestRisk) }}>
                            {(elder.latestScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: '#999', marginRight: '8px' }}>记录数:</span>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>
                            {elder.recordCount} 条
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* 全局风险预警弹窗 */}
      <Modal
        open={alertModalVisible}
        onCancel={() => setAlertModalVisible(false)}
        footer={null}
        closable={true}
        maskClosable={true}
        width={600}
        centered={true}
        wrapClassName="alert-modal-wrapper"
        styles={{
          wrapper: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          body: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderRadius: '20px',
            padding: '24px',
          },
        }}
      >
        {currentAlert && (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid #ff4d4f',
            }}>
              <WarningOutlined style={{ fontSize: '32px', color: '#ff4d4f', marginRight: '12px' }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#ff4d4f', marginBottom: '8px' }}>
                  健康风险预警
                </h2>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 700,
                  color: '#333',
                  marginTop: '4px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, rgba(255, 77, 79, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '2px solid rgba(255, 77, 79, 0.2)',
                  display: 'inline-block',
                  letterSpacing: '1px',
                }}>
                  👤 {currentAlert.elderName}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Tag 
                color={currentAlert.riskLevel === 'critical' ? 'magenta' : 'red'} 
                style={{ fontSize: '16px', padding: '8px 16px', marginBottom: '16px' }}
              >
                {currentAlert.riskLevel === 'critical' ? '严重风险' : '高风险'}
              </Tag>
              {currentAlert.riskScore && (
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#ff4d4f', marginTop: '8px' }}>
                  风险评分: {(currentAlert.riskScore * 100).toFixed(1)}%
                </div>
              )}
            </div>

            <div style={{ 
              background: 'rgba(255, 77, 79, 0.1)', 
              borderRadius: '12px', 
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>
                健康指标
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {currentAlert.systolic && currentAlert.diastolic && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>血压</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: (currentAlert.systolic > 140 || currentAlert.diastolic > 90) ? '#ff4d4f' : '#52c41a',
                    }}>
                      {currentAlert.systolic}/{currentAlert.diastolic} mmHg
                      {(currentAlert.systolic > 140 || currentAlert.diastolic > 90) && (
                        <span style={{ marginLeft: '8px', fontSize: '14px' }}>⚠️</span>
                      )}
                    </div>
                  </div>
                )}
                {currentAlert.bloodGlucose !== undefined && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>血糖</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: (currentAlert.bloodGlucose > 7.0 || currentAlert.bloodGlucose < 3.9) ? '#ff4d4f' : '#52c41a',
                    }}>
                      {currentAlert.bloodGlucose.toFixed(1)} mmol/L
                      {(currentAlert.bloodGlucose > 7.0 || currentAlert.bloodGlucose < 3.9) && (
                        <span style={{ marginLeft: '8px', fontSize: '14px' }}>⚠️</span>
                      )}
                    </div>
                  </div>
                )}
                {currentAlert.sleepHours !== undefined && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>睡眠</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: currentAlert.sleepHours < 6 ? '#ff4d4f' : '#52c41a',
                    }}>
                      {currentAlert.sleepHours.toFixed(1)} 小时
                      {currentAlert.sleepHours < 6 && (
                        <span style={{ marginLeft: '8px', fontSize: '14px' }}>⚠️</span>
                      )}
                    </div>
                  </div>
                )}
                {currentAlert.steps !== undefined && (
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>步数</div>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: currentAlert.steps < 3000 ? '#ff4d4f' : '#52c41a',
                    }}>
                      {currentAlert.steps} 步
                      {currentAlert.steps < 3000 && (
                        <span style={{ marginLeft: '8px', fontSize: '14px' }}>⚠️</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {currentAlert.message && (
              <div style={{ 
                background: 'rgba(255, 193, 7, 0.1)', 
                borderRadius: '12px', 
                padding: '12px',
                marginTop: '12px',
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {currentAlert.message}
                </div>
              </div>
            )}

            <Button
              type="primary"
              block
              onClick={() => setAlertModalVisible(false)}
              style={{ 
                marginTop: '20px',
                height: '48px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              我知道了
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

