const { query, getClient } = require('../db/pool');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generates the next sequential voucher number for a given type within a company.
 * Format: <TYPE_PREFIX>/<FY>/<SEQ>  e.g. "SLS/2425/0001"
 */
async function nextVoucherNumber(client, companyId, voucherType) {
  const PREFIX = {
    sales:       'SLS',
    purchase:    'PUR',
    receipt:     'RCP',
    payment:     'PAY',
    journal:     'JNL',
    contra:      'CTR',
    credit_note: 'CRN',
    debit_note:  'DBN',
  };
  const prefix = PREFIX[voucherType] || 'VCH';

  // Financial Year short code (e.g. "2425" for Apr 2024–Mar 2025)
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyCode = `${String(year).slice(2)}${String(year + 1).slice(2)}`;

  const res = await client.query(
    `SELECT COUNT(*) AS cnt
     FROM vouchers
     WHERE company_id = $1
       AND voucher_type = $2
       AND voucher_number LIKE $3`,
    [companyId, voucherType, `${prefix}/${fyCode}/%`]
  );
  const seq = parseInt(res.rows[0].cnt, 10) + 1;
  return `${prefix}/${fyCode}/${String(seq).padStart(4, '0')}`;
}

/**
 * Update ledger current_balance for a set of line items (debit increases / credit decreases for assets)
 * We use a simple net approach: debit_amount adds to balance, credit_amount subtracts.
 * The real debit/credit convention is handled in UI; here we just adjust the running balance.
 */
async function adjustLedgerBalances(client, lineItems, multiplier = 1) {
  for (const line of lineItems) {
    if (!line.ledger_id) continue;
    const net = (parseFloat(line.debit_amount) - parseFloat(line.credit_amount)) * multiplier;
    if (net !== 0) {
      await client.query(
        'UPDATE ledgers SET current_balance = current_balance + $1 WHERE id = $2',
        [net, line.ledger_id]
      );
    }
  }
}

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * GET /api/vouchers?companyId=&type=&from=&to=&status=
 */
exports.getVouchers = async (req, res) => {
  const { companyId, type, from, to, status } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  try {
    const compCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    let sql = `
      SELECT v.*,
             pl.name AS party_name
      FROM vouchers v
      LEFT JOIN ledgers pl ON v.party_ledger_id = pl.id
      WHERE v.company_id = $1
    `;
    const params = [companyId];
    let i = 2;

    if (type)   { sql += ` AND v.voucher_type = $${i++}`;  params.push(type); }
    if (status) { sql += ` AND v.status = $${i++}`;        params.push(status); }
    if (from)   { sql += ` AND v.date >= $${i++}`;         params.push(from); }
    if (to)     { sql += ` AND v.date <= $${i++}`;         params.push(to); }

    sql += ' ORDER BY v.date DESC, v.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching vouchers:', err);
    res.status(500).json({ message: 'Server error while fetching vouchers' });
  }
};

/**
 * GET /api/vouchers/:id  — voucher + all its line items
 */
