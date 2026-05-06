const WEEK_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function timeToMinutes(value = "") {
  const [hour, minute] = String(value || "00:00").split(":").map(Number);
  return hour * 60 + minute;
}

export function isBusinessOpenNow(profile) {
  const hours = profile?.business_hours;

  if (!hours || typeof hours !== "object") {
    return false;
  }

  const now = new Date();
  const dayKey = WEEK_DAYS[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const periods = Array.isArray(hours[dayKey]) ? hours[dayKey] : [];

  return periods.some((period) => {
    if (!period?.open || !period?.close) return false;

    const open = timeToMinutes(period.open);
    const close = timeToMinutes(period.close);

    return currentMinutes >= open && currentMinutes <= close;
  });
}

export function getBusinessStatus(profile) {
  const open = isBusinessOpenNow(profile);

  return {
    open,
    label: open ? "Aberto agora" : "Fechado agora",
  };
}

export function getDeliveryBadges(profile) {
  const badges = [];

  if (profile?.free_delivery) {
    badges.push({
      type: "free",
      label: "Frete grátis",
    });
  } else if (profile?.delivery_enabled) {
    const fee = Number(profile?.delivery_fee || 0);

    badges.push({
      type: "delivery",
      label: fee > 0 ? `Entrega R$ ${fee.toFixed(2).replace(".", ",")}` : "Faz entrega",
    });
  }

  if (profile?.pickup_enabled) {
    badges.push({
      type: "pickup",
      label: "Busca no cliente",
    });
  }

  if (profile?.home_service_enabled) {
    badges.push({
      type: "home",
      label: "Atende em domicílio",
    });
  }

  return badges;
}