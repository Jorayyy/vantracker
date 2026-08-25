const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const url = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(url);

(async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS geofence_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
      vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
      driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      geofence_name TEXT,
      vehicle_plate TEXT,
      driver_name TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_geofence_alerts_company ON geofence_alerts(company_id, created_at DESC)`;
  console.log('geofence_alerts table created');
  process.exit();
})().catch(e => { console.error(e); process.exit(1); });
