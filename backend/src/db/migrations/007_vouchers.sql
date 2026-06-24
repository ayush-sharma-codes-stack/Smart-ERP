-- ============================================================
-- Migration 007: Vouchers & Voucher Line Items
-- ============================================================

CREATE TYPE voucher_type AS ENUM (
  'contra',
  'payment',
  'receipt',
  'journal',
  'purchase',
  'sales',
  'credit_note',
  'debit_note'
);

CREATE TYPE voucher_status AS ENUM (
  'draft',
  'posted',
  'cancelled'
);

CREATE TABLE vouchers (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  voucher_type     voucher_type  NOT NULL,
  voucher_number   VARCHAR(50)   NOT NULL,
  date             DATE          NOT NULL,
  narration        TEXT,
  party_ledger_id  UUID          REFERENCES ledgers(id) ON DELETE RESTRICT,
  reference_number VARCHAR(100),  -- supplier bill no, cheque no, etc.
  status           voucher_status NOT NULL DEFAULT 'draft',
  total_amount     NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_by       UUID           REFERENCES users(id),
  UNIQUE (company_id, voucher_type, voucher_number)
);

CREATE INDEX idx_vouchers_company ON vouchers(company_id);
CREATE INDEX idx_vouchers_type    ON vouchers(voucher_type);
CREATE INDEX idx_vouchers_date    ON vouchers(date);
CREATE INDEX idx_vouchers_status  ON vouchers(status);

CREATE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Voucher Line Items (double-entry legs)
CREATE TABLE voucher_line_items (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id    UUID          NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  ledger_id     UUID          REFERENCES ledgers(id) ON DELETE RESTRICT,
  stock_item_id UUID          REFERENCES stock_items(id) ON DELETE RESTRICT,
  description   TEXT,
  quantity      NUMERIC(15,3) DEFAULT 0.000,
  rate          NUMERIC(15,2) DEFAULT 0.00,
  unit_id       UUID          REFERENCES units(id),
  debit_amount  NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  gst_percent   NUMERIC(5,2)  DEFAULT 0.00,
  cgst_amount   NUMERIC(15,2) DEFAULT 0.00,
  sgst_amount   NUMERIC(15,2) DEFAULT 0.00,
  igst_amount   NUMERIC(15,2) DEFAULT 0.00,
  sort_order    INTEGER        NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT line_not_both_zero CHECK (
    NOT (debit_amount = 0 AND credit_amount = 0 AND ledger_id IS NOT NULL)
  ),
  CONSTRAINT line_not_both_nonzero CHECK (
    NOT (debit_amount > 0 AND credit_amount > 0)
  )
);

CREATE INDEX idx_vli_voucher      ON voucher_line_items(voucher_id);
CREATE INDEX idx_vli_ledger       ON voucher_line_items(ledger_id);
CREATE INDEX idx_vli_stock_item   ON voucher_line_items(stock_item_id);

-- *** Core Accounting Integrity Trigger ***
-- Prevents saving a voucher with unbalanced debit/credit totals
CREATE OR REPLACE FUNCTION check_voucher_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit  NUMERIC(15,2);
  total_credit NUMERIC(15,2);
BEGIN
  SELECT
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debit, total_credit
  FROM voucher_line_items
  WHERE voucher_id = COALESCE(NEW.voucher_id, OLD.voucher_id);

  -- Only enforce balance when voucher is being posted (not draft)
  -- Check is done at application layer before status change; trigger acts as safety net
  IF ABS(total_debit - total_credit) > 0.01 THEN
    RAISE EXCEPTION
      'Voucher line items are unbalanced: Debit=% Credit=% (diff=%)',
      total_debit, total_credit, (total_debit - total_credit);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- We invoke this check via a stored procedure at post-time
-- (not as a per-row trigger on line items, which would fire before all lines are inserted)
CREATE OR REPLACE PROCEDURE post_voucher(p_voucher_id UUID)
LANGUAGE plpgsql AS $$
DECLARE
  total_debit  NUMERIC(15,2);
  total_credit NUMERIC(15,2);
BEGIN
  SELECT
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debit, total_credit
  FROM voucher_line_items
  WHERE voucher_id = p_voucher_id;

  IF ABS(total_debit - total_credit) > 0.01 THEN
    RAISE EXCEPTION
      'Cannot post voucher: Debit=% Credit=% (diff=%)',
      total_debit, total_credit, (total_debit - total_credit);
  END IF;

  UPDATE vouchers SET status = 'posted' WHERE id = p_voucher_id;
END;
$$;
