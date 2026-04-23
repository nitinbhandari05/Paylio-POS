export const auditLogSchema = {
  _id: "string",
  actorUserId: "string",
  actorRole: "string",
  action: "string",
  module: "string",
  entityType: "string",
  entityId: "string",
  ipAddress: "string",
  userAgent: "string",
  meta: "object",
  createdAt: "date",
};
