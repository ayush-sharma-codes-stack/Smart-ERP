const { query, getClient } = require('../db/pool');

// Helper to generate next invoice number
async function nextInvoiceNumber(client, companyId) {
  const prefix = 'INV';
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyCode = `${String(year).slice(2)}${String(year + 1).slice(2)}`;

  const res = await client.query(
    `SELECT COUNT(*) AS cnt
     FROM invoices
     WHERE company_id = $1
       AND invoice_number LIKE $2`,
    [companyId, `${prefix}/${fyCode}/%`]
  );
  const seq = parseInt(res.rows[0].cnt, 10) + 1;
  return `${prefix}/${fyCode}/${String(seq).padStart(4, '0')}`;
}

// Helper to generate next sequential voucher number
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

// Helper to update ledger balance
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

// Helper to get or create Sales Ledger
async function getOrCreateSalesLedger(client, companyId, userId) {
  let groupRes = await client.query(
    "SELECT id FROM groups WHERE company_id = $1 AND name = 'Sales Accounts'",
    [companyId]
  );
  let groupId;
  if (groupRes.rows.length > 0) {
    groupId = groupRes.rows[0].id;
  } else {
    groupRes = await client.query(
      "SELECT id FROM groups WHERE company_id = $1 AND nature = 'Income' LIMIT 1",
      [companyId]
    );
    if (groupRes.rows.length > 0) {
      groupId = groupRes.rows[0].id;
    } else {
      throw new Error("Sales Accounts group not found in company.");
    }
  }

  const ledgerRes = await client.query(
    "SELECT id FROM ledgers WHERE company_id = $1 AND name = 'Sales Account'",
    [companyId]
  );
  if (ledgerRes.rows.length > 0) {
    return ledgerRes.rows[0].id;
  }

  const newLedgerRes = await client.query(
    `INSERT INTO ledgers (company_id, group_id, name, ledger_type, opening_balance, current_balance, created_by)
     VALUES ($1, $2, 'Sales Account', 'income', 0.00, 0.00, $3)
     RETURNING id`,
    [companyId, groupId, userId]
  );
  return newLedgerRes.rows[0].id;
}

// Helper to get or create Duties & Taxes (CGST, SGST, IGST) Ledger
async function getOrCreateTaxLedger(client, companyId, taxName, userId) {
  let groupRes = await client.query(
    "SELECT id FROM groups WHERE company_id = $1 AND name = 'Duties & Taxes'",
    [companyId]
  );
  let groupId;
  if (groupRes.rows.length > 0) {
    groupId = groupRes.rows[0].id;
  } else {
    groupRes = await client.query(
      "SELECT id FROM groups WHERE company_id = $1 AND nature = 'Liabilities' LIMIT 1",
      [companyId]
    );
    if (groupRes.rows.length > 0) {
      groupId = groupRes.rows[0].id;
    } else {
      throw new Error("Duties & Taxes or Liabilities group not found in company.");
    }
  }

  const ledgerRes = await client.query(
    "SELECT id FROM ledgers WHERE company_id = $1 AND name = $2",
    [companyId, taxName]
  );
  if (ledgerRes.rows.length > 0) {
    return ledgerRes.rows[0].id;
  }

  const newLedgerRes = await client.query(
    `INSERT INTO ledgers (company_id, group_id, name, ledger_type, opening_balance, current_balance, created_by)
     VALUES ($1, $2, $3, 'tax', 0.00, 0.00, $4)
     RETURNING id`,
    [companyId, groupId, taxName, userId]
  );
  return newLedgerRes.rows[0].id;
}

// Helper to get or create Round-off ledger
async function getOrCreateRoundOffLedger(client, companyId, userId) {
  let groupRes = await client.query(
    "SELECT id FROM groups WHERE company_id = $1 AND name = 'Indirect Expenses'",
    [companyId]
  );
  let groupId;
  if (groupRes.rows.length > 0) {
    groupId = groupRes.rows[0].id;
  } else {
    groupRes = await client.query(
      "SELECT id FROM groups WHERE company_id = $1 AND nature = 'Expenses' LIMIT 1",
      [companyId]
    );
    if (groupRes.rows.length > 0) {
      groupId = groupRes.rows[0].id;
    } else {
      throw new Error("Indirect Expenses or Expenses group not found.");
    }
  }

  const ledgerRes = await client.query(
    "SELECT id FROM ledgers WHERE company_id = $1 AND name = 'Round-off A/c'",
    [companyId]
  );
  if (ledgerRes.rows.length > 0) {
    return ledgerRes.rows[0].id;
  }

  const newLedgerRes = await client.query(
    `INSERT INTO ledgers (company_id, group_id, name, ledger_type, opening_balance, current_balance, created_by)
     VALUES ($1, $2, 'Round-off A/c', 'expense', 0.00, 0.00, $3)
     RETURNING id`,
    [companyId, groupId, userId]
  );
  return newLedgerRes.rows[0].id;
}

/**
 * GET /api/invoices?companyId=xxx
 * List all invoices for a company
 */
