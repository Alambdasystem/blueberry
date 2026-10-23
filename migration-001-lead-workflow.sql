CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
LOCK TABLE schema_migrations IN EXCLUSIVE MODE;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version=1) THEN
  ALTER TABLE applications DROP CONSTRAINT applications_status_check;
  ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK(status IN ('received','contacted','qualified','closed'));
  ALTER TABLE applications ADD COLUMN revision integer NOT NULL DEFAULT 1;
  ALTER TABLE applications ADD COLUMN follow_up_on date;
  ALTER TABLE applications ADD COLUMN closure_reason text;
  ALTER TABLE applications ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  CREATE TABLE application_events (
   id bigserial PRIMARY KEY, application_id uuid NOT NULL REFERENCES applications(id),
   actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
   previous_status text NOT NULL, status text NOT NULL,
   previous_follow_up_on date, follow_up_on date,
   previous_closure_reason text, closure_reason text,
   revision integer NOT NULL, UNIQUE(application_id,revision)
  );
  CREATE INDEX applications_review_order ON applications(created_at DESC,id DESC);
  CREATE INDEX application_events_history ON application_events(application_id,revision DESC);
  INSERT INTO schema_migrations(version) VALUES(1);
 END IF;
END $$;
