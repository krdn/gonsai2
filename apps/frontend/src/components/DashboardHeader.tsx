'use client';

import React from 'react';
import Link from 'next/link';
import { Workflow } from 'lucide-react';
import { UserMenu } from './UserMenu';

export function DashboardHeader() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link href="/workflows" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Gonsai2</span>
          </Link>

          {/* 사용자 메뉴 */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
