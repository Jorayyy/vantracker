'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Route, Plus, Edit3, Trash2, MapPin, Truck, Clock, Route as RouteIcon } from 'lucide-react';
import RouteForm from './RouteForm';

export default function RoutesManager({ routes, vehicles, companyId }: {
  routes: any[];
  vehicles: { id: string; plate_number: string }[];
  companyId: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this route?')) return;
    await fetch(`/api/routes?id=${id}`, { method: 'DELETE' });
    router.refresh();
  };

  const assignedCount = (route: any) => route.assigned_vehicles?.length || 0;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-slate-500">{routes.length} route{routes.length !== 1 ? 's' : ''} defined</div>
        <button onClick={() => { setEditingRoute(null); setShowForm(true); }}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Route
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <RouteIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No routes defined yet</p>
          <p className="text-xs text-slate-400 mt-1">Create your first route to assign to vehicles</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Route
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((route) => (
            <div key={route.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: route.color + '20' }}>
                    <RouteIcon className="w-5 h-5" style={{ color: route.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{route.name}</h3>
                    {route.description && <p className="text-xs text-slate-500 mt-0.5">{route.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingRoute(route); setShowForm(true); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(route.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {route.waypoints?.length || 0} stops
                  </span>
                  {route.estimated_duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {route.estimated_duration_minutes} min
                    </span>
                  )}
                  {route.estimated_distance_km && (
                    <span>{route.estimated_distance_km} km</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Truck className="w-3 h-3" /> {assignedCount(route)} vehicle{assignedCount(route) !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    route.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {route.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RouteForm
          companyId={companyId}
          vehicles={vehicles}
          route={editingRoute}
          onClose={() => { setShowForm(false); setEditingRoute(null); }}
        />
      )}
    </>
  );
}
