/**
 * 共享类型定义
 */

export enum Role {
  ADMIN = 'admin',
  BOARD = 'board',
  ELDER_COLLECTOR = 'elderCollector',
  FAMILY = 'family',
}

export enum Gender {
  M = 'M',
  F = 'F',
  OTHER = 'Other',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskStatus {
  LOW = 'low',
  MID = 'mid',
  HIGH = 'high',
  DANGER = 'danger',
}

export interface User {
  id: string;
  role: Role | string;
  username: string;
  phone?: string;
  email?: string;
  createdAt?: string;
}

export interface Elder {
  id: string;
  uuid: string;
  name: string;
  gender?: Gender;
  idCard?: string;
  age?: number;
  status: RiskStatus;
  createdAt: string;
}

export interface DailyRecord {
  id?: string;
  elderId: string;
  recordDate: string;
  systolic?: number;
  diastolic?: number;
  bloodGlucose?: number;
  heartRate?: number; // 心率
  steps?: number;
  sleepHours?: number;
  symptoms?: Record<string, any>;
  dynamicFields?: Record<string, any>; // 动态字段
  createdAt?: string;
}

export interface DimensionScores {
  bp: number;
  glucose: number;
  activity: number;
  sleep: number;
  symptom: number;
}

export interface RiskReport {
  id?: string;
  elderId: string;
  reportTime: string;
  overallRisk: RiskLevel;
  score: number;
  dimensionScores: DimensionScores;
  recommendations: string[];
  explain?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface LoginRequest {
  identifier: string; // 用户名或邮箱
  password: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
  role: Role;
  phone?: string;
}

export interface CreateRecordRequest {
  recordDate: string;
  systolic?: number;
  diastolic?: number;
  bloodGlucose?: number;
  steps?: number;
  sleepHours?: number;
  symptoms?: Record<string, boolean>;
}

export interface CaregiverDashboard {
  elders: Array<{
    id: string;
    name: string;
    latestReport?: RiskReport;
    recentRecords: DailyRecord[];
  }>;
}

/**
 * AI 分析相关类型
 */
export interface AIAnalysisResponse {
  analysis: string;
  suggestions: string[];
  riskFactors: string[];
  nextSteps: string[];
  confidence?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  description?: string;
}

export interface WebSocketMessage {
  type: 'risk_alert' | 'new_report' | 'heartbeat' | 'new_record' | 'ai_prediction';
  elderId?: string;
  elderName?: string; // 老人名称（用于风险预警）
  level?: RiskLevel;
  message?: string;
  data?: any;
  record?: {
    elderId: string;
    elderName?: string;
    recordDate: string;
    systolic?: number;
    diastolic?: number;
    bloodGlucose?: number;
    heartRate?: number;
    steps?: number;
    sleepHours?: number;
    symptoms?: Record<string, any>;
    dynamicFields?: Record<string, any>;
    riskScore?: number;
    riskLevel?: RiskLevel;
  };
}

// 病史信息
export interface MedicalHistory {
  id?: string;
  elderId: string;
  diseaseName: string;
  diagnosisDate?: string;
  severity?: string;
  currentStatus?: string;
  medications?: string | Record<string, any>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// AI预测结果
export interface AIPrediction {
  id?: string;
  elderId: string;
  triggerType: 'daily' | 'high_risk' | 'manual';
  riskLevel: RiskLevel;
  analysis: string;
  predictions: {
    timeRange: string;
    possibleIssues: string[];
    probability: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
  }[];
  suggestions: Array<{
    content: string;
    urgency: 'immediate' | 'soon' | 'regular' | 'lifestyle';
    category?: string;
  }>;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description?: string;
  }>;
  nextSteps: Array<{
    step: string;
    priority: number;
    timeframe?: string;
  }>;
  healthAnalysis?: {
    currentStatus: string;
    trendAnalysis: string;
    mainIssues: string[];
    dataSummary?: {
      bloodPressure?: { trend: string; status: string };
      bloodSugar?: { trend: string; status: string };
      activity?: { trend: string; status: string };
      sleep?: { trend: string; status: string };
    };
  };
  confidence?: number;
  createdAt?: string;
}

// 动态字段配置
export interface DynamicFieldConfig {
  id?: string;
  fieldName: string;
  displayName: string;
  unit?: string;
  description?: string;
  enabled: boolean;
}

