'use client';

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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    driver.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
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
