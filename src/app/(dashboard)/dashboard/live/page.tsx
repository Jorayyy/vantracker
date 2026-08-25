'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Truck, Search } from 'lucide-react';

interface Vehicle {
  id: string;
  plate_number: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  driver_name: string | null;
  status: 'online' | 'idle' | 'offline';
  driver_status?: string;
  route_id?: string;
  route_name?: string;
  route_color?: string;
  route_waypoints?: string | { lat: number; lng: number; name: string }[];
}

interface Route {
  id: string;
  name: string;
  color: string;
  waypoints: { lat: number; lng: number; name: string }[];
}

function parseWaypoints(wp: unknown): { lat: number; lng: number; name: string }[] | null {
  if (!wp) return null;
  let parsed = wp;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }
  if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
  return null;
}

function getStatusColor(v: Vehicle): string {
  if (v.status === 'offline') return '#64748b';
  if (v.driver_status === 'repair') return '#ef4444';
  if (v.driver_status === 'on_break') return '#3b82f6';
  if (v.driver_status === 'idle') return '#f59e0b';
  if (v.status === 'online') return '#10b981';
  if (v.status === 'idle') return '#f59e0b';
  return '#64748b';
}

function getStatusLabel(v: Vehicle): string {
  if (v.driver_status === 'idle') return 'Idling';
  if (v.driver_status === 'on_break') return 'On Break';
  if (v.driver_status === 'repair') return 'Repair';
  if (v.status === 'online') return 'Online';
  return 'Offline';
}

function getMarkerHTML(color: string): string {
  return (
    '<div data-van-badge style="width:36px;height:36px;background:' + color +
    ';border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="1" y="3" width="15" height="13" rx="2"/>' +
    '<polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>' +
    '<circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' +
    '</svg></div>'
  );
}

function getPopupHTML(v: Vehicle, color: string): string {
  const statusLabel = getStatusLabel(v);
  const routeLabel = v.route_name
    ? '<p style="font-size:11px;color:' + (v.route_color || '#3b82f6') + ';font-weight:600;margin-top:2px;">Route: ' + v.route_name + '</p>'
    : '';
  return (
    '<div style="padding:4px;font-family:system-ui;">' +
    '<p style="font-weight:700;font-size:14px;color:#0f172a;">' + v.plate_number + '</p>' +
    '<p style="font-size:12px;color:#64748b;">' + (v.name || '') + '</p>' +
    '<p style="font-size:12px;color:#64748b;">' + (v.driver_name || 'No driver') + '</p>' +
    '<p style="font-size:11px;color:' + color + ';font-weight:600;margin-top:4px;">' + statusLabel + '</p>' +
    routeLabel +
    '<p style="font-size:12px;color:#64748b;">Speed: ' + (v.speed ? Math.round(v.speed) : 0) + ' km/h</p>' +
    '</div>'
  );
}

