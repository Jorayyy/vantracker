import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import VehicleForm from '@/components/VehicleForm';
import VehicleTable from '@/components/VehicleTable';

export const dynamic = 'force-dynamic';

export default async function VehiclesPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const [vehicles, drivers] = await Promise.all([
    sql`
      SELECT v.*, u.full_name as driver_name, u.id as driver_id
      FROM vehicles v
      LEFT JOIN driver_assignments da ON da.vehicle_id = v.id AND da.is_active = true
      LEFT JOIN users u ON u.id = da.driver_id
      WHERE v.company_id = ${companyId}
      ORDER BY v.plate_number
    `,
    sql`
      SELECT id, full_name FROM users
      WHERE company_id = ${companyId} AND role = 'driver' AND is_active = true
      ORDER BY full_name
    `,
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your fleet vehicles</p>
        </div>
        <VehicleForm companyId={companyId} />
      </div>

      <VehicleTable vehicles={vehicles} drivers={drivers} companyId={companyId} />
    </div>
  );
}
