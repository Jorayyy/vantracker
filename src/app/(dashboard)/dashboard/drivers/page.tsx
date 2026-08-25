import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import DriverForm from '@/components/DriverForm';
import { Users, Mail, Phone } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  const session = await auth();
  if (!session) redirect('/login');

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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your fleet drivers</p>
        </div>
        <DriverForm companyId={companyId} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Vehicle</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((driver: any) => (
              <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-sm font-semibold text-slate-600">
                      {driver.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="font-semibold text-sm text-slate-900">{driver.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-0.5">
                    <p className="text-sm text-slate-600 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {driver.email}
                    </p>
                    {driver.phone && (
                      <p className="text-sm text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {driver.phone}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{driver.plate_number || 'Unassigned'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    driver.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {driver.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No drivers yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add your first driver to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
