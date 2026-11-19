import { api } from './apiClient';

export async function reportUser(
  reportedId: number,
  reason: string,
  details?: string
): Promise<void> {
  await api.post('/reports', {
    reported_id: reportedId,
    reason,
    details,
  });
}
