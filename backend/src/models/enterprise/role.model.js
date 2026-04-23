export const roleSchema = {
  _id: "string",
  code: "string",
  name: "string",
  permissions: ["string"],
  level: "number",
  isSystem: "boolean",
  createdAt: "date",
  updatedAt: "date",
};
