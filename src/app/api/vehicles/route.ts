import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { plate_number, name, model, color } = body;

  if (!plate_number || !plate_number.trim()) {
    return NextResponse.json({ error: 'Plate number required' }, { status: 400 });
  }

  try {
    const result = await sql`
      INSERT INTO vehicles (company_id, plate_number, name, model, color)
      VALUES (${companyId}, ${plate_number.trim()}, ${name || null}, ${model || null}, ${color || null})
      RETURNING *
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Vehicle create error:', error);
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { id, plate_number, name, model, color, is_active } = body;

  if (!id) return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 });

  try {
    const result = await sql`
      UPDATE vehicles SET
        plate_number = COALESCE(${plate_number || null}, plate_number),
        name = COALESCE(${name || null}, name),
        model = COALESCE(${model || null}, model),
        color = COALESCE(${color || null}, color),
        is_active = COALESCE(${is_active}, is_active)
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `;
    if (!result[0]) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Vehicle update error:', error);
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 });

  try {
    await sql`DELETE FROM driver_assignments WHERE vehicle_id = ${id}`;
    const result = await sql`DELETE FROM vehicles WHERE id = ${id} AND company_id = ${companyId} RETURNING id`;
    if (result.length === 0) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vehicle delete error:', error);
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const vehicles = await sql`
    SELECT v.*, u.full_name as driver_name
    FROM vehicles v
    LEFT JOIN driver_assignments da ON da.vehicle_id = v.id AND da.is_active = true
    LEFT JOIN users u ON u.id = da.driver_id
    WHERE v.company_id = ${companyId}
    ORDER BY v.plate_number
  `;

  return NextResponse.json(vehicles);
}
