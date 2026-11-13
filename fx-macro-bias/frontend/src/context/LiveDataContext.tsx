"use client";
import React, {createContext, useContext, useEffect, useState} from 'react';
import {usePathname} from 'next/navigation';
import {getLiveSnapshot, setLiveSnapshot, type LiveSnapshot} from '@/lib/liveSnapshot';
import {MASTER_MACRO_DATABASE, PAIR_EQUITY_DATA} from '@/data/macroDataset';
const Context = createContext('');
export const useLiveVersion = () => useContext(Context);
export function LiveDataProvider({children}: {children: React.ReactNode}) {
  const path = usePathname();
  const enabled = path.startsWith('/admin') || ['/portal', '/terminal'].includes(path);
  const [snapshot, setSnapshot] = useState<LiveSnapshot|null>(null);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    const refresh = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const current = getLiveSnapshot();
        const res = await fetch('/api/live/snapshot', {signal: controller.signal, cache: 'no-store', headers: current ? {'If-None-Match': '"'+current.version+'"'} : {}});
        if (res.status !== 304) {
          if (!res.ok) throw new Error('Live data is temporarily unavailable. Retrying automatically.');
          const next: LiveSnapshot = await res.json();
          if (stopped) return;
          setLiveSnapshot(next);
          // Legacy consumers use the same authoritative data as the live screens.
          for (const key of Object.keys(MASTER_MACRO_DATABASE)) delete MASTER_MACRO_DATABASE[key];
          Object.assign(MASTER_MACRO_DATABASE, next.data);
          for (const key of Object.keys(PAIR_EQUITY_DATA)) delete PAIR_EQUITY_DATA[key];
          Object.assign(PAIR_EQUITY_DATA, next.equity);
          setSnapshot(next);
        } else if (!stopped) setSnapshot(current);
        if (!stopped) {setError(''); setCheckedAt(Date.now());}
      } catch {
        if (!stopped) setError('Connection interrupted. Showing the last received data and retrying automatically.');
      } finally {
        clearTimeout(timeout);
        if (!stopped) timer = setTimeout(refresh, 15000);
      }
    };
    refresh();
    return () => {stopped = true; clearTimeout(timer); controller?.abort();};
  }, [enabled]);
  if (!enabled) return <>{children}</>;
  if (!snapshot) return <div role="status" className="p-8 text-slate-300">{error || 'Loading current market data…'}</div>;
  const stale = checkedAt - Date.parse(snapshot.published_at) > 20 * 60 * 1000;
  const degraded = Object.values(snapshot.freshness).some(v => ['ERROR', 'PARTIAL', 'STALE'].includes(v.status));
  return <Context.Provider value={snapshot.version}>
    {(error || stale || degraded) && <div role="status" className="bg-amber-950 px-4 py-2 text-sm text-amber-200">{error || (stale ? 'Updates are delayed. Showing the last received data.' : 'Some source updates are delayed. Available data remains visible.')} Last received: {new Date(snapshot.published_at).toLocaleString()}.</div>}
    {children}
  </Context.Provider>;
}
