'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  FolderOpen,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Clock,
  ArrowRight,
  Zap,
  Settings,
  UserPlus,
  BarChart3,
  PieChart,
  AlertCircle,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminApi,
  AdminDashboardOverview,
  UserActivityData,
  FolderStatsData,
  SystemHealthData,
  AIInsightsData,
  QuickActionsData,
} from '@/lib/api-client';

// 색상 팔레트
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
};

// 스켈레톤 로딩 컴포넌트
function SkeletonCard({ height = 'h-32' }: { height?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${height} animate-pulse`}>
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
  href?: string;
}

function StatCard({ title, value, subtitle, icon, trend, color, href }: StatCardProps) {
  const content = (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-gray-300 group cursor-pointer"
      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span
                className={`flex items-center text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      {href && (
        <div className="mt-4 flex items-center text-sm text-gray-500 group-hover:text-gray-700">
          <span>자세히 보기</span>
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// 원형 프로그레스 컴포넌트
function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  color = COLORS.primary,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{value}%</span>
      </div>
    </div>
  );
}

// 인사이트 타입별 아이콘 및 색상
const insightStyles = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    textColor: 'text-green-800',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-800',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800',
  },
  danger: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-800',
  },
};

// 빠른 액션 우선순위 색상
const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

// 도움말 데이터
const helpContent: Record<
  string,
  { title: string; icon: React.ReactNode; description: string; tips: string[] }
> = {
  stats: {
    title: '주요 지표',
    icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
    description:
      '시스템의 핵심 지표를 한눈에 확인할 수 있습니다. 각 카드를 클릭하면 상세 페이지로 이동합니다.',
    tips: [
      '총 사용자: 시스템에 등록된 전체 사용자 수',
      '관리자: 관리자 권한을 가진 사용자 수',
      '총 폴더: 생성된 폴더의 총 개수',
      '신규 가입: 최근 7일간 새로 가입한 사용자 수',
      '트렌드 화살표는 증감 추세를 나타냅니다',
    ],
  },
  systemHealth: {
    title: '시스템 상태',
    icon: <Server className="w-6 h-6 text-green-600" />,
    description:
      '서버와 데이터베이스의 실시간 상태를 모니터링합니다. 장애 발생 시 즉시 확인할 수 있습니다.',
    tips: [
      'MongoDB: 데이터베이스 연결 상태 및 응답 시간',
      'Backend API: API 서버의 동작 상태',
      '메모리: 현재 서버 메모리 사용률',
      'DB 크기: 데이터베이스 저장 용량',
      '업타임: 서버 재시작 없이 운영된 시간',
      '녹색: 정상 / 빨간색: 이상 감지',
    ],
  },
  aiInsights: {
    title: 'AI 인사이트',
    icon: <Sparkles className="w-6 h-6 text-purple-600" />,
    description: 'AI가 시스템 데이터를 분석하여 자동으로 인사이트와 권장 사항을 제공합니다.',
    tips: [
      '녹색: 긍정적인 지표 또는 성과',
      '노란색: 주의가 필요한 사항',
      '파란색: 참고 정보 및 일반 알림',
      '빨간색: 즉시 조치가 필요한 경고',
      '권장 액션이 있으면 클릭하여 바로 이동할 수 있습니다',
    ],
  },
  userActivation: {
    title: '사용자 활성화율',
    icon: <Activity className="w-6 h-6 text-blue-600" />,
    description: '전체 등록 사용자 중 활성 상태인 사용자의 비율을 보여줍니다.',
    tips: [
      '원형 그래프는 활성화 비율을 시각화합니다',
      '높은 활성화율은 서비스 건강도를 나타냅니다',
      '역할별 분포에서 관리자와 일반 사용자 비율을 확인할 수 있습니다',
      '관리자 비율이 너무 높으면 보안 검토가 필요할 수 있습니다',
    ],
  },
  quickActions: {
    title: '빠른 액션',
    icon: <Zap className="w-6 h-6 text-orange-600" />,
    description: '즉시 처리가 필요한 작업을 우선순위에 따라 보여줍니다.',
    tips: [
      '빨간색: 높은 우선순위 - 즉시 처리 필요',
      '노란색: 중간 우선순위 - 가능한 빨리 처리',
      '회색: 낮은 우선순위 - 여유 있을 때 처리',
      '숫자는 해당 작업의 대기 건수입니다',
      '클릭하면 해당 관리 페이지로 바로 이동합니다',
    ],
  },
  permissionDistribution: {
    title: '권한 레벨 분포',
    icon: <PieChart className="w-6 h-6 text-indigo-600" />,
    description: '폴더 접근 권한이 어떻게 분배되어 있는지 보여줍니다.',
    tips: [
      '뷰어(Viewer): 읽기만 가능',
      '실행자(Executor): 워크플로우 실행 가능',
      '편집자(Editor): 수정 및 삭제 가능',
      '관리자(Admin): 모든 권한 + 권한 관리 가능',
      '경고 메시지가 있으면 권한 설정을 검토하세요',
    ],
  },
  recentUsers: {
    title: '최근 활동 사용자',
    icon: <Clock className="w-6 h-6 text-green-600" />,
    description: '최근에 활동(정보 업데이트)이 있었던 사용자 목록입니다.',
    tips: [
      '초록색 점: 현재 활성 상태',
      '회색 점: 비활성 상태',
      '관리자 배지가 있으면 관리자 계정입니다',
      '전체 사용자 보기를 클릭하면 사용자 관리 페이지로 이동합니다',
    ],
  },
  adminMenu: {
    title: '관리 메뉴',
    icon: <Settings className="w-6 h-6 text-gray-600" />,
    description: '관리자 기능에 빠르게 접근할 수 있는 바로가기입니다.',
    tips: [
      '사용자 관리: 계정 생성, 수정, 삭제, 권한 변경',
      '폴더 관리: 폴더 구조 생성 및 설정',
      '권한 관리: 사용자별 폴더 접근 권한 설정',
      '모니터링: 실시간 시스템 및 워크플로우 상태 확인',
    ],
  },
};

