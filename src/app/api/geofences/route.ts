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

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const companyId = (session.user as any).companyId;
  const geofences = await sql`SELECT * FROM geofences WHERE company_id = ${companyId} ORDER BY name`;
  return NextResponse.json(geofences);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { name, type, center_lat, center_lng, radius_meters, polygon } = body;

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const result = await sql`
    INSERT INTO geofences (company_id, name, type, center_lat, center_lng, radius_meters, polygon)
    VALUES (${companyId}, ${name}, ${type || 'circle'}, ${center_lat || null}, ${center_lng || null}, ${radius_meters || null}, ${polygon ? JSON.stringify(polygon) : null}::jsonb)
    RETURNING *
  `;

  if (center_lat && center_lng && radius_meters) {
    const activeVehicles = await sql`
      SELECT v.id as vehicle_id, v.plate_number, vl.latitude, vl.longitude, vl.driver_id, u.full_name as driver_name
      FROM vehicles v
      JOIN LATERAL (
        SELECT * FROM vehicle_locations WHERE vehicle_id = v.id ORDER BY recorded_at DESC LIMIT 1
      ) vl ON true
      LEFT JOIN users u ON u.id = vl.driver_id
      WHERE v.company_id = ${companyId} AND v.is_active = true
        AND vl.recorded_at > now() - INTERVAL '5 minutes'
    `;
    for (const v of activeVehicles) {
      if (v.latitude == null || v.longitude == null) continue;
      const dist = haversine(v.latitude, v.longitude, center_lat, center_lng);
      if (dist <= radius_meters / 1000) {
        await sql`
          INSERT INTO geofence_alerts (company_id, geofence_id, vehicle_id, driver_id, event_type, geofence_name, vehicle_plate, driver_name, latitude, longitude)
          VALUES (${companyId}, ${result[0].id}, ${v.vehicle_id}, ${v.driver_id || null}, 'entered', ${name}, ${v.plate_number}, ${v.driver_name || null}, ${v.latitude}, ${v.longitude})
        `;
      }
    }
  }

  return NextResponse.json(result[0], { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { id, name, type, center_lat, center_lng, radius_meters, polygon, is_active } = body;

  if (!id) return NextResponse.json({ error: 'Geofence ID required' }, { status: 400 });

  const result = await sql`
    UPDATE geofences SET
      name = COALESCE(${name || null}, name),
      type = COALESCE(${type || null}, type),
      center_lat = COALESCE(${center_lat}, center_lat),
      center_lng = COALESCE(${center_lng}, center_lng),
      radius_meters = COALESCE(${radius_meters}, radius_meters),
      polygon = COALESCE(${polygon ? JSON.stringify(polygon) : null}::jsonb, polygon),
      is_active = COALESCE(${is_active}, is_active)
    WHERE id = ${id} AND company_id = ${companyId}
    RETURNING *
  `;
  if (!result[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(result[0]);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const result = await sql`DELETE FROM geofences WHERE id = ${id} AND company_id = ${companyId} RETURNING id`;
  if (result.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
