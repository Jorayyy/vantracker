import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import { Truck, Users, MapPin, ArrowRight, Zap, Shield, LogIn, LogOut, Activity, Clock, TrendingUp, Route } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const [vehicleCount, driverCount, locationCount, alerts, recentLocations, tripCount, activeGeofences, routeCount] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM vehicles WHERE company_id = ${companyId} AND is_active = true`,
    sql`SELECT COUNT(*)::int as count FROM users WHERE company_id = ${companyId} AND role = 'driver' AND is_active = true`,
    sql`SELECT COUNT(*)::int as count FROM vehicle_locations vl JOIN vehicles v ON v.id = vl.vehicle_id WHERE v.company_id = ${companyId} AND vl.recorded_at > now() - INTERVAL '1 hour'`,
    sql`SELECT * FROM geofence_alerts WHERE company_id = ${companyId} ORDER BY created_at DESC LIMIT 8`,
    sql`
      SELECT v.plate_number, vl.latitude, vl.longitude, vl.speed, vl.recorded_at, vl.driver_status,
             u.full_name as driver_name
      FROM vehicle_locations vl
      JOIN vehicles v ON v.id = vl.vehicle_id
      LEFT JOIN users u ON u.id = vl.driver_id
      WHERE v.company_id = ${companyId}
        AND vl.recorded_at > now() - INTERVAL '5 minutes'
      ORDER BY vl.recorded_at DESC
    `,
    sql`SELECT COUNT(*)::int as count FROM trip_summaries ts JOIN vehicles v ON v.id = ts.vehicle_id WHERE v.company_id = ${companyId} AND ts.started_at > now() - INTERVAL '24 hours'`,
    sql`SELECT COUNT(*)::int as count FROM geofences WHERE company_id = ${companyId} AND is_active = true`,
    sql`SELECT COUNT(*)::int as count FROM routes WHERE company_id = ${companyId} AND is_active = true`,
  ]);

  const onlineCount = recentLocations.filter((l: any) => l.driver_status === 'online' || (!l.driver_status && l.recorded_at > new Date(Date.now() - 2 * 60000).toISOString())).length;
  const offlineCount = (vehicleCount[0]?.count || 0) - onlineCount;

  const stats = [
    { label: 'Vehicles Online', value: onlineCount, total: vehicleCount[0]?.count || 0, icon: Truck, gradient: 'from-blue-500 to-blue-600', ring: 'bg-blue-50' },
    { label: 'Active Drivers', value: driverCount[0]?.count || 0, icon: Users, gradient: 'from-emerald-500 to-emerald-600', ring: 'bg-emerald-50' },
    { label: 'Trips Today', value: tripCount[0]?.count || 0, icon: Route, gradient: 'from-amber-500 to-orange-500', ring: 'bg-amber-50' },
    { label: 'Pings / Hour', value: locationCount[0]?.count || 0, icon: Activity, gradient: 'from-violet-500 to-purple-600', ring: 'bg-violet-50' },
  ];

  const quickActions = [
    { href: '/dashboard/live', label: 'Live Tracking', description: 'Real-time vehicle map', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { href: '/dashboard/vehicles', label: 'Vehicles', description: 'Manage your fleet', icon: Truck, color: 'text-blue-500', bg: 'bg-blue-50' },
    { href: '/dashboard/drivers', label: 'Drivers', description: 'Assign & manage', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { href: '/dashboard/routes', label: 'Routes', description: `${routeCount[0]?.count || 0} routes`, icon: MapPin, color: 'text-rose-500', bg: 'bg-rose-50' },
    { href: '/dashboard/history', label: 'History', description: 'Past trips', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100' },
    { href: '/dashboard/geofences', label: 'Geofences', description: `${activeGeofences[0]?.count || 0} zones`, icon: Shield, color: 'text-violet-500', bg: 'bg-violet-50' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto overflow-auto h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, {session.user?.name?.split(' ')[0]}. Here&apos;s your fleet overview.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                    {'total' in stat && <span className="text-sm text-slate-400">/ {stat.total}</span>}
                  </div>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.ring}`}>
                  <Icon className={`w-5 h-5 ${stat.gradient.includes('blue') ? 'text-blue-600' : stat.gradient.includes('emerald') ? 'text-emerald-600' : stat.gradient.includes('amber') ? 'text-amber-600' : 'text-violet-600'}`} />
                </div>
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} opacity-60`} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions - Left Column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Navigation</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all text-center"
                  >
                    <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{action.label}</p>
                      <p className="text-[10px] text-slate-400">{action.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Activity - Center Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <h2 className="text-sm font-semibold text-slate-900">Live Activity</h2>
              </div>
              <Link href="/dashboard/live" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View Map <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentLocations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No vehicles reporting in the last 5 minutes</p>
            ) : (
              <div className="space-y-2">
                {recentLocations.slice(0, 6).map((loc: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      loc.driver_status === 'online' ? 'bg-emerald-500' :
                      loc.driver_status === 'idle' ? 'bg-amber-500' :
                      loc.driver_status === 'on_break' ? 'bg-blue-500' :
                      loc.driver_status === 'repair' ? 'bg-red-500' : 'bg-slate-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{loc.plate_number}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-xs text-slate-500 truncate">{loc.driver_name || 'No driver'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-slate-600">{loc.speed ? Math.round(loc.speed) + ' km/h' : '—'}</p>
                      <p className="text-[10px] text-slate-400">{new Date(loc.recorded_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geofence Alerts */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Geofence Alerts</h2>
              <p className="text-[11px] text-slate-400">{activeGeofences[0]?.count || 0} active zones</p>
            </div>
          </div>
          <Link href="/dashboard/geofences" className="text-xs font-medium text-blue-600 hover:text-blue-700">Manage Zones</Link>
        </div>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Shield className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No alerts yet. Create zones and start tracking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  alert.event_type === 'entered' ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  {alert.event_type === 'entered'
                    ? <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                    : <LogOut className="w-3.5 h-3.5 text-amber-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    <span className="font-semibold">{alert.vehicle_plate}</span>
                    {' '}
                    <span className={alert.event_type === 'entered' ? 'text-emerald-600' : 'text-amber-600'}>
                      {alert.event_type === 'entered' ? 'entered' : 'exited'}
                    </span>
                    {' '}{alert.geofence_name}
                  </p>
                  <p className="text-[10px] text-slate-400">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
