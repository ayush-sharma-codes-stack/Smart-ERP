const { query, getClient } = require('../db/pool');

/**
 * GET /api/customers?companyId=xxx
 * List all active customers for a company
 */
exports.getCustomers = async (req, res) => {
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
      `SELECT * FROM customers 
       WHERE company_id = $1 AND is_active = TRUE 
       ORDER BY name ASC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ message: 'Server error while fetching customers' });
  }
};

/**
 * GET /api/customers/:id
 * Get a single customer by ID
 */
exports.getCustomer = async (req, res) => {
  try {
    const result = await query(
      `SELECT cust.* 
       FROM customers cust
       JOIN companies comp ON cust.company_id = comp.id
       WHERE cust.id = $1 AND comp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found or access denied' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ message: 'Server error while fetching customer' });
  }
};

/**
 * POST /api/customers
 * Create a new customer and its corresponding Sundry Debtors ledger account
 */
exports.createCustomer = async (req, res) => {
  const {
    companyId, name, mobile, alternatePhone, email, gstin, pan,
    billingAddress, shippingAddress, city, state, pincode,
    creditLimit, creditDays
  } = req.body;

  if (!companyId || !name) {
    return res.status(400).json({ message: 'companyId and name are required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Verify company ownership
    const compCheck = await client.query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // 2. Find Sundry Debtors group
    let groupRes = await client.query(
      "SELECT id FROM groups WHERE company_id = $1 AND name = 'Sundry Debtors'",
      [companyId]
    );
    let groupId;
    if (groupRes.rows.length > 0) {
      groupId = groupRes.rows[0].id;
    } else {
      // Fallback: search for any Assets group
      groupRes = await client.query(
        "SELECT id FROM groups WHERE company_id = $1 AND nature = 'Assets' LIMIT 1",
        [companyId]
      );
      if (groupRes.rows.length > 0) {
        groupId = groupRes.rows[0].id;
      } else {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: "Sundry Debtors group not found in this company" });
      }
    }

    // 3. Create associated ledger account
    const ledgerName = `${name} (Customer)`;
    let ledgerId;
    try {
      const ledgerRes = await client.query(
        `INSERT INTO ledgers (
           company_id, group_id, name, ledger_type, opening_balance, current_balance,
           gstin, pan, address, mobile, email, credit_limit, credit_days, created_by
         ) VALUES ($1, $2, $3, 'customer', 0.00, 0.00, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          companyId, groupId, ledgerName,
          gstin || null, pan || null, billingAddress || null,
          mobile || null, email || null,
          parseFloat(creditLimit) || 0.00, parseInt(creditDays) || 0,
          req.user.id
        ]
      );
      ledgerId = ledgerRes.rows[0].id;
    } catch (ledgerErr) {
      // If a ledger with this name already exists, try to find it or append a suffix
      if (ledgerErr.code === '23505') {
        const existingLedger = await client.query(
          "SELECT id FROM ledgers WHERE company_id = $1 AND name = $2",
          [companyId, ledgerName]
        );
        if (existingLedger.rows.length > 0) {
          ledgerId = existingLedger.rows[0].id;
        } else {
          throw ledgerErr;
        }
      } else {
        throw ledgerErr;
      }
    }

    // 4. Create customer record
    const customerRes = await client.query(
      `INSERT INTO customers (
         company_id, ledger_id, name, mobile, alternate_phone, email, gstin, pan,
         billing_address, shipping_address, city, state, pincode,
         credit_limit, credit_days, outstanding_balance, is_active, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0.00, TRUE, $16)
       RETURNING *`,
      [
        companyId, ledgerId, name,
        mobile || null, alternatePhone || null, email || null,
        gstin || null, pan || null,
        billingAddress || null, shippingAddress || null,
        city || null, state || null, pincode || null,
        parseFloat(creditLimit) || 0.00, parseInt(creditDays) || 0,
        req.user.id
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Customer created successfully',
      customer: customerRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating customer:', err);
    res.status(500).json({ message: 'Server error while creating customer', error: err.message });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/customers/:id
 * Update a customer and its associated ledger details
 */
exports.updateCustomer = async (req, res) => {
  const {
    name, mobile, alternatePhone, email, gstin, pan,
    billingAddress, shippingAddress, city, state, pincode,
    creditLimit, creditDays, isActive
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Verify customer and company ownership
    const checkRes = await client.query(
      `SELECT cust.* 
       FROM customers cust
       JOIN companies comp ON cust.company_id = comp.id
       WHERE cust.id = $1 AND comp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Customer not found or access denied' });
    }
    const customer = checkRes.rows[0];

    // 2. Update customer record
    const updatedCustomerRes = await client.query(
      `UPDATE customers
       SET name = $1, mobile = $2, alternate_phone = $3, email = $4, gstin = $5, pan = $6,
           billing_address = $7, shipping_address = $8, city = $9, state = $10, pincode = $11,
           credit_limit = $12, credit_days = $13, is_active = $14, updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        name,
        mobile || null, alternatePhone || null, email || null,
        gstin || null, pan || null,
        billingAddress || null, shippingAddress || null,
        city || null, state || null, pincode || null,
        parseFloat(creditLimit) || 0.00, parseInt(creditDays) || 0,
        isActive !== undefined ? isActive : true,
        req.params.id
      ]
    );

    // 3. Update associated ledger details if it exists
    if (customer.ledger_id) {
      await client.query(
        `UPDATE ledgers
         SET name = $1, gstin = $2, pan = $3, address = $4, mobile = $5, email = $6,
             credit_limit = $7, credit_days = $8, is_active = $9, updated_at = NOW()
         WHERE id = $10`,
        [
          `${name} (Customer)`,
          gstin || null, pan || null, billingAddress || null,
          mobile || null, email || null,
          parseFloat(creditLimit) || 0.00, parseInt(creditDays) || 0,
          isActive !== undefined ? isActive : true,
          customer.ledger_id
        ]
      );
    }

    await client.query('COMMIT');
    res.json({
      message: 'Customer updated successfully',
      customer: updatedCustomerRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating customer:', err);
    res.status(500).json({ message: 'Server error while updating customer', error: err.message });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/customers/:id
 * Delete a customer and its associated ledger if not used in transactions
 */
exports.deleteCustomer = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const checkRes = await client.query(
      `SELECT cust.* 
       FROM customers cust
       JOIN companies comp ON cust.company_id = comp.id
       WHERE cust.id = $1 AND comp.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Customer not found or access denied' });
    }
    const customer = checkRes.rows[0];

    // Check if customer ledger has transactions
    if (customer.ledger_id) {
      const usageCheck = await client.query(
        'SELECT id FROM voucher_line_items WHERE ledger_id = $1 LIMIT 1',
        [customer.ledger_id]
      );
      if (usageCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'Cannot delete customer: they have transaction entries in ledgers. Deactivate them instead.'
        });
      }
      
      // Delete the ledger account
      await client.query('DELETE FROM ledgers WHERE id = $1', [customer.ledger_id]);
    }

    // Delete customer
    await client.query('DELETE FROM customers WHERE id = $1', [req.params.id]);

    await client.query('COMMIT');
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting customer:', err);
    res.status(500).json({ message: 'Server error while deleting customer', error: err.message });
  } finally {
    client.release();
  }
};
