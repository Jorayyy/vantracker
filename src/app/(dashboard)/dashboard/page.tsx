import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import { Truck, Users, MapPin, ArrowRight, BarChart3, Clock, Zap } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const [vehicleCount, driverCount, locationCount] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM vehicles WHERE company_id = ${companyId}`,
    sql`SELECT COUNT(*)::int as count FROM users WHERE company_id = ${companyId} AND role = 'driver'`,
    sql`SELECT COUNT(*)::int as count FROM vehicle_locations vl JOIN vehicles v ON v.id = vl.vehicle_id WHERE v.company_id = ${companyId} AND vl.created_at > now() - INTERVAL '24 hours'`,
  ]);

  const stats = [
    {
      label: 'Total Vehicles',
      value: vehicleCount[0]?.count || 0,
      icon: Truck,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Active Drivers',
      value: driverCount[0]?.count || 0,
      icon: Users,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Locations Today',
      value: locationCount[0]?.count || 0,
      icon: MapPin,
      color: 'bg-violet-500',
      lightColor: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  const quickActions = [
    {
      href: '/dashboard/live',
      label: 'Live Tracking',
      description: 'See all vans in real-time',
      icon: Zap,
      color: 'text-amber-500',
    },
    {
      href: '/dashboard/vehicles',
      label: 'Manage Vehicles',
      description: 'Add or edit your fleet',
      icon: Truck,
      color: 'text-blue-500',
    },
    {
      href: '/dashboard/drivers',
      label: 'Manage Drivers',
      description: 'Add or assign drivers',
      icon: Users,
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto overflow-auto h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, {session.user?.name?.split(' ')[0]}. Here&apos;s your fleet overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.lightColor} w-12 h-12 rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
