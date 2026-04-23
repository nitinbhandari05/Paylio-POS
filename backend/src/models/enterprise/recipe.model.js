export const recipeSchema = {
  _id: "string",
  outletId: "string",
  productId: "string",
  ingredients: [{ itemId: "string", quantity: "number", unit: "string" }],
  wastagePercent: "number",
  createdAt: "date",
  updatedAt: "date",
};
