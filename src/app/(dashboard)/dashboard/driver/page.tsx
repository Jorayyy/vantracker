'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

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

  // Fetch assigned vehicles
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">🚐 VanTracker</h1>
          <p className="text-gray-400 mt-1">Driver Mode</p>
        </div>

        {/* User info */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-400">Logged in as</p>
          <p className="font-medium">{session?.user?.name || 'Loading...'}</p>
        </div>

        {/* Vehicle selector */}
        <div className="bg-gray-800 rounded-xl p-4 mb-6">
          <label className="block text-sm text-gray-400 mb-2">Select Vehicle</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-4 py-3 text-white"
            disabled={isTracking}
          >
            {vehicles.length === 0 && (
              <option value="">No vehicles assigned</option>
            )}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_number} {v.name ? `- ${v.name}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-700'
          }`}>
            <span className="text-3xl">{isTracking ? '📡' : '📴'}</span>
          </div>
          <p className="text-lg font-medium">
            {isTracking ? 'Tracking Active' : 'Tracking Off'}
          </p>
          {lastUpdate && (
            <p className="text-sm text-gray-400 mt-1">Last update: {lastUpdate}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-6 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Controls */}
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`w-full py-4 rounded-xl text-lg font-bold transition-colors ${
            isTracking
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={!selectedVehicle}
        >
          {isTracking ? '⏹ Stop Tracking' : '▶ Start Tracking'}
        </button>

        <p className="text-center text-gray-500 text-xs mt-4">
          Keep this page open while driving. GPS will update every few seconds.
        </p>
      </div>
    </div>
  );
}
