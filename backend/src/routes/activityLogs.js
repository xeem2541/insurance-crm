const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// Ensure table exists on first query
async function ensureActivityTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NULL,
      user_name VARCHAR(100) NULL,
      user_role VARCHAR(50) NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL DEFAULT 'general',
      entity_id INT NULL,
      description TEXT NULL,
      old_values JSON NULL,
      new_values JSON NULL,
      ip_address VARCHAR(50) NULL,
      user_agent TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (user_id),
      INDEX (action),
      INDEX (entity_type),
      INDEX (created_at)
    )
  `);
}

// GET /api/activity-logs (Admin & Manager only)
router.get('/', authenticateToken, authorizeRole(['Admin', 'Manager']), async (req, res) => {
  try {
    await ensureActivityTable(req.db);

    const {
      startDate,
      endDate,
      userId,
      action,
      entityType,
      search,
      page = 1,
      limit = 50
    } = req.query;

    let conditions = ['1=1'];
    let params = [];

    if (startDate) {
      conditions.push('DATE(created_at) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('DATE(created_at) <= ?');
      params.push(endDate);
    }
    if (userId && userId !== 'all') {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (action && action !== 'all') {
      conditions.push('action = ?');
      params.push(action);
    }
    if (entityType && entityType !== 'all') {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }
    if (search && search.trim()) {
      conditions.push('(description LIKE ? OR user_name LIKE ? OR action LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Total Count
    const [countResult] = await req.db.query(
      `SELECT COUNT(*) as total FROM activity_logs WHERE ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Logs query
    const [logs] = await req.db.query(
      `SELECT * FROM activity_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Summary stats
    const [statsResult] = await req.db.query(`
      SELECT 
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE() THEN 1 END) as today_count,
        COUNT(CASE WHEN action LIKE '%CREATE%' THEN 1 END) as create_count,
        COUNT(CASE WHEN action LIKE '%UPDATE%' THEN 1 END) as update_count,
        COUNT(CASE WHEN action LIKE '%DELETE%' THEN 1 END) as delete_count
      FROM activity_logs
    `);

    const [userStats] = await req.db.query(`
      SELECT user_name, user_role, COUNT(*) as action_count 
      FROM activity_logs 
      WHERE user_name IS NOT NULL 
      GROUP BY user_name, user_role 
      ORDER BY action_count DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats: statsResult[0] || {},
      topUsers: userStats || []
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Failed to retrieve activity logs' });
  }
});

// GET /api/activity-logs/users (List users for filter dropdown)
router.get('/users', authenticateToken, authorizeRole(['Admin', 'Manager']), async (req, res) => {
  try {
    const [users] = await req.db.query('SELECT id, name, username, role FROM users ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
