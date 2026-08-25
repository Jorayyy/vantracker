import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { plate_number, name, model, color, company_id } = body;

  const result = await sql`
    INSERT INTO vehicles (company_id, plate_number, name, model, color)
    VALUES (${company_id}, ${plate_number}, ${name || null}, ${model || null}, ${color || null})
    RETURNING *
  `;

  return NextResponse.json(result[0]);
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
