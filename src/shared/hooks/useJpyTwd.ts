import { useEffect, useState } from 'react';
import { getJpyTwdRate, type RateSnapshot } from '@/data/sync/rateService';

/** shared JPY→TWD rate; null while loading or unavailable */
export function useJpyTwd(): RateSnapshot | null {
  const [snap, setSnap] = useState<RateSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    getJpyTwdRate().then((s) => {
      if (!cancelled) setSnap(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return snap;
}
