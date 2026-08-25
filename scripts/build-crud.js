const fs = require('fs');
const path = require('path');

function write(relPath, content) {
  const fullPath = path.join(__dirname, '..', 'src', ...relPath.split('/'));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Wrote: ' + relPath);
}

// DriverForm with edit support
write('components/DriverForm.tsx', `'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus, Loader2 } from 'lucide-react';

export default function DriverForm({ companyId, driver, onClose }: {
  companyId: string;
  driver?: any;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });

  useEffect(() => {
    if (driver) {
      setForm({ full_name: driver.full_name || '', email: driver.email || '', phone: driver.phone || '', password: '' });
    }
  }, [driver]);

  const isEdit = !!driver;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/drivers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: driver.id, ...form, password: form.password || undefined } : { ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); setLoading(false); return; }
      setLoading(false);
      if (onClose) { onClose(); } else { setOpen(false); setForm({ full_name: '', email: '', phone: '', password: '' }); }
      router.refresh();
    } catch { setError('Network error'); setLoading(false); }
  };

  if (isEdit) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Edit Driver</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
              <input type="text" value={form.full_name} required onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
              <input type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password (leave blank to keep current)</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors flex items-center gap-2">
        <UserPlus className="w-4 h-4" /> Add Driver
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Add Driver</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <input type="text" value={form.full_name} required onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Juan Dela Cruz" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="driver@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="09XXXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
                <input type="password" value={form.password} required minLength={6} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Min. 6 characters" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Add Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
`);

// DriverTable with edit/delete
write('components/DriverTable.tsx', `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Edit3, Trash2, Loader2 } from 'lucide-react';
import DriverForm from './DriverForm';

export default function DriverTable({ drivers, companyId }: { drivers: any[]; companyId: string }) {
  const router = useRouter();
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Delete driver ' + name + '? This cannot be undone.')) return;
    setDeleting(id);
    await fetch('/api/drivers?id=' + id, { method: 'DELETE' });
    setDeleting(null);
    router.refresh();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Vehicle</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((driver: any) => (
              <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <Users className="w-[18px] h-[18px] text-emerald-600" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900">{driver.full_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{driver.email}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{driver.phone || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{driver.plate_number || 'Unassigned'}</td>
                <td className="px-6 py-4">
                  <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                    driver.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }\`}>
                    {driver.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditingDriver(driver)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50 transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(driver.id, driver.full_name)}
                      disabled={deleting === driver.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {deleting === driver.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No drivers yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add your first driver to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editingDriver && <DriverForm companyId={companyId} driver={editingDriver} onClose={() => setEditingDriver(null)} />}
    </>
  );
}
`);

// Updated drivers page
write('app/(dashboard)/dashboard/drivers/page.tsx', `import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import sql from '@/lib/db';
import DriverForm from '@/components/DriverForm';
import DriverTable from '@/components/DriverTable';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if ((session.user as any).role === 'driver') redirect('/dashboard/driver');

  const companyId = (session.user as any).companyId;

  const drivers = await sql\`
    SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
           v.plate_number, v.name as vehicle_name
    FROM users u
    LEFT JOIN driver_assignments da ON da.driver_id = u.id AND da.is_active = true
    LEFT JOIN vehicles v ON v.id = da.vehicle_id
    WHERE u.company_id = \${companyId} AND u.role = 'driver'
    ORDER BY u.full_name
  \`;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your drivers and assignments</p>
        </div>
        <DriverForm companyId={companyId} />
      </div>
      <DriverTable drivers={drivers} companyId={companyId} />
    </div>
  );
}
`);

console.log('Done');
