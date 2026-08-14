const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middlewares/auth');

// GET /api/activity-logs (Admin, Manager, Sales, Staff)
router.get('/', authenticateToken, authorizeRole(['Admin', 'Manager', 'Sales', 'Staff']), async (req, res) => {
  try {
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
      conditions.push('DATE(a.created_at) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('DATE(a.created_at) <= ?');
      params.push(endDate);
    }
    if (userId && userId !== 'all') {
      conditions.push('a.user_id = ?');
      params.push(userId);
    }
    if (action && action !== 'all') {
      conditions.push('a.action = ?');
      params.push(action);
    }
    if (entityType && entityType !== 'all') {
      conditions.push('(a.target_table = ?)');
      params.push(entityType);
    }
    if (search && search.trim()) {
      conditions.push('(a.details LIKE ? OR u.name LIKE ? OR a.action LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.join(' AND ');
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Total Count
    const [countResult] = await req.db.query(
      `SELECT COUNT(*) as total FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Logs query with JOIN on users table
    const [logs] = await req.db.query(
      `SELECT 
        a.id,
        a.user_id,
        COALESCE(u.name, 'System') as user_name,
        COALESCE(u.role, 'Admin') as user_role,
        a.action,
        COALESCE(a.target_table, 'general') as entity_type,
        a.target_id as entity_id,
        COALESCE(a.details, '') as description,
        a.created_at,
        '127.0.0.1' as ip_address
      FROM activity_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE ${whereClause} 
      ORDER BY a.created_at DESC, a.id DESC 
      LIMIT ? OFFSET ?`,
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
      SELECT 
        COALESCE(u.name, 'System') as user_name, 
        COALESCE(u.role, 'Admin') as user_role, 
        COUNT(*) as action_count 
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      GROUP BY u.name, u.role 
      ORDER BY action_count DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)) || 1,
      stats: statsResult[0] || { today_count: 0, create_count: 0, update_count: 0, delete_count: 0 },
      topUsers: userStats || []
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: 'Failed to retrieve activity logs: ' + err.message });
  }
});

// GET /api/activity-logs/users (List users for filter dropdown)
router.get('/users', authenticateToken, authorizeRole(['Admin', 'Manager', 'Sales', 'Staff']), async (req, res) => {
  try {
    const [users] = await req.db.query('SELECT id, name, username, role FROM users ORDER BY name ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
