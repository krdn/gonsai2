'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { getWebSocketClient } from '@/lib/websocket';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // WebSocket 연결
    const wsClient = getWebSocketClient();
    wsClient.connect().catch(console.error);

    return () => {
      wsClient.disconnect();
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
