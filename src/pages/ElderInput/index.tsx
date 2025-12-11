import { useState, useEffect } from 'react';
import {
  Form,
  InputNumber,
  DatePicker,
  Button,
  Checkbox,
  Space,
  Typography,
  Card,
  message,
  Row,
  Col,
  Tag,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { elderService } from '../../services/elderService';
import { useAuthStore } from '../../stores/useAuthStore';
import { getErrorMessage } from '../../utils/errorHandler';
import type {
  CreateRecordRequest,
  RiskReport,
  RiskLevel,
} from '../../types';

const { Title, Text } = Typography;

/**
 * 老人端健康数据录入页面
 * - 大字号设计，适合老年人使用
 * - 单列布局，触控友好
 * - 响应式设计，支持小屏设备
 */
export default function ElderInputPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [elderId, setElderId] = useState<string>('');
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);

  // 获取当前登录用户的老人ID
  useEffect(() => {
    if (user?.id) {
      elderService
        .getElderIdByUserId(user.id)
        .then((elderId) => {
          setElderId(elderId);
        })
        .catch(() => {
          // 如果获取失败，使用默认值
          setElderId('1');
        });
    }
  }, [user?.id]);

  /**
   * 获取风险等级颜色
   */
  const getRiskColor = (risk: RiskLevel): string => {
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

  /**
   * 获取风险等级文本
   */
  const getRiskText = (risk: RiskLevel): string => {
    const map: Record<RiskLevel, string> = {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      critical: '严重风险',
    };
    return map[risk] || '未知';
  };

  /**
   * 处理退出登录
   */
  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  /**
   * 处理表单提交
   */
  const handleSubmit = async (values: any) => {
    setLoading(true);
    setRiskReport(null);

    try {
      const recordData: CreateRecordRequest = {
        recordDate: dayjs(values.recordDate).toISOString(),
        systolic: values.systolic,
        diastolic: values.diastolic,
        bloodGlucose: values.bloodGlucose,
        steps: values.steps,
        sleepHours: values.sleepHours,
        symptoms: values.symptoms && values.symptoms.length > 0
          ? {
              dizzy: values.symptoms.includes('dizzy'),
              chest_pain: values.symptoms.includes('chest_pain'),
              shortness_of_breath: values.symptoms.includes('shortness_of_breath'),
              fatigue: values.symptoms.includes('fatigue'),
            }
          : undefined,
      };

      const result = await elderService.createRecord(elderId, recordData);

      message.success('健康记录提交成功！');

      // 清空表单
      form.resetFields();
      form.setFieldsValue({
        recordDate: dayjs(),
      });

      // 如果有风险报告，显示它
      if (result.riskReport) {
        setRiskReport(result.riskReport);
      }
    } catch (error: any) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '900px',
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        position: 'relative',
      }}
    >
      {/* 顶部导航栏 */}
      <div
        className="elder-header glass-effect"
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
        <div>
          <Text strong style={{ fontSize: '20px' }}>
            欢迎，{user?.username || '用户'}
          </Text>
        </div>
        <Button
          type="default"
          onClick={handleLogout}
          size="large"
          style={{
            fontSize: '16px',
            height: '44px',
            padding: '0 24px',
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

      <Card
        className="macos-card"
        style={{
          marginBottom: '24px',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >
        <Title level={2} style={{ fontSize: '28px', marginBottom: '32px', textAlign: 'center' }}>
          健康数据录入
        </Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            recordDate: dayjs(),
          }}
          size="large"
        >
          {/* 老人ID - 自动获取，只读显示 */}
          {elderId && (
            <Form.Item
              label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>老人ID</Text>}
            >
              <InputNumber
                value={Number(elderId)}
                style={{
                  width: '100%',
                  fontSize: '20px',
                  height: '48px',
                }}
                disabled
                readOnly
              />
            </Form.Item>
          )}

          {/* 记录日期 */}
          <Form.Item
            label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>记录日期</Text>}
            name="recordDate"
            rules={[{ required: true, message: '请选择记录日期' }]}
          >
            <DatePicker
              style={{
                width: '100%',
                fontSize: '20px',
                height: '48px',
              }}
              format="YYYY-MM-DD"
              placeholder="请选择日期"
            />
          </Form.Item>

          {/* 收缩压 */}
          <Form.Item
            label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>收缩压 (mmHg)</Text>}
            name="systolic"
            rules={[
              { type: 'number', min: 50, max: 250, message: '请输入有效血压值（50-250）' },
            ]}
          >
            <InputNumber
              style={{
                width: '100%',
                fontSize: '20px',
                height: '48px',
              }}
              placeholder="例如: 120"
              min={50}
              max={250}
              controls
            />
          </Form.Item>

          {/* 舒张压 */}
          <Form.Item
            label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>舒张压 (mmHg)</Text>}
            name="diastolic"
            rules={[
              { type: 'number', min: 30, max: 150, message: '请输入有效血压值（30-150）' },
            ]}
          >
            <InputNumber
              style={{
                width: '100%',
                fontSize: '20px',
                height: '48px',
              }}
              placeholder="例如: 80"
              min={30}
              max={150}
              controls
            />
          </Form.Item>

          {/* 血糖 */}
          <Form.Item
            label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>血糖 (mmol/L)</Text>}
            name="bloodGlucose"
            rules={[
              { type: 'number', min: 0, max: 30, message: '请输入有效血糖值（0-30）' },
            ]}
          >
            <InputNumber
              style={{
                width: '100%',
                fontSize: '20px',
                height: '48px',
              }}
              placeholder="例如: 5.5"
              min={0}
              max={30}
              step={0.1}
              controls
            />
          </Form.Item>

          {/* 步数 */}
          <Form.Item
            label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>步数</Text>}
            name="steps"
            rules={[{ type: 'number', min: 0, message: '请输入有效步数' }]}
          >
            <InputNumber
              style={{
                width: '100%',
                fontSize: '20px',
                height: '48px',
              }}
              placeholder="例如: 8000"
              min={0}
              controls
            />
          </Form.Item>

          {/* 睡眠时长 */}
          <Form.Item
            label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>睡眠时长 (小时)</Text>}
            name="sleepHours"
            rules={[
              { type: 'number', min: 0, max: 24, message: '请输入有效睡眠时长（0-24）' },
            ]}
          >
            <InputNumber
              style={{
                width: '100%',
                fontSize: '20px',
                height: '48px',
              }}
              placeholder="例如: 8"
              min={0}
              max={24}
              step={0.5}
              controls
            />
          </Form.Item>

          {/* 症状 - Checkbox Group */}
          <Form.Item
            label={<Text style={{ fontSize: '20px', fontWeight: 500 }}>症状（可多选）</Text>}
            name="symptoms"
          >
            <Checkbox.Group
              style={{
                width: '100%',
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Checkbox
                  value="dizzy"
                  style={{
                    fontSize: '20px',
                    lineHeight: '32px',
                  }}
                >
                  头晕
                </Checkbox>
                <Checkbox
                  value="chest_pain"
                  style={{
                    fontSize: '20px',
                    lineHeight: '32px',
                  }}
                >
                  胸痛
                </Checkbox>
                <Checkbox
                  value="shortness_of_breath"
                  style={{
                    fontSize: '20px',
                    lineHeight: '32px',
                  }}
                >
                  气短
                </Checkbox>
                <Checkbox
                  value="fatigue"
                  style={{
                    fontSize: '20px',
                    lineHeight: '32px',
                  }}
                >
                  疲劳
                </Checkbox>
              </Space>
            </Checkbox.Group>
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item style={{ marginTop: '32px', marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              style={{
                fontSize: '20px',
                height: '56px',
                fontWeight: 600,
                borderRadius: '16px',
                boxShadow: '0 4px 16px rgba(24, 144, 255, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(24, 144, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(24, 144, 255, 0.4)';
              }}
            >
              提交
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 风险报告展示 */}
      {riskReport && (
        <Card
          className="macos-card"
          title={
            <Title level={3} style={{ fontSize: '24px', margin: 0 }}>
              健康风险评估报告
            </Title>
          }
          style={{
            marginTop: '24px',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 风险等级和评分 */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text strong style={{ fontSize: '18px' }}>
                    风险等级：
                  </Text>
                  <Tag
                    color={getRiskColor(riskReport.overallRisk)}
                    style={{
                      fontSize: '18px',
                      padding: '4px 12px',
                      marginLeft: '8px',
                    }}
                  >
                    {getRiskText(riskReport.overallRisk)}
                  </Tag>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text strong style={{ fontSize: '18px' }}>
                    风险评分：
                  </Text>
                  <Text style={{ fontSize: '18px', marginLeft: '8px' }}>
                    {(riskReport.score * 100).toFixed(1)}%
                  </Text>
                </div>
              </Col>
            </Row>

            {/* Top 3 建议 */}
            {riskReport.recommendations && riskReport.recommendations.length > 0 && (
              <div>
                <Text strong style={{ fontSize: '20px', display: 'block', marginBottom: '12px' }}>
                  健康建议：
                </Text>
                <ul
                  style={{
                    fontSize: '18px',
                    lineHeight: '28px',
                    paddingLeft: '24px',
                    margin: 0,
                  }}
                >
                  {riskReport.recommendations.slice(0, 3).map((rec: string, index: number) => (
                    <li key={index} style={{ marginBottom: '8px' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Space>
        </Card>
      )}

      {/* 响应式样式 - 小屏优化 */}
      <style>{`
        @media (max-width: 576px) {
          .ant-card {
            margin: 12px !important;
            padding: 16px !important;
          }
          .ant-form-item-label > label {
            font-size: 18px !important;
          }
          .ant-input-number,
          .ant-picker {
            font-size: 18px !important;
            height: 44px !important;
          }
          .ant-btn {
            font-size: 20px !important;
            height: 52px !important;
          }
          .ant-checkbox-wrapper {
            font-size: 18px !important;
          }
          /* 顶部导航栏在小屏幕上的样式 */
          .elder-header {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: flex-start !important;
          }
          .elder-header .ant-btn {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
