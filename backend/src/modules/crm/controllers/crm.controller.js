export const getCrmOverview = async (_req, res) => {
  res.json({ module: "crm", status: "ready", message: "crm module scaffold is active" });
};
