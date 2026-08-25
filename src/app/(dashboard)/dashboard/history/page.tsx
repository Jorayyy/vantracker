import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';

export default async function HistoryPage() {
  const session = await auth();
  if (!session) redirect('/login');

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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Trip History</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Speed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trips.map((trip: any) => (
              <tr key={trip.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{trip.plate_number}</td>
                <td className="px-6 py-4 text-gray-600">{trip.driver_name || '-'}</td>
                <td className="px-6 py-4 text-gray-600">
                  {trip.started_at ? new Date(trip.started_at).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {trip.started_at && trip.ended_at
                    ? `${Math.round((new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60000)} min`
                    : '-'}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {trip.distance_km ? `${trip.distance_km.toFixed(1)} km` : '-'}
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {trip.avg_speed ? `${Math.round(trip.avg_speed)} km/h` : '-'}
                </td>
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No trip history yet. Trips will appear here once drivers start tracking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
