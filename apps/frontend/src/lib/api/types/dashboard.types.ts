/**
 * 사용자 대시보드 관련 타입 정의
 */

export interface UserDashboardOverview {
  user: {
    name: string;
    role: string;
    greeting: string;
  };
  summary: {
    totalFolders: number;
    totalWorkflows: number;
    permissionBreakdown: Record<string, number>;
  };
  folders: Array<{
    id: string;
    name: string;
    description?: string;
    workflowCount: number;
    updatedAt: string;
  }>;
  recentActivity: Array<{
    type: string;
    folderId: string;
    folderName: string;
    timestamp: string;
  }>;
}

export interface WorkflowStatsData {
  totalWorkflows: number;
  folderStats: Array<{
    folderId: string;
    folderName: string;
    workflowCount: number;
  }>;
  recentAssignments: Array<{
    workflowId: string;
    folderId: string;
    folderName: string;
    assignedAt: string;
  }>;
}

export interface AIRecommendation {
  id: string;
  type: 'action' | 'insight' | 'tip' | 'warning';
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIRecommendationsData {
  recommendations: AIRecommendation[];
  generatedAt: string;
  context: {
    isAdmin: boolean;
    folderCount: number;
    userName: string;
  };
}

export interface UserQuickAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
  enabled: boolean;
}

export interface UserQuickActionsData {
  quickActions: UserQuickAction[];
  permissions: {
    isAdmin: boolean;
    hasEditorPermission: boolean;
    hasExecutorPermission: boolean;
  };
}

export interface SystemStatusData {
  overall: 'operational' | 'degraded' | 'outage';
  services: Array<{
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    icon: string;
  }>;
  uptime: string;
  lastChecked: string;
}

export interface ActivityTimelineData {
  timeline: Array<{
    id: string;
    type: string;
    icon: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
  hasMore: boolean;
}
