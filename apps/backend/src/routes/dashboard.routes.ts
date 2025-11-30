/**
 * 사용자 대시보드 API 라우트
 *
 * 로그인 사용자 기반의 개인화된 대시보드 데이터 제공
 * AI 기반 인사이트 및 추천 기능 포함
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware';
import { databaseService } from '../services/database.service';
import { USER_COLLECTION } from '../models/user.model';
import { FOLDER_COLLECTION } from '../models/folder.model';
import {
  FOLDER_PERMISSION_COLLECTION,
  PERMISSION_HIERARCHY,
} from '../models/folder-permission.model';
import { WORKFLOW_FOLDER_COLLECTION } from '../models/workflow-folder.model';
import { ObjectId } from 'mongodb';
import { log } from '../utils/logger';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticateJWT);

/**
 * 사용자 대시보드 개요
 * GET /api/dashboard/overview
 */
router.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const userName = req.userEmail?.split('@')[0] || 'User';

    if (!userId) {
      res.status(401).json({ success: false, message: '인증이 필요합니다' });
      return;
    }

    const db = databaseService.getDb();
    const userObjectId = new ObjectId(userId);
    const isAdmin = userRole === 'admin';

    // 사용자별 접근 가능한 폴더 조회
    let accessibleFolders: ObjectId[] = [];
    let permissionStats: any = {};

    if (isAdmin) {
      // 관리자는 모든 폴더 접근 가능
      const allFolders = await db.collection(FOLDER_COLLECTION).find({}).toArray();
      accessibleFolders = allFolders.map((f) => f._id);
      permissionStats = { admin: allFolders.length };
    } else {
      // 일반 사용자는 권한이 부여된 폴더만
      const permissions = await db
        .collection(FOLDER_PERMISSION_COLLECTION)
        .find({ userId: userObjectId })
        .toArray();
      accessibleFolders = permissions.map((p) => p.folderId);

      // 권한별 통계
      permissionStats = permissions.reduce((acc: any, p: any) => {
        acc[p.permission] = (acc[p.permission] || 0) + 1;
        return acc;
      }, {});
    }

    // 접근 가능한 워크플로우 조회
    const accessibleWorkflows = await db
      .collection(WORKFLOW_FOLDER_COLLECTION)
      .find({ folderId: { $in: accessibleFolders } })
      .toArray();

    // 폴더 정보 조회
    const folderDetails = await db
      .collection(FOLDER_COLLECTION)
      .find({ _id: { $in: accessibleFolders } })
      .toArray();

    // 최근 활동 (사용자가 접근한 폴더의 최근 변경)
    const recentFolderActivity = await db
      .collection(FOLDER_COLLECTION)
      .find({ _id: { $in: accessibleFolders } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    // 현재 시간 기준 인사말 생성
    const hour = new Date().getHours();
    let greeting = '안녕하세요';
    if (hour < 12) greeting = '좋은 아침이에요';
    else if (hour < 18) greeting = '좋은 오후예요';
    else greeting = '좋은 저녁이에요';

    res.json({
      success: true,
      data: {
        user: {
          name: userName,
          role: userRole,
          greeting: `${greeting}, ${userName}님!`,
        },
        summary: {
          totalFolders: accessibleFolders.length,
          totalWorkflows: accessibleWorkflows.length,
          permissionBreakdown: permissionStats,
        },
        folders: folderDetails.map((f: any) => ({
          id: f._id.toString(),
          name: f.name,
          description: f.description,
          workflowCount: accessibleWorkflows.filter((w) => w.folderId.equals(f._id)).length,
          updatedAt: f.updatedAt,
        })),
        recentActivity: recentFolderActivity.map((f: any) => ({
          type: 'folder_update',
          folderId: f._id.toString(),
          folderName: f.name,
          timestamp: f.updatedAt,
        })),
      },
    });
  } catch (error) {
    log.error('사용자 대시보드 개요 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '대시보드 데이터 조회에 실패했습니다',
    });
  }
});

/**
 * 사용자별 워크플로우 통계
 * GET /api/dashboard/workflow-stats
 */
