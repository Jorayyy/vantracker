import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

    const ts = recorded_at || new Date().toISOString();
    const status = driver_status || 'online';

    const result = await sql`
      INSERT INTO vehicle_locations (vehicle_id, driver_id, latitude, longitude, speed, heading, accuracy, recorded_at, driver_status)
      VALUES (${vehicle_id}, ${driver_id || null}, ${lat}, ${lng}, ${speed || null}, ${heading || null}, ${accuracy || null}, ${ts}, ${status})
      RETURNING id, recorded_at
    `;

    const isActive = status === 'online' || status === 'idle';

    if (isActive) {
      const [activeTrip] = await sql`
        SELECT id FROM trip_summaries
        WHERE vehicle_id = ${vehicle_id} AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1
      `;

      if (!activeTrip) {
        const [assignedRoute] = await sql`
          SELECT r.id as route_id, r.name as route_name
          FROM route_assignments ra
          JOIN routes r ON r.id = ra.route_id AND r.is_active = true
          WHERE ra.vehicle_id = ${vehicle_id}
          LIMIT 1
        `;
        await sql`
          INSERT INTO trip_summaries (vehicle_id, driver_id, started_at, start_lat, start_lng, route_id, route_name)
          VALUES (${vehicle_id}, ${driver_id || null}, ${ts}, ${lat}, ${lng}, ${assignedRoute?.route_id || null}, ${assignedRoute?.route_name || null})
        `;
      }
    } else {
      const [activeTrip] = await sql`
        SELECT id, started_at, start_lat, start_lng FROM trip_summaries
        WHERE vehicle_id = ${vehicle_id} AND ended_at IS NULL
        ORDER BY started_at DESC LIMIT 1
      `;

      if (activeTrip) {
        const [lastLoc] = await sql`
          SELECT latitude, longitude, speed FROM vehicle_locations
          WHERE vehicle_id = ${vehicle_id} AND recorded_at > ${activeTrip.started_at}
          ORDER BY recorded_at DESC LIMIT 1 OFFSET 1
        `;
        const totalDistance = lastLoc ? haversine(activeTrip.start_lat, activeTrip.start_lng, lat, lng) : 0;

        const [speedStats] = await sql`
          SELECT AVG(speed) as avg_speed, MAX(speed) as max_speed
          FROM vehicle_locations
          WHERE vehicle_id = ${vehicle_id}
            AND recorded_at >= ${activeTrip.started_at}
            AND recorded_at <= ${ts}
            AND speed IS NOT NULL AND speed > 0
        `;

        await sql`
          UPDATE trip_summaries
          SET ended_at = ${ts}, end_lat = ${lat}, end_lng = ${lng},
              distance_km = ${totalDistance},
              avg_speed = ${speedStats?.avg_speed || null},
              max_speed = ${speedStats?.max_speed || null}
          WHERE id = ${activeTrip.id}
        `;
      }
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await sql`
      UPDATE trip_summaries
      SET ended_at = ${ts}, end_lat = ${lat}, end_lng = ${lng}
      WHERE ended_at IS NULL
        AND vehicle_id = ${vehicle_id}
        AND started_at < ${fiveMinAgo}
    `;

    const [vehicle] = await sql`SELECT company_id FROM vehicles WHERE id = ${vehicle_id}`;
    if (vehicle) {
      const geofences = await sql`
        SELECT id, name, center_lat, center_lng, radius_meters
        FROM geofences WHERE company_id = ${vehicle.company_id} AND is_active = true
      `;
      const [vehicleInfo] = await sql`SELECT plate_number FROM vehicles WHERE id = ${vehicle_id}`;
      const [driverInfo] = driver_id
        ? await sql`SELECT full_name FROM users WHERE id = ${driver_id}`
        : [null];

      for (const gf of geofences) {
        if (gf.center_lat == null || gf.center_lng == null || gf.radius_meters == null) continue;
        const dist = haversine(lat, lng, gf.center_lat, gf.center_lng);
        const isInside = dist <= gf.radius_meters / 1000;

        const [lastAlert] = await sql`
          SELECT event_type FROM geofence_alerts
          WHERE geofence_id = ${gf.id} AND vehicle_id = ${vehicle_id}
          ORDER BY created_at DESC LIMIT 1
        `;

        const wasInside = lastAlert?.event_type === 'entered';

        if (isInside && !wasInside) {
          await sql`
            INSERT INTO geofence_alerts (company_id, geofence_id, vehicle_id, driver_id, event_type, geofence_name, vehicle_plate, driver_name, latitude, longitude)
            VALUES (${vehicle.company_id}, ${gf.id}, ${vehicle_id}, ${driver_id || null}, 'entered', ${gf.name}, ${vehicleInfo?.plate_number || ''}, ${driverInfo?.full_name || null}, ${lat}, ${lng})
          `;
        } else if (!isInside && wasInside) {
          await sql`
            INSERT INTO geofence_alerts (company_id, geofence_id, vehicle_id, driver_id, event_type, geofence_name, vehicle_plate, driver_name, latitude, longitude)
            VALUES (${vehicle.company_id}, ${gf.id}, ${vehicle_id}, ${driver_id || null}, 'exited', ${gf.name}, ${vehicleInfo?.plate_number || ''}, ${driverInfo?.full_name || null}, ${lat}, ${lng})
          `;
        }
      }
    }

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error('Location insert error:', error);
    return NextResponse.json({ error: 'Failed to save location' }, { status: 500 });
  }
}

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
