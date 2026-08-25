'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, Plus, Edit3, Trash2, X, Loader2 } from 'lucide-react';

export default function GeofencesManager({ geofences, companyId }: { geofences: any[]; companyId: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'polygon', radius: '500', lat: '10.75', lng: '124.8' });

  const openEdit = (g: any) => {
    setEditing(g);
    setForm({
      name: g.name || '',
      type: g.type || 'polygon',
      radius: g.radius?.toString() || '500',
      lat: g.coordinates?.[0]?.lat?.toString() || '10.75',
      lng: g.coordinates?.[0]?.lng?.toString() || '124.8',
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', type: 'polygon', radius: '500', lat: '10.75', lng: '124.8' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setLoading(true);
    const coordinates = [{ lat: parseFloat(form.lat), lng: parseFloat(form.lng) }];
    const payload = editing
      ? { id: editing.id, name: form.name, type: form.type, coordinates, radius: parseInt(form.radius) }
      : { name: form.name, type: form.type, coordinates, radius: parseInt(form.radius) };

    await fetch('/api/geofences', {
      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    setShowForm(false);
    setEditing(null);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this geofence?')) return;
    await fetch('/api/geofences?id=' + id, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-slate-500">{geofences.length} geofence{geofences.length !== 1 ? 's' : ''}</div>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Geofence
        </button>
      </div>

      {geofences.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No geofences defined yet</p>
          <button onClick={openNew} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Geofence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {geofences.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                    <Map className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{g.name}</h3>
                    <p className="text-xs text-slate-500 capitalize">{g.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(g)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(g.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {g.radius && <p className="text-xs text-slate-500">Radius: {g.radius}m</p>}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${g.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {g.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit' : 'New'} Geofence</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Warehouse Zone"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="polygon">Polygon</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Radius (m)</label>
                  <input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Center Latitude</label>
                  <input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Center Longitude</label>
                  <input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} disabled={loading || !form.name}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
