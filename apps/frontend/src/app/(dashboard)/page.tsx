'use client';

// Next.js 15 정적 생성 비활성화
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Folder,
  Bot,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Zap,
  Shield,
  Settings,
  Play,
  Eye,
  Edit3,
  Users,
  Server,
  Database,
  Wifi,
  ChevronRight,
  Lightbulb,
  Target,
  Award,
  Calendar,
  HelpCircle,
  X,
} from 'lucide-react';
import {
  dashboardApi,
  UserDashboardOverview,
  WorkflowStatsData,
  AIRecommendationsData,
  UserQuickActionsData,
  SystemStatusData,
  ActivityTimelineData,
  AIRecommendation,
  ApiClientError,
} from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

// 도움말 콘텐츠
const helpContent: Record<
  string,
  { title: string; icon: React.ReactNode; description: string; tips: string[] }
> = {
  greeting: {
    title: '환영 인사',
    icon: <Sparkles className="w-5 h-5" />,
    description: '개인화된 인사말과 현재 접속 정보를 표시합니다.',
    tips: [
      '시간대에 따라 인사말이 변경됩니다',
      '사용자 이름과 역할이 표시됩니다',
      '관리자와 일반 사용자에게 다른 정보가 제공됩니다',
    ],
  },
  quickActions: {
    title: '빠른 액션',
    icon: <Zap className="w-5 h-5" />,
    description: '자주 사용하는 기능에 빠르게 접근할 수 있습니다.',
    tips: [
      '권한에 따라 표시되는 액션이 달라집니다',
      '관리자는 추가 관리 메뉴에 접근할 수 있습니다',
      '클릭하여 해당 페이지로 바로 이동합니다',
    ],
  },
  aiRecommendations: {
    title: 'AI 추천',
    icon: <Bot className="w-5 h-5" />,
    description: 'AI가 분석한 개인화된 추천 및 인사이트를 제공합니다.',
    tips: [
      '사용 패턴을 분석하여 맞춤 추천을 제공합니다',
      '권한 현황 및 시스템 상태를 기반으로 조언합니다',
      '액션 버튼을 클릭하여 바로 실행할 수 있습니다',
    ],
  },
  summary: {
    title: '요약 통계',
    icon: <TrendingUp className="w-5 h-5" />,
    description: '접근 가능한 폴더와 워크플로우의 요약 정보입니다.',
    tips: [
      '총 접근 가능한 폴더 수를 확인할 수 있습니다',
      '할당된 워크플로우 수가 표시됩니다',
      '권한별 폴더 분포를 확인할 수 있습니다',
    ],
  },
  folders: {
    title: '내 폴더',
    icon: <Folder className="w-5 h-5" />,
    description: '접근 가능한 폴더 목록과 워크플로우 수입니다.',
    tips: [
      '각 폴더에 포함된 워크플로우 수를 확인합니다',
      '클릭하여 폴더 상세 페이지로 이동합니다',
      '최근 업데이트된 폴더가 상단에 표시됩니다',
    ],
  },
  systemStatus: {
    title: '시스템 상태',
    icon: <Server className="w-5 h-5" />,
    description: '현재 시스템의 가동 상태를 실시간으로 확인합니다.',
    tips: [
      '모든 서비스가 정상인지 확인할 수 있습니다',
      '서버 가동 시간이 표시됩니다',
      '문제 발생 시 상태 표시가 변경됩니다',
    ],
  },
  timeline: {
    title: '활동 타임라인',
    icon: <Clock className="w-5 h-5" />,
    description: '접근 가능한 폴더의 최근 활동 내역입니다.',
    tips: [
      '폴더 변경 및 워크플로우 할당 내역을 확인합니다',
      '시간순으로 정렬되어 표시됩니다',
      '관련 페이지로 빠르게 이동할 수 있습니다',
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
  if (!isOpen) return null;

  const content = helpContent[helpKey];
  if (!content) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                {content.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{content.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">{content.description}</p>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              활용 팁
            </h4>
            <ul className="space-y-2">
              {content.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
      title="도움말"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
}

// 아이콘 맵핑
const iconMap: Record<string, React.ReactNode> = {
  '📋': <Activity className="w-5 h-5" />,
  '▶️': <Play className="w-5 h-5" />,
  '📊': <TrendingUp className="w-5 h-5" />,
  '📜': <Clock className="w-5 h-5" />,
  '👥': <Users className="w-5 h-5" />,
  '📁': <Folder className="w-5 h-5" />,
  '👑': <Award className="w-5 h-5" />,
  '⚠️': <AlertCircle className="w-5 h-5" />,
  '🔒': <Shield className="w-5 h-5" />,
  '👁️': <Eye className="w-5 h-5" />,
  '✏️': <Edit3 className="w-5 h-5" />,
  '🌙': <Clock className="w-5 h-5" />,
  '💡': <Lightbulb className="w-5 h-5" />,
  '🎯': <Target className="w-5 h-5" />,
};

// 색상 맵핑
const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
  orange: 'from-orange-500 to-orange-600',
  red: 'from-red-500 to-red-600',
  yellow: 'from-yellow-500 to-yellow-600',
  indigo: 'from-indigo-500 to-indigo-600',
  pink: 'from-pink-500 to-pink-600',
};

// 추천 타입별 스타일
const recommendationStyles: Record<string, { bg: string; border: string; icon: string }> = {
  action: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  insight: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
  tip: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [overview, setOverview] = useState<UserDashboardOverview | null>(null);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStatsData | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendationsData | null>(null);
  const [quickActions, setQuickActions] = useState<UserQuickActionsData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [timeline, setTimeline] = useState<ActivityTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeHelpKey, setActiveHelpKey] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    // 인증되지 않은 경우 API 호출하지 않음
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 모든 API 병렬 호출 - 개별 에러 처리로 부분 실패 허용
      const [overviewRes, statsRes, recsRes, actionsRes, statusRes, timelineRes] =
        await Promise.all([
          dashboardApi.getOverview().catch((err) => {
            // 401 에러는 조용히 처리 (인증 문제)
            if (err instanceof ApiClientError && err.status === 401) {
              return null;
            }
            console.error('Overview API error:', err);
            return null;
          }),
          dashboardApi.getWorkflowStats().catch((err) => {
            if (err instanceof ApiClientError && err.status === 401) return null;
            console.error('WorkflowStats API error:', err);
            return null;
          }),
          dashboardApi.getAIRecommendations().catch((err) => {
            if (err instanceof ApiClientError && err.status === 401) return null;
            console.error('AIRecommendations API error:', err);
            return null;
          }),
          dashboardApi.getQuickActions().catch((err) => {
            if (err instanceof ApiClientError && err.status === 401) return null;
            console.error('QuickActions API error:', err);
            return null;
          }),
          dashboardApi.getSystemStatus().catch((err) => {
            if (err instanceof ApiClientError && err.status === 401) return null;
            console.error('SystemStatus API error:', err);
            return null;
          }),
          dashboardApi.getActivityTimeline().catch((err) => {
            if (err instanceof ApiClientError && err.status === 401) return null;
            console.error('ActivityTimeline API error:', err);
            return null;
          }),
        ]);

      if (overviewRes?.success) setOverview(overviewRes.data);
      if (statsRes?.success) setWorkflowStats(statsRes.data);
      if (recsRes?.success) setRecommendations(recsRes.data);
      if (actionsRes?.success) setQuickActions(actionsRes.data);
      if (statusRes?.success) setSystemStatus(statusRes.data);
      if (timelineRes?.success) setTimeline(timelineRes.data);
    } catch (err) {
      // 401 에러는 로그인 페이지로 리다이렉트하지 않고 조용히 처리
      if (err instanceof ApiClientError && err.status === 401) {
        console.log('인증 만료 - 재로그인 필요');
        return;
      }
      setError(err instanceof Error ? err.message : '대시보드 데이터 조회 중 오류 발생');
      console.error('대시보드 데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 인증 상태 확인 후 데이터 로드
  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) return;

    // 인증되지 않은 경우 로그인 페이지로 리다이렉트 (미들웨어가 처리하지만 안전장치)
    if (!user) {
      router.push('/login');
      return;
    }

    loadDashboardData();

    // 30초마다 자동 새로고침
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [authLoading, user, loadDashboardData, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'editor':
        return <Edit3 className="w-4 h-4 text-blue-500" />;
      case 'executor':
        return <Play className="w-4 h-4 text-green-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'admin':
        return '관리자';
      case 'editor':
        return '편집자';
      case 'executor':
        return '실행자';
      default:
        return '뷰어';
    }
  };

  // 인증 로딩 중이거나 데이터 로딩 중일 때 로딩 표시
  if (authLoading || (loading && !overview)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
            <Sparkles className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">
            {authLoading ? '인증 확인 중...' : 'AI 대시보드 로딩 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (미들웨어가 리다이렉트하기 전에 잠시 표시될 수 있음)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 도움말 모달 */}
      <HelpModal
        isOpen={activeHelpKey !== null}
        onClose={() => setActiveHelpKey(null)}
        helpKey={activeHelpKey || ''}
      />

      {/* 인사말 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white relative overflow-hidden">
        {/* 배경 그라데이션 효과 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20"></div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{overview?.user.greeting || '안녕하세요!'}</h1>
                <p className="text-white/80 text-sm">
                  {overview?.user.role === 'admin' ? '시스템 관리자' : '일반 사용자'} •{' '}
                  {new Date().toLocaleDateString('ko-KR', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton onClick={() => setActiveHelpKey('greeting')} />
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">새로고침</span>
              </button>
            </div>
          </div>

          {/* 요약 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Folder className="w-5 h-5" />
                <span className="text-sm text-white/80">내 폴더</span>
              </div>
              <p className="text-2xl font-bold">{overview?.summary.totalFolders || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5" />
                <span className="text-sm text-white/80">워크플로우</span>
              </div>
              <p className="text-2xl font-bold">{overview?.summary.totalWorkflows || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm text-white/80">권한 수준</span>
              </div>
              <p className="text-2xl font-bold">
                {overview?.user.role === 'admin'
                  ? '전체'
                  : Object.keys(overview?.summary.permissionBreakdown || {}).length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5" />
                <span className="text-sm text-white/80">시스템 상태</span>
              </div>
              <p className="text-2xl font-bold flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${systemStatus?.overall === 'operational' ? 'bg-green-400' : 'bg-yellow-400'}`}
                ></span>
                {systemStatus?.overall === 'operational' ? '정상' : '점검중'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* 빠른 액션 */}
      {quickActions && quickActions.quickActions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              빠른 액션
            </h2>
            <HelpButton onClick={() => setActiveHelpKey('quickActions')} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="group flex flex-col items-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all hover:scale-105"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[action.color] || colorMap.blue} flex items-center justify-center text-white mb-3 group-hover:shadow-lg transition-shadow`}
                >
                  {iconMap[action.icon] || <Activity className="w-5 h-5" />}
                </div>
                <span className="text-sm font-medium text-gray-900 text-center">
                  {action.title}
                </span>
                <span className="text-xs text-gray-500 text-center mt-1">{action.description}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: AI 추천 */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI 추천 */}
          {recommendations && recommendations.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  AI 맞춤 추천
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {recommendations.recommendations.length}개
                  </span>
                </h2>
                <HelpButton onClick={() => setActiveHelpKey('aiRecommendations')} />
              </div>
              <div className="space-y-3">
                {recommendations.recommendations.map((rec: AIRecommendation) => {
                  const style = recommendationStyles[rec.type] || recommendationStyles.tip;
                  return (
                    <div
                      key={rec.id}
                      className={`${style.bg} ${style.border} border rounded-xl p-4 transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center ${style.icon} flex-shrink-0`}
                        >
                          {iconMap[rec.icon] || <Lightbulb className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{rec.title}</h3>
                            {rec.priority === 'high' && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                중요
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{rec.description}</p>
                          {rec.actionText && rec.actionHref && (
                            <Link
                              href={rec.actionHref}
                              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                              {rec.actionText}
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 내 폴더 */}
          {overview && overview.folders.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Folder className="w-5 h-5 text-blue-600" />내 폴더
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {overview.folders.length}개
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  <HelpButton onClick={() => setActiveHelpKey('folders')} />
                  <Link
                    href="/folders"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    전체 보기
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overview.folders.slice(0, 6).map((folder) => (
                  <Link
                    key={folder.id}
                    href={`/folders/${folder.id}`}
                    className="group flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                      <Folder className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{folder.workflowCount} 워크플로우</span>
                        <span>•</span>
                        <span>{formatDate(folder.updatedAt)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 워크플로우 통계 */}
          {workflowStats && workflowStats.folderStats.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  폴더별 워크플로우
                </h2>
                <HelpButton onClick={() => setActiveHelpKey('summary')} />
              </div>
              <div className="space-y-3">
                {workflowStats.folderStats.slice(0, 5).map((stat) => (
                  <div key={stat.folderId} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {stat.folderName}
                        </span>
                        <span className="text-sm text-gray-500">{stat.workflowCount}개</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((stat.workflowCount / (workflowStats.totalWorkflows || 1)) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽 사이드바 */}
        <div className="space-y-6">
          {/* 시스템 상태 */}
          {systemStatus && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-gray-600" />
                  시스템 상태
                </h2>
                <HelpButton onClick={() => setActiveHelpKey('systemStatus')} />
              </div>
              <div className="space-y-3">
                {systemStatus.services.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{service.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          service.status === 'operational'
                            ? 'bg-green-500'
                            : service.status === 'degraded'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      ></span>
                      <span className="text-xs text-gray-500">
                        {service.status === 'operational' ? '정상' : '점검중'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">서버 가동 시간</span>
                  <span className="font-medium text-gray-900">{systemStatus.uptime}</span>
                </div>
              </div>
            </div>
          )}

          {/* 권한 현황 */}
          {overview && Object.keys(overview.summary.permissionBreakdown).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />내 권한 현황
              </h2>
              <div className="space-y-2">
                {Object.entries(overview.summary.permissionBreakdown).map(([permission, count]) => (
                  <div
                    key={permission}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {getPermissionIcon(permission)}
                      <span className="text-sm font-medium text-gray-900">
                        {getPermissionLabel(permission)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{count}개 폴더</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 활동 타임라인 */}
          {timeline && timeline.timeline.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  최근 활동
                </h2>
                <HelpButton onClick={() => setActiveHelpKey('timeline')} />
              </div>
              <div className="space-y-3">
                {timeline.timeline.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(item.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
