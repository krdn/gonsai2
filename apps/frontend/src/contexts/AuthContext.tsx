'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthContextType, User, LoginResponse, SignupResponse } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // 초기 로드 시 로컬 스토리지에서 사용자 정보 복원
  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('[Auth] Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  // 서버 렌더링 시 항상 로그아웃 상태로 렌더링 (Hydration 에러 방지)
  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          isLoading: false,
          isAuthenticated: false,
          login: async () => {},
          signup: async () => {},
          logout: () => {},
          updateUser: () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '로그인에 실패했습니다.');
      }

      const data: LoginResponse = await response.json();

      // 사용자 정보 및 토큰 저장
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // 대시보드로 리다이렉트
      router.push('/workflows');
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '회원가입에 실패했습니다.');
      }

      const data: SignupResponse = await response.json();

      // 사용자 정보 및 토큰 저장
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // 대시보드로 리다이렉트
      router.push('/workflows');
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('[Auth] Logout started');

    // 클라이언트 측 상태 먼저 정리
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    console.log('[Auth] LocalStorage cleared');

    try {
      // 백엔드 로그아웃 API 호출 (서버 측 쿠키 삭제)
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      console.log('[Auth] Logout API response:', response.status);
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // 에러가 발생해도 클라이언트 측 로그아웃은 진행
    }

    console.log('[Auth] Redirecting to login page');
    // 페이지 강제 새로고침을 통한 완전한 상태 초기화
    // setUser(null)을 호출하지 않고 바로 리다이렉트하여
    // 컴포넌트 언마운트로 인한 리다이렉트 실패 방지
    window.location.replace('/login');
  };

  const updateUser = (data: Partial<User>) => {
    if (!user) return;

    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
