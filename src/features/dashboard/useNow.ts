import { useEffect, useState } from 'react';
import { toZonedTime } from 'date-fns-tz';

/** Current time in the trip's timezone, ticking every 20 seconds. */
export function useNow(timezone: string): Date {
  const [now, setNow] = useState(() => toZonedTime(new Date(), timezone));
  useEffect(() => {
    const t = setInterval(() => setNow(toZonedTime(new Date(), timezone)), 20_000);
    return () => clearInterval(t);
  }, [timezone]);
  return now;
}
