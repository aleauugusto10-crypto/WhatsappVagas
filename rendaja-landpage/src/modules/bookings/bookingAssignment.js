import { getAvailableStaffForService } from "../staff/staffAssignment";
import { getSharedAvailableSlots } from "../staff/scheduleEngine";

export function assignBookingToStaff({
  service,
  staffList = [],
  bookings = [],
  date,
  preferredStaffId = null,
  slot = null,
}) {
  const availableStaff = getAvailableStaffForService({
    service,
    staffList,
  });

  if (availableStaff.length === 0) return null;

  if (preferredStaffId) {
    const preferred = availableStaff.find(
      (staff) => String(staff.id) === String(preferredStaffId)
    );

    if (preferred) return preferred;
  }

  if (slot && date) {
    const sharedSlots = getSharedAvailableSlots({
      staffList: availableStaff,
      bookings,
      date,
    });

    const selectedSlot = sharedSlots.find((item) => item.slot === slot);

    if (selectedSlot?.professionals?.length > 0) {
      const selected = selectedSlot.professionals[0];

      return (
        availableStaff.find(
          (staff) => String(staff.id) === String(selected.id)
        ) || null
      );
    }
  }

  return availableStaff[0];
}

export function buildBookingAssignmentPayload({
  booking,
  staff,
}) {
  if (!booking || !staff) return {};

  return {
    assigned_staff_id: staff.id,
    assigned_staff_name: staff.nome,
    assigned_staff_phone: staff.telefone || null,
    assigned_at: new Date().toISOString(),
  };
}

export function getBookingStaffLabel(booking) {
  if (!booking?.assigned_staff_id) {
    return "Sem profissional definido";
  }

  return booking.assigned_staff_name || "Profissional";
}