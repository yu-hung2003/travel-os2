import { BottomSheet } from '@/shared/components/BottomSheet';
import { useTheme } from '@/shared/hooks/useTheme';
import type { ThemePref } from '@/domain/types';

const options: { value: ThemePref; label: string }[] = [
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
  { value: 'auto', label: '自動' },
];

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pref, setPref } = useTheme();
  return (
    <BottomSheet open={open} onClose={onClose} title="⚙️ 設定">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-ink-2">🎨 外觀主題(此裝置)</p>
          <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-surface-3 p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPref(opt.value)}
                className={`rounded-lg py-2 text-sm transition-colors ${
                  pref === opt.value
                    ? 'bg-primary font-semibold text-primary-ink shadow-card'
                    : 'text-ink-2'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-ink-3">
          Travel OS 2 · 資料離線儲存於此裝置;各旅程可獨立開啟夥伴同步(旅程內「更多」頁)。
        </p>
      </div>
    </BottomSheet>
  );
}
