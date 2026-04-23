export const ROLE_ALIASES = {
  admin: "superadmin",
  owner: "outletowner",
  kitchen: "chef",
  delivery: "deliverystaff",
  headoffice: "brandowner",
  user: "cashier",
};

export const ROLES = [
  "superadmin",
  "brandowner",
  "franchiseowner",
  "outletowner",
  "manager",
  "cashier",
  "chef",
  "waiter",
  "deliverystaff",
  "accountant",
];

export const PERMISSIONS = {
  SUPER_CONTROL: "super:control",
  BRAND_CONTROL: "brand:control",
  FRANCHISE_CONTROL: "franchise:control",
  OUTLET_CONTROL: "outlet:control",
  POS_BILLING: "pos:billing",
  POS_REFUND_APPROVE: "pos:refund:approve",
  POS_REFUND_LIMITED: "pos:refund:limited",
  TABLE_MANAGE: "tables:manage",
  KOT_ACCESS: "kot:access",
  KITCHEN_STATUS_UPDATE: "kitchen:status:update",
  INVENTORY_READ: "inventory:read",
  INVENTORY_WRITE: "inventory:write",
  INVENTORY_TRANSFER: "inventory:transfer",
  CRM_READ: "crm:read",
  CRM_WRITE: "crm:write",
  REPORTS_VIEW: "reports:view",
  REPORTS_LIMITED: "reports:limited",
  FINANCE_VIEW: "finance:view",
  FINANCE_EXPORT: "finance:export",
  STAFF_MANAGE: "staff:manage",
  SUBSCRIPTION_MANAGE: "subscription:manage",
  MODULE_TOGGLE: "modules:toggle",
  SUPPORT_TOOLS: "support:tools",
  DELIVERY_ORDERS: "delivery:orders",
};

export const ROLE_PERMISSIONS = {
  superadmin: Object.values(PERMISSIONS),
  brandowner: [
    PERMISSIONS.BRAND_CONTROL,
    PERMISSIONS.FRANCHISE_CONTROL,
    PERMISSIONS.OUTLET_CONTROL,
    PERMISSIONS.POS_BILLING,
    PERMISSIONS.POS_REFUND_APPROVE,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.KOT_ACCESS,
    PERMISSIONS.KITCHEN_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_EXPORT,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.SUBSCRIPTION_MANAGE,
    PERMISSIONS.MODULE_TOGGLE,
  ],
  franchiseowner: [
    PERMISSIONS.FRANCHISE_CONTROL,
    PERMISSIONS.OUTLET_CONTROL,
    PERMISSIONS.POS_BILLING,
    PERMISSIONS.POS_REFUND_APPROVE,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.KOT_ACCESS,
    PERMISSIONS.KITCHEN_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.STAFF_MANAGE,
  ],
  outletowner: [
    PERMISSIONS.OUTLET_CONTROL,
    PERMISSIONS.POS_BILLING,
    PERMISSIONS.POS_REFUND_APPROVE,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.KOT_ACCESS,
    PERMISSIONS.KITCHEN_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.CRM_WRITE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.STAFF_MANAGE,
  ],
  manager: [
    PERMISSIONS.POS_BILLING,
    PERMISSIONS.POS_REFUND_APPROVE,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.KOT_ACCESS,
    PERMISSIONS.KITCHEN_STATUS_UPDATE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_WRITE,
    PERMISSIONS.CRM_READ,
    PERMISSIONS.REPORTS_LIMITED,
    PERMISSIONS.STAFF_MANAGE,
  ],
  cashier: [
    PERMISSIONS.POS_BILLING,
    PERMISSIONS.POS_REFUND_LIMITED,
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.CRM_READ,
  ],
  chef: [
    PERMISSIONS.KOT_ACCESS,
    PERMISSIONS.KITCHEN_STATUS_UPDATE,
  ],
  waiter: [
    PERMISSIONS.TABLE_MANAGE,
    PERMISSIONS.KOT_ACCESS,
    PERMISSIONS.POS_BILLING,
  ],
  deliverystaff: [
    PERMISSIONS.DELIVERY_ORDERS,
  ],
  accountant: [
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_EXPORT,
  ],
};

export const normalizeRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return ROLE_ALIASES[normalized] || normalized;
};

export const resolvePermissions = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_PERMISSIONS[normalizedRole] || [];
};

export const hasPermission = (role, permission) =>
  resolvePermissions(role).includes(permission);