router.get('/workflow-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      res.status(401).json({ success: false, message: '인증이 필요합니다' });
      return;
    }

    const db = databaseService.getDb();
    const userObjectId = new ObjectId(userId);
    const isAdmin = userRole === 'admin';

    // 접근 가능한 폴더 ID 수집
    let accessibleFolderIds: ObjectId[] = [];

    if (isAdmin) {
      const allFolders = await db.collection(FOLDER_COLLECTION).find({}).toArray();
      accessibleFolderIds = allFolders.map((f) => f._id);
    } else {
      const permissions = await db
        .collection(FOLDER_PERMISSION_COLLECTION)
        .find({ userId: userObjectId })
        .toArray();
      accessibleFolderIds = permissions.map((p) => p.folderId);
    }

    // 폴더별 워크플로우 통계
    const folderWorkflowStats = await db
      .collection(WORKFLOW_FOLDER_COLLECTION)
      .aggregate([
        { $match: { folderId: { $in: accessibleFolderIds } } },
        { $group: { _id: '$folderId', count: { $sum: 1 } } },
        {
          $lookup: {
            from: FOLDER_COLLECTION,
            localField: '_id',
            foreignField: '_id',
            as: 'folder',
          },
        },
        { $unwind: { path: '$folder', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            folderId: { $toString: '$_id' },
            folderName: { $ifNull: ['$folder.name', 'Unknown'] },
            workflowCount: '$count',
            _id: 0,
          },
        },
        { $sort: { workflowCount: -1 } },
      ])
      .toArray();

    // 최근 할당된 워크플로우
    const recentAssignments = await db
      .collection(WORKFLOW_FOLDER_COLLECTION)
      .aggregate([
        { $match: { folderId: { $in: accessibleFolderIds } } },
        { $sort: { assignedAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: FOLDER_COLLECTION,
            localField: 'folderId',
            foreignField: '_id',
            as: 'folder',
          },
        },
        { $unwind: { path: '$folder', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    res.json({
      success: true,
      data: {
        totalWorkflows: folderWorkflowStats.reduce((sum, f) => sum + f.workflowCount, 0),
        folderStats: folderWorkflowStats,
        recentAssignments: recentAssignments.map((a: any) => ({
          workflowId: a.workflowId,
          folderId: a.folderId.toString(),
          folderName: a.folder?.name || 'Unknown',
          assignedAt: a.assignedAt,
        })),
      },
    });
  } catch (error) {
    log.error('워크플로우 통계 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '워크플로우 통계 조회에 실패했습니다',
    });
  }
});

/**
 * AI 기반 개인화 추천
 * GET /api/dashboard/ai-recommendations
 */
router.get('/ai-recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const userName = req.userEmail?.split('@')[0] || 'User';

    if (!userId) {
      res.status(401).json({ success: false, message: '인증이 필요합니다' });
      return;
    }

    const db = databaseService.getDb();
    const userObjectId = new ObjectId(userId);
    const isAdmin = userRole === 'admin';

    // 사용자 데이터 수집
    const userPermissions = await db
      .collection(FOLDER_PERMISSION_COLLECTION)
      .find({ userId: userObjectId })
      .toArray();

    const totalFolders = await db.collection(FOLDER_COLLECTION).countDocuments();
    const userFolderCount = isAdmin ? totalFolders : userPermissions.length;

    // AI 추천 생성
    const recommendations: Array<{
      id: string;
      type: 'action' | 'insight' | 'tip' | 'warning';
      icon: string;
      title: string;
      description: string;
      actionText?: string;
      actionHref?: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // 관리자별 추천
    if (isAdmin) {
      recommendations.push({
        id: 'admin-overview',
        type: 'tip',
        icon: '👑',
        title: '관리자 전용 대시보드',
        description: '전체 시스템 현황을 한눈에 확인할 수 있는 관리자 대시보드를 활용하세요.',
        actionText: '관리자 대시보드 열기',
        actionHref: '/admin/dashboard',
        priority: 'medium',
      });

      // 사용자 관리 추천
      const inactiveUsers = await db
        .collection(USER_COLLECTION)
        .countDocuments({ isActive: false });

      if (inactiveUsers > 0) {
        recommendations.push({
          id: 'inactive-users',
          type: 'warning',
          icon: '⚠️',
          title: `비활성 사용자 ${inactiveUsers}명`,
          description: '비활성화된 사용자 계정을 검토하고 필요시 삭제 또는 재활성화하세요.',
          actionText: '사용자 관리',
          actionHref: '/admin/users',
          priority: 'high',
        });
      }
    }

    // 일반 사용자용 추천
    if (!isAdmin) {
      // 권한이 없는 경우 안내
      if (userPermissions.length === 0) {
        recommendations.push({
          id: 'no-access',
          type: 'warning',
          icon: '🔒',
          title: '폴더 접근 권한 없음',
          description: '현재 접근 가능한 폴더가 없습니다. 관리자에게 권한을 요청하세요.',
          priority: 'high',
        });
      } else {
        // 접근 가능한 폴더 안내
        recommendations.push({
          id: 'folder-access',
          type: 'insight',
          icon: '📁',
          title: `${userFolderCount}개 폴더 접근 가능`,
          description: '할당된 폴더에서 워크플로우를 관리하고 실행할 수 있습니다.',
          actionText: '폴더 목록 보기',
          actionHref: '/folders',
          priority: 'medium',
        });
      }

      // 권한 레벨별 팁
      const highestPermission = userPermissions.reduce((max: string, p: any) => {
        const currentLevel =
          PERMISSION_HIERARCHY[p.permission as keyof typeof PERMISSION_HIERARCHY] || 0;
        const maxLevel = PERMISSION_HIERARCHY[max as keyof typeof PERMISSION_HIERARCHY] || 0;
        return currentLevel > maxLevel ? p.permission : max;
      }, 'viewer');

      if (highestPermission === 'viewer') {
        recommendations.push({
          id: 'viewer-tip',
          type: 'tip',
          icon: '👁️',
          title: '뷰어 권한 활용 팁',
          description: '워크플로우를 조회하고 실행 결과를 모니터링할 수 있습니다.',
          priority: 'low',
        });
      } else if (highestPermission === 'executor') {
        recommendations.push({
          id: 'executor-tip',
          type: 'tip',
          icon: '▶️',
          title: '실행자 권한 활용 팁',
          description: '워크플로우를 직접 실행하고 결과를 확인할 수 있습니다.',
          actionText: '워크플로우 실행',
          actionHref: '/workflows',
          priority: 'low',
        });
      } else if (highestPermission === 'editor') {
        recommendations.push({
          id: 'editor-tip',
          type: 'tip',
          icon: '✏️',
          title: '편집자 권한 활용 팁',
          description: '워크플로우를 수정하고 새로운 자동화를 구축할 수 있습니다.',
          actionText: '워크플로우 편집',
          actionHref: '/workflows',
          priority: 'low',
        });
      }
    }

    // 시스템 팁 (모든 사용자)
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      recommendations.push({
        id: 'late-night-tip',
        type: 'tip',
        icon: '🌙',
        title: '야간 작업 알림',
        description: '늦은 시간 작업 중이시네요. 중요한 변경사항은 낮에 다시 확인하세요.',
        priority: 'low',
      });
    }

    // 월요일 인사이트
    if (new Date().getDay() === 1) {
      recommendations.push({
        id: 'monday-insight',
        type: 'insight',
        icon: '📊',
        title: '주간 시작',
        description: '새로운 주가 시작되었습니다. 이번 주 작업 계획을 세워보세요.',
        priority: 'low',
      });
    }

    // 우선순위 순으로 정렬
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({
      success: true,
      data: {
        recommendations: recommendations.slice(0, 6), // 최대 6개
        generatedAt: new Date().toISOString(),
        context: {
          isAdmin,
          folderCount: userFolderCount,
          userName,
        },
      },
    });
  } catch (error) {
    log.error('AI 추천 생성 오류', error);
    res.status(500).json({
      success: false,
      message: 'AI 추천 생성에 실패했습니다',
    });
  }
});

