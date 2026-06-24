-- ============================================================
-- Migration 009: Inventory Transactions
-- ============================================================

CREATE TYPE inventory_transaction_type AS ENUM (
  'stock_in',
  'stock_out',
  'transfer_in',
  'transfer_out',
  'adjustment_in',
  'adjustment_out',
  'opening_stock',
  'damage'
);

CREATE TABLE inventory_transactions (
  id               UUID                       PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID                       NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stock_item_id    UUID                       NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  voucher_id       UUID                       REFERENCES vouchers(id) ON DELETE SET NULL,
  invoice_id       UUID                       REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_type inventory_transaction_type NOT NULL,
  quantity         NUMERIC(15,3)              NOT NULL,
  rate             NUMERIC(15,2)              NOT NULL DEFAULT 0.00,
  total_value      NUMERIC(15,2)              GENERATED ALWAYS AS (quantity * rate) STORED,
  running_balance  NUMERIC(15,3)              NOT NULL DEFAULT 0.000,
  notes            TEXT,
  transaction_date DATE                       NOT NULL,
  created_at       TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  created_by       UUID                       REFERENCES users(id),
  CONSTRAINT qty_nonzero CHECK (quantity <> 0)
);

CREATE INDEX idx_inv_txn_company    ON inventory_transactions(company_id);
CREATE INDEX idx_inv_txn_item       ON inventory_transactions(stock_item_id);
CREATE INDEX idx_inv_txn_voucher    ON inventory_transactions(voucher_id);
CREATE INDEX idx_inv_txn_date       ON inventory_transactions(transaction_date);
CREATE INDEX idx_inv_txn_type       ON inventory_transactions(transaction_type);
