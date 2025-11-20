'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { getSocketClient, destroySocketClient } from '@/lib/socket-client';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // WebSocket 연결
    const wsClient = getSocketClient();
    wsClient.connect().catch(console.error);

    return () => {
      // 소켓 클라이언트 완전 정리 (메모리 누수 방지)
      destroySocketClient();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
