'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Truck, Play, Square, Signal, WifiOff, MapPin, Clock, Loader2 } from 'lucide-react';

interface Vehicle {
  id: string;
  plate_number: string;
  name: string;
}

export default function DriverPage() {
  const { data: session } = useSession();
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/driver/vehicles')
      .then((res) => res.json())
      .then((data) => {
        setVehicles(data);
        if (data.length > 0) setSelectedVehicle(data[0].id);
      });
  }, []);

  const startTracking = () => {
    if (!selectedVehicle) {
      setError('Please select a vehicle first');
      return;
    }

    setError(null);

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
          setError(`GPS Error: ${err.message}`);
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
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
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-md mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">VanTracker</h1>
          <p className="text-slate-400 text-sm mt-1">Driver Mode</p>
        </div>

        {/* User info */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-5">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-medium mb-1">Logged in as</p>
          <p className="font-semibold text-sm">{session?.user?.name || 'Loading...'}</p>
        </div>

        {/* Vehicle selector */}
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
              <option key={v.id} value={v.id}>
                {v.plate_number} {v.name ? `- ${v.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Status card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-5 text-center">
          <div className={`w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center transition-all duration-300 ${
            isTracking
              ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-700 border-2 border-slate-600'
          }`}>
            {isTracking ? (
              <Signal className="w-10 h-10 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-10 h-10 text-slate-500" />
            )}
          </div>
          <p className="text-lg font-bold">
            {isTracking ? 'Tracking Active' : 'Tracking Off'}
          </p>
          {lastUpdate && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs text-slate-400">Last update: {lastUpdate}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-5">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Control button */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isTracking
              ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/25'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25'
          }`}
          disabled={!selectedVehicle}
        >
          {isTracking ? (
            <>
              <Square className="w-4 h-4" />
              Stop Tracking
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Tracking
            </>
          )}
        </button>

        <p className="text-center text-slate-500 text-[11px] mt-4">
          Keep this page open while driving. GPS updates every few seconds.
        </p>
      </div>
    </div>
  );
}
