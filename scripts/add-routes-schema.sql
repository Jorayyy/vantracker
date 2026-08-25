-- Fixed routes table
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  waypoints JSONB NOT NULL DEFAULT '[]',
  estimated_duration_minutes INTEGER,
  estimated_distance_km DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route assignments (which vehicle follows which route)
CREATE TABLE IF NOT EXISTS route_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, vehicle_id)
);

-- Driver statuses (idle, repair, break, etc.)
CREATE TABLE IF NOT EXISTS driver_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'online',
  status_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add status column to vehicle_locations
ALTER TABLE vehicle_locations ADD COLUMN IF NOT EXISTS driver_status VARCHAR(50) DEFAULT 'online';
