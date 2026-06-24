/**
 * Default Tally-style groups to seed when a new company is created.
 * Organized hierarchically (nature -> standard groups -> subgroups).
 */
const defaultGroups = [
  // Assets
  { name: 'Fixed Assets', nature: 'Assets', parent: null },
  { name: 'Investments', nature: 'Assets', parent: null },
  { name: 'Current Assets', nature: 'Assets', parent: null },
  { name: 'Bank Accounts', nature: 'Assets', parent: 'Current Assets' },
  { name: 'Cash-in-hand', nature: 'Assets', parent: 'Current Assets' },
  { name: 'Stock-in-hand', nature: 'Assets', parent: 'Current Assets' },
  { name: 'Sundry Debtors', nature: 'Assets', parent: 'Current Assets' },

  // Liabilities
  { name: 'Capital Account', nature: 'Liabilities', parent: null },
  { name: 'Loans (Liability)', nature: 'Liabilities', parent: null },
  { name: 'Current Liabilities', nature: 'Liabilities', parent: null },
  { name: 'Duties & Taxes', nature: 'Liabilities', parent: 'Current Liabilities' },
  { name: 'Sundry Creditors', nature: 'Liabilities', parent: 'Current Liabilities' },

  // Income
  { name: 'Sales Accounts', nature: 'Income', parent: null },
  { name: 'Direct Incomes', nature: 'Income', parent: null },
  { name: 'Indirect Incomes', nature: 'Income', parent: null },

  // Expenses
  { name: 'Purchase Accounts', nature: 'Expenses', parent: null },
  { name: 'Direct Expenses', nature: 'Expenses', parent: null },
  { name: 'Indirect Expenses', nature: 'Expenses', parent: null },
];

/**
 * Seeding function to populate default groups for a given company.
 * Runs inside a transaction client to ensure atomic completion.
 */
async function seedDefaultGroups(client, companyId, userId) {
  // 1. Insert parent groups first (where parent is null)
  const parentGroups = defaultGroups.filter(g => g.parent === null);
  const groupMap = new Map(); // maps group name to inserted UUID

  for (const group of parentGroups) {
    const res = await client.query(
      `INSERT INTO groups (company_id, name, nature, parent_group_id, is_system, created_by)
       VALUES ($1, $2, $3, NULL, TRUE, $4)
       RETURNING id, name`,
      [companyId, group.name, group.nature, userId]
    );
    groupMap.set(group.name, res.rows[0].id);
  }

  // 2. Insert sub-groups linked to parents
  const subGroups = defaultGroups.filter(g => g.parent !== null);
  for (const group of subGroups) {
    const parentId = groupMap.get(group.parent);
    if (!parentId) continue;

    const res = await client.query(
      `INSERT INTO groups (company_id, name, nature, parent_group_id, is_system, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING id, name`,
      [companyId, group.name, group.nature, parentId, userId]
    );
    groupMap.set(group.name, res.rows[0].id);
  }

  // 3. Create default Cash and Profit & Loss accounts/ledgers as system defaults
  // Cash ledger goes under 'Cash-in-hand' group
  const cashGroupId = groupMap.get('Cash-in-hand');
  if (cashGroupId) {
    await client.query(
      `INSERT INTO ledgers (company_id, group_id, name, ledger_type, opening_balance, current_balance, created_by)
       VALUES ($1, $2, 'Cash', 'cash', 0.00, 0.00, $3)`,
      [companyId, cashGroupId, userId]
    );
  }

  // Profit & Loss Ledger goes under a new system 'Other' type (system level Capital or Retained Earnings)
  const capitalGroupId = groupMap.get('Capital Account');
  if (capitalGroupId) {
    await client.query(
      `INSERT INTO ledgers (company_id, group_id, name, ledger_type, opening_balance, current_balance, created_by)
       VALUES ($1, $2, 'Profit & Loss A/c', 'other', 0.00, 0.00, $3)`,
      [companyId, capitalGroupId, userId]
    );
  }
}

module.exports = { seedDefaultGroups };
