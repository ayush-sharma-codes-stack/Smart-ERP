-- ============================================================
-- Migration 005: Units & Stock Groups & Stock Items
-- ============================================================

-- Units of Measure
CREATE TABLE units (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,   -- e.g. "Pieces"
  symbol     VARCHAR(20)  NOT NULL,   -- e.g. "PCS"
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by UUID         REFERENCES users(id),
  UNIQUE (company_id, symbol)
);

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stock Groups (e.g. Electronics, Furniture)
CREATE TABLE stock_groups (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                  VARCHAR(255) NOT NULL,
  parent_stock_group_id UUID         REFERENCES stock_groups(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by            UUID         REFERENCES users(id),
  UNIQUE (company_id, name)
);

CREATE TRIGGER stock_groups_updated_at
  BEFORE UPDATE ON stock_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stock Items
CREATE TABLE stock_items (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID           NOT NULL REFERENCES companies(id)     ON DELETE CASCADE,
  stock_group_id  UUID           REFERENCES stock_groups(id)           ON DELETE SET NULL,
  unit_id         UUID           NOT NULL REFERENCES units(id)         ON DELETE RESTRICT,
  ledger_id       UUID           REFERENCES ledgers(id)                ON DELETE SET NULL,
  name            VARCHAR(255)   NOT NULL,
  sku             VARCHAR(100),
  description     TEXT,
  purchase_price  NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  selling_price   NUMERIC(15,2)  NOT NULL DEFAULT 0.00,
  gst_percent     NUMERIC(5,2)   NOT NULL DEFAULT 0.00,
  -- GST component breakdown (CGST + SGST or IGST)
  hsn_code        VARCHAR(20),
  -- Inventory tracking
  quantity_on_hand  NUMERIC(15,3) NOT NULL DEFAULT 0.000,
  reserved_qty      NUMERIC(15,3) NOT NULL DEFAULT 0.000,
  damaged_qty       NUMERIC(15,3) NOT NULL DEFAULT 0.000,
  reorder_level     NUMERIC(15,3) NOT NULL DEFAULT 0.000,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_by        UUID          REFERENCES users(id),
  UNIQUE (company_id, name),
  UNIQUE (company_id, sku),
  CONSTRAINT qty_non_negative CHECK (quantity_on_hand >= 0),
  CONSTRAINT damaged_non_negative CHECK (damaged_qty >= 0),
  CONSTRAINT reserved_non_negative CHECK (reserved_qty >= 0)
);

CREATE INDEX idx_stock_items_company ON stock_items(company_id);
CREATE INDEX idx_stock_items_group   ON stock_items(stock_group_id);
CREATE INDEX idx_stock_items_sku     ON stock_items(sku);

CREATE TRIGGER stock_items_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Computed column helper: available_qty = on_hand - reserved - damaged
-- (used by queries, not stored to avoid staleness)
