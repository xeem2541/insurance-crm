// Helper utility to record activity logs in database
async function logActivity(db, req, {
  action,
  entity_type = 'general',
  entity_id = null,
  description = ''
}) {
  try {
    if (!db) return;

    const user = req?.user || {};
    const userId = user.id || null;
    
    await db.query(`
      INSERT INTO activity_logs (
        user_id, action, target_table, target_id, details
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      userId,
      action,
      entity_type,
      entity_id,
      description
    ]);
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}

module.exports = { logActivity };
