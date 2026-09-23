import { I18nKey, tr } from './i18n';

/** One broker's answer to the sync window's connection test
 * (`BrokerProbe` in p2p_sync.rs). */
export interface BrokerProbe {
  broker: string;
  reachable: boolean;
  millis: number;
}

/** The connection test's verdict and one line per broker. */
export function describeProbes(probes: BrokerProbe[]): { verdict: I18nKey; lines: string[] } {
  const ok = probes.filter((p) => p.reachable).length;
  const verdict = ok === probes.length && ok > 0 ? 'sync.test.allOk' : ok > 0 ? 'sync.test.someOk' : 'sync.test.noneOk';
  const lines = probes.map((p) =>
    p.reachable ? tr('sync.test.ok', { broker: p.broker, ms: p.millis }) : tr('sync.test.fail', { broker: p.broker })
  );
  return { verdict, lines };
}
