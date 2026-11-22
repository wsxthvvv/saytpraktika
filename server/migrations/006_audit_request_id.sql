ALTER TABLE admin_audit_log ADD COLUMN IF NOT EXISTS request_id TEXT;
CREATE INDEX IF NOT EXISTS admin_audit_request_idx ON admin_audit_log(request_id);
