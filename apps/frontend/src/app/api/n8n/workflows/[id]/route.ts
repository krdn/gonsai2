/**
 * n8n Workflow API Proxy
 * CORS 문제를 해결하기 위해 n8n API를 프록시합니다.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 서버 사이드 전용 환경 변수 사용 (보안 강화)
    // N8N_INTERNAL_URL: 개발환경 localhost, 운영환경 Docker 내부 네트워크
    const n8nBaseUrl =
      process.env.N8N_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_N8N_BASE_URL ||
      'http://localhost:5678';
    // N8N_API_KEY: 서버 사이드 전용 (NEXT_PUBLIC_ 접두사 없음 = 클라이언트 노출 안됨)
    const n8nApiKey = process.env.N8N_API_KEY || '';

    if (!n8nApiKey) {
      console.error('[n8n API Proxy] Missing API key');
      return NextResponse.json({ error: 'n8n API key configuration missing' }, { status: 500 });
    }

    const n8nResponse = await fetch(`${n8nBaseUrl}/api/v1/workflows/${id}`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
      },
    });

    if (!n8nResponse.ok) {
      return NextResponse.json(
        { error: `n8n API error: ${n8nResponse.status} ${n8nResponse.statusText}` },
        { status: n8nResponse.status }
      );
    }

    const data = await n8nResponse.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('[n8n API Proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
