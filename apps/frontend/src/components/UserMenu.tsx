'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, LogOut, User as UserIcon, Shield, Settings } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* 사용자 메뉴 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {/* 사용자 아바타 */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
          ) : (
            <span className="text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* 사용자 정보 */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.name}
            {user.role === 'admin' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                <Shield className="w-3 h-3 mr-1" />
                관리자
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>

        {/* 드롭다운 아이콘 */}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* 사용자 정보 (모바일용) */}
          <div className="md:hidden px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-900">{user.name}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>

          {/* 프로필 메뉴 */}
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/profile');
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <UserIcon className="w-4 h-4 mr-3 text-gray-400" />
            프로필
          </button>

          {/* 관리자 전용 메뉴 */}
          {user.role === 'admin' && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin');
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <Shield className="w-4 h-4 mr-3" />
                관리자 대시보드
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/users');
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-3" />
                사용자 관리
              </button>
              <div className="border-t border-gray-100 my-1" />
            </>
          )}

          {/* 로그아웃 */}
          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
