'use client';

import React from 'react';
import Link from 'next/link';
import { Workflow } from 'lucide-react';
import { UserMenu } from './UserMenu';
import HamburgerIcon from './HamburgerIcon';

interface DashboardHeaderProps {
  onMenuClick: () => void;
  isOpen?: boolean;
}

export function DashboardHeader({ onMenuClick, isOpen = false }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            {/* 햄버거 메뉴 버튼 (모바일에서만 표시) */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="메뉴"
              aria-expanded={isOpen}
            >
              <HamburgerIcon isOpen={isOpen} />
            </button>

            {/* 로고 */}
            <Link href="/workflows" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Gonsai2</span>
            </Link>
          </div>

          {/* 사용자 메뉴 */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
