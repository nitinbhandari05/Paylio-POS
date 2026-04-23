export const brandSchema = {
  _id: "string",
  name: "string",
  ownerUserId: "string",
  businessModel: "single|multi|franchise|cloud-kitchen|food-court|white-label",
  outlets: ["string"],
  activePlanCode: "string",
  settings: "object",
  createdAt: "date",
  updatedAt: "date",
};
