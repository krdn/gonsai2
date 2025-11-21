import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/workflows/[id]
 * 백엔드 API로 워크플로우 정보 요청을 프록시
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Docker 내부 네트워크 사용 (런타임 환경변수 또는 기본값)
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL?.replace('/api/:path*', '') || 'http://gonsai2-backend:3000';
    const apiKey =
      process.env.NEXT_PUBLIC_BACKEND_API_KEY || process.env.NEXT_PUBLIC_N8N_API_KEY || '';

    // 백엔드 API 호출
    const response = await fetch(`${backendUrl}/api/workflows/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch workflow', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
