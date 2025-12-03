/**
 * n8n Workflow API Proxy
 * CORS 문제를 해결하기 위해 n8n API를 프록시합니다.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Docker 내부 네트워크 사용 (런타임 환경변수 또는 빌드타임 폴백)
    const n8nBaseUrl =
      process.env.N8N_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_N8N_BASE_URL ||
      'http://localhost:5678';
    const n8nApiKey =
      process.env.NEXT_PUBLIC_N8N_API_KEY || process.env.NEXT_PUBLIC_BACKEND_API_KEY || '';

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
