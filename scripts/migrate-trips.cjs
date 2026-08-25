const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const url = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(url);

(async () => {
  await sql`ALTER TABLE trip_summaries ADD COLUMN IF NOT EXISTS route_id UUID`;
  await sql`ALTER TABLE trip_summaries ADD COLUMN IF NOT EXISTS route_name TEXT`;
  console.log('Columns added');
  process.exit();
})().catch(e => { console.error(e); process.exit(1); });
