import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo Offline — Exibindo catálogo em cache seguro (sem dados sensíveis).</span>
    </div>
  );
};
