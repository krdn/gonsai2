/**
 * 관리자 대시보드 API 라우트
 *
 * 관리자 전용 통계, 분석, 모니터링 API
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT, requireAdmin } from '../middleware';
import { databaseService } from '../services/database.service';
import { USER_COLLECTION } from '../models/user.model';
import { FOLDER_COLLECTION } from '../models/folder.model';
import { FOLDER_PERMISSION_COLLECTION } from '../models/folder-permission.model';
import { WORKFLOW_FOLDER_COLLECTION } from '../models/workflow-folder.model';
import { log } from '../utils/logger';

const router = Router();

// 모든 라우트에 인증 및 관리자 권한 필요
router.use(authenticateJWT);
router.use(requireAdmin());

/**
 * 대시보드 개요 통계
 * GET /api/admin/dashboard/overview
 */
router.get('/dashboard/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = databaseService.getDb();
    const usersCollection = db.collection(USER_COLLECTION);
    const foldersCollection = db.collection(FOLDER_COLLECTION);
    const permissionsCollection = db.collection(FOLDER_PERMISSION_COLLECTION);
    const workflowFoldersCollection = db.collection(WORKFLOW_FOLDER_COLLECTION);

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalFolders,
      totalPermissions,
      totalWorkflowAssignments,
      recentUsers,
      usersByRole,
      usersByMonth,
    ] = await Promise.all([
      // 총 사용자 수
      usersCollection.countDocuments(),
      // 활성 사용자 수
      usersCollection.countDocuments({ isActive: { $ne: false } }),
      // 관리자 수
      usersCollection.countDocuments({ role: 'admin' }),
      // 총 폴더 수
      foldersCollection.countDocuments(),
      // 총 권한 설정 수
      permissionsCollection.countDocuments(),
      // 총 워크플로우 할당 수
      workflowFoldersCollection.countDocuments(),
      // 최근 가입 사용자 (7일)
      usersCollection.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      // 역할별 사용자 분포
      usersCollection
        .aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $project: { role: '$_id', count: 1, _id: 0 } },
        ])
        .toArray(),
      // 월별 가입자 추이 (최근 6개월)
      usersCollection
        .aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
          {
            $project: {
              month: {
                $concat: [
                  { $toString: '$_id.year' },
                  '-',
                  {
                    $cond: {
                      if: { $lt: ['$_id.month', 10] },
                      then: { $concat: ['0', { $toString: '$_id.month' }] },
                      else: { $toString: '$_id.month' },
                    },
                  },
                ],
              },
              count: 1,
              _id: 0,
            },
          },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
          admins: adminUsers,
          regularUsers: totalUsers - adminUsers,
          recentSignups: recentUsers,
        },
        folders: {
          total: totalFolders,
          permissions: totalPermissions,
          workflowAssignments: totalWorkflowAssignments,
        },
        charts: {
          usersByRole: usersByRole,
          usersByMonth: usersByMonth,
        },
      },
    });
  } catch (error) {
    log.error('대시보드 개요 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '대시보드 통계 조회에 실패했습니다',
    });
  }
});

/**
 * 사용자 활동 통계
 * GET /api/admin/dashboard/user-activity
 */
router.get('/dashboard/user-activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const db = databaseService.getDb();
    const usersCollection = db.collection(USER_COLLECTION);

    const [dailySignups, userStatusDistribution, recentlyActiveUsers] = await Promise.all([
      // 일별 가입자 수
      usersCollection
        .aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { date: '$_id', count: 1, _id: 0 } },
        ])
        .toArray(),
      // 사용자 상태 분포
      usersCollection
        .aggregate([
          {
            $group: {
              _id: { $ifNull: ['$isActive', true] },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              status: { $cond: { if: '$_id', then: 'active', else: 'inactive' } },
              count: 1,
              _id: 0,
            },
          },
        ])
        .toArray(),
      // 최근 업데이트된 사용자
      usersCollection.find({}).sort({ updatedAt: -1 }).limit(10).project({ password: 0 }).toArray(),
    ]);

    res.json({
      success: true,
      data: {
        dailySignups,
        userStatusDistribution,
        recentlyActiveUsers: recentlyActiveUsers.map((user: any) => ({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive !== false,
          lastActivity: user.updatedAt,
        })),
      },
    });
  } catch (error) {
    log.error('사용자 활동 통계 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '사용자 활동 통계 조회에 실패했습니다',
    });
  }
});

