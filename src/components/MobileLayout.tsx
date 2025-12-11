import { ReactNode } from 'react';
import './MobileLayout.css';

interface MobileLayoutProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: Array<{ key: string; label: string; icon: ReactNode }>;
}

/**
 * iOS风格移动端布局组件
 * 仿iOS 26底栏样式
 */
export function MobileLayout({ children, activeTab, onTabChange, tabs }: MobileLayoutProps) {
  return (
    <div className="mobile-layout">
      <div className="mobile-content">
        {children}
      </div>
      {tabs && tabs.length > 0 && (
        <div className="mobile-bottom-bar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`mobile-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => onTabChange?.(tab.key)}
            >
              <div className="mobile-tab-icon">{tab.icon}</div>
              <div className="mobile-tab-label">{tab.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

