import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import DriverForm from '@/components/DriverForm';
import DriverTable from '@/components/DriverTable';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const drivers = await sql`
    SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
           v.plate_number, v.name as vehicle_name
    FROM users u
    LEFT JOIN driver_assignments da ON da.driver_id = u.id AND da.is_active = true
    LEFT JOIN vehicles v ON v.id = da.vehicle_id
    WHERE u.company_id = ${companyId} AND u.role = 'driver'
    ORDER BY u.full_name
  `;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your drivers and assignments</p>
        </div>
        <DriverForm companyId={companyId} />
      </div>
      <DriverTable drivers={drivers} companyId={companyId} />
    </div>
  );
}
