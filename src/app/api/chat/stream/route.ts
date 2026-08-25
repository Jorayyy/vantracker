import { auth } from '@/lib/auth';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const companyId = (session.user as any).companyId;
  const userId = (session.user as any).id;
  const encoder = new TextEncoder();
  let lastMessageTime: string | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendMessages = async () => {
        try {
          let messages;
          if (lastMessageTime) {
            messages = await sql`
              SELECT cm.*, u.full_name as sender_name, u.role as sender_role
              FROM chat_messages cm
              LEFT JOIN users u ON u.id = cm.sender_id
              WHERE cm.company_id = ${companyId}
                AND (cm.sender_id = ${userId} OR cm.recipient_id = ${userId} OR cm.recipient_id IS NULL)
                AND cm.created_at > ${lastMessageTime}
              ORDER BY cm.created_at ASC
            `;
          } else {
            messages = await sql`
              SELECT cm.*, u.full_name as sender_name, u.role as sender_role
              FROM chat_messages cm
              LEFT JOIN users u ON u.id = cm.sender_id
              WHERE cm.company_id = ${companyId}
                AND (cm.sender_id = ${userId} OR cm.recipient_id = ${userId} OR cm.recipient_id IS NULL)
              ORDER BY cm.created_at DESC
              LIMIT 20
            `;
            messages = messages.reverse();
          }

          if (messages.length > 0) {
            lastMessageTime = messages[messages.length - 1].created_at;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(messages)}\n\n`));
          }
        } catch (error) {
          console.error('Chat stream error:', error);
        }
      };

      sendMessages();

      const interval = setInterval(sendMessages, 2000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
