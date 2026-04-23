export const getAuthOverview = async (_req, res) => {
  res.json({ module: "auth", status: "ready", message: "auth module scaffold is active" });
};