exports.getInvoices = async (req, res) => {
  const { companyId, status, from, to } = req.query;
  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required' });
  }

  try {
    const compCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let sql = `
      SELECT inv.*, cust.name AS customer_name
      FROM invoices inv
      JOIN customers cust ON inv.customer_id = cust.id
      WHERE inv.company_id = $1
    `;
    const params = [companyId];
    let i = 2;

    if (status) { sql += ` AND inv.status = $${i++}`; params.push(status); }
    if (from)   { sql += ` AND inv.invoice_date >= $${i++}`; params.push(from); }
    if (to)     { sql += ` AND inv.invoice_date <= $${i++}`; params.push(to); }

    sql += ' ORDER BY inv.invoice_date DESC, inv.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ message: 'Server error while fetching invoices' });
  }
};

/**
 * GET /api/invoices/:id
 * Retrieve full invoice details including lines/items and customer details
 */
exports.getInvoice = async (req, res) => {
  try {
    const invRes = await query(
      `SELECT inv.*, cust.name AS customer_name, cust.mobile AS customer_mobile, cust.email AS customer_email,
              cust.gstin AS customer_gstin, cust.billing_address, cust.shipping_address
       FROM invoices inv
       JOIN customers cust ON inv.customer_id = cust.id
       JOIN companies comp ON inv.company_id = comp.id
       WHERE inv.id = $1 AND comp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (invRes.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found or access denied' });
    }
    const invoice = invRes.rows[0];

    // Fetch stock item details (items from inventory transactions)
    const itemsRes = await query(
      `SELECT it.*, si.name AS item_name, si.sku, si.hsn_code, u.symbol AS unit_symbol
       FROM inventory_transactions it
       JOIN stock_items si ON it.stock_item_id = si.id
       JOIN units u ON si.unit_id = u.id
       WHERE it.invoice_id = $1`,
      [req.params.id]
    );

    res.json({
      ...invoice,
      items: itemsRes.rows.map(item => ({
        ...item,
        quantity: Math.abs(parseFloat(item.quantity)), // inventory stock out is stored as negative quantity, convert back to positive for UI
        rate: parseFloat(item.rate),
        total_value: Math.abs(parseFloat(item.total_value))
      }))
    });
  } catch (err) {
    console.error('Error fetching invoice detail:', err);
    res.status(500).json({ message: 'Server error while fetching invoice detail' });
  }
};

/**
 * POST /api/invoices
 * Create a new invoice, reduce stock inventory, and post the double-entry accounting Sales Voucher
 */
exports.createInvoice = async (req, res) => {
  const {
    companyId, customerId, invoiceType, invoiceDate, dueDate, placeOfSupply, isInterstate,
    subtotal, discountAmount, taxableAmount, cgstTotal, sgstTotal, igstTotal, totalTax,
    roundOff, grandTotal, notes, termsConditions, items = []
  } = req.body;

  if (!companyId || !customerId || !invoiceDate || !items.length) {
    return res.status(400).json({ message: 'companyId, customerId, invoiceDate, and items are required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Verify company ownership and customer validity
    const compCheck = await client.query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied to company' });
    }

    const custCheck = await client.query(
      'SELECT id, ledger_id, name FROM customers WHERE id = $1 AND company_id = $2',
      [customerId, companyId]
    );
    if (custCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid customer selected' });
    }
    const customer = custCheck.rows[0];
    if (!customer.ledger_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Selected customer is not linked to any ledger account' });
    }

    // 2. Generate sequential Invoice Number
    const invoiceNumber = await nextInvoiceNumber(client, companyId);

    // 3. Create posted accounting Sales Voucher
    const salesVoucherNumber = await nextVoucherNumber(client, companyId, 'sales');
    const voucherRes = await client.query(
      `INSERT INTO vouchers (
         company_id, voucher_type, voucher_number, date, narration,
         party_ledger_id, reference_number, status, total_amount, created_by
       ) VALUES ($1, 'sales', $2, $3, $4, $5, $6, 'posted', $7, $8)
       RETURNING id`,
      [
        companyId, salesVoucherNumber, invoiceDate,
        `Sales Invoice ${invoiceNumber}`, customer.ledger_id,
        invoiceNumber, parseFloat(grandTotal), req.user.id
      ]
    );
    const voucherId = voucherRes.rows[0].id;

    // 4. Create invoice record
    const invoiceRes = await client.query(
      `INSERT INTO invoices (
         company_id, voucher_id, customer_id, invoice_type, invoice_number, invoice_date, due_date,
         place_of_supply, is_interstate, subtotal, discount_amount, taxable_amount,
         cgst_total, sgst_total, igst_total, total_tax, round_off, grand_total, amount_paid, status,
         notes, terms_conditions, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 0.00, 'issued', $19, $20, $21)
       RETURNING *`,
      [
        companyId, voucherId, customerId, invoiceType || 'gst_invoice', invoiceNumber, invoiceDate, dueDate || null,
        placeOfSupply || null, isInterstate || false,
        parseFloat(subtotal) || 0.00, parseFloat(discountAmount) || 0.00, parseFloat(taxableAmount) || 0.00,
        parseFloat(cgstTotal) || 0.00, parseFloat(sgstTotal) || 0.00, parseFloat(igstTotal) || 0.00,
        parseFloat(totalTax) || 0.00, parseFloat(roundOff) || 0.00, parseFloat(grandTotal) || 0.00,
        notes || null, termsConditions || null, req.user.id
      ]
    );
    const invoice = invoiceRes.rows[0];

    // 5. Create Inventory Transactions and reduce stock quantity
    for (const item of items) {
      // Get stock item unit_id
      const itemCheck = await client.query(
        'SELECT id, unit_id, quantity_on_hand FROM stock_items WHERE id = $1 AND company_id = $2',
        [item.stockItemId, companyId]
      );
      if (itemCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Stock item not found: ${item.stockItemId}` });
      }

      const quantity = parseFloat(item.quantity);
      const rate = parseFloat(item.rate);

      // Insert inventory transaction (quantity is stored as negative for stock_out)
      await client.query(
        `INSERT INTO inventory_transactions (
           company_id, stock_item_id, voucher_id, invoice_id, transaction_type,
           quantity, rate, notes, transaction_date, created_by
         ) VALUES ($1, $2, $3, $4, 'stock_out', $5, $6, $7, $8, $9)`,
        [
          companyId, item.stockItemId, voucherId, invoice.id,
          -quantity, rate, item.notes || null, invoiceDate, req.user.id
        ]
      );

      // Deduct quantity_on_hand in stock_items
      await client.query(
        `UPDATE stock_items
         SET quantity_on_hand = quantity_on_hand - $1
         WHERE id = $2`,
        [quantity, item.stockItemId]
      );
    }

    // 6. Build double-entry accounting leg entries (Voucher Line Items)
    const salesLedgerId = await getOrCreateSalesLedger(client, companyId, req.user.id);
    const roundOffLedgerId = await getOrCreateRoundOffLedger(client, companyId, req.user.id);

    const vliLines = [];

    // Line A: Debit Customer Ledger (Receivable)
    vliLines.push({
      ledger_id: customer.ledger_id,
      description: `Amount Receivable for Invoice ${invoiceNumber}`,
      debit_amount: parseFloat(grandTotal),
      credit_amount: 0.00,
    });

    // Line B: Credit Sales Ledger (Income)
    vliLines.push({
      ledger_id: salesLedgerId,
      description: `Sales Income from Invoice ${invoiceNumber}`,
      debit_amount: 0.00,
      credit_amount: parseFloat(taxableAmount),
    });

    // Line C: Credit Taxes (CGST, SGST, IGST)
    if (parseFloat(cgstTotal) > 0) {
      const cgstLedgerId = await getOrCreateTaxLedger(client, companyId, 'CGST', req.user.id);
      vliLines.push({
        ledger_id: cgstLedgerId,
        description: `Output CGST for Invoice ${invoiceNumber}`,
        debit_amount: 0.00,
        credit_amount: parseFloat(cgstTotal),
      });
    }

    if (parseFloat(sgstTotal) > 0) {
      const sgstLedgerId = await getOrCreateTaxLedger(client, companyId, 'SGST', req.user.id);
      vliLines.push({
        ledger_id: sgstLedgerId,
        description: `Output SGST for Invoice ${invoiceNumber}`,
        debit_amount: 0.00,
        credit_amount: parseFloat(sgstTotal),
      });
    }

    if (parseFloat(igstTotal) > 0) {
      const igstLedgerId = await getOrCreateTaxLedger(client, companyId, 'IGST', req.user.id);
      vliLines.push({
        ledger_id: igstLedgerId,
        description: `Output IGST for Invoice ${invoiceNumber}`,
        debit_amount: 0.00,
        credit_amount: parseFloat(igstTotal),
      });
    }

    // Line D: Handle Round-off
    const rOff = parseFloat(roundOff);
    if (rOff !== 0) {
      if (rOff > 0) {
        // Credit Round-off A/c
        vliLines.push({
          ledger_id: roundOffLedgerId,
          description: `Round-off difference for Invoice ${invoiceNumber}`,
          debit_amount: 0.00,
          credit_amount: rOff,
        });
      } else {
        // Debit Round-off A/c
        vliLines.push({
          ledger_id: roundOffLedgerId,
          description: `Round-off difference for Invoice ${invoiceNumber}`,
          debit_amount: Math.abs(rOff),
          credit_amount: 0.00,
        });
      }
    }

    // Insert voucher line items sequentially
    const insertedVli = [];
    for (let i = 0; i < vliLines.length; i++) {
      const line = vliLines[i];
      const lineRes = await client.query(
        `INSERT INTO voucher_line_items (
           voucher_id, ledger_id, description,
           debit_amount, credit_amount, sort_order
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          voucherId, line.ledger_id, line.description,
          line.debit_amount, line.credit_amount, i
        ]
      );
      insertedVli.push(lineRes.rows[0]);
    }

    // Adjust ledger balances (double entry books increment/decrement running balances)
    await adjustLedgerBalances(client, insertedVli, 1);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating invoice:', err);
    res.status(500).json({ message: 'Server error while generating invoice', error: err.message });
  } finally {
    client.release();
  }
};
