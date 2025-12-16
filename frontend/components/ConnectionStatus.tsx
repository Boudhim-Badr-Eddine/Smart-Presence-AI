/**
 * Connection status indicator showing online/offline mode and WebSocket status.
 */
'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Radio } from 'lucide-react';
import { getWebSocketManager } from '@/lib/websocket';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    // Monitor online/offline status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    updateOnlineStatus();

    // Monitor WebSocket status
    const ws = getWebSocketManager();

    const unsubscribeConnect = ws.onConnect(() => setWsConnected(true));
    const unsubscribeDisconnect = ws.onDisconnect(() => setWsConnected(false));

    setWsConnected(ws.isConnected);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 shadow-lg">
        <WifiOff className="h-4 w-4 animate-pulse" />
        Mode hors ligne
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-lg transition-all ${
          wsConnected
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        }`}
        title={wsConnected ? 'Temps réel actif' : 'Temps réel déconnecté'}
      >
        {wsConnected ? (
          <>
            <Radio className="h-3 w-3 animate-pulse" />
            <span>Temps réel</span>
          </>
        ) : (
          <>
            <Wifi className="h-3 w-3" />
            <span>Connexion...</span>
          </>
        )}
      </div>
    </div>
  );
}
