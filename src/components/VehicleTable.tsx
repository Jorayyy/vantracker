'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Edit3, Trash2, Loader2 } from 'lucide-react';
import VehicleForm from './VehicleForm';
import AssignDriverForm from './AssignDriverForm';

export default function VehicleTable({ vehicles, drivers, companyId }: {
  vehicles: any[];
  drivers: any[];
  companyId: string;
}) {
  const router = useRouter();
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete vehicle ${name}? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/vehicles?id=${id}`, { method: 'DELETE' });
    setDeleting(null);
    router.refresh();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((vehicle: any) => (
              <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Truck className="w-[18px] h-[18px] text-blue-600" />
                    </div>
                    <span className="font-semibold text-sm text-slate-900">{vehicle.plate_number}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{vehicle.name || '-'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{vehicle.model || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{vehicle.driver_name || 'Unassigned'}</span>
                    <AssignDriverForm
                      vehicleId={vehicle.id}
                      currentDriverId={vehicle.driver_id}
                      drivers={drivers}
                    />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vehicle.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {vehicle.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditingVehicle(vehicle)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50 transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(vehicle.id, vehicle.plate_number)}
                      disabled={deleting === vehicle.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50">
                      {deleting === vehicle.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No vehicles yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add your first vehicle to get started</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingVehicle && (
        <VehicleForm
          companyId={companyId}
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
        />
      )}
    </>
  );
}
