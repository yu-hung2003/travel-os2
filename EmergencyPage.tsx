import { NavLink, useParams } from 'react-router-dom';

interface NavItem {
  seg: string;
  label: string;
  icon: (active: boolean) => JSX.Element;
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const items: NavItem[] = [
  {
    seg: 'today', label: '今日',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    seg: 'timeline', label: '行程',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" />
        <path d="M6 8v8" /><path d="M11 6h9" /><path d="M11 18h9" />
      </svg>
    ),
  },
  {
    seg: 'map', label: '地圖',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14" /><path d="M15 6v14" />
      </svg>
    ),
  },
  {
    seg: 'expense', label: '花費',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <circle cx="12" cy="12" r="9" /><path d="M8.5 8.5 12 13l3.5-4.5" /><path d="M12 13v5" /><path d="M9 12.5h6" /><path d="M9 15h6" />
      </svg>
    ),
  },
  {
    seg: 'more', label: '更多',
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...stroke}>
        <circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const { tripId = '' } = useParams();
  return (
    <nav className="border-t border-line bg-surface-2/90 pb-safe backdrop-blur">
      <ul className="flex">
        {items.map((item) => (
          <li key={item.seg} className="flex-1">
            <NavLink
              to={`/t/${tripId}/${item.seg}`}
              className={({ isActive }) =>
                `flex min-h-[52px] flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] ${
                  isActive ? 'font-semibold text-primary' : 'text-ink-3'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.icon(isActive)}
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
