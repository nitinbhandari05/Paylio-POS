import Organization from "../models/organization.model.js";
import Subscription from "../models/subscription.model.js";

export const resolveOrganizationId = (req) =>
  req.headers["x-organization-id"] ||
  req.user?.organizationId ||
  Organization.DEFAULT_ORG_ID;

export const attachSubscriptionContext = async (req, res, next) => {
  try {
    req.organizationId = resolveOrganizationId(req);
    req.subscription = await Subscription.getByOrganization(req.organizationId);
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requireActiveSubscription = async (req, res, next) => {
  try {
    req.organizationId = resolveOrganizationId(req);
    req.subscription = await Subscription.assertActive(req.organizationId);
    next();
  } catch (error) {
    res.status(402).json({ message: error.message });
  }
};
