import { NextRequest, NextResponse } from 'next/server';

/**
 * 로그아웃 API 엔드포인트
 * POST /api/auth/logout
 *
 * 백엔드 API로 프록시
 */
export async function POST(request: NextRequest) {
  try {
    // 백엔드 API 호출
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // 쿠키 전달을 위해 필요
    });

    const data = await response.json();

    // 백엔드에서 설정한 쿠키를 프론트엔드 응답에 전달
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Set-Cookie 헤더가 있으면 복사 (쿠키 삭제 헤더)
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      nextResponse.headers.set('set-cookie', setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error('[API] Logout error:', error);
    return NextResponse.json(
      { success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
