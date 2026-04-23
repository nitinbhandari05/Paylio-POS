export const planSchema = {
  _id: "string",
  code: "string",
  name: "string",
  priceInrMonthly: "number",
  outletLimit: "number",
  userLimit: "number",
  modules: ["string"],
  trialDays: "number",
  createdAt: "date",
  updatedAt: "date",
};
