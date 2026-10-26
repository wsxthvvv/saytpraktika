const logAdminAction = async (query, {
  adminUserId,
  action,
  entityType = '',
  entityId = '',
  details = {},
}) => {
  await query(
    `INSERT INTO admin_audit_log (admin_user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [adminUserId, action, entityType, String(entityId), JSON.stringify(details)],
  );
};

const mapAuditRow = (row) => ({
  id: row.id,
  adminUserId: row.admin_user_id,
  adminEmail: row.admin_email || '',
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  details: row.details || {},
  createdAt: row.created_at,
});

module.exports = { logAdminAction, mapAuditRow };
