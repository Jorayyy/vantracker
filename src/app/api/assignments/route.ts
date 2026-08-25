import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// POST: Assign driver to vehicle
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { driver_id, vehicle_id } = body;

  if (!driver_id || !vehicle_id) {
    return NextResponse.json({ error: 'driver_id and vehicle_id required' }, { status: 400 });
  }

  // Deactivate old assignment for this vehicle
  await sql`
    UPDATE driver_assignments SET is_active = false
    WHERE vehicle_id = ${vehicle_id} AND is_active = true
  `;

  // Create new assignment
  const result = await sql`
    INSERT INTO driver_assignments (driver_id, vehicle_id)
    VALUES (${driver_id}, ${vehicle_id})
    ON CONFLICT (driver_id, vehicle_id) DO UPDATE SET is_active = true
    RETURNING *
  `;

  return NextResponse.json(result[0]);
}

// DELETE: Unassign driver from vehicle
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle_id');

  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicle_id required' }, { status: 400 });
  }

  await sql`
    UPDATE driver_assignments SET is_active = false
    WHERE vehicle_id = ${vehicleId} AND is_active = true
  `;

  return NextResponse.json({ success: true });
}
