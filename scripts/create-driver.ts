import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

async function createDriver() {
  const hash = await bcrypt.hash('driver123', 10);
  const company = await sql`SELECT id FROM companies LIMIT 1`;
  const companyId = company[0].id;

  const result = await sql`
    INSERT INTO users (company_id, email, password_hash, full_name, phone, role)
    VALUES (${companyId}, 'driver@demo.com', ${hash}, 'Juan Dela Cruz', '09123456789', 'driver')
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, full_name, role
  `;
  console.log('Driver created:', result[0]);

  if (result[0]) {
    const vehicle = await sql`SELECT id FROM vehicles WHERE company_id = ${companyId} LIMIT 1`;
    if (vehicle[0]) {
      const assign = await sql`
        INSERT INTO driver_assignments (driver_id, vehicle_id)
        VALUES (${result[0].id}, ${vehicle[0].id})
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      console.log('Assigned to vehicle:', assign[0]);
    }
  }
}

createDriver();
