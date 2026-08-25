import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import VehicleForm from '@/components/VehicleForm';

export const dynamic = 'force-dynamic';

export default async function VehiclesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const companyId = (session.user as any).companyId;

  const vehicles = await sql`
    SELECT v.*, u.full_name as driver_name
    FROM vehicles v
    LEFT JOIN driver_assignments da ON da.vehicle_id = v.id AND da.is_active = true
    LEFT JOIN users u ON u.id = da.driver_id
    WHERE v.company_id = ${companyId}
    ORDER BY v.plate_number
  `;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <VehicleForm companyId={companyId} />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vehicles.map((vehicle: any) => (
              <tr key={vehicle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{vehicle.plate_number}</td>
                <td className="px-6 py-4 text-gray-600">{vehicle.name || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{vehicle.model || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{vehicle.driver_name || 'Unassigned'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    vehicle.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {vehicle.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No vehicles yet. Add your first vehicle to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