function drawSelectedRoute(mapInstance: maplibregl.Map, vehicle: Vehicle) {
  const sourceId = 'selected-route';
  const lineId = 'selected-route-line';
  const dotsId = 'selected-route-dots';
  const highlightId = 'selected-route-highlight';
  const dotsSrc = 'selected-route-dots-src';

  try {
    if (mapInstance.getLayer(highlightId)) mapInstance.removeLayer(highlightId);
    if (mapInstance.getLayer(lineId)) mapInstance.removeLayer(lineId);
    if (mapInstance.getLayer(dotsId)) mapInstance.removeLayer(dotsId);
    if (mapInstance.getSource(dotsSrc)) mapInstance.removeSource(dotsSrc);
    if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
  } catch {}

  const wps = parseWaypoints(vehicle.route_waypoints);
  if (!wps) return;

  const color = vehicle.route_color || '#3b82f6';
  const vehicleCoords: [number, number] = [vehicle.longitude, vehicle.latitude];
  const wpCoords: [number, number][] = wps.map((wp) => [wp.lng, wp.lat]);
  const allCoords: [number, number][] = [vehicleCoords, ...wpCoords];

  mapInstance.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: allCoords },
    },
  });

  mapInstance.addLayer({
    id: highlightId,
    type: 'line',
    source: sourceId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': color, 'line-width': 6, 'line-opacity': 0.3 },
  });

  mapInstance.addLayer({
    id: lineId,
    type: 'line',
    source: sourceId,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': color, 'line-width': 3, 'line-opacity': 0.9 },
  });

  const dotsData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: wps.map((wp, i) => ({
      type: 'Feature',
      properties: { name: wp.name || 'Stop ' + (i + 1) },
      geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
    })),
  };

  mapInstance.addSource(dotsSrc, { type: 'geojson', data: dotsData });
  mapInstance.addLayer({
    id: dotsId,
    type: 'circle',
    source: dotsSrc,
    paint: { 'circle-radius': 7, 'circle-color': color, 'circle-stroke-color': 'white', 'circle-stroke-width': 2 },
  });

  const bounds = new maplibregl.LngLatBounds();
  allCoords.forEach((c) => bounds.extend(c));
  mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 14 });
}

