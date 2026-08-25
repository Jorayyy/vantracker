import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import RoutesManager from '@/components/RoutesManager';
import { Route } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function RoutesPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const [routes, vehicles] = await Promise.all([
    sql`SELECT r.*,
      COALESCE(
        json_agg(
          json_build_object('vehicle_id', ra.vehicle_id, 'plate_number', v.plate_number)
        ) FILTER (WHERE ra.vehicle_id IS NOT NULL),
        '[]'
      ) as assigned_vehicles
    FROM routes r
    LEFT JOIN route_assignments ra ON ra.route_id = r.id
    LEFT JOIN vehicles v ON v.id = ra.vehicle_id
    WHERE r.company_id = ${companyId}
    GROUP BY r.id
    ORDER BY r.name`,
    sql`SELECT id, plate_number FROM vehicles WHERE company_id = ${companyId} AND is_active = true ORDER BY plate_number`,
  ]);

  const vehiclesList = vehicles as { id: string; plate_number: string }[];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Routes</h1>
        <p className="text-sm text-slate-500 mt-1">Define fixed routes for your fleet</p>
      </div>

      <RoutesManager routes={routes} vehicles={vehiclesList} companyId={companyId} />
    </div>
  );
}
