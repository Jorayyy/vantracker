import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// POST: Receive GPS location from driver's phone
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { vehicle_id, driver_id, latitude, longitude, speed, heading, accuracy, recorded_at, driver_status } = body;

    if (!vehicle_id || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO vehicle_locations (vehicle_id, driver_id, latitude, longitude, speed, heading, accuracy, recorded_at, driver_status)
      VALUES (${vehicle_id}, ${driver_id || null}, ${lat}, ${lng}, ${speed || null}, ${heading || null}, ${accuracy || null}, ${recorded_at || new Date().toISOString()}, ${driver_status || 'online'})
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
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicle_id required' }, { status: 400 });
  }

  try {
    const locations = await sql`
      SELECT id, latitude, longitude, speed, heading, accuracy, recorded_at, driver_status
      FROM vehicle_locations
      WHERE vehicle_id = ${vehicleId}
      ORDER BY recorded_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Location query error:', error);
    return NextResponse.json({ error: 'Failed to query locations' }, { status: 500 });
  }
}
