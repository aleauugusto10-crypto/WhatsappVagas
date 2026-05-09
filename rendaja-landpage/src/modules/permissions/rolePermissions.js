export const STAFF_ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  CASHIER: "cashier",
  STAFF: "staff",
};

export function getDefaultPermissions(role = STAFF_ROLES.STAFF) {
  switch (role) {
    case STAFF_ROLES.OWNER:
      return {
        can_view_orders: true,
        can_update_orders: true,
        can_view_finance: true,
        can_manage_finance: true,
        can_manage_staff: true,
        can_manage_store: true,
      };

    case STAFF_ROLES.MANAGER:
      return {
        can_view_orders: true,
        can_update_orders: true,
        can_view_finance: true,
        can_manage_finance: false,
        can_manage_staff: false,
        can_manage_store: true,
      };

    case STAFF_ROLES.CASHIER:
      return {
        can_view_orders: true,
        can_update_orders: true,
        can_view_finance: true,
        can_manage_finance: true,
        can_manage_staff: false,
        can_manage_store: false,
      };

    case STAFF_ROLES.STAFF:
    default:
      return {
        can_view_orders: true,
        can_update_orders: true,
        can_view_finance: false,
        can_manage_finance: false,
        can_manage_staff: false,
        can_manage_store: false,
      };
  }
}

export function canAccessFinance(staff) {
  return staff?.can_view_finance === true;
}

export function canManageFinance(staff) {
  return staff?.can_manage_finance === true;
}

export function canManageStore(staff) {
  return staff?.can_manage_store === true;
}

export function canManageStaff(staff) {
  return staff?.can_manage_staff === true;
}

export function isOwner(staff) {
  return staff?.role === STAFF_ROLES.OWNER;
}