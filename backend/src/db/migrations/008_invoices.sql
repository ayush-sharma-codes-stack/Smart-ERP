-- ============================================================
-- Migration 008: Invoices
-- ============================================================

CREATE TYPE invoice_type AS ENUM (
  'gst_invoice',
  'proforma',
  'quotation',
  'estimate'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'issued',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled'
);

CREATE TABLE invoices (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID           NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  voucher_id       UUID           REFERENCES vouchers(id) ON DELETE SET NULL,
  customer_id      UUID           REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_type     invoice_type   NOT NULL DEFAULT 'gst_invoice',
  invoice_number   VARCHAR(50)    NOT NULL,
  invoice_date     DATE           NOT NULL,
  due_date         DATE,
  place_of_supply  VARCHAR(100),  -- state for GST (intra/inter-state detection)
  is_interstate    BOOLEAN        NOT NULL DEFAULT FALSE,
  subtotal         NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  discount_amount  NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  taxable_amount   NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  cgst_total       NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  sgst_total       NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  igst_total       NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  total_tax        NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  round_off        NUMERIC(5,2)   NOT NULL DEFAULT 0.00,
  grand_total      NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  amount_paid      NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  amount_due       NUMERIC(15,2)  GENERATED ALWAYS AS (grand_total - amount_paid) STORED,
  status           invoice_status NOT NULL DEFAULT 'draft',
  notes            TEXT,
  terms_conditions TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_by       UUID           REFERENCES users(id),
  UNIQUE (company_id, invoice_number)
);

CREATE INDEX idx_invoices_company   ON invoices(company_id);
CREATE INDEX idx_invoices_customer  ON invoices(customer_id);
CREATE INDEX idx_invoices_date      ON invoices(invoice_date);
CREATE INDEX idx_invoices_status    ON invoices(status);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
