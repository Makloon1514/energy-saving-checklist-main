-- Create the buildings table
CREATE TABLE IF NOT EXISTS public.buildings (
  id text PRIMARY KEY,
  name text NOT NULL
);

-- Create the rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id text PRIMARY KEY,
  building_id text REFERENCES public.buildings(id) ON DELETE CASCADE,
  name text NOT NULL
);

-- Create the inspectors table
CREATE TABLE IF NOT EXISTS public.inspectors (
  name text PRIMARY KEY,  -- using name as PK for simplicity matching old data
  image_url text,
  default_building text
);

-- Create the schedules table (representing days of the week 1-5)
CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  day_index integer NOT NULL, -- 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  inspector_name text REFERENCES public.inspectors(name) ON DELETE CASCADE ON UPDATE CASCADE,
  building_id text REFERENCES public.buildings(id) ON DELETE CASCADE,
  UNIQUE(day_index, inspector_name)
);

-- Note: 'records' table already exists from previous setup

-- ------------------------------------------------------------------
-- RLS POLICIES
-- ------------------------------------------------------------------
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all buildings" ON public.buildings FOR ALL TO public, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all rooms" ON public.rooms FOR ALL TO public, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all inspectors" ON public.inspectors FOR ALL TO public, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all schedules" ON public.schedules FOR ALL TO public, anon USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------
-- INITIAL DATA MIGRATION (From constants.js)
-- ------------------------------------------------------------------

-- 1. Insert Buildings
INSERT INTO public.buildings (id, name) VALUES
  ('building-1', 'อาคาร 1'),
  ('building-2', 'อาคาร 2'),
  ('building-3', 'อาคาร 3')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Rooms
INSERT INTO public.rooms (id, building_id, name) VALUES
  -- อาคาร 1
  ('1-admin', 'building-1', 'งานบริหารงานทั่วไป'),
  ('1-finance', 'building-1', 'งานการเงิน'),
  ('1-eds', 'building-1', 'งานEDS'),
  ('1-plan', 'building-1', 'งานแผน'),
  -- อาคาร 2
  ('2-201', 'building-2', '2-201'),
  ('2-202', 'building-2', '2-202'),
  ('2-202-1', 'building-2', '2-202/1'),
  ('2-202-2', 'building-2', '2-202/2'),
  -- อาคาร 3
  ('3-201', 'building-3', '3-201'),
  ('3-202', 'building-3', '3-202'),
  ('3-203', 'building-3', '3-203'),
  ('3-204', 'building-3', '3-204'),
  ('3-205', 'building-3', '3-205'),
  ('3-206', 'building-3', '3-206'),
  ('3-207', 'building-3', '3-207'),
  ('3-208', 'building-3', '3-208')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Inspectors
INSERT INTO public.inspectors (name, image_url, default_building) VALUES
  ('พี่แตน', '/pic/tan.jpg', 'อาคาร 1'),
  ('พี่ณี', '/pic/nee.jpg', 'อาคาร 3'),
  ('เมจ', '/pic/mage.jpg', 'อาคาร 1'),
  ('อ้อ', '/pic/ao.jpg', 'อาคาร 3'),
  ('ออม', '/pic/aom.jpg', 'อาคาร 1'),
  ('เบนซ์', '/pic/benz.jpg', 'อาคาร 3'),
  ('พี่นัน (ชาย)', '/pic/nan.jpg', 'อาคาร 1'),
  ('น้ำหอม', '/pic/namhorm.jpg', 'อาคาร 3'),
  ('ภรณ์', '/pic/pon.jpg', 'อาคาร 1'),
  ('น้ำ', '/pic/nam.jpg', 'อาคาร 3')
ON CONFLICT (name) DO NOTHING;

-- 4. Insert Schedules
INSERT INTO public.schedules (day_index, inspector_name, building_id) VALUES
  (1, 'พี่แตน', 'building-1'),
  (1, 'พี่ณี', 'building-3'),
  (2, 'เมจ', 'building-1'),
  (2, 'อ้อ', 'building-3'),
  (3, 'ออม', 'building-1'),
  (3, 'เบนซ์', 'building-3'),
  (4, 'พี่นัน (ชาย)', 'building-1'),
  (4, 'น้ำหอม', 'building-3'),
  (5, 'ภรณ์', 'building-1'),
  (5, 'น้ำ', 'building-3')
ON CONFLICT (day_index, inspector_name) DO NOTHING;
