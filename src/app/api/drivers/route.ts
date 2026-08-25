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

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { id, full_name, email, phone, password, is_active } = body;

  if (!id) return NextResponse.json({ error: 'Driver ID required' }, { status: 400 });

  try {
    let result;
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      result = await sql`
        UPDATE users SET
          full_name = COALESCE(${full_name || null}, full_name),
          email = COALESCE(${email || null}, email),
          phone = COALESCE(${phone || null}, phone),
          password_hash = ${password_hash},
          is_active = COALESCE(${is_active}, is_active)
        WHERE id = ${id} AND company_id = ${companyId} AND role = 'driver'
        RETURNING id, email, full_name, phone, is_active, created_at
      `;
    } else {
      result = await sql`
        UPDATE users SET
          full_name = COALESCE(${full_name || null}, full_name),
          email = COALESCE(${email || null}, email),
          phone = COALESCE(${phone || null}, phone),
          is_active = COALESCE(${is_active}, is_active)
        WHERE id = ${id} AND company_id = ${companyId} AND role = 'driver'
        RETURNING id, email, full_name, phone, is_active, created_at
      `;
    }
    if (!result[0]) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Driver update error:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Driver ID required' }, { status: 400 });

  try {
    await sql`DELETE FROM driver_assignments WHERE driver_id = ${id}`;
    const result = await sql`DELETE FROM users WHERE id = ${id} AND company_id = ${companyId} AND role = 'driver' RETURNING id`;
    if (result.length === 0) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Driver delete error:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
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
