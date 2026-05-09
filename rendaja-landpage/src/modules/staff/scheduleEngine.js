function normalizeDate(date) {
  const d = new Date(date);

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}

function formatHour(hour) {
  return String(hour).padStart(2, "0") + ":00";
}

export function buildDaySlots({
  startHour = 8,
  endHour = 18,
  intervalMinutes = 60,
}) {
  const slots = [];

  const start = startHour * 60;
  const end = endHour * 60;

  for (let minutes = start; minutes < end; minutes += intervalMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    slots.push(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    );
  }

  return slots;
}

export function removeBusySlots({
  slots = [],
  bookings = [],
}) {
  const busy = bookings.map((booking) => booking.slot);

  return slots.filter((slot) => !busy.includes(slot));
}

export function getAvailableSlotsForStaff({
  staff,
  bookings = [],
  date,
}) {
  if (!staff) return [];

  const normalizedDate = normalizeDate(date);

  const day = normalizedDate.getDay();

  const workingDays = Array.isArray(staff.working_days)
    ? staff.working_days
    : [1, 2, 3, 4, 5];

  if (!workingDays.includes(day)) {
    return [];
  }

  const hours = staff.working_hours || {
    start: 8,
    end: 18,
    interval: 60,
  };

  const slots = buildDaySlots({
    startHour: hours.start,
    endHour: hours.end,
    intervalMinutes: hours.interval,
  });

  const sameDayBookings = bookings.filter((booking) => {
    if (!booking.booking_date) return false;

    const bookingDate = normalizeDate(booking.booking_date);

    return bookingDate.getTime() === normalizedDate.getTime();
  });

  return removeBusySlots({
    slots,
    bookings: sameDayBookings,
  });
}

export function groupAvailableSlots({
  staffList = [],
  bookings = [],
  date,
}) {
  return staffList.map((staff) => ({
    staff_id: staff.id,
    staff_name: staff.nome,
    slots: getAvailableSlotsForStaff({
      staff,
      bookings,
      date,
    }),
  }));
}

export function getSharedAvailableSlots({
  staffList = [],
  bookings = [],
  date,
}) {
  const grouped = groupAvailableSlots({
    staffList,
    bookings,
    date,
  });

  const slotMap = new Map();

  grouped.forEach((staff) => {
    staff.slots.forEach((slot) => {
      if (!slotMap.has(slot)) {
        slotMap.set(slot, []);
      }

      slotMap.get(slot).push({
        id: staff.staff_id,
        nome: staff.staff_name,
      });
    });
  });

  return Array.from(slotMap.entries())
    .map(([slot, professionals]) => ({
      slot,
      professionals,
    }))
    .sort((a, b) => a.slot.localeCompare(b.slot));
}