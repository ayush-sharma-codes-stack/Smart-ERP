-- ============================================================
-- Migration 004: Ledgers
-- ============================================================

CREATE TYPE ledger_type AS ENUM (
  'customer',
  'supplier',
  'bank',
  'cash',
  'expense',
  'income',
  'stock',
  'tax',
  'capital',
  'loan',
  'other'
);

CREATE TABLE ledgers (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  group_id         UUID         NOT NULL REFERENCES groups(id)    ON DELETE RESTRICT,
  name             VARCHAR(255) NOT NULL,
  ledger_type      ledger_type  NOT NULL,
  opening_balance  NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  -- positive = debit-side opening, negative = credit-side opening
  current_balance  NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  gstin            VARCHAR(15),
  pan              VARCHAR(10),
  address          TEXT,
  mobile           VARCHAR(20),
  email            VARCHAR(255),
  credit_limit     NUMERIC(15,2),
  credit_days      INTEGER,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by       UUID         REFERENCES users(id),
  UNIQUE (company_id, name)
);

CREATE INDEX idx_ledgers_company    ON ledgers(company_id);
CREATE INDEX idx_ledgers_group      ON ledgers(group_id);
CREATE INDEX idx_ledgers_type       ON ledgers(ledger_type);

CREATE TRIGGER ledgers_updated_at
  BEFORE UPDATE ON ledgers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