export default function LiveTrackingPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const routeLayers = useRef<Map<string, boolean>>(new Map());
  const vehiclesRef = useRef<Vehicle[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) || null;

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate_number.toLowerCase().includes(search.toLowerCase()) ||
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.driver_name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const container = mapContainer.current;

    const initMap = () => {
      if (map.current) return;
      map.current = new maplibregl.Map({
        container,
        style: {
          version: 8,
          sources: {
            'carto-light': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution: '\u00a3 CARTO \u00a3 OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'carto-light', type: 'raster', source: 'carto-light' }],
        },
        center: [124.8, 10.75],
        zoom: 11,
      });
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    };

    const observer = new ResizeObserver(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        observer.disconnect();
        initMap();
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    fetch('/api/routes')
      .then((res) => res.json())
      .then((data) => setRoutes(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    routes.forEach((route) => {
      if (routeLayers.current.has(route.id)) return;
      if (!route.waypoints || route.waypoints.length < 2) return;

      const sourceId = 'route-' + route.id;
      const lineId = 'route-line-' + route.id;
      const dotsId = 'route-dots-' + route.id;

      const coords = route.waypoints.map((wp) => [wp.lng, wp.lat]);

      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });

      map.current!.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': route.color, 'line-width': 3, 'line-opacity': 0.7 },
      });

      const dotsData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: route.waypoints.map((wp, i) => ({
          type: 'Feature',
          properties: { name: wp.name || 'Stop ' + (i + 1), index: i },
          geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
        })),
      };

      map.current!.addSource(dotsId, { type: 'geojson', data: dotsData });
      map.current!.addLayer({
        id: dotsId,
        type: 'circle',
        source: dotsId,
        paint: { 'circle-radius': 6, 'circle-color': route.color, 'circle-stroke-color': 'white', 'circle-stroke-width': 2 },
      });

      routeLayers.current.set(route.id, true);
    });
  }, [routes]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    if (!selectedVehicle) {
      try {
        const m = map.current;
        if (m.getLayer('selected-route-highlight')) m.removeLayer('selected-route-highlight');
        if (m.getLayer('selected-route-line')) m.removeLayer('selected-route-line');
        if (m.getLayer('selected-route-dots')) m.removeLayer('selected-route-dots');
        if (m.getSource('selected-route-dots-src')) m.removeSource('selected-route-dots-src');
        if (m.getSource('selected-route')) m.removeSource('selected-route');
      } catch {}
      return;
    }
    drawSelectedRoute(map.current!, selectedVehicle);
  }, [selectedVehicle?.id, selectedVehicle?.latitude, selectedVehicle?.longitude, selectedVehicle?.route_id]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {};

      eventSource.onmessage = (event) => {
        const data: Vehicle[] = JSON.parse(event.data);
        vehiclesRef.current = data;
        setVehicles(data);

        if (!map.current) return;

        data.forEach((vehicle) => {
          if (!vehicle.latitude || !vehicle.longitude) return;

          const color = getStatusColor(vehicle);
          const existingMarker = markers.current.get(vehicle.id);

          if (existingMarker) {
            existingMarker.setLngLat([vehicle.longitude, vehicle.latitude]);
            const badge = existingMarker.getElement().querySelector('[data-van-badge]') as HTMLElement | null;
            if (badge) badge.style.background = color;
            const popup = existingMarker.getPopup();
            if (popup) popup.setHTML(getPopupHTML(vehicle, color));
          } else {
            const el = document.createElement('div');
            el.style.cssText = 'width:36px;height:36px;cursor:pointer;position:relative;';
            el.innerHTML = getMarkerHTML(color);

            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([vehicle.longitude, vehicle.latitude])
              .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(getPopupHTML(vehicle, color)))
              .addTo(map.current!);

            marker.getElement().addEventListener('click', () => {
              setSelectedId(vehicle.id);
            });

            markers.current.set(vehicle.id, marker);
          }
        });
      };

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const statusCounts = {
    driving: vehicles.filter((v) => v.status !== 'offline' && (v.driver_status === 'online' || (!v.driver_status && v.status === 'online'))).length,
    idle: vehicles.filter((v) => v.status !== 'offline' && (v.driver_status === 'idle' || v.status === 'idle')).length,
    on_break: vehicles.filter((v) => v.status !== 'offline' && v.driver_status === 'on_break').length,
    repair: vehicles.filter((v) => v.status !== 'offline' && v.driver_status === 'repair').length,
    offline: vehicles.filter((v) => v.status === 'offline').length,
  };

  const handleSelectVehicle = useCallback((vehicle: Vehicle) => {
    setSelectedId(vehicle.id);
    map.current?.flyTo({
      center: [vehicle.longitude, vehicle.latitude],
      zoom: 15,
    });
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-slate-900">Live Tracking</h1>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Driving ({statusCounts.driving})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            Idle ({statusCounts.idle})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Break ({statusCounts.on_break})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Repair ({statusCounts.repair})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
            Offline ({statusCounts.offline})
          </span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

        <div className="absolute left-4 top-4 bottom-4 w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col z-10">
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 px-1">{filteredVehicles.length} vehicles</p>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => handleSelectVehicle(vehicle)}
                className={
                  'px-4 py-3 cursor-pointer border-b border-slate-50 hover:bg-slate-50 transition-colors ' +
                  (selectedId === vehicle.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : '')
                }
              >
                <div className="flex items-center gap-3">
                  <span className={
                    'w-2.5 h-2.5 rounded-full shrink-0 ' +
                    (vehicle.status === 'offline' ? 'bg-slate-400' :
                     vehicle.driver_status === 'repair' ? 'bg-red-500' :
                     vehicle.driver_status === 'on_break' ? 'bg-blue-500' :
                     vehicle.driver_status === 'idle' ? 'bg-amber-500' :
                     vehicle.status === 'online' ? 'bg-emerald-500' :
                     vehicle.status === 'idle' ? 'bg-amber-500' : 'bg-slate-400')
                  }></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{vehicle.plate_number}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {vehicle.driver_name || 'No driver'}
                    </p>
                    {vehicle.route_name && (
                      <p className="text-[10px] font-medium truncate" style={{ color: vehicle.route_color || '#3b82f6' }}>
                        {vehicle.route_name}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">
                    {vehicle.speed ? Math.round(vehicle.speed) + ' km/h' : '-'}
                  </span>
                </div>
              </div>
            ))}
            {filteredVehicles.length === 0 && (
              <div className="p-8 text-center">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No vehicles found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
