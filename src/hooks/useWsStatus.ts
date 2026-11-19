import { useState, useEffect } from 'react';
import { wsService, WsStatus } from '../services/wsService';

export function useWsStatus(): WsStatus {
  const [status, setStatus] = useState<WsStatus>(wsService.status);

  useEffect(() => {
    return wsService.on(
      '__ws_status',
      ({ status: s }: { status: WsStatus }) => {
        setStatus(s);
      }
    );
  }, []);

  return status;
}
