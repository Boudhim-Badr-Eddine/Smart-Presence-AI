'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { queryClientConfig } from '@/lib/api-client';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient(queryClientConfig));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
