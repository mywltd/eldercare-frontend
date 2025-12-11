import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Form,
  Select,
  DatePicker,
  Space,
  Tag,
  message,
  Row,
  Col,
  Input,
  Typography,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/errorHandler';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Title } = Typography;

/**
 * 设备上报日志查看页面
 */
export default function DeviceLogsPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
  });
  const [filters, setFilters] = useState<{
    parsed?: boolean;
    startDate?: string;
    endDate?: string;
  }>({});
  const [form] = Form.useForm();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logDetailVisible, setLogDetailVisible] = useState(false);

  // 获取设备信息
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    if (deviceId) {
      fetchDeviceInfo();
      fetchLogs();
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) {
      fetchLogs();
    }
  }, [pagination, filters]);

  const fetchDeviceInfo = async () => {
    try {
      const res = await api.get(`/admin/devices`) as any;
      if (res?.success) {
        const device = res.data.find((d: any) => d.id === deviceId);
        if (device) {
          setDeviceInfo(device);
        }
      }
    } catch (error) {
      console.error('获取设备信息失败:', error);
    }
  };

  const fetchLogs = async () => {
    if (!deviceId) return;

    setLoading(true);
    try {
      const params: any = {
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      };

      if (filters.parsed !== undefined) {
        params.parsed = filters.parsed ? 'true' : 'false';
      }

      if (filters.startDate) {
        params.startDate = filters.startDate;
      }

      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      const res = await api.get(`/admin/devices/${deviceId}/logs`, { params }) as any;

      if (res?.success) {
        setLogs(res.data || []);
        setTotal(res.total || 0);
      } else {
        message.error(res?.message || '获取日志失败');
      }
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (values: any) => {
    const newFilters: typeof filters = {};

    if (values.parsed !== undefined) {
      newFilters.parsed = values.parsed;
    }

    if (values.dateRange && values.dateRange.length === 2) {
      const start = dayjs(values.dateRange[0]);
      const end = dayjs(values.dateRange[1]);
      newFilters.startDate = start.startOf('day').toISOString();
      newFilters.endDate = end.endOf('day').toISOString();
    }

    setFilters(newFilters);
    setPagination({ ...pagination, current: 1 });
  };

  const handleReset = () => {
    form.resetFields();
    setFilters({});
    setPagination({ ...pagination, current: 1 });
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleViewDetail = (log: any) => {
    setSelectedLog(log);
    setLogDetailVisible(true);
  };

  const columns = [
    {
      title: '上报时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => (date ? new Date(date).toLocaleString('zh-CN') : '-'),
      sorter: true,
    },
    {
      title: '解析状态',
      dataIndex: 'parsed',
      key: 'parsed',
      width: 120,
      render: (parsed: boolean) => (
        <Tag color={parsed ? 'green' : 'orange'}>
          {parsed ? '已解析' : '未解析'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<FileTextOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '24px',
    }}>
      <Card
        style={{
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 页面标题 */}
        <div style={{ marginBottom: '24px' }}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/admin/devices')}
            >
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              设备上报日志
              {deviceInfo && (
                <span style={{ marginLeft: '12px', color: '#666', fontWeight: 'normal' }}>
                  (SN: {deviceInfo.sn})
                </span>
              )}
            </Title>
          </Space>
        </div>

        {/* 筛选表单 */}
        <Card
          size="small"
          style={{ marginBottom: '16px', background: '#fafafa' }}
        >
          <Form
            form={form}
            layout="inline"
            onFinish={handleFilter}
            style={{ marginBottom: 0 }}
          >
            <Form.Item name="parsed" label="解析状态">
              <Select
                placeholder="全部"
                allowClear
                showSearch
                style={{ width: 120 }}
                filterOption={(input, option) => {
                  const text = typeof option?.children === 'string' 
                    ? option.children 
                    : String(option?.children || '');
                  return text.toLowerCase().includes(input.toLowerCase());
                }}
              >
                <Select.Option value={true}>已解析</Select.Option>
                <Select.Option value={false}>未解析</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="dateRange" label="时间范围">
              <RangePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                style={{ width: 400 }}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  筛选
                </Button>
                <Button onClick={handleReset}>
                  重置
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchLogs}
                >
                  刷新
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 日志表格 */}
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 日志详情模态框 */}
      <Modal
        title="日志详情"
        open={logDetailVisible}
        onCancel={() => setLogDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setLogDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={12}>
                <strong>上报时间：</strong>
                {selectedLog.createdAt
                  ? new Date(selectedLog.createdAt).toLocaleString('zh-CN')
                  : '-'}
              </Col>
              <Col span={12}>
                <strong>解析状态：</strong>
                <Tag color={selectedLog.parsed ? 'green' : 'orange'}>
                  {selectedLog.parsed ? '已解析' : '未解析'}
                </Tag>
              </Col>
            </Row>

            <div style={{ marginBottom: '16px' }}>
              <strong>原始数据：</strong>
              <TextArea
                value={JSON.stringify(selectedLog.rawJson, null, 2)}
                readOnly
                rows={15}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  marginTop: '8px',
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

