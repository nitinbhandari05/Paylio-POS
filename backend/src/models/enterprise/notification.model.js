export const notificationSchema = {
  _id: "string",
  organizationId: "string",
  outletId: "string",
  channel: "sms|email|whatsapp|push|in-app",
  audienceType: "customer|staff|owner",
  title: "string",
  body: "string",
  status: "queued|sent|failed",
  createdAt: "date",
  sentAt: "date",
};
