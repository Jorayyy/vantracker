import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle_id');
  if (!vehicleId) return NextResponse.json({ route: null });

  const result = await sql`
    SELECT r.id, r.name, r.color, r.waypoints
    FROM route_assignments ra
    JOIN routes r ON r.id = ra.route_id
    WHERE ra.vehicle_id = ${vehicleId} AND r.is_active = true
    LIMIT 1
  `;

  return NextResponse.json({ route: result[0] || null });
}
