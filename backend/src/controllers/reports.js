const { query } = require('../db/pool');

// ── Helper: verify company ownership ──────────────────────────────────────────
async function verifyCompany(companyId, userId) {
  const res = await query(
    'SELECT id, name, currency_symbol, financial_year_start FROM companies WHERE id = $1 AND user_id = $2',
    [companyId, userId]
  );
  return res.rows[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL BALANCE
// Returns all ledgers with their current_balance classified as Dr or Cr
// ─────────────────────────────────────────────────────────────────────────────
exports.getTrialBalance = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  const company = await verifyCompany(companyId, req.user.id);
  if (!company) return res.status(403).json({ message: 'Access denied' });

  try {
    const result = await query(
      `SELECT
         l.id,
         l.name AS ledger_name,
         g.name AS group_name,
         g.nature,
         l.current_balance,
         -- For Assets & Expenses: positive balance = Debit
         -- For Liabilities & Income: positive balance = Credit
         CASE
           WHEN g.nature IN ('Assets', 'Expenses') AND l.current_balance >= 0 THEN l.current_balance
           WHEN g.nature IN ('Liabilities', 'Income') AND l.current_balance < 0 THEN ABS(l.current_balance)
           ELSE 0
         END AS debit_balance,
         CASE
           WHEN g.nature IN ('Liabilities', 'Income') AND l.current_balance >= 0 THEN l.current_balance
           WHEN g.nature IN ('Assets', 'Expenses') AND l.current_balance < 0 THEN ABS(l.current_balance)
           ELSE 0
         END AS credit_balance
       FROM ledgers l
       JOIN groups g ON l.group_id = g.id
       WHERE l.company_id = $1 AND l.is_active = TRUE
       ORDER BY g.nature ASC, g.name ASC, l.name ASC`,
      [companyId]
    );

    const rows = result.rows;
    const totalDr = rows.reduce((s, r) => s + parseFloat(r.debit_balance), 0);
    const totalCr = rows.reduce((s, r) => s + parseFloat(r.credit_balance), 0);

    res.json({ company, ledgers: rows, totalDr, totalCr });
  } catch (err) {
    console.error('Error generating trial balance:', err);
    res.status(500).json({ message: 'Server error generating trial balance' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BALANCE SHEET
// Assets (Dr-side) vs Liabilities + Capital (Cr-side)
// ─────────────────────────────────────────────────────────────────────────────
exports.getBalanceSheet = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  const company = await verifyCompany(companyId, req.user.id);
  if (!company) return res.status(403).json({ message: 'Access denied' });

  try {
    // Get all ledger balances grouped under their groups
    const result = await query(
      `SELECT
         g.id AS group_id,
         g.name AS group_name,
         g.nature,
         g.parent_group_id,
         pg.name AS parent_group_name,
         l.id AS ledger_id,
         l.name AS ledger_name,
         l.current_balance
       FROM ledgers l
       JOIN groups g ON l.group_id = g.id
       LEFT JOIN groups pg ON g.parent_group_id = pg.id
       WHERE l.company_id = $1 AND l.is_active = TRUE
       ORDER BY g.nature ASC, g.name ASC, l.name ASC`,
      [companyId]
    );

    // Calculate net profit from Income - Expenses
    const netProfitRes = await query(
      `SELECT
         SUM(CASE WHEN g.nature = 'Income'   THEN l.current_balance ELSE 0 END) AS total_income,
         SUM(CASE WHEN g.nature = 'Expenses' THEN l.current_balance ELSE 0 END) AS total_expenses
       FROM ledgers l
       JOIN groups g ON l.group_id = g.id
       WHERE l.company_id = $1 AND l.is_active = TRUE`,
      [companyId]
    );
    const totalIncome   = parseFloat(netProfitRes.rows[0].total_income   || 0);
    const totalExpenses = parseFloat(netProfitRes.rows[0].total_expenses || 0);
    const netProfit = totalIncome - totalExpenses;

    // Separate into sides
    const assets      = result.rows.filter(r => r.nature === 'Assets');
    const liabilities = result.rows.filter(r => r.nature === 'Liabilities');

    // Sum sides
    const totalAssets      = assets.reduce((s, r) => s + parseFloat(r.current_balance), 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + parseFloat(r.current_balance), 0);

    res.json({
      company,
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netProfit,
      totalIncome,
      totalExpenses,
    });
  } catch (err) {
    console.error('Error generating balance sheet:', err);
    res.status(500).json({ message: 'Server error generating balance sheet' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFIT & LOSS
// Income vs Expenses
// ─────────────────────────────────────────────────────────────────────────────
exports.getProfitLoss = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  const company = await verifyCompany(companyId, req.user.id);
  if (!company) return res.status(403).json({ message: 'Access denied' });

  try {
    const result = await query(
      `SELECT
         g.name AS group_name,
         g.nature,
         l.name AS ledger_name,
         l.current_balance
       FROM ledgers l
       JOIN groups g ON l.group_id = g.id
       WHERE l.company_id = $1
         AND l.is_active = TRUE
         AND g.nature IN ('Income', 'Expenses')
       ORDER BY g.nature DESC, g.name ASC, l.name ASC`,
      [companyId]
    );

    const income   = result.rows.filter(r => r.nature === 'Income');
    const expenses = result.rows.filter(r => r.nature === 'Expenses');

    const totalIncome   = income.reduce((s, r)   => s + parseFloat(r.current_balance), 0);
    const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.current_balance), 0);
    const netProfit = totalIncome - totalExpenses;

    res.json({ company, income, expenses, totalIncome, totalExpenses, netProfit });
  } catch (err) {
    console.error('Error generating P&L:', err);
    res.status(500).json({ message: 'Server error generating P&L' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER ACCOUNT STATEMENT
// All voucher entries for a specific ledger with running balance
// ─────────────────────────────────────────────────────────────────────────────
exports.getLedgerAccount = async (req, res) => {
  const { companyId, ledgerId, from, to } = req.query;
  if (!companyId || !ledgerId) {
    return res.status(400).json({ message: 'companyId and ledgerId are required' });
  }

  const company = await verifyCompany(companyId, req.user.id);
  if (!company) return res.status(403).json({ message: 'Access denied' });

  try {
    // Get ledger details
    const ledgerRes = await query(
      `SELECT l.*, g.name AS group_name, g.nature
       FROM ledgers l
       JOIN groups g ON l.group_id = g.id
       WHERE l.id = $1 AND l.company_id = $2`,
      [ledgerId, companyId]
    );
    if (ledgerRes.rows.length === 0) return res.status(404).json({ message: 'Ledger not found' });
    const ledger = ledgerRes.rows[0];

    // Get all transactions for this ledger
    let txSql = `
      SELECT
        v.date,
        v.voucher_number,
        v.voucher_type,
        v.narration,
        v.reference_number,
        vli.debit_amount,
        vli.credit_amount,
        vli.description AS line_description
      FROM voucher_line_items vli
      JOIN vouchers v ON vli.voucher_id = v.id
      WHERE vli.ledger_id = $1
        AND v.company_id = $2
        AND v.status = 'posted'
    `;
    const params = [ledgerId, companyId];
    let i = 3;
    if (from) { txSql += ` AND v.date >= $${i++}`; params.push(from); }
    if (to)   { txSql += ` AND v.date <= $${i++}`; params.push(to); }
    txSql += ' ORDER BY v.date ASC, v.created_at ASC';

    const txRes = await query(txSql, params);

    // Compute running balance starting from opening_balance
    let runningBalance = parseFloat(ledger.opening_balance || 0);
    const transactions = txRes.rows.map(tx => {
      const dr = parseFloat(tx.debit_amount || 0);
      const cr = parseFloat(tx.credit_amount || 0);
      runningBalance += (dr - cr);
      return { ...tx, running_balance: runningBalance };
    });

    const totalDr = transactions.reduce((s, t) => s + parseFloat(t.debit_amount), 0);
    const totalCr = transactions.reduce((s, t) => s + parseFloat(t.credit_amount), 0);

    res.json({
      company,
      ledger,
      transactions,
      openingBalance: parseFloat(ledger.opening_balance || 0),
      closingBalance: runningBalance,
      totalDr,
      totalCr,
    });
  } catch (err) {
    console.error('Error generating ledger account:', err);
    res.status(500).json({ message: 'Server error generating ledger account' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCK SUMMARY
// All stock items with current quantity and value
// ─────────────────────────────────────────────────────────────────────────────
exports.getStockSummary = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  const company = await verifyCompany(companyId, req.user.id);
  if (!company) return res.status(403).json({ message: 'Access denied' });

  try {
    const result = await query(
      `SELECT
         si.id,
         si.name,
         si.sku,
         si.quantity_on_hand,
         si.purchase_price,
         si.selling_price,
         si.gst_percent,
         si.hsn_code,
         (si.quantity_on_hand * si.purchase_price) AS stock_value,
         u.name AS unit_name,
         u.symbol AS unit_symbol,
         sg.name AS stock_group_name
       FROM stock_items si
       JOIN units u ON si.unit_id = u.id
       LEFT JOIN stock_groups sg ON si.stock_group_id = sg.id
       WHERE si.company_id = $1 AND si.is_active = TRUE
       ORDER BY sg.name NULLS LAST, si.name ASC`,
      [companyId]
    );

    const totalValue = result.rows.reduce((s, r) => s + parseFloat(r.stock_value || 0), 0);
    res.json({ company, items: result.rows, totalValue });
  } catch (err) {
    console.error('Error generating stock summary:', err);
    res.status(500).json({ message: 'Server error generating stock summary' });
  }
};
