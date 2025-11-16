'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <DashboardHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />

      {/* 사이드바와 메인 콘텐츠 */}
      <div className="flex">
        {/* 좌측 사이드바 */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
