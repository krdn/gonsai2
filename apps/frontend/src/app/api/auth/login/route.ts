import { NextRequest, NextResponse } from 'next/server';
import type { LoginRequest } from '@/types/auth';

/**
 * 로그인 API 엔드포인트
 * POST /api/auth/login
 *
 * 백엔드 API로 프록시
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    // 백엔드 API 호출
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include', // 쿠키 전달을 위해 필요
    });

    // Content-Type 확인 및 안전한 JSON 파싱
    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // 비-JSON 응답 처리 (예: rate limiter의 text/html 응답)
      const text = await response.text();
      data = {
        success: false,
        error: text || '서버 응답 오류가 발생했습니다.',
      };
    }

    // 백엔드에서 설정한 쿠키를 프론트엔드 응답에 전달
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Set-Cookie 헤더가 있으면 복사
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error('[API] Login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
