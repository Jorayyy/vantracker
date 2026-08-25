import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import GeofencesManager from '@/components/GeofencesManager';

export const dynamic = 'force-dynamic';

export default async function GeofencesPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;
  const geofences = await sql`SELECT * FROM geofences WHERE company_id = ${companyId} ORDER BY name`;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Geofences</h1>
        <p className="text-sm text-slate-500 mt-1">Define zones to monitor vehicle movements</p>
      </div>
      <GeofencesManager geofences={geofences} companyId={companyId} />
    </div>
  );
}
