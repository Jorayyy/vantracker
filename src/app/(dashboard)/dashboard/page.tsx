import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const companyId = (session.user as any).companyId;

  const [vehicleCount, driverCount, locationCount] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM vehicles WHERE company_id = ${companyId}`,
    sql`SELECT COUNT(*)::int as count FROM users WHERE company_id = ${companyId} AND role = 'driver'`,
    sql`SELECT COUNT(*)::int as count FROM vehicle_locations WHERE created_at > now() - INTERVAL '24 hours'`,
  ]);

  const stats = [
    { label: 'Total Vehicles', value: vehicleCount[0]?.count || 0, icon: '🚐', color: 'bg-blue-500' },
    { label: 'Active Drivers', value: driverCount[0]?.count || 0, icon: '👤', color: 'bg-green-500' },
    { label: 'Locations Today', value: locationCount[0]?.count || 0, icon: '📍', color: 'bg-purple-500' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/live"
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">📍</span>
            <p className="font-medium mt-2">Live Tracking</p>
            <p className="text-sm text-gray-500">See all vans in real-time</p>
          </a>
          <a
            href="/dashboard/vehicles"
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">🚐</span>
            <p className="font-medium mt-2">Manage Vehicles</p>
            <p className="text-sm text-gray-500">Add or edit your fleet</p>
          </a>
          <a
            href="/dashboard/drivers"
            className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-2xl">👤</span>
            <p className="font-medium mt-2">Manage Drivers</p>
            <p className="text-sm text-gray-500">Add or assign drivers</p>
          </a>
        </div>
      </div>
    </div>
  );
}
