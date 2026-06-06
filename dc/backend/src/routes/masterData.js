const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// Get all master data (optionally filtered by category)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const category = req.query.category;
    let query = 'SELECT * FROM master_data';
    let params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY id ASC';
    
    const [rows] = await req.db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new master data entry (Admin, Manager)
router.post('/', [authenticateToken, authorizeRole(['Admin', 'Manager'])], async (req, res) => {
  try {
    const { category, value } = req.body;
    if (!category || !value) {
      return res.status(400).json({ error: 'category and value are required' });
    }
    
    const [result] = await req.db.query(
      'INSERT INTO master_data (category, value) VALUES (?, ?)',
      [category, value]
    );
    res.status(201).json({ id: result.insertId, category, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update master data entry
router.put('/:id', [authenticateToken, authorizeRole(['Admin', 'Manager'])], async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;
    if (!value) {
      return res.status(400).json({ error: 'value is required' });
    }
    
    await req.db.query(
      'UPDATE master_data SET value = ? WHERE id = ?',
      [value, id]
    );
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete master data entry
router.delete('/:id', [authenticateToken, authorizeRole(['Admin', 'Manager'])], async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query('DELETE FROM master_data WHERE id = ?', [id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
