// Seed script: Create initial admin user and company
// Usage: npx tsx scripts/seed.ts

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  const companyName = 'Demo Fleet Company';
  const adminEmail = 'admin@demo.com';
  const adminPassword = 'admin123';

  console.log('Creating company...');
  const [company] = await sql`
    INSERT INTO companies (name, address, phone)
    VALUES (${companyName}, 'Tacloban City, Leyte', '09123456789')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  if (!company) {
    console.log('Company already exists, fetching...');
    const [existing] = await sql`SELECT id FROM companies LIMIT 1`;
    if (!existing) {
      console.error('No company found and could not create one');
      process.exit(1);
    }
    await createAdmin(existing.id);
    return;
  }

  await createAdmin(company.id);

  // Create demo vehicles
  console.log('Creating demo vehicles...');
  await sql`
    INSERT INTO vehicles (company_id, plate_number, name, model, color)
    VALUES
      (${company.id}, 'ABC 1234', 'Delivery Van 1', 'Toyota HiAce', 'White'),
      (${company.id}, 'XYZ 5678', 'Delivery Van 2', 'Nissan NV350', 'Blue'),
      (${company.id}, 'DEF 9012', 'Delivery Van 3', 'Mitsubishi L300', 'Red')
    ON CONFLICT DO NOTHING
  `;

  console.log('Seed complete!');
  console.log('Login with: admin@demo.com / admin123');
}

async function createAdmin(companyId: string) {
  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash('admin123', 10);

  await sql`
    INSERT INTO users (company_id, email, password_hash, full_name, role)
    VALUES (${companyId}, 'admin@demo.com', ${passwordHash}, 'Admin User', 'admin')
    ON CONFLICT (email) DO NOTHING
  `;
}

seed().catch(console.error);
