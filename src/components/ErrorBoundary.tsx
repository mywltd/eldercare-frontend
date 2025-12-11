import { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '24px'
        }}>
          <Alert
            message="页面加载错误"
            description={
              <div>
                <p>{this.state.error?.message || '未知错误'}</p>
                <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                  请刷新页面重试，或检查浏览器控制台获取更多信息
                </p>
              </div>
            }
            type="error"
            showIcon
            style={{ maxWidth: '600px' }}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

