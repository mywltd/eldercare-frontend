import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Alert, Spin, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import { wsService } from '../../services/ws';
import { useAuthStore } from '../../stores/useAuthStore';
import { getErrorMessage } from '../../utils/errorHandler';
import type { CaregiverDashboard, WebSocketMessage } from '../../../../shared/types';

export default function CaregiverDashboard() {
  const [dashboard, setDashboard] = useState<CaregiverDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<WebSocketMessage[]>([]);
  const [expandedElders, setExpandedElders] = useState<Set<string>>(new Set());
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
      // 连接 WebSocket，使用登录用户的 ID
      wsService.connect(user.id, (message) => {
        if (message.type === 'risk_alert') {
          setAlerts((prev) => [message, ...prev.slice(0, 9)]);
        }
      });
    }

    return () => {
      wsService.disconnect();
    };
  }, [user?.id]);

  const loadDashboard = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const dashboardData = await dashboardService.getCaregiverDashboard(user.id);
      setDashboard(dashboardData);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboard || dashboard.elders.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert title="暂无数据" type="info" />
      </div>
    );
  }

  const getRiskColor = (risk?: string) => {
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

  const getRiskText = (risk?: string) => {
    const map: Record<string, string> = {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      critical: '严重',
    };
    return map[risk || ''] || '未知';
  };

  /**
   * 切换老人卡片的展开状态
   */
  const toggleElderExpanded = (elderId: string) => {
    setExpandedElders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(elderId)) {
        newSet.delete(elderId);
      } else {
        newSet.add(elderId);
      }
      return newSet;
    });
  };

  /**
   * 为指定老人准备图表数据
   */
  const getChartDataForElder = (elder: CaregiverDashboard['elders'][0]) => {
    return elder.recentRecords.map((record) => ({
      date: new Date(record.recordDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      systolic: record.systolic || 0,
      diastolic: record.diastolic || 0,
      glucose: record.bloodGlucose || 0,
      steps: record.steps || 0,
    }));
  };

  return (
    <div style={{ 
      padding: '24px', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    }}>
      {/* 顶部导航栏 */}
      <div 
        className="glass-effect"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          padding: '20px 28px',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>看护人仪表盘</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '16px', fontWeight: '500' }}>欢迎，{user?.username}</span>
          <Button 
            onClick={handleLogout}
            style={{
              borderRadius: '12px',
              fontWeight: '500',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            退出登录
          </Button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {alerts.map((alert, idx) => (
            <Alert
              key={idx}
              message={alert.message}
              description={alert.elderId ? `老人 ID: ${alert.elderId}` : undefined}
              type={alert.level === 'critical' ? 'error' : 'warning'}
              closable
              style={{ 
                marginBottom: '12px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              }}
            />
          ))}
        </div>
      )}

      <Row gutter={[16, 16]}>
        {dashboard.elders.map((elder) => {
          const isExpanded = expandedElders.has(elder.id);
          const chartData = getChartDataForElder(elder);
          const hasChartData = chartData.length > 0;

          return (
            <Col xs={24} sm={12} lg={8} key={elder.id}>
              <Card
                className="macos-card"
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600' }}>老人 {elder.id}</span>
                    {elder.latestReport && (
                      <Tag 
                        color={getRiskColor(elder.latestReport.overallRisk)}
                        style={{
                          borderRadius: '8px',
                          fontWeight: '500',
                          padding: '2px 12px',
                        }}
                      >
                        {getRiskText(elder.latestReport.overallRisk)}
                      </Tag>
                    )}
                  </div>
                }
                extra={
                  hasChartData && (
                    <Button
                      type="text"
                      size="small"
                      onClick={() => toggleElderExpanded(elder.id)}
                      style={{ 
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontWeight: '500',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(24, 144, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {isExpanded ? '收起图表' : '查看趋势'}
                    </Button>
                  )
                }
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '24px',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 48px 0 rgba(31, 38, 135, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
                }}
              >
                {elder.latestReport ? (
                  <div>
                    <p>
                      <strong>风险评分:</strong> {(elder.latestReport.score * 100).toFixed(1)}%
                    </p>
                    <p>
                      <strong>血压:</strong> {(elder.latestReport.dimensionScores.bp * 100).toFixed(1)}%
                    </p>
                    <p>
                      <strong>血糖:</strong> {(elder.latestReport.dimensionScores.glucose * 100).toFixed(1)}%
                    </p>
                    <p>
                      <strong>活动:</strong> {(elder.latestReport.dimensionScores.activity * 100).toFixed(1)}%
                    </p>
                    <p>
                      <strong>睡眠:</strong> {(elder.latestReport.dimensionScores.sleep * 100).toFixed(1)}%
                    </p>
                    <p>
                      <strong>症状:</strong> {(elder.latestReport.dimensionScores.symptom * 100).toFixed(1)}%
                    </p>
                    {elder.latestReport.recommendations.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <strong>建议:</strong>
                        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                          {elder.latestReport.recommendations.map((rec, idx) => (
                            <li key={idx} style={{ fontSize: '12px' }}>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>暂无风险报告</p>
                )}

                {/* 健康趋势图 - 展开时显示 */}
                {isExpanded && hasChartData && (
                  <div style={{ 
                    marginTop: '24px', 
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)', 
                    paddingTop: '20px',
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '20px',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
                      健康趋势图
                    </h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="systolic"
                          stroke="#8884d8"
                          name="收缩压"
                          dot={{ r: 3 }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="diastolic"
                          stroke="#82ca9d"
                          name="舒张压"
                          dot={{ r: 3 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="glucose"
                          stroke="#ffc658"
                          name="血糖"
                          dot={{ r: 3 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="steps"
                          stroke="#ff7300"
                          name="步数"
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 如果没有数据，提示用户 */}
                {isExpanded && !hasChartData && (
                  <div style={{ marginTop: '24px', textAlign: 'center', color: '#999', padding: '20px' }}>
                    暂无健康记录数据
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

