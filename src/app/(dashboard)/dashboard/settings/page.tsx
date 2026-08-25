import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import { Settings, Building2, MapPin, Phone } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const [company] = await sql`
    SELECT * FROM companies WHERE id = ${companyId}
  `;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto h-full overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your company and account settings</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Company Information</h2>
            <p className="text-xs text-slate-500">Your business details</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
            <input
              type="text"
              defaultValue={company?.name || ''}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-600"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <input
              type="text"
              defaultValue={company?.address || ''}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-600"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input
              type="text"
              defaultValue={company?.phone || ''}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-600"
              readOnly
            />
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">Contact support to update company details.</p>
        </div>
      </div>
    </div>
  );
}
