
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'requesting',
  rider_id TEXT NOT NULL,
  driver_id TEXT,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  driver_lat DOUBLE PRECISION,
  driver_lng DOUBLE PRECISION,
  pickup_label TEXT,
  dropoff_label TEXT,
  fare_estimate NUMERIC,
  distance_km NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO anon, authenticated;
GRANT ALL ON public.trips TO service_role;

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo open read" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Demo open insert" ON public.trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Demo open update" ON public.trips FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Demo open delete" ON public.trips FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trips_touch_updated_at BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;
