const { query, getClient } = require('../db/pool');
const { seedDefaultGroups } = require('../db/defaultGroups');

exports.createCompany = async (req, res) => {
  const {
    name,
    address,
    city,
    state,
    pincode,
    gstin,
    pan,
    contactPhone,
    contactEmail,
    financialYearStart,
    currencySymbol
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Check company count for user (strict limit of 5)
    const countRes = await client.query(
      'SELECT COUNT(*) FROM companies WHERE user_id = $1',
      [req.user.id]
    );
    const count = parseInt(countRes.rows[0].count, 10);
    if (count >= 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Maximum company limit reached. You can create up to 5 companies.'
      });
    }

    // 2. Insert new company
    const insertRes = await client.query(
      `INSERT INTO companies (
        user_id, name, address, city, state, pincode, gstin, pan,
        contact_phone, contact_email, financial_year_start, currency_symbol, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $1)
      RETURNING *`,
      [
        req.user.id,
        name,
        address || null,
        city || null,
        state || null,
        pincode || null,
        gstin || null,
        pan || null,
        contactPhone || null,
        contactEmail || null,
        financialYearStart || 'April',
        currencySymbol || '₹'
      ]
    );

    const newCompany = insertRes.rows[0];

    // 3. Seed default groups and base ledgers (Cash, P&L) for the new company
    await seedDefaultGroups(client, newCompany.id, req.user.id);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Company created and initialized successfully',
      company: newCompany
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating company:', err);
    res.status(500).json({ message: 'Server error while creating company', error: err.message });
  } finally {
    client.release();
  }
};

exports.getCompanies = async (req, res) => {
  try {
    // Return all companies where user_id matches
    const result = await query(
      'SELECT * FROM companies WHERE user_id = $1 AND is_active = TRUE ORDER BY name ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error getting companies:', err);
    res.status(500).json({ message: 'Server error while retrieving companies' });
  }
};

exports.getCompany = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM companies WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error getting company:', err);
    res.status(500).json({ message: 'Server error while retrieving company details' });
  }
};

exports.updateCompany = async (req, res) => {
  const {
    name,
    address,
    city,
    state,
    pincode,
    gstin,
    pan,
    contactPhone,
    contactEmail,
    financialYearStart,
    currencySymbol,
    isActive
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Company name is required' });
  }

  try {
    const checkCompany = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (checkCompany.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found or unauthorized' });
    }

    const updateRes = await query(
      `UPDATE companies
       SET name = $1, address = $2, city = $3, state = $4, pincode = $5,
           gstin = $6, pan = $7, contact_phone = $8, contact_email = $9,
           financial_year_start = $10, currency_symbol = $11, is_active = $12
       WHERE id = $13 AND user_id = $14
       RETURNING *`,
      [
        name,
        address || null,
        city || null,
        state || null,
        pincode || null,
        gstin || null,
        pan || null,
        contactPhone || null,
        contactEmail || null,
        financialYearStart || 'April',
        currencySymbol || '₹',
        isActive !== undefined ? isActive : true,
        req.params.id,
        req.user.id
      ]
    );

    res.json({
      message: 'Company updated successfully',
      company: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error updating company:', err);
    res.status(500).json({ message: 'Server error while updating company' });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const checkCompany = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (checkCompany.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found or unauthorized' });
    }

    // Soft delete or hard delete based on preference.
    // The schema allows cascade delete for child tables via FKs. Let's do a hard delete as requested by CRUD alter/delete spec.
    await query(
      'DELETE FROM companies WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    console.error('Error deleting company:', err);
    res.status(500).json({ message: 'Server error while deleting company' });
  }
};
