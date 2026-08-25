const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  try {
    await sql`ALTER TABLE driver_statuses ADD CONSTRAINT driver_statuses_driver_id_unique UNIQUE (driver_id)`;
    console.log('Constraint added');
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('Constraint already exists');
    } else {
      console.error(e);
    }
  }
}
run();