/**
 * 폴더 및 권한 통계
 * GET /api/admin/dashboard/folder-stats
 */
router.get('/dashboard/folder-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = databaseService.getDb();
    const foldersCollection = db.collection(FOLDER_COLLECTION);
    const permissionsCollection = db.collection(FOLDER_PERMISSION_COLLECTION);
    const usersCollection = db.collection(USER_COLLECTION);

    const [
      permissionsByLevel,
      topFoldersWithPermissions,
      foldersWithoutPermissions,
      usersWithoutFolderAccess,
    ] = await Promise.all([
      // 권한 레벨별 분포
      permissionsCollection
        .aggregate([
          { $group: { _id: '$permission', count: { $sum: 1 } } },
          { $project: { level: '$_id', count: 1, _id: 0 } },
        ])
        .toArray(),
      // 가장 많은 권한이 설정된 폴더 Top 10
      permissionsCollection
        .aggregate([
          { $group: { _id: '$folderId', permissionCount: { $sum: 1 } } },
          { $sort: { permissionCount: -1 } },
          { $limit: 10 },
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
              permissionCount: 1,
              _id: 0,
            },
          },
        ])
        .toArray(),
      // 권한이 설정되지 않은 폴더 수
      foldersCollection
        .aggregate([
          {
            $lookup: {
              from: FOLDER_PERMISSION_COLLECTION,
              localField: '_id',
              foreignField: 'folderId',
              as: 'permissions',
            },
          },
          { $match: { permissions: { $size: 0 } } },
          { $count: 'count' },
        ])
        .toArray(),
      // 폴더 접근 권한이 없는 사용자 수
      usersCollection
        .aggregate([
          { $match: { role: { $ne: 'admin' } } },
          {
            $lookup: {
              from: FOLDER_PERMISSION_COLLECTION,
              localField: '_id',
              foreignField: 'userId',
              as: 'permissions',
            },
          },
          { $match: { permissions: { $size: 0 } } },
          { $count: 'count' },
        ])
        .toArray(),
    ]);

    res.json({
      success: true,
      data: {
        permissionsByLevel,
        topFoldersWithPermissions,
        foldersWithoutPermissions: foldersWithoutPermissions[0]?.count || 0,
        usersWithoutFolderAccess: usersWithoutFolderAccess[0]?.count || 0,
      },
    });
  } catch (error) {
    log.error('폴더 통계 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '폴더 통계 조회에 실패했습니다',
    });
  }
});

/**
 * 시스템 상태 및 헬스 체크
 * GET /api/admin/dashboard/system-health
 */
