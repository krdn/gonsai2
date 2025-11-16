'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Eye,
  Users,
  Bot,
  ChevronDown,
  ChevronRight,
  Home,
  LucideIcon,
  X,
  Tags,
  Tag,
} from 'lucide-react';
import { useTagList } from '@/hooks/useTags';
import { workflowsApi } from '@/lib/api-client';

interface NavigationItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  children?: {
    name: string;
    href: string;
    icon: LucideIcon;
    count?: number;
  }[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// 정적 네비게이션 항목 (Tags는 동적으로 추가)
const staticNavigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
  },
  {
    name: 'AI Agents',
    href: '/ai-agents',
    icon: Bot,
  },
  {
    name: 'Admin',
    icon: LayoutDashboard,
    children: [
      { name: 'Workflows', href: '/workflows', icon: Workflow },
      { name: 'Executions', href: '/executions', icon: Activity },
      { name: 'Monitoring', href: '/monitoring', icon: Eye },
      { name: 'Agents', href: '/agents', icon: Users },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Admin']);
  const [workflows, setWorkflows] = useState<any[]>([]);

  // n8n 태그 목록 가져오기 (30초마다 자동 갱신)
  const tags = useTagList(30000);

  // 워크플로우 목록 가져오기
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const data = await workflowsApi.list();
        setWorkflows(data.data || []);
      } catch (error) {
        console.error('워크플로우 조회 오류:', error);
      }
    };

    loadWorkflows();
    // 30초마다 자동 갱신
    const interval = setInterval(loadWorkflows, 30000);
    return () => clearInterval(interval);
  }, []);

  // 각 태그별 워크플로우 개수 계산
  const getTagWorkflowCount = (tagId: string): number => {
    return workflows.filter((workflow) => workflow.tags?.some((tag: any) => tag.id === tagId))
      .length;
  };

  // 동적 네비게이션 생성 (Tags 폴더 포함)
  const navigation: NavigationItem[] = React.useMemo(() => {
    const tagsNavItem: NavigationItem = {
      name: 'Tags',
      icon: Tags,
      href: '/workflows', // Tags 클릭 시 워크플로우 페이지로 이동
      children: tags.map((tag) => ({
        name: tag.name,
        href: `/workflows?tag=${encodeURIComponent(tag.id)}`, // 태그별 필터링
        icon: Tag,
        count: getTagWorkflowCount(tag.id),
      })),
    };

    return [...staticNavigation, tagsNavItem];
  }, [tags, workflows]);

  // ESC 키로 사이드바 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // 사이드바 열렸을 때 배경 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // 클린업: 컴포넌트 언마운트 시 원래 상태로 복원
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:block
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* 모바일 닫기 버튼 */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="사이드바 닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;

            // 자식 메뉴가 없는 최상위 메뉴 항목
            if (!item.children) {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href!}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            }

            // 자식 메뉴가 있는 부모 메뉴 항목
            const isExpanded = expandedItems.includes(item.name);
            const hasHref = !!item.href;

            return (
              <div key={item.name}>
                {/* 부모 메뉴 */}
                {hasHref ? (
                  <Link
                    href={item.href!}
                    onClick={() => toggleExpanded(item.name)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}

                {/* 자식 메뉴 */}
                {isExpanded && item.children && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isActive = pathname.startsWith(child.href);
                      const ChildIcon = child.icon;

                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <ChildIcon className="w-4 h-4" />
                            <span>{child.name}</span>
                          </div>
                          {child.count !== undefined && (
                            <span className="text-xs text-gray-400">{child.count}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
