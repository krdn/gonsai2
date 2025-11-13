import { NextRequest, NextResponse } from 'next/server';
import type { SignupRequest } from '@/types/auth';

/**
 * 회원가입 API 엔드포인트
 * POST /api/auth/signup
 *
 * 백엔드 API로 프록시
 */
export async function POST(request: NextRequest) {
  try {
    const body: SignupRequest = await request.json();

    // 백엔드 API 호출
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include', // 쿠키 전달을 위해 필요
    });

    const data = await response.json();

    // 백엔드에서 설정한 쿠키를 프론트엔드 응답에 전달
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Set-Cookie 헤더가 있으면 복사
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error('[API] Signup error:', error);
    return NextResponse.json(
      { success: false, error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
