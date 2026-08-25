import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

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
