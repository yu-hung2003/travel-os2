import { lazy, Suspense, useEffect } from 'react';
import {
  createBrowserRouter, RouterProvider, Outlet, Navigate, Link, useParams,
} from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import { BottomNav } from '@/app/components/BottomNav';
import { PwaBanner } from '@/app/components/PwaBanner';
import { OfflinePill } from '@/app/components/OfflinePill';
import { rememberTrip } from '@/shared/hooks/useTrip';

// Route splitting: every page is its own chunk
const TripListPage = lazy(() => import('@/features/triplist/TripListPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const TripInfoPage = lazy(() => import('@/features/trips/TripDetailPage'));
const TimelinePage = lazy(() => import('@/features/timeline/TimelinePage'));
const MapPage = lazy(() => import('@/features/map/MapPage'));
const ExpensePage = lazy(() => import('@/features/expense/ExpensePage'));
const MorePage = lazy(() => import('@/features/more/MorePage'));
const PackingPage = lazy(() => import('@/features/packing/PackingPage'));
const PlacesPage = lazy(() => import('@/features/places/PlacesPage'));
const ShoppingPage = lazy(() => import('@/features/shopping/ShoppingPage'));
const EmergencyPage = lazy(() => import('@/features/emergency/EmergencyPage'));
const PrintPage = lazy(() => import('@/features/print/PrintPage'));

const fallback = (
  <div className="flex h-full items-center justify-center text-ink-3">載入中…</div>
);

/** Root level: the trip list, no bottom nav. */
function ListShell() {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <PwaBanner />
      <main className="flex-1 overflow-y-auto px-4 pt-safe">
        <OfflinePill />
        <Suspense fallback={fallback}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/** Trip workspace: top bar (back to list + trip name) + bottom nav. */
function TripShell() {
  const { tripId = '' } = useParams();
  const trip = useLiveQuery(
    async () => (tripId ? (await db.trips.get(tripId)) ?? null : null),
    [tripId],
  );

  useEffect(() => {
    if (tripId) rememberTrip(tripId);
  }, [tripId]);

  // trip was deleted / unknown id → back to list
  if (trip === null) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <PwaBanner />
      <Link
        to="/"
        className="flex items-center gap-1.5 border-b border-line/60 bg-surface-2/90 px-4 py-2 pt-safe text-sm font-semibold text-ink-2 backdrop-blur active:opacity-70 print:hidden"
      >
        <span className="text-ink-3">‹</span>
        <span className="truncate">
          {trip ? `${trip.coverEmoji ?? '🧳'} ${trip.title}` : '…'}
        </span>
        <span className="ml-auto shrink-0 text-[11px] font-normal text-ink-3">切換旅程</span>
      </Link>
      <main className="flex-1 overflow-y-auto px-4">
        <OfflinePill />
        <Suspense fallback={fallback}>
          <Outlet />
        </Suspense>
      </main>
      <span className="print:hidden"><BottomNav /></span>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <ListShell />,
    children: [{ path: '/', element: <TripListPage /> }],
  },
  {
    path: '/t/:tripId',
    element: <TripShell />,
    children: [
      { index: true, element: <Navigate to="today" replace /> },
      { path: 'today', element: <DashboardPage /> },
      { path: 'timeline', element: <TimelinePage /> },
      { path: 'map', element: <MapPage /> },
      { path: 'expense', element: <ExpensePage /> },
      { path: 'more', element: <MorePage /> },
      { path: 'info', element: <TripInfoPage /> },
      { path: 'packing', element: <PackingPage /> },
      { path: 'places', element: <PlacesPage /> },
      { path: 'shopping', element: <ShoppingPage /> },
      { path: 'emergency', element: <EmergencyPage /> },
      { path: 'print', element: <PrintPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
