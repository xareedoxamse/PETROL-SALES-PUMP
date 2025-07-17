/*
  # Create fuel sales table

  1. New Tables
    - `fuel_sales`
      - `id` (bigint, primary key, auto-increment)
      - `date` (date, not null)
      - `rate_per_liter` (numeric, not null, default 9500)
      - `dispenser_open` (numeric, not null, default 0)
      - `dispenser_close` (numeric, not null, default 0)
      - `units_sold` (numeric, not null, calculated field)
      - `total_sale` (numeric, not null, calculated field)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `fuel_sales` table
    - Add policy for public read access (no authentication required)
    - Add policy for public insert access (no authentication required)

  3. Changes
    - This is the initial migration to create the fuel sales tracking system
    - No authentication required as specified in requirements
    - Includes proper indexing for date-based queries
*/

CREATE TABLE IF NOT EXISTS fuel_sales (
  id bigserial PRIMARY KEY,
  date date NOT NULL,
  rate_per_liter numeric NOT NULL DEFAULT 9500,
  dispenser_open numeric NOT NULL DEFAULT 0,
  dispenser_close numeric NOT NULL DEFAULT 0,
  units_sold numeric NOT NULL DEFAULT 0,
  total_sale numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_fuel_sales_date ON fuel_sales(date DESC);

-- Enable Row Level Security
ALTER TABLE fuel_sales ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (no authentication required)
CREATE POLICY "Public can read fuel sales"
  ON fuel_sales
  FOR SELECT
  TO public
  USING (true);

-- Create policy for public insert access (no authentication required)
CREATE POLICY "Public can insert fuel sales"
  ON fuel_sales
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for public update access (no authentication required)
CREATE POLICY "Public can update fuel sales"
  ON fuel_sales
  FOR UPDATE
  TO public
  USING (true);

-- Create policy for public delete access (no authentication required)
CREATE POLICY "Public can delete fuel sales"
  ON fuel_sales
  FOR DELETE
  TO public
  USING (true);