const { query } = require('../db/pool');

/**
 * GET /api/groups
 * List all groups for the active company (from query param ?companyId=...)
 */
exports.getGroups = async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) {
    return res.status(400).json({ message: 'companyId query parameter is required' });
  }

  try {
    // Verify the company belongs to this user
    const compCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    const result = await query(
      `SELECT g.*, pg.name AS parent_name
       FROM groups g
       LEFT JOIN groups pg ON g.parent_group_id = pg.id
       WHERE g.company_id = $1
       ORDER BY g.nature ASC, g.name ASC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ message: 'Server error while fetching groups' });
  }
};

/**
 * POST /api/groups
 * Create a new group under a company
 */
exports.createGroup = async (req, res) => {
  const { companyId, name, nature, parentGroupId } = req.body;

  if (!companyId || !name || !nature) {
    return res.status(400).json({ message: 'companyId, name, and nature are required' });
  }

  const validNatures = ['Assets', 'Liabilities', 'Income', 'Expenses'];
  if (!validNatures.includes(nature)) {
    return res.status(400).json({ message: `nature must be one of: ${validNatures.join(', ')}` });
  }

  try {
    const compCheck = await query(
      'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
      [companyId, req.user.id]
    );
    if (compCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this company' });
    }

    // If parentGroupId provided, ensure it belongs to same company
    if (parentGroupId) {
      const parentCheck = await query(
        'SELECT id, nature FROM groups WHERE id = $1 AND company_id = $2',
        [parentGroupId, companyId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Parent group not found in this company' });
      }
      if (parentCheck.rows[0].nature !== nature) {
        return res.status(400).json({ message: 'Parent group nature must match the new group nature' });
      }
    }

    const result = await query(
      `INSERT INTO groups (company_id, name, nature, parent_group_id, is_system, created_by)
       VALUES ($1, $2, $3, $4, FALSE, $5)
       RETURNING *`,
      [companyId, name, nature, parentGroupId || null, req.user.id]
    );
    res.status(201).json({ message: 'Group created successfully', group: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A group with this name already exists in this company' });
    }
    console.error('Error creating group:', err);
    res.status(500).json({ message: 'Server error while creating group' });
  }
};

/**
 * PUT /api/groups/:id
 * Update a group name (cannot change nature or make system group)
 */
exports.updateGroup = async (req, res) => {
  const { name, parentGroupId } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  try {
    // Check group exists and belongs to a company owned by this user
    const check = await query(
      `SELECT g.id, g.is_system, g.nature, g.company_id
       FROM groups g
       JOIN companies c ON g.company_id = c.id
       WHERE g.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }
    if (check.rows[0].is_system) {
      return res.status(403).json({ message: 'System groups cannot be modified' });
    }

    const result = await query(
      `UPDATE groups SET name = $1, parent_group_id = $2
       WHERE id = $3 RETURNING *`,
      [name, parentGroupId || null, req.params.id]
    );
    res.json({ message: 'Group updated successfully', group: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A group with this name already exists' });
    }
    console.error('Error updating group:', err);
    res.status(500).json({ message: 'Server error while updating group' });
  }
};

/**
 * DELETE /api/groups/:id
 * Delete a non-system group (must have no ledgers or child groups)
 */
exports.deleteGroup = async (req, res) => {
  try {
    const check = await query(
      `SELECT g.id, g.is_system
       FROM groups g
       JOIN companies c ON g.company_id = c.id
       WHERE g.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found or access denied' });
    }
    if (check.rows[0].is_system) {
      return res.status(403).json({ message: 'System groups cannot be deleted' });
    }

    // Check for dependent ledgers
    const ledgerCheck = await query('SELECT id FROM ledgers WHERE group_id = $1 LIMIT 1', [req.params.id]);
    if (ledgerCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Cannot delete group: it has ledgers under it. Move or delete them first.' });
    }

    // Check for child groups
    const childCheck = await query('SELECT id FROM groups WHERE parent_group_id = $1 LIMIT 1', [req.params.id]);
    if (childCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Cannot delete group: it has child groups. Delete them first.' });
    }

    await query('DELETE FROM groups WHERE id = $1', [req.params.id]);
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ message: 'Server error while deleting group' });
  }
};
