import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import { Map, Plus, Circle, Hexagon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function GeofencesPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const geofences = await sql`
    SELECT * FROM geofences
    WHERE company_id = ${companyId}
    ORDER BY name
  `;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Geofences</h1>
          <p className="text-sm text-slate-500 mt-1">Define zones to monitor vehicle movements</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Geofence
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {geofences.map((fence: any) => (
          <div key={fence.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {fence.type === 'circle' ? (
                  <Circle className="w-5 h-5 text-blue-500" />
                ) : (
                  <Hexagon className="w-5 h-5 text-violet-500" />
                )}
                <h3 className="font-semibold text-sm text-slate-900">{fence.name}</h3>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                fence.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {fence.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {fence.type === 'circle' ? `Circle · ${fence.radius_meters}m radius` : 'Polygon zone'}
            </p>
            {fence.type === 'circle' && (
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                {fence.center_lat?.toFixed(5)}, {fence.center_lng?.toFixed(5)}
              </p>
            )}
          </div>
        ))}
        {geofences.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-16 text-center">
            <Map className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">No geofences yet</p>
            <p className="text-xs text-slate-400 mt-1">Create zones to monitor when vans enter or leave specific areas</p>
          </div>
        )}
      </div>
    </div>
  );
}
