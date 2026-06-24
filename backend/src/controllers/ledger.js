const { query } = require('../db/pool');

/**
 * GET /api/ledgers?companyId=xxx
 * List all active ledgers for a company
 */
exports.getLedgers = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) {
    return res.status(400).json({ message: 'companyId query parameter is required' });
  }

  try {
    const compCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    const result = await query(
      `SELECT l.*, g.name AS group_name, g.nature AS group_nature
       FROM ledgers l
       JOIN groups g ON l.group_id = g.id
       WHERE l.company_id = $1
       ORDER BY g.nature ASC, l.name ASC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching ledgers:', err);
    res.status(500).json({ message: 'Server error while fetching ledgers' });
  }
};

/**
 * GET /api/ledgers/:id
 * Get a single ledger by ID
 */
exports.getLedger = async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, g.name AS group_name, g.nature AS group_nature
       FROM ledgers l
       JOIN groups g ON l.group_id = g.id
       JOIN companies c ON l.company_id = c.id
       WHERE l.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ledger not found or access denied' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching ledger:', err);
    res.status(500).json({ message: 'Server error while fetching ledger' });
  }
};

/**
 * POST /api/ledgers
 * Create a new ledger under a group
 */
exports.createLedger = async (req, res) => {
  const {
    companyId, groupId, name, ledgerType,
    openingBalance, gstin, pan, address, mobile, email,
    creditLimit, creditDays
  } = req.body;

  if (!companyId || !groupId || !name || !ledgerType) {
    return res.status(400).json({ message: 'companyId, groupId, name, and ledgerType are required' });
  }

  const validTypes = ['customer', 'supplier', 'bank', 'cash', 'expense', 'income', 'stock', 'tax', 'capital', 'loan', 'other'];
  if (!validTypes.includes(ledgerType)) {
    return res.status(400).json({ message: `ledgerType must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const compCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    const groupCheck = await query(
      'SELECT id FROM groups WHERE id = $1 AND company_id = $2',
      [groupId, companyId]
    );
    if (groupCheck.rows.length === 0) {
      return res.status(400).json({ message: 'Group not found in this company' });
    }

    const ob = parseFloat(openingBalance) || 0.00;
    const result = await query(
      `INSERT INTO ledgers (
         company_id, group_id, name, ledger_type, opening_balance, current_balance,
         gstin, pan, address, mobile, email, credit_limit, credit_days, created_by
       ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        companyId, groupId, name, ledgerType, ob,
        gstin || null, pan || null, address || null,
        mobile || null, email || null,
        creditLimit || null, creditDays || null, req.user.id
      ]
    );
    res.status(201).json({ message: 'Ledger created successfully', ledger: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A ledger with this name already exists in this company' });
    }
    console.error('Error creating ledger:', err);
    res.status(500).json({ message: 'Server error while creating ledger' });
  }
};

/**
 * PUT /api/ledgers/:id
 * Update an existing ledger
 */
exports.updateLedger = async (req, res) => {
  const {
    groupId, name, ledgerType, openingBalance,
    gstin, pan, address, mobile, email, creditLimit, creditDays, isActive
  } = req.body;

  if (!name || !groupId || !ledgerType) {
    return res.status(400).json({ message: 'name, groupId, and ledgerType are required' });
  }

  try {
    const check = await query(
      `SELECT l.id, l.company_id
       FROM ledgers l
       JOIN companies c ON l.company_id = c.id
       WHERE l.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Ledger not found or access denied' });
    }

    const ob = parseFloat(openingBalance) || 0.00;
    const result = await query(
      `UPDATE ledgers
       SET group_id = $1, name = $2, ledger_type = $3, opening_balance = $4,
           gstin = $5, pan = $6, address = $7, mobile = $8, email = $9,
           credit_limit = $10, credit_days = $11, is_active = $12
       WHERE id = $13
       RETURNING *`,
      [
        groupId, name, ledgerType, ob,
        gstin || null, pan || null, address || null,
        mobile || null, email || null,
        creditLimit || null, creditDays || null,
        isActive !== undefined ? isActive : true,
        req.params.id
      ]
    );
    res.json({ message: 'Ledger updated successfully', ledger: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A ledger with this name already exists' });
    }
    console.error('Error updating ledger:', err);
    res.status(500).json({ message: 'Server error while updating ledger' });
  }
};

/**
 * DELETE /api/ledgers/:id
 * Delete a ledger (only if it has no voucher entries)
 */
exports.deleteLedger = async (req, res) => {
  try {
    const check = await query(
      `SELECT l.id, l.name
       FROM ledgers l
       JOIN companies c ON l.company_id = c.id
       WHERE l.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Ledger not found or access denied' });
    }

    // Check if ledger is used in any voucher entries
    const usageCheck = await query(
      'SELECT id FROM voucher_entries WHERE ledger_id = $1 LIMIT 1',
      [req.params.id]
    );
    if (usageCheck.rows.length > 0) {
      return res.status(409).json({
        message: 'Cannot delete ledger: it is used in voucher entries. You can deactivate it instead.'
      });
    }

    await query('DELETE FROM ledgers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Ledger deleted successfully' });
  } catch (err) {
    console.error('Error deleting ledger:', err);
    res.status(500).json({ message: 'Server error while deleting ledger' });
  }
};
