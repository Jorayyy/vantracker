import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';

export default async function GeofencesPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const companyId = (session.user as any).companyId;

  const geofences = await sql`
    SELECT * FROM geofences
    WHERE company_id = ${companyId}
    ORDER BY name
  `;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Geofences</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Add Geofence
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {geofences.map((fence: any) => (
          <div key={fence.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{fence.name}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                fence.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {fence.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Type: {fence.type === 'circle' ? `Circle (${fence.radius_meters}m)` : 'Polygon'}
            </p>
            {fence.type === 'circle' && (
              <p className="text-xs text-gray-500 mt-1">
                Center: {fence.center_lat?.toFixed(6)}, {fence.center_lng?.toFixed(6)}
              </p>
            )}
          </div>
        ))}
        {geofences.length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            No geofences yet. Create zones to monitor when vans enter or leave specific areas.
          </div>
        )}
      </div>
    </div>
  );
}
