'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
}

export default function LiveTrackingPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [124.8, 10.75], // Leyte, Philippines
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      const data: Vehicle[] = JSON.parse(event.data);
      setVehicles(data);

      data.forEach((vehicle) => {
        if (!map.current) return;

        const existingMarker = markers.current.get(vehicle.id);

        if (existingMarker) {
          // Animate to new position
          existingMarker.setLngLat([vehicle.longitude, vehicle.latitude]);
        } else {
          // Create new marker
          const statusColor = vehicle.status === 'online' ? '#22c55e' :
                             vehicle.status === 'idle' ? '#eab308' : '#6b7280';

          const el = document.createElement('div');
          el.className = 'vehicle-marker';
          el.style.cssText = `
            width: 32px;
            height: 32px;
            background: ${statusColor};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          `;
          el.innerHTML = '🚐';

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([vehicle.longitude, vehicle.latitude])
            .setPopup(
              new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <p class="font-bold">${vehicle.plate_number}</p>
                  <p class="text-sm text-gray-600">${vehicle.name || ''}</p>
                  <p class="text-sm text-gray-600">${vehicle.driver_name || 'No driver'}</p>
                  <p class="text-sm">Speed: ${vehicle.speed ? Math.round(vehicle.speed) : 0} km/h</p>
                </div>
              `)
            )
            .addTo(map.current);

          marker.getElement().addEventListener('click', () => {
            setSelectedVehicle(vehicle);
          });

          markers.current.set(vehicle.id, marker);
        }
      });
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Live Tracking</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span> Online
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Idle
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-gray-500 rounded-full"></span> Offline
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Vehicle list sidebar */}
        <div className="absolute left-4 top-4 bottom-4 w-72 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-gray-50">
            <p className="font-semibold text-gray-900">Fleet ({vehicles.length})</p>
          </div>
          <div className="flex-1 overflow-auto">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => {
                  setSelectedVehicle(vehicle);
                  map.current?.flyTo({
                    center: [vehicle.longitude, vehicle.latitude],
                    zoom: 15,
                  });
                }}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedVehicle?.id === vehicle.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    vehicle.status === 'online' ? 'bg-green-500' :
                    vehicle.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{vehicle.plate_number}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {vehicle.driver_name || 'No driver'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {vehicle.speed ? `${Math.round(vehicle.speed)} km/h` : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
