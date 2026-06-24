-- ============================================================
-- Migration 003: Groups (Chart of Accounts)
-- ============================================================

CREATE TYPE group_nature AS ENUM ('Assets', 'Liabilities', 'Income', 'Expenses');

CREATE TABLE groups (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  nature          group_nature NOT NULL,
  parent_group_id UUID         REFERENCES groups(id) ON DELETE RESTRICT,
  is_system       BOOLEAN      NOT NULL DEFAULT FALSE,  -- system groups can't be deleted
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by      UUID         REFERENCES users(id),
  UNIQUE (company_id, name)
);

CREATE INDEX idx_groups_company ON groups(company_id);
CREATE INDEX idx_groups_parent  ON groups(parent_group_id);

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default Tally-style groups on company creation
-- (called by application layer after INSERT into companies)
