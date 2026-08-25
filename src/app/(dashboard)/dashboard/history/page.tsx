import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import { History, Route, Clock, Gauge } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const trips = await sql`
    SELECT ts.*, v.plate_number, u.full_name as driver_name
    FROM trip_summaries ts
    JOIN vehicles v ON v.id = ts.vehicle_id
    LEFT JOIN users u ON u.id = ts.driver_id
    WHERE v.company_id = ${companyId}
    ORDER BY ts.started_at DESC
    LIMIT 50
  `;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Trip History</h1>
        <p className="text-sm text-slate-500 mt-1">View past trips and route data</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Started</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Distance</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((trip: any) => (
              <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-semibold text-sm text-slate-900">{trip.plate_number}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{trip.driver_name || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {trip.started_at ? new Date(trip.started_at).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {trip.started_at && trip.ended_at
                    ? `${Math.round((new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60000)} min`
                    : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {trip.distance_km ? `${trip.distance_km.toFixed(1)} km` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {trip.avg_speed ? `${Math.round(trip.avg_speed)} km/h` : '-'}
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <Route className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No trip history yet</p>
                  <p className="text-xs text-slate-400 mt-1">Trips will appear here once drivers start tracking</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
