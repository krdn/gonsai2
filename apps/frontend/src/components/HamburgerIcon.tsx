'use client';

import React from 'react';

interface HamburgerIconProps {
  isOpen: boolean;
}

/**
 * 애니메이션 햄버거 아이콘 컴포넌트
 *
 * @param isOpen - true일 때 X 모양으로 변환, false일 때 햄버거 모양
 *
 * 구조:
 * - 3개의 수평선으로 햄버거 표현
 * - 클릭 시 햄버거(☰) ↔ X(✕) 애니메이션
 * - CSS Transform으로 300ms 트랜지션
 */
export default function HamburgerIcon({ isOpen }: HamburgerIconProps) {
  return (
    <div className="w-6 h-6 flex flex-col justify-center items-center" aria-hidden="true">
      {/* 상단 라인 */}
      <span
        className={`
          block h-0.5 w-6 bg-current rounded-full
          transition-all duration-300 ease-in-out
          ${isOpen ? 'rotate-45 translate-y-1.5' : 'rotate-0 translate-y-0'}
        `}
      />

      {/* 중간 라인 */}
      <span
        className={`
          block h-0.5 w-6 bg-current rounded-full my-1
          transition-all duration-300 ease-in-out
          ${isOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}
        `}
      />

      {/* 하단 라인 */}
      <span
        className={`
          block h-0.5 w-6 bg-current rounded-full
          transition-all duration-300 ease-in-out
          ${isOpen ? '-rotate-45 -translate-y-1.5' : 'rotate-0 translate-y-0'}
        `}
      />
    </div>
  );
}
