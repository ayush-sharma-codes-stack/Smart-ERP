-- ============================================================
-- Migration 002: Companies
-- ============================================================

CREATE TYPE financial_year_month AS ENUM (
  'April', 'January'
);

CREATE TABLE companies (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                 VARCHAR(255) NOT NULL,
  address              TEXT,
  city                 VARCHAR(100),
  state                VARCHAR(100),
  pincode              VARCHAR(10),
  country              VARCHAR(100) NOT NULL DEFAULT 'India',
  gstin                VARCHAR(15),
  pan                  VARCHAR(10),
  contact_phone        VARCHAR(20),
  contact_email        VARCHAR(255),
  financial_year_start financial_year_month NOT NULL DEFAULT 'April',
  currency_symbol      VARCHAR(5)   NOT NULL DEFAULT '₹',
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by           UUID         REFERENCES users(id)
);

CREATE INDEX idx_companies_user_id ON companies(user_id);

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enforce max 5 companies per user at DB level
CREATE OR REPLACE FUNCTION check_company_limit()
RETURNS TRIGGER AS $$
DECLARE
  company_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO company_count
  FROM companies
  WHERE user_id = NEW.user_id;

  IF company_count >= 5 THEN
    RAISE EXCEPTION 'User cannot have more than 5 companies (current: %)', company_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_company_limit
  BEFORE INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION check_company_limit();
