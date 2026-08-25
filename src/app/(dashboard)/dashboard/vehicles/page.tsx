import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import VehicleForm from '@/components/VehicleForm';
import AssignDriverForm from '@/components/AssignDriverForm';
import { Truck } from 'lucide-react';

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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your fleet vehicles</p>
        </div>
        <VehicleForm companyId={companyId} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((vehicle: any) => (
              <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Truck className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900">{vehicle.plate_number}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{vehicle.name || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{vehicle.model || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{vehicle.driver_name || 'Unassigned'}</span>
                    <AssignDriverForm
                      vehicleId={vehicle.id}
                      currentDriverId={vehicle.driver_id}
                      drivers={drivers as any}
                    />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vehicle.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {vehicle.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No vehicles yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add your first vehicle to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