// 도움말 모달 컴포넌트
function HelpModal({
  isOpen,
  onClose,
  helpKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  helpKey: string;
}) {
  const content = helpContent[helpKey];

  if (!isOpen || !content) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
              {content.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{content.title}</h3>
              <p className="text-sm text-gray-500">도움말</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          <p className="text-gray-700 mb-6 leading-relaxed">{content.description}</p>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              주요 정보
            </h4>
            <ul className="space-y-2">
              {content.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium">
                    {index + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// 도움말 버튼 컴포넌트
function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="도움말"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터 상태
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivityData | null>(null);
  const [folderStats, setFolderStats] = useState<FolderStatsData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);
  const [aiInsights, setAIInsights] = useState<AIInsightsData | null>(null);
  const [quickActions, setQuickActions] = useState<QuickActionsData | null>(null);

  // 도움말 모달 상태
  const [helpModal, setHelpModal] = useState<{ isOpen: boolean; helpKey: string }>({
    isOpen: false,
    helpKey: '',
  });

  const openHelp = (helpKey: string) => {
    setHelpModal({ isOpen: true, helpKey });
  };

  const closeHelp = () => {
    setHelpModal({ isOpen: false, helpKey: '' });
  };

  // 현재 시간
  const [currentTime, setCurrentTime] = useState(new Date());

  // 관리자 권한 확인
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  // 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [
        overviewRes,
        userActivityRes,
        folderStatsRes,
        systemHealthRes,
        aiInsightsRes,
        quickActionsRes,
      ] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getUserActivity(30),
        adminApi.getFolderStats(),
        adminApi.getSystemHealth(),
        adminApi.getAIInsights(),
        adminApi.getQuickActions(),
      ]);

      setOverview(overviewRes.data);
      setUserActivity(userActivityRes.data);
      setFolderStats(folderStatsRes.data);
      setSystemHealth(systemHealthRes.data);
      setAIInsights(aiInsightsRes.data);
      setQuickActions(quickActionsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // 30초마다 자동 새로고침
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // 날짜 포맷
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
          <p className="text-gray-500">관리자만 접근할 수 있는 페이지입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
                <p className="text-gray-500">시스템 전체 현황을 한눈에 확인하세요</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">{formatDate(currentTime)}</p>
              <p className="text-2xl font-mono font-bold text-gray-900">
                {formatTime(currentTime)}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* 주요 지표 카드 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">주요 지표</h2>
              <HelpButton onClick={() => openHelp('stats')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="총 사용자"
                value={overview?.users.total || 0}
                subtitle={`활성: ${overview?.users.active || 0} / 비활성: ${overview?.users.inactive || 0}`}
                icon={<Users className="w-6 h-6" />}
                color={COLORS.primary}
                href="/admin/users"
              />
              <StatCard
                title="관리자"
                value={overview?.users.admins || 0}
                subtitle={`일반 사용자: ${overview?.users.regularUsers || 0}`}
                icon={<Shield className="w-6 h-6" />}
                color={COLORS.purple}
              />
              <StatCard
                title="총 폴더"
                value={overview?.folders.total || 0}
                subtitle={`워크플로우 할당: ${overview?.folders.workflowAssignments || 0}`}
                icon={<FolderOpen className="w-6 h-6" />}
                color={COLORS.success}
                href="/admin/folders"
              />
              <StatCard
                title="신규 가입"
                value={overview?.users.recentSignups || 0}
                subtitle="최근 7일"
                icon={<UserPlus className="w-6 h-6" />}
                color={COLORS.info}
                trend={
                  overview?.users.recentSignups
                    ? {
                        value: Math.round(
                          (overview.users.recentSignups / overview.users.total) * 100
                        ),
                        isPositive: true,
                      }
                    : undefined
                }
              />
            </div>
          </div>

          {/* 2단 레이아웃 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 왼쪽: 시스템 상태 + 활성화율 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 시스템 헬스 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Server className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">시스템 상태</h2>
                      <p className="text-sm text-gray-500">실시간 서비스 모니터링</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      업타임: {systemHealth?.uptime || '-'}
                    </span>
                    <HelpButton onClick={() => openHelp('systemHealth')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {systemHealth?.services.map((service) => (
                    <div
                      key={service.name}
                      className={`p-4 rounded-lg border ${
                        service.status === 'healthy'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {service.status === 'healthy' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900">{service.name}</span>
                      </div>
                      <p className="text-sm text-gray-500">응답: {service.latency}</p>
                    </div>
                  ))}

                  {/* 메모리 사용량 */}
                  <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Cpu className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-900">메모리</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {systemHealth?.memory.usagePercent}% 사용 중
                    </p>
                  </div>

                  {/* 데이터베이스 */}
                  <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-900">DB 크기</span>
                    </div>
                    <p className="text-sm text-gray-500">{systemHealth?.database.dataSize}</p>
                  </div>
                </div>
              </div>

              {/* AI 인사이트 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">AI 인사이트</h2>
                      <p className="text-sm text-gray-500">시스템 분석 기반 권장 사항</p>
                    </div>
                  </div>
                  <HelpButton onClick={() => openHelp('aiInsights')} />
                </div>

                <div className="space-y-4">
                  {aiInsights?.insights.map((insight, index) => {
                    const style = insightStyles[insight.type];
                    const Icon = style.icon;
                    return (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${style.bgColor} ${style.borderColor}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 ${style.iconColor} mt-0.5`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className={`font-medium ${style.textColor}`}>{insight.title}</h3>
                              {insight.metric && (
                                <span className={`text-lg font-bold ${style.textColor}`}>
                                  {insight.metric}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                            {insight.action && (
                              <button className="mt-2 text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1">
                                {insight.action}
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 오른쪽: 활성화율 + 빠른 액션 */}
            <div className="space-y-6">
              {/* 사용자 활성화율 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">사용자 활성화율</h2>
                      <p className="text-sm text-gray-500">전체 사용자 대비</p>
                    </div>
                  </div>
                  <HelpButton onClick={() => openHelp('userActivation')} />
                </div>

                <div className="flex flex-col items-center">
                  <CircularProgress
                    value={
                      overview?.users.total
                        ? Math.round((overview.users.active / overview.users.total) * 100)
                        : 0
                    }
                    color={COLORS.success}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      {overview?.users.active || 0}명 활성 / {overview?.users.total || 0}명 전체
                    </p>
                  </div>
                </div>

                {/* 역할별 분포 */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">역할별 분포</h3>
                  <div className="space-y-2">
                    {overview?.charts.usersByRole.map((item) => (
                      <div key={item.role} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              item.role === 'admin' ? 'bg-purple-500' : 'bg-gray-400'
                            }`}
                          />
                          <span className="text-sm text-gray-600">
                            {item.role === 'admin' ? '관리자' : '사용자'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{item.count}명</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 빠른 액션 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">빠른 액션</h2>
                      <p className="text-sm text-gray-500">처리 필요한 작업</p>
                    </div>
                  </div>
                  <HelpButton onClick={() => openHelp('quickActions')} />
                </div>

                <div className="space-y-3">
                  {quickActions?.quickActions.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      <p>처리할 작업이 없습니다</p>
                    </div>
                  ) : (
                    quickActions?.quickActions.map((action) => (
                      <Link
                        key={action.id}
                        href={action.href}
                        className={`block p-4 rounded-lg border transition-all hover:shadow-md ${priorityColors[action.priority]}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{action.title}</h3>
                            <p className="text-sm opacity-80">{action.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{action.count}</span>
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 폴더 및 권한 통계 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 권한 분포 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">권한 레벨 분포</h2>
                    <p className="text-sm text-gray-500">폴더 접근 권한 현황</p>
                  </div>
                </div>
                <HelpButton onClick={() => openHelp('permissionDistribution')} />
              </div>

              <div className="space-y-4">
                {folderStats?.permissionsByLevel.map((item) => {
                  const total = folderStats.permissionsByLevel.reduce((sum, i) => sum + i.count, 0);
                  const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  const levelColors: Record<string, string> = {
                    viewer: COLORS.info,
                    executor: COLORS.cyan,
                    editor: COLORS.warning,
                    admin: COLORS.danger,
                  };
                  const levelLabels: Record<string, string> = {
                    viewer: '뷰어',
                    executor: '실행자',
                    editor: '편집자',
                    admin: '관리자',
                  };
                  return (
                    <div key={item.level}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {levelLabels[item.level] || item.level}
                        </span>
                        <span className="text-sm text-gray-500">
                          {item.count}명 ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: levelColors[item.level] || COLORS.primary,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 경고 */}
              {(folderStats?.foldersWithoutPermissions || 0) > 0 ||
              (folderStats?.usersWithoutFolderAccess || 0) > 0 ? (
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  {(folderStats?.foldersWithoutPermissions || 0) > 0 && (
                    <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm">
                        {folderStats?.foldersWithoutPermissions}개 폴더에 권한이 설정되지 않음
                      </span>
                    </div>
                  )}
                  {(folderStats?.usersWithoutFolderAccess || 0) > 0 && (
                    <div className="flex items-center gap-2 text-orange-700 bg-orange-50 p-3 rounded-lg">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-sm">
                        {folderStats?.usersWithoutFolderAccess}명의 사용자가 폴더 접근 불가
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 최근 활동 사용자 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">최근 활동 사용자</h2>
                    <p className="text-sm text-gray-500">최근 업데이트 기준</p>
                  </div>
                </div>
                <HelpButton onClick={() => openHelp('recentUsers')} />
              </div>

              <div className="space-y-3">
                {userActivity?.recentlyActiveUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role === 'admin' ? '관리자' : '사용자'}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          user.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/admin/users"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-sm text-blue-600 hover:text-blue-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>전체 사용자 보기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 하단 관리자 메뉴 바로가기 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">관리 메뉴</h2>
              <HelpButton onClick={() => openHelp('adminMenu')} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/admin/users"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-700">사용자 관리</p>
                  <p className="text-sm text-gray-500">계정 생성, 수정, 삭제</p>
                </div>
              </Link>

              <Link
                href="/admin/folders"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all group"
              >
                <FolderOpen className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-green-700">폴더 관리</p>
                  <p className="text-sm text-gray-500">폴더 구조 및 설정</p>
                </div>
              </Link>

              <Link
                href="/admin/folders/permissions"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
              >
                <Shield className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-purple-700">권한 관리</p>
                  <p className="text-sm text-gray-500">폴더 접근 권한 설정</p>
                </div>
              </Link>

              <Link
                href="/monitoring"
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
              >
                <Activity className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-orange-700">모니터링</p>
                  <p className="text-sm text-gray-500">실시간 시스템 상태</p>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* 도움말 모달 */}
      <HelpModal isOpen={helpModal.isOpen} onClose={closeHelp} helpKey={helpModal.helpKey} />
    </div>
  );
}
