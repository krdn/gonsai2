import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware - 보호된 라우트 인증 체크
 *
 * 비인증 사용자는 /login으로 리다이렉트
 * 인증된 사용자가 /login, /signup 접근 시 /workflows로 리다이렉트
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로 (인증 불필요)
  const publicPaths = ['/login', '/signup', '/api'];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // 정적 파일 및 Next.js 내부 경로는 무시
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 쿠키에서 인증 토큰 확인 (localStorage는 클라이언트 측이므로 쿠키 사용)
  // 현재는 간단히 user 데이터 존재 여부로 체크
  const token = request.cookies.get('token')?.value;

  // 비인증 사용자 처리
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 인증된 사용자가 로그인/회원가입 페이지 접근 시 대시보드로 리다이렉트
  if (token && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/workflows', request.url));
  }

  return NextResponse.next();
}

/**
 * Middleware가 실행될 경로 설정
 * - 모든 경로에서 실행하되, API routes, static files, _next는 제외
 */
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 경로에서 실행:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