exports.getVoucher = async (req, res) => {
  try {
    const vRes = await query(
      `SELECT v.*, pl.name AS party_name
       FROM vouchers v
       LEFT JOIN ledgers pl ON v.party_ledger_id = pl.id
       JOIN companies c ON v.company_id = c.id
       WHERE v.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (vRes.rows.length === 0) return res.status(404).json({ message: 'Voucher not found or access denied' });

    const lineRes = await query(
      `SELECT vli.*, l.name AS ledger_name, l.ledger_type
       FROM voucher_line_items vli
       LEFT JOIN ledgers l ON vli.ledger_id = l.id
       ORDER BY vli.sort_order ASC`,
      // (voucher_id filter)
      []
    );
    // Re-query with voucher_id filter
    const linesResult = await query(
      `SELECT vli.*, l.name AS ledger_name, l.ledger_type
       FROM voucher_line_items vli
       LEFT JOIN ledgers l ON vli.ledger_id = l.id
       WHERE vli.voucher_id = $1
       ORDER BY vli.sort_order ASC`,
      [req.params.id]
    );

    res.json({ ...vRes.rows[0], lineItems: linesResult.rows });
  } catch (err) {
    console.error('Error fetching voucher:', err);
    res.status(500).json({ message: 'Server error while fetching voucher' });
  }
};

/**
 * POST /api/vouchers
 * Body: { companyId, voucherType, date, narration, partyLedgerId, referenceNumber, lineItems[] }
 * lineItems[]: { ledgerId, debitAmount, creditAmount, description, quantity, rate, unitId, gstPercent, cgstAmount, sgstAmount, igstAmount }
 */
exports.createVoucher = async (req, res) => {
  const {
    companyId, voucherType, date, narration,
    partyLedgerId, referenceNumber, lineItems = []
  } = req.body;

  if (!companyId || !voucherType || !date) {
    return res.status(400).json({ message: 'companyId, voucherType, and date are required' });
  }
  if (!lineItems.length) {
    return res.status(400).json({ message: 'At least one line item is required' });
  }

  // Client-side balance validation
  const totalDr = lineItems.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0);
  const totalCr = lineItems.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    return res.status(400).json({
      message: `Voucher is unbalanced. Debit: ${totalDr.toFixed(2)}, Credit: ${totalCr.toFixed(2)}, Difference: ${(totalDr - totalCr).toFixed(2)}`
    });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Auth check
    const compCheck = await client.query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate voucher number
    const voucherNumber = await nextVoucherNumber(client, companyId, voucherType);

    // Insert voucher header
    const vRes = await client.query(
      `INSERT INTO vouchers (
         company_id, voucher_type, voucher_number, date, narration,
         party_ledger_id, reference_number, status, total_amount, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'posted', $8, $9)
       RETURNING *`,
      [
        companyId, voucherType, voucherNumber, date,
        narration || null, partyLedgerId || null,
        referenceNumber || null, totalDr, req.user.id
      ]
    );
    const voucher = vRes.rows[0];

    // Insert line items
    const insertedLines = [];
    for (let i = 0; i < lineItems.length; i++) {
      const l = lineItems[i];
      const lineRes = await client.query(
        `INSERT INTO voucher_line_items (
           voucher_id, ledger_id, description,
           quantity, rate, unit_id,
           debit_amount, credit_amount,
           gst_percent, cgst_amount, sgst_amount, igst_amount,
           sort_order
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          voucher.id,
          l.ledgerId || null,
          l.description || null,
          parseFloat(l.quantity) || 0,
          parseFloat(l.rate) || 0,
          l.unitId || null,
          parseFloat(l.debitAmount) || 0,
          parseFloat(l.creditAmount) || 0,
          parseFloat(l.gstPercent) || 0,
          parseFloat(l.cgstAmount) || 0,
          parseFloat(l.sgstAmount) || 0,
          parseFloat(l.igstAmount) || 0,
          i
        ]
      );
      insertedLines.push(lineRes.rows[0]);
    }

    // Update ledger balances
    await adjustLedgerBalances(client, insertedLines, 1);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Voucher posted successfully',
      voucher: { ...voucher, lineItems: insertedLines }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating voucher:', err);
    res.status(500).json({ message: 'Server error while creating voucher', error: err.message });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/vouchers/:id
 * Reverses old entries, replaces with new ones
 */
exports.updateVoucher = async (req, res) => {
  const { date, narration, partyLedgerId, referenceNumber, lineItems = [] } = req.body;

  if (!date || !lineItems.length) {
    return res.status(400).json({ message: 'date and lineItems are required' });
  }

  const totalDr = lineItems.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0);
  const totalCr = lineItems.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    return res.status(400).json({
      message: `Voucher is unbalanced. Debit: ${totalDr.toFixed(2)}, Credit: ${totalCr.toFixed(2)}`
    });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check ownership
    const vRes = await client.query(
      `SELECT v.* FROM vouchers v
       JOIN companies c ON v.company_id = c.id
       WHERE v.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (vRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Voucher not found or access denied' });
    }

    // Reverse old ledger balances
    const oldLines = await client.query(
      'SELECT * FROM voucher_line_items WHERE voucher_id = $1',
      [req.params.id]
    );
    await adjustLedgerBalances(client, oldLines.rows, -1);

    // Delete old line items
    await client.query('DELETE FROM voucher_line_items WHERE voucher_id = $1', [req.params.id]);

    // Update header
    await client.query(
      `UPDATE vouchers
       SET date = $1, narration = $2, party_ledger_id = $3,
           reference_number = $4, total_amount = $5
       WHERE id = $6`,
      [date, narration || null, partyLedgerId || null, referenceNumber || null, totalDr, req.params.id]
    );

    // Insert new line items
    const newLines = [];
    for (let i = 0; i < lineItems.length; i++) {
      const l = lineItems[i];
      const r = await client.query(
        `INSERT INTO voucher_line_items (
           voucher_id, ledger_id, description,
           quantity, rate, unit_id,
           debit_amount, credit_amount,
           gst_percent, cgst_amount, sgst_amount, igst_amount,
           sort_order
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          req.params.id, l.ledgerId || null, l.description || null,
          parseFloat(l.quantity) || 0, parseFloat(l.rate) || 0, l.unitId || null,
          parseFloat(l.debitAmount) || 0, parseFloat(l.creditAmount) || 0,
          parseFloat(l.gstPercent) || 0, parseFloat(l.cgstAmount) || 0,
          parseFloat(l.sgstAmount) || 0, parseFloat(l.igstAmount) || 0,
          i
        ]
      );
      newLines.push(r.rows[0]);
    }

    // Apply new ledger balances
    await adjustLedgerBalances(client, newLines, 1);

    await client.query('COMMIT');
    res.json({ message: 'Voucher updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating voucher:', err);
    res.status(500).json({ message: 'Server error while updating voucher', error: err.message });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/vouchers/:id
 * Cancels the voucher and reverses ledger balances
 */
exports.deleteVoucher = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const vRes = await client.query(
      `SELECT v.* FROM vouchers v
       JOIN companies c ON v.company_id = c.id
       WHERE v.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (vRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Voucher not found or access denied' });
    }

    // Reverse ledger balances
    const lines = await client.query(
      'SELECT * FROM voucher_line_items WHERE voucher_id = $1',
      [req.params.id]
    );
    await adjustLedgerBalances(client, lines.rows, -1);

    // Delete voucher (cascades to line items)
    await client.query('DELETE FROM vouchers WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Voucher deleted and ledger entries reversed' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting voucher:', err);
    res.status(500).json({ message: 'Server error while deleting voucher' });
  } finally {
    client.release();
  }
};
