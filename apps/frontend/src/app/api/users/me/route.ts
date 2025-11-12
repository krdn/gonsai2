import { NextRequest, NextResponse } from 'next/server';

/**
 * 사용자 프로필 조회 API
 * GET /api/users/me
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // 쿠키 헤더 전달
    const cookieHeader = request.headers.get('cookie');

    const response = await fetch(`${backendUrl}/api/users/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      credentials: 'include',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API] Get user profile error:', error);
    return NextResponse.json(
      { success: false, error: '프로필 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 사용자 프로필 수정 API
 * PATCH /api/users/me
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // 쿠키 헤더 전달
    const cookieHeader = request.headers.get('cookie');

    const response = await fetch(`${backendUrl}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API] Update user profile error:', error);
    return NextResponse.json(
      { success: false, error: '프로필 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
