const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', '(dashboard)', 'dashboard', 'driver', 'page.tsx');

const content = `'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Truck, Play, Square, Signal, WifiOff, Clock, Coffee, Wrench, Pause } from 'lucide-react';

interface Vehicle {
  id: string;
  plate_number: string;
  name: string;
}

interface DriverRoute {
  id: string;
  name: string;
  color: string;
  waypoints: { lat: number; lng: number; name: string }[];
}

const statusConfig: Record<string, { label: string; Icon: typeof Truck; activeBg: string; activeBorder: string; activeText: string }> = {
  online: { label: 'Driving', Icon: Truck, activeBg: 'bg-emerald-500/10', activeBorder: 'border-emerald-500/50', activeText: 'text-emerald-400' },
  idle: { label: 'Idling', Icon: Pause, activeBg: 'bg-amber-500/10', activeBorder: 'border-amber-500/50', activeText: 'text-amber-400' },
  on_break: { label: 'On Break', Icon: Coffee, activeBg: 'bg-blue-500/10', activeBorder: 'border-blue-500/50', activeText: 'text-blue-400' },
  repair: { label: 'Repair', Icon: Wrench, activeBg: 'bg-red-500/10', activeBorder: 'border-red-500/50', activeText: 'text-red-400' },
};

export default function DriverPage() {
  const { data: session } = useSession();
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [driverStatus, setDriverStatus] = useState('online');
  const [currentRoute, setCurrentRoute] = useState<DriverRoute | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const driverStatusRef = useRef('online');

  useEffect(() => {
    fetch('/api/driver/vehicles')
      .then((res) => res.json())
      .then((data) => {
        setVehicles(data);
        if (data.length > 0) setSelectedVehicle(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      fetch('/api/driver/vehicle-route?vehicle_id=' + selectedVehicle)
        .then((res) => res.json())
        .then((data) => setCurrentRoute(data.route || null))
        .catch(() => setCurrentRoute(null));
    }
  }, [selectedVehicle]);

  const sendStatus = async (status: string) => {
    setDriverStatus(status);
    driverStatusRef.current = status;
    try {
      await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Failed to send status:', err);
    }
  };

  const startTracking = () => {
    if (!selectedVehicle) {
      setError('Please select a vehicle first');
      return;
    }
    setError(null);
    sendStatus('online');

    const sendLocation = async (position: GeolocationPosition) => {
      try {
        await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: selectedVehicle,
            driver_id: (session?.user as any)?.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
            accuracy: position.coords.accuracy,
            recorded_at: new Date().toISOString(),
            driver_status: driverStatusRef.current,
          }),
        });
        setLastUpdate(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Failed to send location:', err);
      }
    };

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        sendLocation,
        (err) => {
          setError('GPS Error: ' + err.message);
          setIsTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      setIsTracking(true);
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    sendStatus('offline');
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const cfg = statusConfig[driverStatus] || statusConfig.online;
  const StatusIcon = cfg.Icon;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8 pt-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">VanTracker</h1>
          <p className="text-slate-400 text-sm mt-1">Driver Mode</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1">Logged in as</p>
          <p className="font-semibold text-sm">{session?.user?.name || 'Loading...'}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
          <label className="block text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-2">Select Vehicle</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTracking}
          >
            {vehicles.length === 0 && <option value="">No vehicles assigned</option>}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate_number} {v.name ? '- ' + v.name : ''}</option>
            ))}
          </select>
        </div>

        {currentRoute && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentRoute.color }}></div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Current Route</span>
            </div>
            <p className="font-semibold text-sm">{currentRoute.name}</p>
            {currentRoute.waypoints && (
              <div className="mt-2 space-y-1">
                {currentRoute.waypoints.map((wp, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold bg-slate-700 text-slate-400">{i + 1}</div>
                    <span>{wp.name || 'Stop ' + (i + 1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isTracking && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-3">Set Your Status</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(statusConfig).map(([value, opt]) => {
                const Icon = opt.Icon;
                const isActive = driverStatus === value;
                return (
                  <button
                    key={value}
                    onClick={() => sendStatus(value)}
                    className={
                      'p-3 rounded-xl border text-left transition-all ' +
                      (isActive ? opt.activeBg + ' ' + opt.activeBorder : 'bg-slate-700/50 border-slate-700 hover:border-slate-600')
                    }
                  >
                    <Icon className={'w-4 h-4 mb-1.5 ' + (isActive ? opt.activeText : 'text-slate-500')} />
                    <p className={'text-xs font-semibold ' + (isActive ? 'text-white' : 'text-slate-400')}>{opt.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-5 text-center">
          <div className={
            'w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center transition-all duration-300 ' +
            (isTracking
              ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-700 border-2 border-slate-600')
          }>
            {isTracking ? (
              <Signal className="w-10 h-10 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-10 h-10 text-slate-500" />
            )}
          </div>
          <p className="text-lg font-bold">
            {isTracking ? 'Tracking Active' : 'Tracking Off'}
          </p>
          {isTracking && (
            <div className={'flex items-center justify-center gap-2 mt-2'}>
              <StatusIcon className={'w-4 h-4 ' + cfg.activeText} />
              <span className={'text-sm font-medium ' + cfg.activeText}>{cfg.label}</span>
            </div>
          )}
          {lastUpdate && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs text-slate-400">Last update: {lastUpdate}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-5">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={
            'w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ' +
            (isTracking
              ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/25'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25')
          }
          disabled={!selectedVehicle}
        >
          {isTracking ? (
            <><Square className="w-4 h-4" /> Stop Tracking</>
          ) : (
            <><Play className="w-4 h-4" /> Start Tracking</>
          )}
        </button>

        {isTracking && (
          <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-3">Change Status</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(statusConfig).map(([value, opt]) => {
                const Icon = opt.Icon;
                const isActive = driverStatus === value;
                return (
                  <button
                    key={value}
                    onClick={() => sendStatus(value)}
                    className={
                      'p-2 rounded-lg text-center transition-all ' +
                      (isActive ? opt.activeBg + ' border ' + opt.activeBorder : 'bg-slate-700/50 border border-slate-700 hover:border-slate-600')
                    }
                  >
                    <Icon className={'w-4 h-4 mx-auto mb-1 ' + (isActive ? opt.activeText : 'text-slate-500')} />
                    <p className={'text-[10px] font-medium ' + (isActive ? 'text-white' : 'text-slate-400')}>{opt.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-center text-slate-500 text-[11px] mt-4">
          Keep this page open while driving. GPS updates every few seconds.
        </p>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Driver page rewritten with static Tailwind classes + ref fix');