/**
 * 빠른 액션 목록
 * GET /api/dashboard/quick-actions
 */
router.get('/quick-actions', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      res.status(401).json({ success: false, message: '인증이 필요합니다' });
      return;
    }

    const db = databaseService.getDb();
    const userObjectId = new ObjectId(userId);
    const isAdmin = userRole === 'admin';

    // 사용자 권한 조회
    const userPermissions = await db
      .collection(FOLDER_PERMISSION_COLLECTION)
      .find({ userId: userObjectId })
      .toArray();

    const hasEditorPermission =
      isAdmin || userPermissions.some((p) => ['editor', 'admin'].includes(p.permission));
    const hasExecutorPermission =
      isAdmin ||
      userPermissions.some((p) => ['executor', 'editor', 'admin'].includes(p.permission));

    // 빠른 액션 생성
    const quickActions: Array<{
      id: string;
      icon: string;
      title: string;
      description: string;
      href: string;
      color: string;
      enabled: boolean;
    }> = [];

    // 워크플로우 목록 (모든 사용자)
    quickActions.push({
      id: 'view-workflows',
      icon: '📋',
      title: '워크플로우 목록',
      description: '모든 워크플로우 확인',
      href: '/workflows',
      color: 'blue',
      enabled: true,
    });

    // 워크플로우 실행 (executor 이상)
    quickActions.push({
      id: 'run-workflow',
      icon: '▶️',
      title: '워크플로우 실행',
      description: '워크플로우 수동 실행',
      href: '/workflows',
      color: 'green',
      enabled: hasExecutorPermission,
    });

    // 모니터링 (모든 사용자)
    quickActions.push({
      id: 'monitoring',
      icon: '📊',
      title: '실시간 모니터링',
      description: '시스템 상태 확인',
      href: '/monitoring',
      color: 'purple',
      enabled: true,
    });

    // 실행 기록 (모든 사용자)
    quickActions.push({
      id: 'executions',
      icon: '📜',
      title: '실행 기록',
      description: '과거 실행 내역 조회',
      href: '/executions',
      color: 'orange',
      enabled: true,
    });

    // 관리자 전용
    if (isAdmin) {
      quickActions.push({
        id: 'admin-users',
        icon: '👥',
        title: '사용자 관리',
        description: '사용자 계정 관리',
        href: '/admin/users',
        color: 'red',
        enabled: true,
      });

      quickActions.push({
        id: 'admin-folders',
        icon: '📁',
        title: '폴더 관리',
        description: '폴더 및 권한 설정',
        href: '/admin/folders',
        color: 'yellow',
        enabled: true,
      });
    }

    res.json({
      success: true,
      data: {
        quickActions: quickActions.filter((a) => a.enabled),
        permissions: {
          isAdmin,
          hasEditorPermission,
          hasExecutorPermission,
        },
      },
    });
  } catch (error) {
    log.error('빠른 액션 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '빠른 액션 조회에 실패했습니다',
    });
  }
});

