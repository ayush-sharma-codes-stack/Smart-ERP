-- ============================================================
-- Migration 006: Customers & Suppliers
-- ============================================================

CREATE TABLE customers (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ledger_id         UUID         REFERENCES ledgers(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  mobile            VARCHAR(20),
  alternate_phone   VARCHAR(20),
  email             VARCHAR(255),
  gstin             VARCHAR(15),
  pan               VARCHAR(10),
  billing_address   TEXT,
  shipping_address  TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  pincode           VARCHAR(10),
  credit_limit      NUMERIC(15,2) DEFAULT 0.00,
  credit_days       INTEGER       DEFAULT 0,
  outstanding_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by        UUID          REFERENCES users(id)
);

CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_mobile  ON customers(mobile);
CREATE INDEX idx_customers_gstin   ON customers(gstin);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE suppliers (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ledger_id         UUID         REFERENCES ledgers(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  mobile            VARCHAR(20),
  alternate_phone   VARCHAR(20),
  email             VARCHAR(255),
  gstin             VARCHAR(15),
  pan               VARCHAR(10),
  address           TEXT,
  city              VARCHAR(100),
  state             VARCHAR(100),
  pincode           VARCHAR(10),
  bank_name         VARCHAR(255),
  bank_account      VARCHAR(50),
  bank_ifsc         VARCHAR(20),
  outstanding_dues  NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by        UUID          REFERENCES users(id)
);

CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_suppliers_mobile  ON suppliers(mobile);
CREATE INDEX idx_suppliers_gstin   ON suppliers(gstin);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
