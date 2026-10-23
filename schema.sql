CREATE TABLE IF NOT EXISTS applications (
 id uuid PRIMARY KEY, submission_key uuid UNIQUE NOT NULL,
 name text NOT NULL, email text NOT NULL, zip text NOT NULL, vehicle text NOT NULL,
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received')),
 consent_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS owner_sessions (
 token_hash text PRIMARY KEY, csrf text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS login_counters (
 bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS used_totp (step bigint PRIMARY KEY);
