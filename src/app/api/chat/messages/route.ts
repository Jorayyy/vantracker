import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const before = searchParams.get('before');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

  let messages;
  if (before) {
    messages = await sql`
      SELECT cm.*, u.full_name as sender_name, u.role as sender_role
      FROM chat_messages cm
      LEFT JOIN users u ON u.id = cm.sender_id
      WHERE cm.company_id = ${companyId}
        AND (cm.sender_id = ${userId} OR cm.recipient_id = ${userId} OR cm.recipient_id IS NULL)
        AND cm.created_at < (SELECT created_at FROM chat_messages WHERE id = ${before})
      ORDER BY cm.created_at DESC
      LIMIT ${limit}
    `;
  } else {
    messages = await sql`
      SELECT cm.*, u.full_name as sender_name, u.role as sender_role
      FROM chat_messages cm
      LEFT JOIN users u ON u.id = cm.sender_id
      WHERE cm.company_id = ${companyId}
        AND (cm.sender_id = ${userId} OR cm.recipient_id = ${userId} OR cm.recipient_id IS NULL)
      ORDER BY cm.created_at DESC
      LIMIT ${limit}
    `;
  }

  return NextResponse.json(messages.reverse());
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const body = await request.json();
  const { message, recipient_id } = body;

  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    const result = await sql`
      INSERT INTO chat_messages (company_id, sender_id, recipient_id, message)
      VALUES (${companyId}, ${userId}, ${recipient_id || null}, ${message.trim()})
      RETURNING *
    `;
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await request.json();
  const { message_ids } = body;

  if (!message_ids || !Array.isArray(message_ids)) {
    return NextResponse.json({ error: 'message_ids array required' }, { status: 400 });
  }

  try {
    await sql`
      UPDATE chat_messages SET is_read = true
      WHERE id = ANY(${message_ids}) AND recipient_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat mark read error:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
