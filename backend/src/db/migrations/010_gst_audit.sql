-- ============================================================
-- Migration 010: GST Records and Audit Logs
-- ============================================================

CREATE TABLE gst_records (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  voucher_id      UUID          NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  gstin           VARCHAR(15)   NOT NULL,
  cgst            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  sgst            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  igst            NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  taxable_value   NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  period          VARCHAR(7)    NOT NULL, -- YYYY-MM
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by      UUID          REFERENCES users(id)
);

CREATE INDEX idx_gst_records_company ON gst_records(company_id);
CREATE INDEX idx_gst_records_period  ON gst_records(period);

CREATE TABLE audit_logs (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID         REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  table_name  VARCHAR(100) NOT NULL,
  record_id   UUID         NOT NULL,
  action      VARCHAR(10)  NOT NULL, -- CREATE, UPDATE, DELETE
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