/**
 * 시스템 상태 요약 (사용자용)
 * GET /api/dashboard/system-status
 */
router.get('/system-status', async (_req: Request, res: Response): Promise<void> => {
  try {
    // MongoDB 연결 상태 확인
    const mongoStatus = databaseService.isConnected() ? 'healthy' : 'unhealthy';

    // 업타임
    const uptime = process.uptime();
    const formatUptime = (seconds: number) => {
      const days = Math.floor(seconds / (24 * 60 * 60));
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((seconds % (60 * 60)) / 60);
      if (days > 0) return `${days}일 ${hours}시간`;
      if (hours > 0) return `${hours}시간 ${minutes}분`;
      return `${minutes}분`;
    };

    res.json({
      success: true,
      data: {
        overall: mongoStatus === 'healthy' ? 'operational' : 'degraded',
        services: [
          { name: 'API 서버', status: 'operational', icon: '🖥️' },
          {
            name: '데이터베이스',
            status: mongoStatus === 'healthy' ? 'operational' : 'degraded',
            icon: '🗄️',
          },
          { name: 'WebSocket', status: 'operational', icon: '🔌' },
        ],
        uptime: formatUptime(uptime),
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('시스템 상태 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '시스템 상태 조회에 실패했습니다',
    });
  }
});

/**
 * 사용자 활동 타임라인
 * GET /api/dashboard/activity-timeline
 */
router.get('/activity-timeline', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;

    if (!userId) {
      res.status(401).json({ success: false, message: '인증이 필요합니다' });
      return;
    }

    const db = databaseService.getDb();
    const userObjectId = new ObjectId(userId);
    const isAdmin = userRole === 'admin';

    // 사용자가 접근 가능한 폴더
    let accessibleFolderIds: ObjectId[] = [];

    if (isAdmin) {
      const allFolders = await db.collection(FOLDER_COLLECTION).find({}).toArray();
      accessibleFolderIds = allFolders.map((f) => f._id);
    } else {
      const permissions = await db
        .collection(FOLDER_PERMISSION_COLLECTION)
        .find({ userId: userObjectId })
        .toArray();
      accessibleFolderIds = permissions.map((p) => p.folderId);
    }

    // 최근 폴더 변경 사항
    const recentFolderChanges = await db
      .collection(FOLDER_COLLECTION)
      .find({ _id: { $in: accessibleFolderIds } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray();

    // 최근 워크플로우 할당
    const recentWorkflowAssignments = await db
      .collection(WORKFLOW_FOLDER_COLLECTION)
      .aggregate([
        { $match: { folderId: { $in: accessibleFolderIds } } },
        { $sort: { assignedAt: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: FOLDER_COLLECTION,
            localField: 'folderId',
            foreignField: '_id',
            as: 'folder',
          },
        },
        { $unwind: { path: '$folder', preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    // 타임라인 생성
    const timeline: Array<{
      id: string;
      type: string;
      icon: string;
      title: string;
      description: string;
      timestamp: Date;
    }> = [];

    recentFolderChanges.forEach((folder: any) => {
      timeline.push({
        id: `folder-${folder._id}`,
        type: 'folder_update',
        icon: '📁',
        title: `폴더 업데이트: ${folder.name}`,
        description: folder.description || '폴더 정보가 변경되었습니다',
        timestamp: folder.updatedAt,
      });
    });

    recentWorkflowAssignments.forEach((assignment: any) => {
      timeline.push({
        id: `workflow-${assignment._id}`,
        type: 'workflow_assignment',
        icon: '🔗',
        title: `워크플로우 할당`,
        description: `${assignment.folder?.name || 'Unknown'} 폴더에 워크플로우가 할당됨`,
        timestamp: assignment.assignedAt,
      });
    });

    // 시간순 정렬
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: {
        timeline: timeline.slice(0, 10),
        hasMore: timeline.length > 10,
      },
    });
  } catch (error) {
    log.error('활동 타임라인 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '활동 타임라인 조회에 실패했습니다',
    });
  }
});

export default router;
