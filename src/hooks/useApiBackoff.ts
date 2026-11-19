import { useEffect, useState } from 'react';
import {
  getBackoffState,
  onBackoffChange,
  BackoffState,
} from '../services/apiBackoffStatus';

/** P3-2, item 2 — estado do retry/backoff do apiClient, pra UI não-bloqueante. */
export function useApiBackoff(): BackoffState {
  const [state, setState] = useState<BackoffState>(getBackoffState());

  useEffect(() => onBackoffChange(setState), []);

  return state;
}
