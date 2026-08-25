const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const url = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(url);

(async () => {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'geofences'
    ORDER BY ordinal_position
  `;
  console.log('GEOFENCES TABLE COLUMNS:', JSON.stringify(cols, null, 2));

  const count = await sql`SELECT COUNT(*) as count FROM geofences`;
  console.log('GEOFENCES COUNT:', count[0].count);

  const sample = await sql`SELECT * FROM geofences LIMIT 5`;
  console.log('SAMPLE:', JSON.stringify(sample, null, 2));

  process.exit();
})().catch(e => { console.error(e); process.exit(1); });
