import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Tag,
  Avatar,
  Statistic,
  Row,
  Col,
  Empty,
  Spin,
  message,
  Tabs,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Popconfirm,
  Space,
} from 'antd';
import {
  ArrowLeftOutlined,
  HeartOutlined,
  ExclamationCircleOutlined,
  LineChartOutlined,
  FileTextOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { elderDetailService, type ElderDetail } from '../../services/elderDetailService';
import { medicalHistoryService } from '../../services/medicalHistoryService';
import { useMobile } from '../../hooks/useMobile';
import { useAuthStore } from '../../stores/useAuthStore';
import { getErrorMessage } from '../../utils/errorHandler';
import type { MedicalHistory } from '../../../../shared/types';
import dayjs from 'dayjs';
import './elder-detail.css';

/**
 * 老人详情页面
 * 支持PC端和移动端
 */
export default function ElderDetailPage() {
  const { elderId, source } = useParams<{ elderId: string; source: 'family' | 'collector' }>();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ElderDetail | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [medicalHistories, setMedicalHistories] = useState<MedicalHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [editingHistory, setEditingHistory] = useState<MedicalHistory | null>(null);
  const [historyForm] = Form.useForm();
  const { user } = useAuthStore();
  
  // 判断是否可以编辑（family和collector都可以）
  const canEdit = user?.role === 'family' || user?.role === 'elderCollector' || user?.role === 'admin';

  useEffect(() => {
    if (elderId) {
      loadDetail();
      loadMedicalHistories();
    }
  }, [elderId, source]);
  
  useEffect(() => {
    if (activeTab === 'history' && elderId) {
      loadMedicalHistories();
    }
  }, [activeTab]);

  const loadDetail = async () => {
    if (!elderId) return;
    
    setLoading(true);
    try {
      const data = source === 'collector'
        ? await elderDetailService.getCollectorElderDetail(elderId)
        : await elderDetailService.getFamilyElderDetail(elderId);
      setDetail(data);
    } catch (error: any) {
      message.error(getErrorMessage(error));
      // 如果加载失败，返回上一页
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalHistories = async () => {
    if (!elderId) return;
    
    setHistoryLoading(true);
    try {
      const histories = await medicalHistoryService.getByElderId(elderId);
      setMedicalHistories(histories);
    } catch (error: any) {
      message.error(getErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddHistory = () => {
    setEditingHistory(null);
    historyForm.resetFields();
    setHistoryModalVisible(true);
  };

  const handleEditHistory = (history: MedicalHistory) => {
    setEditingHistory(history);
    historyForm.setFieldsValue({
      diseaseName: history.diseaseName,
      diagnosisDate: history.diagnosisDate ? dayjs(history.diagnosisDate) : undefined,
      severity: history.severity,
      currentStatus: history.currentStatus,
      medications: typeof history.medications === 'string' ? history.medications : JSON.stringify(history.medications || {}),
      notes: history.notes,
    });
    setHistoryModalVisible(true);
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await medicalHistoryService.delete(id);
      message.success('删除成功');
      loadMedicalHistories();
    } catch (error: any) {
      message.error(getErrorMessage(error));
    }
  };

  const handleHistorySubmit = async () => {
    if (!elderId) return;
    
    try {
      const values = await historyForm.validateFields();
      const data = {
        ...values,
        diagnosisDate: values.diagnosisDate ? values.diagnosisDate.format('YYYY-MM-DD') : undefined,
      };
      
      if (editingHistory?.id) {
        await medicalHistoryService.update(editingHistory.id, data);
        message.success('更新成功');
      } else {
        await medicalHistoryService.create({
          elderId,
          ...data,
        });
        message.success('添加成功');
      }
      
      setHistoryModalVisible(false);
      historyForm.resetFields();
      loadMedicalHistories();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
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

  // 准备图表数据
  const prepareChartData = () => {
    if (!detail || !detail.healthRecords.length) return [];

    return detail.healthRecords
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(record => ({
        date: new Date(record.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        fullDate: new Date(record.createdAt).toLocaleDateString('zh-CN'),
        systolic: record.bloodPressureSys,
        diastolic: record.bloodPressureDia,
        heartRate: record.heartRate,
        bloodSugar: record.bloodSugar,
        steps: record.steps,
        sleepHours: record.sleepHours,
      }));
  };

  // 准备风险评分历史数据
  const prepareRiskScoreData = () => {
    if (!detail || !detail.riskReports.length) return [];

    return detail.riskReports
      .sort((a, b) => new Date(a.reportTime).getTime() - new Date(b.reportTime).getTime())
      .map(report => ({
        date: new Date(report.reportTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        fullDate: new Date(report.reportTime).toLocaleDateString('zh-CN'),
        score: report.score * 100,
        overallRisk: report.overallRisk,
        bp: (report.dimensionScores.bp || 0) * 100,
        glucose: (report.dimensionScores.glucose || 0) * 100,
        activity: (report.dimensionScores.activity || 0) * 100,
        sleep: (report.dimensionScores.sleep || 0) * 100,
        symptom: (report.dimensionScores.symptom || 0) * 100,
      }));
  };

  if (loading) {
    return (
      <div className="elder-detail-page">
        <div className="loading-container">
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="elder-detail-page">
        <Empty description="未找到老人信息" />
      </div>
    );
  }

  const chartData = prepareChartData();
  const riskScoreData = prepareRiskScoreData();
  const riskColor = getRiskColor(detail.elder.status);
  const latestReport = detail.riskReports[0];

  return (
    <div className={`elder-detail-page ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* 头部 */}
      <div className="detail-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          className="back-button"
        >
          返回
        </Button>
        <div className="header-info">
          <Avatar
            size={isMobile ? 64 : 80}
            className="elder-avatar"
            style={{
              background: `linear-gradient(135deg, ${riskColor === 'green' ? '#52c41a' : riskColor === 'orange' ? '#faad14' : riskColor === 'red' ? '#ff4d4f' : '#eb2f96'} 0%, ${riskColor === 'green' ? '#389e0d' : riskColor === 'orange' ? '#d48806' : riskColor === 'red' ? '#cf1322' : '#c41d7f'} 100%)`,
            }}
          >
            {detail.elder.name?.[0] || '老'}
          </Avatar>
          <div className="elder-basic-info">
            <h2 className="elder-name">{detail.elder.name}</h2>
            <div className="elder-meta">
              <span>ID: {detail.elder.uuid}</span>
              {detail.elder.age && <span>{detail.elder.age}岁</span>}
              {detail.elder.gender && <span>{detail.elder.gender === 'M' ? '男' : '女'}</span>}
            </div>
            <Tag
              color={riskColor}
              icon={getRiskIcon(detail.elder.status)}
              className="risk-tag"
            >
              {getRiskText(detail.elder.status)}
            </Tag>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      {latestReport && (
        <Row gutter={[16, 16]} className="statistics-row">
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="综合风险评分"
                value={latestReport.score * 100}
                precision={1}
                suffix="%"
                valueStyle={{ color: riskColor === 'green' ? '#52c41a' : riskColor === 'orange' ? '#faad14' : '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="健康记录数"
                value={detail.healthRecords.length}
                suffix="条"
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="风险报告数"
                value={detail.riskReports.length}
                suffix="份"
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card className="stat-card">
              <Statistic
                title="最新报告时间"
                value={new Date(latestReport.reportTime).toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 标签页内容 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="detail-tabs"
        items={[
          {
            key: 'overview',
            label: '健康概览',
            icon: <LineChartOutlined />,
            children: (
              <div className="tab-content">
                {/* 血压趋势图 */}
                {chartData.some(d => d.systolic || d.diastolic) && (
                  <Card title="血压趋势" className="chart-card">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'mmHg', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="systolic"
                          name="收缩压"
                          stroke="#ff4d4f"
                          fill="#ff4d4f"
                          fillOpacity={0.3}
                        />
                        <Area
                          type="monotone"
                          dataKey="diastolic"
                          name="舒张压"
                          stroke="#1890ff"
                          fill="#1890ff"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* 血糖趋势图 */}
                {chartData.some(d => d.bloodSugar) && (
                  <Card title="血糖趋势" className="chart-card">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'mmol/L', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="bloodSugar"
                          name="血糖"
                          stroke="#52c41a"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* 心率趋势图 */}
                {chartData.some(d => d.heartRate) && (
                  <Card title="心率趋势" className="chart-card">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: '次/分', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="heartRate"
                          name="心率"
                          stroke="#faad14"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* 活动量趋势图 */}
                {chartData.some(d => d.steps) && (
                  <Card title="活动量趋势" className="chart-card">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: '步数', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="steps" name="步数" fill="#722ed1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* 睡眠趋势图 */}
                {chartData.some(d => d.sleepHours) && (
                  <Card title="睡眠时长趋势" className="chart-card">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: '小时', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="sleepHours"
                          name="睡眠时长"
                          stroke="#13c2c2"
                          fill="#13c2c2"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'risk',
            label: '风险评分',
            icon: <HeartOutlined />,
            children: (
              <div className="tab-content">
                {/* 风险评分历史趋势 */}
                {riskScoreData.length > 0 && (
                  <Card title="风险评分历史趋势" className="chart-card">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <LineChart data={riskScoreData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: '评分 (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="score"
                          name="综合评分"
                          stroke="#ff4d4f"
                          strokeWidth={3}
                          dot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* 各维度评分对比 */}
                {riskScoreData.length > 0 && (
                  <Card title="各维度评分对比" className="chart-card">
                    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                      <LineChart data={riskScoreData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: '评分 (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="bp"
                          name="血压"
                          stroke="#ff4d4f"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="glucose"
                          name="血糖"
                          stroke="#faad14"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="activity"
                          name="活动"
                          stroke="#1890ff"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="sleep"
                          name="睡眠"
                          stroke="#52c41a"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="symptom"
                          name="症状"
                          stroke="#722ed1"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* 最新风险报告 */}
                {latestReport && (
                  <Card title="最新风险报告" className="report-card">
                    <div className="report-content">
                      <div className="report-score">
                        <Statistic
                          title="综合风险评分"
                          value={latestReport.score * 100}
                          precision={1}
                          suffix="%"
                          valueStyle={{ color: riskColor === 'green' ? '#52c41a' : riskColor === 'orange' ? '#faad14' : '#ff4d4f', fontSize: '32px' }}
                        />
                        <Tag color={riskColor} className="risk-level-tag">
                          {getRiskText(latestReport.overallRisk)}
                        </Tag>
                      </div>
                      {latestReport.explain && (
                        <div className="report-explain">
                          <h4>评分说明</h4>
                          <p>{latestReport.explain}</p>
                        </div>
                      )}
                      {latestReport.recommendations && latestReport.recommendations.length > 0 && (
                        <div className="report-recommendations">
                          <h4>建议措施</h4>
                          <ul>
                            {latestReport.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'history',
            label: '病史管理',
            icon: <FileTextOutlined />,
            children: (
              <div className="tab-content">
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <h3 style={{ margin: 0 }}>病史记录</h3>
                  {canEdit && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddHistory}
                      size={isMobile ? 'middle' : 'large'}
                    >
                      添加病史
                    </Button>
                  )}
                </div>
                
                {historyLoading ? (
                  <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '40px' }} />
                ) : medicalHistories.length === 0 ? (
                  <Empty description="暂无病史记录" />
                ) : (
                  <div className="history-list">
                    {medicalHistories.map((history) => (
                      <Card
                        key={history.id}
                        className="history-card"
                        style={{ marginBottom: 16 }}
                      >
                        <div className="history-header">
                          <div>
                            <h4 style={{ margin: 0, fontSize: isMobile ? 16 : 18 }}>
                              {history.diseaseName}
                            </h4>
                            {history.diagnosisDate && (
                              <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
                                确诊日期：{new Date(history.diagnosisDate).toLocaleDateString('zh-CN')}
                              </div>
                            )}
                          </div>
                          {canEdit && (
                            <Space>
                              <Button
                                type="link"
                                icon={<EditOutlined />}
                                onClick={() => handleEditHistory(history)}
                                size={isMobile ? 'small' : 'middle'}
                              >
                                编辑
                              </Button>
                              {user?.role === 'admin' && (
                                <Popconfirm
                                  title="确定删除吗？"
                                  onConfirm={() => history.id && handleDeleteHistory(history.id)}
                                >
                                  <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                    size={isMobile ? 'small' : 'middle'}
                                  >
                                    删除
                                  </Button>
                                </Popconfirm>
                              )}
                            </Space>
                          )}
                        </div>
                        
                        <div className="history-content" style={{ marginTop: 12 }}>
                          {history.severity && (
                            <div style={{ marginBottom: 8 }}>
                              <Tag color="orange">严重程度：{history.severity}</Tag>
                            </div>
                          )}
                          {history.currentStatus && (
                            <div style={{ marginBottom: 8 }}>
                              <Tag color="blue">当前状态：{history.currentStatus}</Tag>
                            </div>
                          )}
                          {history.medications && (
                            <div style={{ marginBottom: 8 }}>
                              <strong>用药情况：</strong>
                              <span style={{ marginLeft: 8 }}>
                                {typeof history.medications === 'string' 
                                  ? history.medications 
                                  : JSON.stringify(history.medications)}
                              </span>
                            </div>
                          )}
                          {history.notes && (
                            <div>
                              <strong>备注：</strong>
                              <p style={{ marginTop: 4, marginBottom: 0, color: '#666' }}>
                                {history.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* 病史编辑模态框 */}
      <Modal
        title={editingHistory ? '编辑病史' : '添加病史'}
        open={historyModalVisible}
        onOk={handleHistorySubmit}
        onCancel={() => {
          setHistoryModalVisible(false);
          historyForm.resetFields();
        }}
        width={isMobile ? '90%' : 600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={historyForm}
          layout="vertical"
        >
          <Form.Item
            name="diseaseName"
            label="疾病名称"
            rules={[{ required: true, message: '请输入疾病名称' }]}
          >
            <Input placeholder="请输入疾病名称" />
          </Form.Item>
          
          <Form.Item
            name="diagnosisDate"
            label="确诊日期"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item
            name="severity"
            label="严重程度"
          >
            <Select 
              showSearch
              placeholder="请选择严重程度"
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
          
          <Form.Item
            name="currentStatus"
            label="当前状态"
          >
            <Select 
              showSearch
              placeholder="请选择当前状态"
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
          
          <Form.Item
            name="medications"
            label="用药情况"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入用药情况，如：阿司匹林 100mg 每日一次"
            />
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="请输入备注信息"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

