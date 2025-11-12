import { redirect } from 'next/navigation';

/**
 * 루트 페이지 - 인증된 사용자를 /workflows로 리다이렉트
 * 비인증 사용자는 middleware에서 /login으로 리다이렉트됨
 */
export default function HomePage() {
  redirect('/workflows');
}
