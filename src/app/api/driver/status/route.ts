import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await request.json();
  const { status, status_message } = body;

  const validStatuses = ['online', 'idle', 'on_break', 'repair', 'offline'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM driver_statuses WHERE driver_id = ${userId}`;

  if (existing.length > 0) {
    await sql`
      UPDATE driver_statuses SET status = ${status}, status_message = ${status_message || null}, created_at = NOW()
      WHERE driver_id = ${userId}
    `;
  } else {
    await sql`
      INSERT INTO driver_statuses (driver_id, status, status_message)
      VALUES (${userId}, ${status}, ${status_message || null})
    `;
  }

  return NextResponse.json({ success: true, status });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const statuses = await sql`
    SELECT ds.*, u.full_name as driver_name
    FROM driver_statuses ds
    JOIN users u ON u.id = ds.driver_id
    WHERE u.company_id = ${companyId}
  `;

  return NextResponse.json(statuses);
}
