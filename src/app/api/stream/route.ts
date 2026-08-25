import { auth } from '@/lib/auth';
import sql from '@/lib/db';

// GET: SSE stream of all vehicle positions for dispatcher
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const companyId = (session.user as any).companyId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial data immediately
      sendPositions(controller, encoder, companyId);

      // Poll every 3 seconds
      const interval = setInterval(() => {
        sendPositions(controller, encoder, companyId);
      }, 3000);

      // Cleanup on disconnect
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

async function sendPositions(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  companyId: string
) {
  try {
    const vehicles = await sql`
      SELECT
        v.id,
        v.plate_number,
        v.name,
        l.latitude,
        l.longitude,
        l.speed,
        l.heading,
        l.recorded_at,
        u.full_name as driver_name,
        CASE
          WHEN l.recorded_at > now() - INTERVAL '2 minutes' THEN 'online'
          WHEN l.recorded_at > now() - INTERVAL '10 minutes' THEN 'idle'
          ELSE 'offline'
        END as status
      FROM vehicles v
      LEFT JOIN LATERAL (
        SELECT * FROM vehicle_locations
        WHERE vehicle_id = v.id
        ORDER BY recorded_at DESC LIMIT 1
      ) l ON true
      LEFT JOIN driver_assignments da ON da.vehicle_id = v.id AND da.is_active = true
      LEFT JOIN users u ON u.id = da.driver_id
      WHERE v.company_id = ${companyId} AND v.is_active = true
    `;

    controller.enqueue(encoder.encode(`data: ${JSON.stringify(vehicles)}\n\n`));
  } catch (error) {
    console.error('SSE stream error:', error);
  }
}
