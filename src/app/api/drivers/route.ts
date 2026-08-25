import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { full_name, email, phone, password } = body;

  if (!full_name || !email || !password) {
    return NextResponse.json({ error: 'full_name, email, and password are required' }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const result = await sql`
      INSERT INTO users (company_id, email, password_hash, full_name, phone, role)
      VALUES (${companyId}, ${email}, ${password_hash}, ${full_name}, ${phone || null}, 'driver')
      RETURNING id, email, full_name, phone, role, created_at
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Driver create error:', error);
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;

  const drivers = await sql`
    SELECT u.id, u.full_name, u.email, u.phone, u.is_active, u.created_at,
           v.plate_number, v.name as vehicle_name
    FROM users u
    LEFT JOIN driver_assignments da ON da.driver_id = u.id AND da.is_active = true
    LEFT JOIN vehicles v ON v.id = da.vehicle_id
    WHERE u.company_id = ${companyId} AND u.role = 'driver'
    ORDER BY u.full_name
  `;

  return NextResponse.json(drivers);
}
