'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Workflow } from 'lucide-react';
import { UserMenu } from './UserMenu';

const navigation = [
  { name: 'Workflows', href: '/workflows' },
  { name: 'Executions', href: '/executions' },
  { name: 'Monitoring', href: '/monitoring' },
  { name: 'Agents', href: '/agents' },
];

export function DashboardHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 및 네비게이션 */}
          <div className="flex items-center">
            {/* 로고 */}
            <Link href="/workflows" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Gonsai2</span>
            </Link>

            {/* 네비게이션 메뉴 */}
            <nav className="hidden md:ml-10 md:flex md:space-x-1">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 사용자 메뉴 */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
