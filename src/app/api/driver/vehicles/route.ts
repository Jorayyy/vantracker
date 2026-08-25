import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET: Get vehicles assigned to the current driver
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;

  const vehicles = await sql`
    SELECT v.id, v.plate_number, v.name
    FROM driver_assignments da
    JOIN vehicles v ON v.id = da.vehicle_id
    WHERE da.driver_id = ${userId} AND da.is_active = true
  `;

  return NextResponse.json(vehicles);
}
