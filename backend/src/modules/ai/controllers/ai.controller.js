export const getAiOverview = async (_req, res) => {
  res.json({ module: "ai", status: "ready", message: "ai module scaffold is active" });
};
