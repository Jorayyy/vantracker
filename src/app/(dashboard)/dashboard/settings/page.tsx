import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import SettingsForm from '@/components/SettingsForm';
import { Building2, Shield, Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;
  const [company] = await sql`SELECT * FROM companies WHERE id = ${companyId}`;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your company and account settings</p>
      </div>

      <SettingsForm company={company} user={session.user} />
    </div>
  );
}
