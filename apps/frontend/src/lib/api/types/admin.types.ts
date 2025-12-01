/**
 * 관리자 대시보드 관련 타입 정의
 */

export interface AdminDashboardOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    regularUsers: number;
    recentSignups: number;
  };
  folders: {
    total: number;
    permissions: number;
    workflowAssignments: number;
  };
  charts: {
    usersByRole: Array<{ role: string; count: number }>;
    usersByMonth: Array<{ month: string; count: number }>;
  };
}

export interface UserActivityData {
  dailySignups: Array<{ date: string; count: number }>;
  userStatusDistribution: Array<{ status: string; count: number }>;
  recentlyActiveUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastActivity: string;
  }>;
}

export interface FolderStatsData {
  permissionsByLevel: Array<{ level: string; count: number }>;
  topFoldersWithPermissions: Array<{
    folderId: string;
    folderName: string;
    permissionCount: number;
  }>;
  foldersWithoutPermissions: number;
  usersWithoutFolderAccess: number;
}

export interface SystemHealthData {
  services: Array<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    latency: string;
  }>;
  memory: {
    heapUsed: string;
    heapTotal: string;
    external: string;
    rss: string;
    usagePercent: string;
  };
  uptime: string;
  uptimeSeconds: number;
  database: {
    collections: number;
    documents: number;
    dataSize: string;
    indexSize: string;
  };
  nodeVersion: string;
  platform: string;
  timestamp: string;
}

export interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  metric?: string;
  action?: string;
}

export interface AIInsightsData {
  insights: AIInsight[];
  generatedAt: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
  href: string;
}

export interface QuickActionsData {
  quickActions: QuickAction[];
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
}

export interface AuditLogData {
  userChanges: Array<{
    id: string;
    type: string;
    action: string;
    targetName: string;
    targetEmail: string;
    timestamp: string;
  }>;
  permissionChanges: Array<{
    id: string;
    type: string;
    action: string;
    userName: string;
    folderName: string;
    permission: string;
    timestamp: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