router.get('/dashboard/system-health', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();

    // MongoDB 연결 상태 확인
    const mongoStatus = databaseService.isConnected() ? 'healthy' : 'unhealthy';
    const mongoLatency = Date.now() - startTime;

    // 메모리 사용량
    const memoryUsage = process.memoryUsage();
    const formatBytes = (bytes: number) => {
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    // 업타임
    const uptime = process.uptime();
    const formatUptime = (seconds: number) => {
      const days = Math.floor(seconds / (24 * 60 * 60));
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((seconds % (60 * 60)) / 60);
      return `${days}d ${hours}h ${minutes}m`;
    };

    // 데이터베이스 통계
    let dbStats: any = {
      collections: 0,
      objects: 0,
      dataSize: 0,
      indexSize: 0,
    };

    try {
      const db = databaseService.getDb();
      dbStats = await db.stats();
    } catch (e) {
      log.warn('DB 통계 조회 실패', e instanceof Error ? { message: e.message } : undefined);
    }

    res.json({
      success: true,
      data: {
        services: [
          {
            name: 'MongoDB',
            status: mongoStatus,
            latency: `${mongoLatency}ms`,
          },
          {
            name: 'Backend API',
            status: 'healthy',
            latency: '0ms',
          },
        ],
        memory: {
          heapUsed: formatBytes(memoryUsage.heapUsed),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          external: formatBytes(memoryUsage.external),
          rss: formatBytes(memoryUsage.rss),
          usagePercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1),
        },
        uptime: formatUptime(uptime),
        uptimeSeconds: uptime,
        database: {
          collections: dbStats?.collections || 0,
          documents: dbStats?.objects || 0,
          dataSize: formatBytes(dbStats?.dataSize || 0),
          indexSize: formatBytes(dbStats?.indexSize || 0),
        },
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
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
 * 감사 로그 (사용자 활동 기반)
 * GET /api/admin/dashboard/audit-log
 */
router.get('/dashboard/audit-log', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const db = databaseService.getDb();
    const usersCollection = db.collection(USER_COLLECTION);
    const permissionsCollection = db.collection(FOLDER_PERMISSION_COLLECTION);

    // 최근 사용자 변경 기록 (createdAt, updatedAt 기반)
    const [recentUserChanges, totalCount, recentPermissionChanges] = await Promise.all([
      usersCollection
        .find({})
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({ password: 0 })
        .toArray(),
      usersCollection.countDocuments(),
      // 최근 폴더 권한 변경
      permissionsCollection
        .aggregate([
          { $sort: { updatedAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: USER_COLLECTION,
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
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
        .toArray(),
    ]);

    res.json({
      success: true,
      data: {
        userChanges: recentUserChanges.map((user: any) => ({
          id: user._id.toString(),
          type: 'user',
          action: user.createdAt.getTime() === user.updatedAt.getTime() ? 'created' : 'updated',
          targetName: user.name,
          targetEmail: user.email,
          timestamp: user.updatedAt,
        })),
        permissionChanges: recentPermissionChanges.map((perm: any) => ({
          id: perm._id.toString(),
          type: 'permission',
          action: 'granted',
          userName: perm.user?.name || 'Unknown',
          folderName: perm.folder?.name || 'Unknown',
          permission: perm.permission,
          timestamp: perm.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    log.error('감사 로그 조회 오류', error);
    res.status(500).json({
      success: false,
      message: '감사 로그 조회에 실패했습니다',
    });
  }
});

/**
 * AI 인사이트 생성 (통계 기반 인사이트)
 * GET /api/admin/dashboard/ai-insights
 */
router.get('/dashboard/ai-insights', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = databaseService.getDb();
    const usersCollection = db.collection(USER_COLLECTION);
    const foldersCollection = db.collection(FOLDER_COLLECTION);
    const permissionsCollection = db.collection(FOLDER_PERMISSION_COLLECTION);

    const [
      totalUsers,
      activeUsers,
      recentSignups,
      adminCount,
      foldersWithoutPerms,
      usersWithoutAccess,
    ] = await Promise.all([
      usersCollection.countDocuments(),
      usersCollection.countDocuments({ isActive: { $ne: false } }),
      usersCollection.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      usersCollection.countDocuments({ role: 'admin' }),
      foldersCollection
        .aggregate([
          {
            $lookup: {
              from: FOLDER_PERMISSION_COLLECTION,
              localField: '_id',
              foreignField: 'folderId',
              as: 'permissions',
            },
          },
          { $match: { permissions: { $size: 0 } } },
          { $count: 'count' },
        ])
        .toArray(),
      usersCollection
        .aggregate([
          { $match: { role: { $ne: 'admin' } } },
          {
            $lookup: {
              from: FOLDER_PERMISSION_COLLECTION,
              localField: '_id',
              foreignField: 'userId',
              as: 'permissions',
            },
          },
          { $match: { permissions: { $size: 0 } } },
          { $count: 'count' },
        ])
        .toArray(),
    ]);

    const insights: Array<{
      type: 'success' | 'warning' | 'info' | 'danger';
      title: string;
      description: string;
      metric?: string;
      action?: string;
    }> = [];

    // 성장률 인사이트
    if (recentSignups > 0) {
      const growthRate = ((recentSignups / totalUsers) * 100).toFixed(1);
      insights.push({
        type: 'info',
        title: '최근 7일 사용자 성장',
        description: `지난 7일간 ${recentSignups}명의 새로운 사용자가 가입했습니다.`,
        metric: `+${growthRate}%`,
      });
    }

    // 활성화율 인사이트
    const activeRate = totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0';
    if (parseFloat(activeRate) < 80) {
      insights.push({
        type: 'warning',
        title: '사용자 활성화율 개선 필요',
        description: `현재 사용자 활성화율이 ${activeRate}%입니다. 비활성 사용자를 확인해보세요.`,
        metric: `${activeRate}%`,
        action: '비활성 사용자 관리',
      });
    } else {
      insights.push({
        type: 'success',
        title: '높은 사용자 활성화율',
        description: `사용자 활성화율이 ${activeRate}%로 양호합니다.`,
        metric: `${activeRate}%`,
      });
    }

    // 관리자 비율 인사이트
    const adminRate = totalUsers > 0 ? ((adminCount / totalUsers) * 100).toFixed(1) : '0';
    if (parseFloat(adminRate) > 20) {
      insights.push({
        type: 'warning',
        title: '높은 관리자 비율',
        description: `관리자 비율이 ${adminRate}%로 높습니다. 보안을 위해 검토가 필요할 수 있습니다.`,
        metric: `${adminCount}명`,
        action: '관리자 권한 검토',
      });
    }

    // 권한 미설정 폴더 인사이트
    const noPermFolders = foldersWithoutPerms[0]?.count || 0;
    if (noPermFolders > 0) {
      insights.push({
        type: 'info',
        title: '권한 미설정 폴더',
        description: `${noPermFolders}개의 폴더에 권한이 설정되지 않았습니다.`,
        metric: `${noPermFolders}개`,
        action: '폴더 권한 설정',
      });
    }

    // 폴더 접근 권한 없는 사용자 인사이트
    const noAccessUsers = usersWithoutAccess[0]?.count || 0;
    if (noAccessUsers > 0) {
      insights.push({
        type: 'warning',
        title: '폴더 접근 권한 없는 사용자',
        description: `${noAccessUsers}명의 일반 사용자가 어떤 폴더에도 접근할 수 없습니다.`,
        metric: `${noAccessUsers}명`,
        action: '권한 부여 필요',
      });
    }

    res.json({
      success: true,
      data: {
        insights,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('AI 인사이트 생성 오류', error);
    res.status(500).json({
      success: false,
      message: 'AI 인사이트 생성에 실패했습니다',
    });
  }
});

/**
 * 빠른 액션 (관리자 작업)
 * GET /api/admin/dashboard/quick-actions
 */
router.get('/dashboard/quick-actions', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = databaseService.getDb();
    const usersCollection = db.collection(USER_COLLECTION);
    const foldersCollection = db.collection(FOLDER_COLLECTION);

    const [inactiveUsersCount, foldersWithoutPermsResult, recentNewUsers] = await Promise.all([
      // 비활성 사용자 수
      usersCollection.countDocuments({ isActive: false }),
      // 권한 없는 폴더 수
      foldersCollection
        .aggregate([
          {
            $lookup: {
              from: FOLDER_PERMISSION_COLLECTION,
              localField: '_id',
              foreignField: 'folderId',
              as: 'permissions',
            },
          },
          { $match: { permissions: { $size: 0 } } },
          { $count: 'count' },
        ])
        .toArray(),
      // 최근 생성된 사용자 (검토 필요)
      usersCollection
        .find({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        })
        .project({ password: 0 })
        .toArray(),
    ]);

    const foldersWithoutPerms = foldersWithoutPermsResult[0]?.count || 0;

    const quickActions = [
      {
        id: 'review-inactive-users',
        title: '비활성 사용자 검토',
        description: '비활성화된 사용자 계정을 확인하세요',
        count: inactiveUsersCount,
        priority: inactiveUsersCount > 0 ? 'medium' : 'low',
        href: '/admin/users?filter=inactive',
      },
      {
        id: 'setup-folder-permissions',
        title: '폴더 권한 설정',
        description: '권한이 없는 폴더에 접근 권한을 설정하세요',
        count: foldersWithoutPerms,
        priority: foldersWithoutPerms > 0 ? 'high' : 'low',
        href: '/admin/folders/permissions',
      },
      {
        id: 'review-new-users',
        title: '신규 사용자 검토',
        description: '최근 24시간 내 가입한 사용자를 확인하세요',
        count: recentNewUsers.length,
        priority: recentNewUsers.length > 0 ? 'medium' : 'low',
        href: '/admin/users?filter=recent',
      },
    ];

    res.json({
      success: true,
      data: {
        quickActions: quickActions.filter(
          (action) => action.count > 0 || action.priority !== 'low'
        ),
        recentUsers: recentNewUsers.map((user: any) => ({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        })),
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

export default router;
