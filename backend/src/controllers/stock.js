const { query } = require('../db/pool');

/**
 * GET /api/stock/units?companyId=xxx
 * List all units of measure for a company
 */
exports.getUnits = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  try {
    const compCheck = await query('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, req.user.id]);
    if (compCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    const result = await query(
      'SELECT * FROM units WHERE company_id = $1 ORDER BY name ASC',
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching units:', err);
    res.status(500).json({ message: 'Server error while fetching units' });
  }
};

/**
 * POST /api/stock/units
 * Create a unit of measure
 */
exports.createUnit = async (req, res) => {
  const { companyId, name, symbol } = req.body;
  if (!companyId || !name || !symbol) {
    return res.status(400).json({ message: 'companyId, name, and symbol are required' });
  }

  try {
    const compCheck = await query('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, req.user.id]);
    if (compCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    const result = await query(
      'INSERT INTO units (company_id, name, symbol, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [companyId, name, symbol.toUpperCase(), req.user.id]
    );
    res.status(201).json({ message: 'Unit created', unit: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'A unit with this symbol already exists' });
    console.error('Error creating unit:', err);
    res.status(500).json({ message: 'Server error while creating unit' });
  }
};

/**
 * GET /api/stock/stock-groups?companyId=xxx
 * List all stock groups for a company
 */
exports.getStockGroups = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  try {
    const compCheck = await query('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, req.user.id]);
    if (compCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    const result = await query(
      `SELECT sg.*, psg.name AS parent_name
       FROM stock_groups sg
       LEFT JOIN stock_groups psg ON sg.parent_stock_group_id = psg.id
       WHERE sg.company_id = $1 ORDER BY sg.name ASC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stock groups:', err);
    res.status(500).json({ message: 'Server error while fetching stock groups' });
  }
};

/**
 * POST /api/stock/stock-groups
 * Create a stock group
 */
exports.createStockGroup = async (req, res) => {
  const { companyId, name, parentStockGroupId } = req.body;
  if (!companyId || !name) return res.status(400).json({ message: 'companyId and name are required' });

  try {
    const compCheck = await query('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, req.user.id]);
    if (compCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    const result = await query(
      'INSERT INTO stock_groups (company_id, name, parent_stock_group_id, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [companyId, name, parentStockGroupId || null, req.user.id]
    );
    res.status(201).json({ message: 'Stock group created', stockGroup: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'A stock group with this name already exists' });
    console.error('Error creating stock group:', err);
    res.status(500).json({ message: 'Server error while creating stock group' });
  }
};

/**
 * GET /api/stock/items?companyId=xxx
 * List all stock items for a company
 */
exports.getStockItems = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ message: 'companyId is required' });

  try {
    const compCheck = await query('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, req.user.id]);
    if (compCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    const result = await query(
      `SELECT si.*, sg.name AS stock_group_name, u.name AS unit_name, u.symbol AS unit_symbol
       FROM stock_items si
       LEFT JOIN stock_groups sg ON si.stock_group_id = sg.id
       JOIN units u ON si.unit_id = u.id
       WHERE si.company_id = $1 AND si.is_active = TRUE
       ORDER BY si.name ASC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching stock items:', err);
    res.status(500).json({ message: 'Server error while fetching stock items' });
  }
};

/**
 * GET /api/stock/items/:id
 * Get a single stock item
 */
exports.getStockItem = async (req, res) => {
  try {
    const result = await query(
      `SELECT si.*, sg.name AS stock_group_name, u.name AS unit_name, u.symbol AS unit_symbol
       FROM stock_items si
       LEFT JOIN stock_groups sg ON si.stock_group_id = sg.id
       JOIN units u ON si.unit_id = u.id
       JOIN companies c ON si.company_id = c.id
       WHERE si.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Stock item not found or access denied' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stock item:', err);
    res.status(500).json({ message: 'Server error while fetching stock item' });
  }
};

/**
 * POST /api/stock/items
 * Create a stock item
 */
exports.createStockItem = async (req, res) => {
  const {
    companyId, stockGroupId, unitId, name, sku, description,
    purchasePrice, sellingPrice, gstPercent, hsnCode
  } = req.body;

  if (!companyId || !unitId || !name) {
    return res.status(400).json({ message: 'companyId, unitId, and name are required' });
  }

  try {
    const compCheck = await query('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, req.user.id]);
    if (compCheck.rows.length === 0) return res.status(403).json({ message: 'Access denied' });

    const unitCheck = await query('SELECT id FROM units WHERE id = $1 AND company_id = $2', [unitId, companyId]);
    if (unitCheck.rows.length === 0) return res.status(400).json({ message: 'Unit not found in this company' });

    const result = await query(
      `INSERT INTO stock_items (
         company_id, stock_group_id, unit_id, name, sku, description,
         purchase_price, selling_price, gst_percent, hsn_code, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        companyId, stockGroupId || null, unitId, name,
        sku || null, description || null,
        parseFloat(purchasePrice) || 0,
        parseFloat(sellingPrice) || 0,
        parseFloat(gstPercent) || 0,
        hsnCode || null,
        req.user.id
      ]
    );
    res.status(201).json({ message: 'Stock item created successfully', item: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'A stock item with this name or SKU already exists' });
    console.error('Error creating stock item:', err);
    res.status(500).json({ message: 'Server error while creating stock item' });
  }
};

/**
 * PUT /api/stock/items/:id
 * Update a stock item
 */
exports.updateStockItem = async (req, res) => {
  const {
    stockGroupId, unitId, name, sku, description,
    purchasePrice, sellingPrice, gstPercent, hsnCode, isActive
  } = req.body;

  if (!name || !unitId) {
    return res.status(400).json({ message: 'name and unitId are required' });
  }

  try {
    const check = await query(
      `SELECT si.id FROM stock_items si
       JOIN companies c ON si.company_id = c.id
       WHERE si.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: 'Stock item not found or access denied' });

    const result = await query(
      `UPDATE stock_items
       SET stock_group_id = $1, unit_id = $2, name = $3, sku = $4, description = $5,
           purchase_price = $6, selling_price = $7, gst_percent = $8, hsn_code = $9, is_active = $10
       WHERE id = $11
       RETURNING *`,
      [
        stockGroupId || null, unitId, name,
        sku || null, description || null,
        parseFloat(purchasePrice) || 0,
        parseFloat(sellingPrice) || 0,
        parseFloat(gstPercent) || 0,
        hsnCode || null,
        isActive !== undefined ? isActive : true,
        req.params.id
      ]
    );
    res.json({ message: 'Stock item updated successfully', item: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'A stock item with this name or SKU already exists' });
    console.error('Error updating stock item:', err);
    res.status(500).json({ message: 'Server error while updating stock item' });
  }
};

/**
 * DELETE /api/stock/items/:id
 * Delete a stock item (soft delete: set is_active = false if it has transactions)
 */
exports.deleteStockItem = async (req, res) => {
  try {
    const check = await query(
      `SELECT si.id FROM stock_items si
       JOIN companies c ON si.company_id = c.id
       WHERE si.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ message: 'Stock item not found or access denied' });

    // Check if the item has any inventory transactions
    const txCheck = await query(
      'SELECT id FROM inventory_transactions WHERE stock_item_id = $1 LIMIT 1',
      [req.params.id]
    );
    if (txCheck.rows.length > 0) {
      // Soft delete
      await query('UPDATE stock_items SET is_active = FALSE WHERE id = $1', [req.params.id]);
      return res.json({ message: 'Stock item deactivated (has existing transactions)' });
    }

    await query('DELETE FROM stock_items WHERE id = $1', [req.params.id]);
    res.json({ message: 'Stock item deleted successfully' });
  } catch (err) {
    console.error('Error deleting stock item:', err);
    res.status(500).json({ message: 'Server error while deleting stock item' });
  }
};
