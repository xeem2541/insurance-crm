// Helper utility to record activity logs in database
async function logActivity(db, req, {
  action,
  entity_type = 'general',
  entity_id = null,
  description = '',
  old_values = null,
  new_values = null
}) {
  try {
    if (!db) return;

    // Ensure activity_logs table exists
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

    const user = req?.user || {};
    const userId = user.id || null;
    const userName = user.name || user.username || 'System';
    const userRole = user.role || 'System';
    
    // Extract IP address
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || '') : '';

    await db.query(`
      INSERT INTO activity_logs (
        user_id, user_name, user_role, action, entity_type, entity_id, description,
        old_values, new_values, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      userName,
      userRole,
      action,
      entity_type,
      entity_id,
      description,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      ip,
      userAgent
    ]);
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}

module.exports = { logActivity };
