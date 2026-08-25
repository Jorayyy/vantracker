import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const routes = await sql`
    SELECT r.*,
      COALESCE(
        json_agg(
          json_build_object('vehicle_id', ra.vehicle_id, 'plate_number', v.plate_number)
        ) FILTER (WHERE ra.vehicle_id IS NOT NULL),
        '[]'
      ) as assigned_vehicles
    FROM routes r
    LEFT JOIN route_assignments ra ON ra.route_id = r.id
    LEFT JOIN vehicles v ON v.id = ra.vehicle_id
    WHERE r.company_id = ${companyId}
    GROUP BY r.id
    ORDER BY r.name
  `;

  return NextResponse.json(routes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { name, description, color, waypoints, estimated_duration_minutes, estimated_distance_km } = body;

  if (!name || !waypoints || waypoints.length < 2) {
    return NextResponse.json({ error: 'Name and at least 2 waypoints required' }, { status: 400 });
  }

  const result = await sql`
    INSERT INTO routes (company_id, name, description, color, waypoints, estimated_duration_minutes, estimated_distance_km)
    VALUES (${companyId}, ${name}, ${description || null}, ${color || '#3b82f6'}, ${JSON.stringify(waypoints)}::jsonb, ${estimated_duration_minutes || null}, ${estimated_distance_km || null})
    RETURNING *
  `;

  return NextResponse.json(result[0], { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { id, name, description, color, waypoints, estimated_duration_minutes, estimated_distance_km, is_active, vehicle_ids } = body;

  if (!id) return NextResponse.json({ error: 'Route ID required' }, { status: 400 });

  const result = await sql`
    UPDATE routes SET
      name = COALESCE(${name}, name),
      description = COALESCE(${description}, description),
      color = COALESCE(${color}, color),
      waypoints = COALESCE(${waypoints ? JSON.stringify(waypoints) : null}::jsonb, waypoints),
      estimated_duration_minutes = COALESCE(${estimated_duration_minutes}, estimated_duration_minutes),
      estimated_distance_km = COALESCE(${estimated_distance_km}, estimated_distance_km),
      is_active = COALESCE(${is_active}, is_active),
      updated_at = NOW()
    WHERE id = ${id} AND company_id = ${companyId}
    RETURNING *
  `;

  if (result[0] && vehicle_ids !== undefined) {
    await sql`DELETE FROM route_assignments WHERE route_id = ${id}`;
    for (const vid of vehicle_ids) {
      await sql`INSERT INTO route_assignments (route_id, vehicle_id) VALUES (${id}, ${vid}) ON CONFLICT DO NOTHING`;
    }
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Route ID required' }, { status: 400 });

  await sql`DELETE FROM routes WHERE id = ${id} AND company_id = ${companyId}`;
  return NextResponse.json({ success: true });
}
