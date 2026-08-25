import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// POST: Receive GPS location from driver's phone
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vehicle_id, driver_id, latitude, longitude, speed, heading, accuracy, recorded_at } = body;

    if (!vehicle_id || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO vehicle_locations (vehicle_id, driver_id, latitude, longitude, speed, heading, accuracy, recorded_at)
      VALUES (${vehicle_id}, ${driver_id || null}, ${latitude}, ${longitude}, ${speed || null}, ${heading || null}, ${accuracy || null}, ${recorded_at || new Date().toISOString()})
      RETURNING id, recorded_at
    `;

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error('Location insert error:', error);
    return NextResponse.json({ error: 'Failed to save location' }, { status: 500 });
  }
}

// GET: Get location history for a vehicle
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle_id');
  const limit = parseInt(searchParams.get('limit') || '100');

  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicle_id required' }, { status: 400 });
  }

  const locations = await sql`
    SELECT id, latitude, longitude, speed, heading, accuracy, recorded_at
    FROM vehicle_locations
    WHERE vehicle_id = ${vehicleId}
    ORDER BY recorded_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json(locations);
}
