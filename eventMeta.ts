import { useOnline } from '@/shared/hooks/useOnline';

export function OfflinePill() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="sticky top-0 z-40 -mx-4 bg-warning/15 px-4 py-1.5 text-center text-xs font-semibold text-warning backdrop-blur">
      目前離線 · 行程、記帳、備註皆可正常使用
    </div>
  );
}
