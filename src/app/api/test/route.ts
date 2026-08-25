import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection
    const result = await sql`SELECT 1 as test`;
    
    // Test if users table exists and has data
    const users = await sql`SELECT id, email, role FROM users LIMIT 5`;
    
    return NextResponse.json({
      dbConnected: true,
      testResult: result,
      users: users,
      dbUrl: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
      nextauthSecret: process.env.NEXTAUTH_SECRET ? 'SET (hidden)' : 'NOT SET',
      nextauthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    });
  } catch (error: any) {
    return NextResponse.json({
      dbConnected: false,
      error: error.message,
      code: error.code,
      dbUrl: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
    }, { status: 500 });
  }
}
