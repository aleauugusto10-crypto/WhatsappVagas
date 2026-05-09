export function roundMoney(value = 0) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function normalizeMoney(value = 0) {
  return Number(value || 0);
}

/**
 * Tipos:
 *
 * none
 * percent
 * fixed
 */

export function calculateCommission({
  amount = 0,
  commissionType = "none",
  commissionValue = 0,
}) {
  const total = normalizeMoney(amount);

  if (!total || total <= 0) {
    return {
      commissionAmount: 0,
      netAmount: 0,
      commissionType,
      commissionValue,
    };
  }

  let commissionAmount = 0;

  switch (commissionType) {
    case "percent": {
      commissionAmount =
        total * (normalizeMoney(commissionValue) / 100);
      break;
    }

    case "fixed": {
      commissionAmount = normalizeMoney(commissionValue);
      break;
    }

    case "none":
    default: {
      commissionAmount = 0;
      break;
    }
  }

  commissionAmount = Math.max(0, commissionAmount);

  if (commissionAmount > total) {
    commissionAmount = total;
  }

  const netAmount = total - commissionAmount;

  return {
    commissionAmount: roundMoney(commissionAmount),
    netAmount: roundMoney(netAmount),
    commissionType,
    commissionValue: normalizeMoney(commissionValue),
  };
}

export function buildCommissionLabel({
  commissionType = "none",
  commissionValue = 0,
}) {
  if (commissionType === "percent") {
    return `${commissionValue}%`;
  }

  if (commissionType === "fixed") {
    return `R$ ${Number(commissionValue || 0).toFixed(2)}`;
  }

  return "Sem comissão";
}