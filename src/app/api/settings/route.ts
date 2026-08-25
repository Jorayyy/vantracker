import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { name, address, phone, email } = body;

  try {
    const result = await sql`
      UPDATE companies SET
        name = COALESCE(${name || null}, name),
        address = COALESCE(${address || null}, address),
        phone = COALESCE(${phone || null}, phone),
        email = COALESCE(${email || null}, email)
      WHERE id = ${companyId}
      RETURNING *
    `;
    if (!result[0]) return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
