import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Space,
  Switch,
  message,
  Table,
} from 'antd';

/**
 * 硬件设备模拟器
 */
export default function DeviceSimulator() {
  const [form] = Form.useForm();
  const [isConnected, setIsConnected] = useState(false);
  const [autoUpload, setAutoUpload] = useState(false);
  const [uploadInterval, setUploadInterval] = useState(30); // 秒
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleConnect = () => {
    const sn = form.getFieldValue('sn');
    if (!sn) {
      message.error('请输入设备SN号');
      return;
    }

    // WebSocket 连接在设备上报时不需要保持连接，直接发送即可
    setIsConnected(true);
    message.success('设备已就绪');
  };

  const handleDisconnect = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsConnected(false);
    message.info('设备已断开');
  };

  const generateRandomValue = (min: number, max: number, base?: number) => {
    if (base !== undefined) {
      const variation = (max - min) * 0.1; // 10% 变化范围
      return Math.max(min, Math.min(max, base + (Math.random() - 0.5) * 2 * variation));
    }
    return Math.random() * (max - min) + min;
  };

  const handleUpload = async () => {
    const values = form.getFieldsValue();
    const sn = values.sn;

    if (!sn) {
      message.error('请输入设备SN号');
      return;
    }

    const data: any = {
      sn,
      timestamp: Date.now(),
      data: {},
    };

    // 根据表单值构建数据
    if (values.bloodPressureSys !== undefined || values.bloodPressureDia !== undefined) {
      data.data.bloodPressure = {
        sys: values.bloodPressureSys || generateRandomValue(110, 140),
        dia: values.bloodPressureDia || generateRandomValue(70, 90),
      };
    }

    if (values.heartRate !== undefined) {
      data.data.heartRate = Math.round(values.heartRate || generateRandomValue(60, 100));
    }

    if (values.bloodSugar !== undefined) {
      data.data.bloodSugar = parseFloat((values.bloodSugar || generateRandomValue(4.5, 7.0)).toFixed(2));
    }

    if (values.bloodFat !== undefined) {
      data.data.bloodFat = parseFloat((values.bloodFat || generateRandomValue(2.0, 5.0)).toFixed(2));
    }

    if (values.sleepHours !== undefined) {
      data.data.sleepHours = parseFloat((values.sleepHours || generateRandomValue(6, 9)).toFixed(1));
    }

    if (values.steps !== undefined) {
      data.data.steps = Math.round(values.steps || generateRandomValue(3000, 10000));
    }

    if (values.symptoms) {
      data.data.symptoms = values.symptoms;
    }

    try {
      // 通过 WebSocket 发送数据
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/device`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send(JSON.stringify(data));
      };

      socket.onmessage = (event) => {
        const response = JSON.parse(event.data);
        if (response.success) {
          message.success('上报成功');
          setUploadHistory((prev) => [
            {
              time: new Date().toLocaleString(),
              sn,
              success: true,
              response,
            },
            ...prev.slice(0, 49), // 保留最近50条
          ]);
        } else {
          message.error(response.error || '上报失败');
          setUploadHistory((prev) => [
            {
              time: new Date().toLocaleString(),
              sn,
              success: false,
              error: response.error,
            },
            ...prev.slice(0, 49),
          ]);
        }
        socket.close();
      };

      socket.onerror = (error) => {
        message.error('连接错误');
        console.error('WebSocket error:', error);
      };
    } catch (error: any) {
      message.error(error.message || '上报失败');
    }
  };

  useEffect(() => {
    if (autoUpload && isConnected) {
      intervalRef.current = setInterval(() => {
        handleUpload();
      }, uploadInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoUpload, isConnected, uploadInterval]);

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="硬件设备模拟器">
        <Form form={form} layout="vertical" initialValues={{ sn: 'DEV-AX98-1234' }}>
          <Form.Item name="sn" label="设备SN号" rules={[{ required: true }]}>
            <Input placeholder="例如: DEV-AX98-1234" />
          </Form.Item>

          <Card title="上报数据" size="small" style={{ marginBottom: '16px' }}>
            <Form.Item name="bloodPressureSys" label="收缩压 (mmHg)">
              <InputNumber min={50} max={250} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="bloodPressureDia" label="舒张压 (mmHg)">
              <InputNumber min={30} max={150} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="heartRate" label="心率 (次/分)">
              <InputNumber min={30} max={200} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="bloodSugar" label="血糖 (mmol/L)">
              <InputNumber min={0} max={30} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="bloodFat" label="血脂 (mmol/L)">
              <InputNumber min={0} max={20} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sleepHours" label="睡眠时长 (小时)">
              <InputNumber min={0} max={24} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="steps" label="步数">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="symptoms" label="症状">
              <Input placeholder="例如: headache, dizziness" />
            </Form.Item>
          </Card>

          <Space style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              onClick={isConnected ? handleDisconnect : handleConnect}
            >
              {isConnected ? '断开连接' : '连接设备'}
            </Button>
            <Button
              type="default"
              onClick={handleUpload}
              disabled={!isConnected}
            >
              单次上报
            </Button>
            <Space>
              <span>自动上报:</span>
              <Switch
                checked={autoUpload}
                onChange={setAutoUpload}
                disabled={!isConnected}
              />
              {autoUpload && (
                <InputNumber
                  min={5}
                  max={300}
                  value={uploadInterval}
                  onChange={(v) => setUploadInterval(v || 30)}
                  addonAfter="秒"
                  style={{ width: '100px' }}
                />
              )}
            </Space>
          </Space>
        </Form>

        <Card title="上报历史" size="small">
          <Table
            columns={[
              { title: '时间', dataIndex: 'time', key: 'time' },
              { title: 'SN号', dataIndex: 'sn', key: 'sn' },
              {
                title: '状态',
                key: 'status',
                render: (_: any, record: any) => (
                  <span style={{ color: record.success ? 'green' : 'red' }}>
                    {record.success ? '成功' : '失败'}
                  </span>
                ),
              },
              {
                title: '响应',
                dataIndex: 'response',
                key: 'response',
                render: (response: any) => response?.message || '-',
              },
            ]}
            dataSource={uploadHistory}
            rowKey={(record, index) => `${record.time}-${index}`}
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      </Card>
    </div>
  );
}

