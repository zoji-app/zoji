/**
 * useVersionGate (P3-5) — na inicialização, busca GET /app/config e compara a
 * versão atual do app com min_version (semver). Se a versão for menor, o app
 * mostra uma tela bloqueante "Atualize o Zoji".
 *
 * Falha aberto: erro de rede / config ausente → nunca bloqueia.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  lt as semverLt,
  valid as semverValid,
  coerce as semverCoerce,
} from 'semver';
import { fetchAppConfig } from '../services/appConfigApi';
import { logger } from '../utils/logger';

type GateStatus = 'checking' | 'ok' | 'blocked';

interface VersionGate {
  status: GateStatus;
  storeUrl: string;
}

function currentVersion(): string {
  const raw =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '0.0.0';
  return semverValid(raw) ?? semverCoerce(raw)?.version ?? '0.0.0';
}

/** Pura: true se `current` deve ser bloqueada por `min`. Falha aberto. */
export function shouldBlock(current: string, min: string): boolean {
  const m = semverValid(min);
  if (!m || m === '0.0.0') return false;
  const c = semverValid(current) ?? semverCoerce(current)?.version;
  if (!c) return false;
  try {
    return semverLt(c, m);
  } catch {
    return false;
  }
}

export function useVersionGate(): VersionGate {
  const [gate, setGate] = useState<VersionGate>({
    status: 'checking',
    storeUrl: '',
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cfg = await fetchAppConfig();
      if (cancelled) return;

      const storeUrl =
        Platform.OS === 'ios' ? cfg.store_urls.ios : cfg.store_urls.android;

      const cur = currentVersion();
      const blocked = shouldBlock(cur, cfg.min_version);

      if (blocked) {
        logger.warn(
          `[VersionGate] versão ${cur} < mínima ${cfg.min_version} — bloqueando`
        );
      }

      setGate({ status: blocked ? 'blocked' : 'ok', storeUrl });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return gate;
}
