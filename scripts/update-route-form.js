const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'RouteForm.tsx');

const content = `'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, Plus, Trash2, Search, MapPin } from 'lucide-react';

interface Waypoint {
  lat: number;
  lng: number;
  name: string;
}

interface GeocodeResult {
  name: string;
  short_name: string;
  lat: number;
  lng: number;
  type: string;
}

export default function RouteForm({ companyId, vehicles, route, onClose }: {
  companyId: string;
  vehicles: { id: string; plate_number: string }[];
  route?: any;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(route?.name || '');
  const [description, setDescription] = useState(route?.description || '');
  const [color, setColor] = useState(route?.color || '#3b82f6');
  const [duration, setDuration] = useState(route?.estimated_duration_minutes?.toString() || '');
  const [distance, setDistance] = useState(route?.estimated_distance_km?.toString() || '');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>(
    route?.assigned_vehicles?.map((v: any) => v.vehicle_id) || []
  );
  const [waypoints, setWaypoints] = useState<Waypoint[]>(
    route?.waypoints || [{ lat: 10.75, lng: 124.8, name: 'Start' }]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchingWaypointIndex, setSearchingWaypointIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const searchPlaces = useCallback(async (query: string, waypointIndex: number) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    setSearchingWaypointIndex(waypointIndex);
    try {
      const res = await fetch('/api/geocode?q=' + encodeURIComponent(query));
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  }, []);

  const selectPlace = (result: GeocodeResult, waypointIndex: number) => {
    const updated = [...waypoints];
    updated[waypointIndex] = { lat: result.lat, lng: result.lng, name: result.short_name };
    setWaypoints(updated);
    setSearchResults([]);
    setSearchQuery('');
    setSearchingWaypointIndex(null);
  };

  const addWaypoint = () => {
    const last = waypoints[waypoints.length - 1];
    setWaypoints([...waypoints, { lat: last?.lat || 10.75, lng: last?.lng || 124.8, name: '' }]);
  };

  const removeWaypoint = (index: number) => {
    if (waypoints.length <= 2) return;
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index: number, field: keyof Waypoint, value: string) => {
    const updated = [...waypoints];
    if (field === 'lat' || field === 'lng') {
      (updated[index] as any)[field] = parseFloat(value) || 0;
    } else {
      (updated[index] as any)[field] = value;
    }
    setWaypoints(updated);
  };

  const handleSave = async () => {
    if (!name || waypoints.length < 2) return;
    setLoading(true);

    const payload = {
      ...(route ? { id: route.id } : {}),
      name,
      description,
      color,
      waypoints,
      estimated_duration_minutes: duration ? parseInt(duration) : null,
      estimated_distance_km: distance ? parseFloat(distance) : null,
      vehicle_ids: selectedVehicles,
    };

    await fetch('/api/routes', {
      method: route ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-slate-900">{route ? 'Edit Route' : 'New Route'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Route Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tacloban City Loop"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional route description"
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 border border-slate-300 rounded-lg cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Est. Duration (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Est. Distance (km)</label>
              <input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)}
                placeholder="15.5"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Assign Vehicles</label>
            <div className="flex flex-wrap gap-2">
              {vehicles.map((v) => (
                <button key={v.id} type="button"
                  onClick={() => setSelectedVehicles(prev =>
                    prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                  )}
                  className={\`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors \${
                    selectedVehicles.includes(v.id)
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }\`}>
                  {v.plate_number}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500">Waypoints * (min 2)</label>
              <button onClick={addWaypoint} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Point
              </button>
            </div>
            <div className="space-y-3">
              {waypoints.map((wp, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                      {i + 1}
                    </span>
                    <input value={wp.name} onChange={(e) => updateWaypoint(i, 'name', e.target.value)}
                      placeholder="Stop name"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" step="any" value={wp.lng || ''} onChange={(e) => updateWaypoint(i, 'lng', e.target.value)}
                      placeholder="Lng"
                      className="w-24 px-2 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" step="any" value={wp.lat || ''} onChange={(e) => updateWaypoint(i, 'lat', e.target.value)}
                      placeholder="Lat"
                      className="w-24 px-2 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                    {waypoints.length > 2 && (
                      <button onClick={() => removeWaypoint(i)} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-7">
                    <div className="flex-1 relative">
                      <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200">
                        <Search className="w-3 h-3 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search place name (e.g. Tacloban, Ormoc, Cebu)..."
                          value={searchingWaypointIndex === i ? searchQuery : ''}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            searchPlaces(e.target.value, i);
                          }}
                          onFocus={() => setSearchingWaypointIndex(i)}
                          className="bg-transparent text-[11px] outline-none w-full placeholder:text-slate-400"
                        />
                        {isSearching && searchingWaypointIndex === i && (
                          <Loader2 className="w-3 h-3 text-slate-400 animate-spin shrink-0" />
                        )}
                      </div>
                      {searchResults.length > 0 && searchingWaypointIndex === i && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto z-20">
                          {searchResults.map((result, ri) => (
                            <button
                              key={ri}
                              onClick={() => selectPlace(result, i)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-start gap-2"
                            >
                              <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[11px] font-medium text-slate-700">{result.short_name}</p>
                                <p className="text-[10px] text-slate-400">{result.lat.toFixed(4)}, {result.lng.toFixed(4)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading || !name || waypoints.length < 2}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {route ? 'Update Route' : 'Create Route'}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('RouteForm updated');
