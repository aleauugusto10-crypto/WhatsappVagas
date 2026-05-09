import { useEffect, useMemo, useState } from "react";
import { supabase } from "../src/lib/supabase";

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function isSameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

function isBeforeToday(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);

  return compare < today;
}

function formatFullDate(date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeReservedSlots(value = []) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;

      if (item?.date && item?.time) {
        return `${item.date}-${item.time}`;
      }

      if (item?.day && item?.slot) {
        return `${item.day}-${item.slot}`;
      }

      return null;
    })
    .filter(Boolean);
}

function normalizeBookingServices(value = []) {
  if (!Array.isArray(value)) return [];

  return value.filter(Boolean).map((item, index) => ({
    id: item.id || item.slug || `booking-service-${index}`,
    name: item.name || item.title || item.service_title || "Serviço",

    price: item.price || item.value || null,

    price_type: item.price_type || "fixed",

    duration: item.duration || item.duration_minutes || null,

    qty: item.qty || 1,

    allowed_staff_ids:
      item.allowed_staff_ids ||
      item.staff_ids ||
      item.professional_ids ||
      [],

    allow_all_staff:
      item.allow_all_staff === true ||
      item.all_staff === true ||
      false,
  }));
}

function formatMoney(value) {
  if (!value && value !== 0) return null;

  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildSlotId(date, time, staffId = "no_staff") {
  return `${date}-${time}-${staffId}`;
}
export default function BookingSection({ profile }) {
  const professionalName =
    profile?.name ||
    profile?.nome ||
    profile?.professional_name ||
    profile?.business_name ||
    profile?.title ||
    "profissional";

  const professionalWhatsapp =
    profile?.whatsapp || profile?.phone || "";

  const [bookingServices, setBookingServices] = useState([]);

  const [selectedServiceId, setSelectedServiceId] = useState("");

  const [selectedSlot, setSelectedSlot] = useState(null);

  const [creatingBooking, setCreatingBooking] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);

  const [bookingCreated, setBookingCreated] = useState(null);

  const [staffMembers, setStaffMembers] = useState([]);

  const [selectedStaffId, setSelectedStaffId] = useState("any");

  const [reservedBookings, setReservedBookings] = useState([]);

  const [clientForm, setClientForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    note: "",
  });

  const selectedService =
    bookingServices.find(
      (service) => service.id === selectedServiceId
    ) ||
    bookingServices[0] ||
    null;

  const shouldShowBooking =
    profile?.show_booking === true &&
    bookingServices.length > 0;

  const workingHours = profile?.working_hours || {
    start: 8,
    end: 18,
    interval: 1,
  };

  const workingDays =
    profile?.working_days || [1, 2, 3, 4, 5, 6];

  const today = useMemo(() => new Date(), []);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });

  const [selectedDate, setSelectedDate] = useState(today);

  const selectedDateKey = dateKey(selectedDate);

  useEffect(() => {
    async function loadStaff() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from("profile_staff")
        .select("*")
        .eq("profile_page_id", profile.id)
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("❌ erro ao buscar funcionários:", error);
        return;
      }

      setStaffMembers(data || []);
    }

    loadStaff();
  }, [profile?.id]);

  useEffect(() => {
    async function loadReservedBookings() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from("profile_bookings")
        .select("*")
        .eq("profile_page_id", profile.id)
        .in("status", [
          "pending",
          "confirmed",
          "waiting_payment",
        ]);

      if (error) {
        console.error("❌ erro reservas:", error);
        return;
      }

      setReservedBookings(data || []);
    }

    loadReservedBookings();
  }, [profile?.id]);

  useEffect(() => {
    function applyServices(services) {
      const normalized =
        normalizeBookingServices(services);

      setBookingServices(normalized);

      setSelectedServiceId(normalized[0]?.id || "");

      setSelectedSlot(null);

      setBookingCreated(null);
    }

    function applySingleService(service) {
      if (!service?.id) return;

      applyServices([service]);
    }

    const savedServices =
      window.sessionStorage.getItem(
        "selected_booking_services"
      );

    const savedService =
      window.sessionStorage.getItem(
        "selected_booking_service"
      );

    if (savedServices) {
      try {
        applyServices(JSON.parse(savedServices));
      } catch {
        window.sessionStorage.removeItem(
          "selected_booking_services"
        );
      }
    } else if (savedService) {
      try {
        applySingleService(JSON.parse(savedService));
      } catch {
        window.sessionStorage.removeItem(
          "selected_booking_service"
        );
      }
    }

    function handleServicesSelected(event) {
      applyServices(event.detail);
    }

    function handleServiceSelected(event) {
      applySingleService(event.detail);
    }

    window.addEventListener(
      "booking-services-selected",
      handleServicesSelected
    );

    window.addEventListener(
      "booking-service-selected",
      handleServiceSelected
    );

    return () => {
      window.removeEventListener(
        "booking-services-selected",
        handleServicesSelected
      );

      window.removeEventListener(
        "booking-service-selected",
        handleServiceSelected
      );
    };
  }, []);

    const availableStaff = useMemo(() => {
    if (!selectedService) return [];

    if (
      selectedService.allow_all_staff === true ||
      !selectedService.allowed_staff_ids?.length
    ) {
      return staffMembers;
    }

    return staffMembers.filter((staff) =>
      selectedService.allowed_staff_ids.includes(staff.id)
    );
  }, [selectedService, staffMembers]);

  const usingStaffSystem =
    availableStaff.length > 0;

  function isWorkingDay(date, staff = null) {
    const baseWorkingDays =
      staff?.working_days ||
      workingDays;

    return baseWorkingDays.includes(date.getDay());
  }

  function isPastSlot(slot) {
    const now = new Date();

    if (!isSameDay(selectedDate, now)) {
      return false;
    }

    const [hour, minute] = slot
      .split(":")
      .map(Number);

    const slotDate = new Date(selectedDate);

    slotDate.setHours(hour, minute || 0, 0, 0);

    return slotDate <= now;
  }

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();

    const month = visibleMonth.getMonth();

    const firstDay = new Date(year, month, 1);

    const startWeekDay = firstDay.getDay();

    const startDate = new Date(
      year,
      month,
      1 - startWeekDay
    );

    return Array.from({ length: 42 }).map(
      (_, index) => {
        const date = new Date(startDate);

        date.setDate(
          startDate.getDate() + index
        );

        const disabled =
          isBeforeToday(date) ||
          !workingDays.includes(date.getDay());

        return {
          date,

          key: dateKey(date),

          dayNumber: date.getDate(),

          isCurrentMonth:
            date.getMonth() === month,

          isToday: isSameDay(date, today),

          isSelected: isSameDay(
            date,
            selectedDate
          ),

          disabled,
        };
      }
    );
  }, [
    visibleMonth,
    selectedDate,
    today,
    workingDays,
  ]);

  const slots = useMemo(() => {
    const list = [];

    const start = Number(
      workingHours.start || 8
    );

    const end = Number(
      workingHours.end || 18
    );

    const interval = Number(
      workingHours.interval || 1
    );

    for (
      let h = start;
      h < end;
      h += interval
    ) {
      const hour = Math.floor(h);

      const minute =
        h % 1 === 0.5 ? "30" : "00";

      list.push(`${pad(hour)}:${minute}`);
    }

    return list;
  }, [workingHours]);

  function getReservedStaffIds(
    date,
    slot
  ) {
    return reservedBookings
      .filter(
        (booking) =>
          booking.date === date &&
          booking.time === slot
      )
      .map(
  (booking) =>
    booking.staff_id || booking.assigned_staff_id || "no_staff"
);
  }

  function isReserved(slot) {
    if (!usingStaffSystem) {
      return reservedBookings.some(
        (booking) =>
          booking.date ===
            selectedDateKey &&
          booking.time === slot
      );
    }

    if (selectedStaffId === "any") {
      const reservedIds =
        getReservedStaffIds(
          selectedDateKey,
          slot
        );

      const freeStaff =
        availableStaff.filter(
          (staff) =>
            !reservedIds.includes(staff.id)
        );

      return freeStaff.length === 0;
    }

    return reservedBookings.some(
      (booking) =>
        booking.date ===
          selectedDateKey &&
        booking.time === slot &&
        (
  booking.staff_id === selectedStaffId ||
  booking.assigned_staff_id === selectedStaffId
)
    );
  }

  function getAvailableStaffForSlot(slot) {
    const reservedIds =
      getReservedStaffIds(
        selectedDateKey,
        slot
      );

    return availableStaff.filter(
      (staff) =>
        !reservedIds.includes(staff.id)
    );
  }

  function isUnavailable(slot) {
    if (isPastSlot(slot)) {
      return true;
    }

    if (!usingStaffSystem) {
      return (
        isReserved(slot) ||
        !isWorkingDay(selectedDate)
      );
    }

    if (
      selectedStaffId !== "any"
    ) {
      const selectedStaff =
        availableStaff.find(
          (staff) =>
            staff.id === selectedStaffId
        );

      if (
        !isWorkingDay(
          selectedDate,
          selectedStaff
        )
      ) {
        return true;
      }
    }

    return isReserved(slot);
  }

  function reservedCountForDay(dayKey) {
    return reservedBookings.filter(
      (booking) =>
        booking.date === dayKey
    ).length;
  }

  function availableCountForSelectedDay() {
    return slots.filter(
      (slot) => !isUnavailable(slot)
    ).length;
  }

  function goToPreviousMonth() {
    setVisibleMonth((current) => {
      const next = new Date(current);

      next.setMonth(
        next.getMonth() - 1
      );

      return next;
    });
  }

  function goToNextMonth() {
    setVisibleMonth((current) => {
      const next = new Date(current);

      next.setMonth(
        next.getMonth() + 1
      );

      return next;
    });
  }

  function selectDate(date) {
    if (isBeforeToday(date)) {
      return;
    }

    if (!isWorkingDay(date)) {
      return;
    }

    setSelectedDate(date);

    setSelectedSlot(null);

    setBookingCreated(null);
  }

  function handleSelect(slot) {
    if (isUnavailable(slot)) {
      return;
    }

    setSelectedSlot(slot);

    setBookingCreated(null);
  }

  function updateClientForm(
    field,
    value
  ) {
    setClientForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function openClientModal() {
    if (!selectedSlot) {
      return;
    }

    setShowClientModal(true);
  }

  function buildWhatsAppText(
    customerName = "",
    assignedStaff = null
  ) {
    const servicesText =
      bookingServices
        .map((service) => {
          const qtyText =
            service.qty > 1
              ? `${service.qty}x `
              : "";

          const priceText =
            service.price_type ===
            "quote"
              ? "\n💰 Valor: Sob orçamento"
              : service.price
              ? `\n💰 Valor: ${formatMoney(
                  service.price
                )}`
              : "";

          return `🛠️ ${qtyText}${service.name}${priceText}`;
        })
        .join("\n\n");

    const professionalText =
      assignedStaff
        ? `\n👤 Profissional: ${assignedStaff.nome}\n`
        : "";

    return encodeURIComponent(
      `Olá, ${professionalName}! 👋

Acabei de solicitar um agendamento pela sua página.

👤 Cliente: ${
        customerName || "Cliente"
      }
${professionalText}
${servicesText}

📅 Data: ${formatFullDate(
        selectedDate
      )}

⏰ Horário: ${selectedSlot}

Aguardo confirmação.`
    );
  }
async function submitBookingRequest(event) {
  event.preventDefault();

  if (!selectedSlot || bookingServices.length === 0 || creatingBooking) return;

  if (!profile?.id) {
    alert("Não foi possível identificar a página do profissional.");
    return;
  }

  const firstName = clientForm.firstName.trim();
  const lastName = clientForm.lastName.trim();
  const customerPhone = onlyDigits(clientForm.phone);

  if (!firstName) {
    alert("Informe seu nome.");
    return;
  }

  if (!customerPhone || customerPhone.length < 10) {
    alert("Informe um WhatsApp válido com DDD.");
    return;
  }

  const customerName = `${firstName} ${lastName}`.trim();

  let assignedStaff = null;

  if (usingStaffSystem) {
    if (selectedStaffId === "any") {
      const freeStaff = getAvailableStaffForSlot(selectedSlot);

      if (freeStaff.length === 0) {
        alert("Esse horário acabou de ficar indisponível. Escolha outro horário.");
        setShowClientModal(false);
        return;
      }

      assignedStaff = freeStaff[0];
    } else {
      assignedStaff =
        availableStaff.find((staff) => staff.id === selectedStaffId) || null;
    }
  }

  if (isReserved(selectedSlot)) {
    alert("Esse horário acabou de ficar indisponível. Escolha outro horário.");
    setShowClientModal(false);
    return;
  }

  setCreatingBooking(true);

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const bookingPayload = {
    profile_page_id: profile.id,
    date: selectedDateKey,
    time: selectedSlot,
    services: bookingServices,
    customer_name: customerName,
    customer_phone: customerPhone,
    note: clientForm.note.trim() || null,
    status: "pending",
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };

  if (assignedStaff?.id) {
    bookingPayload.assigned_staff_id = assignedStaff.id;
    bookingPayload.staff_id = assignedStaff.id;
    bookingPayload.staff_name = assignedStaff.nome || null;
  }

  try {
    const response = await fetch("/api/profile-bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingPayload),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Erro ao criar reserva:", json);
      alert(json.error || "Não foi possível solicitar esse agendamento.");
      return;
    }

    const data = json.booking;

    setReservedBookings((prev) => [...prev, data]);
    setBookingCreated(data);
    setShowClientModal(false);

    setClientForm({
      firstName: "",
      lastName: "",
      phone: "",
      note: "",
    });

    alert("Agendamento enviado com sucesso!");
  } catch (err) {
    console.error("Erro ao criar agendamento:", err);
    alert("Erro ao solicitar agendamento.");
  } finally {
    setCreatingBooking(false);
  }
}

  function openWhatsAppAfterBooking() {
    const customerName = bookingCreated?.customer_name || "Cliente";

    const assignedStaff =
      staffMembers.find(
  (staff) =>
    staff.id === bookingCreated?.staff_id ||
    staff.id === bookingCreated?.assigned_staff_id
) ||
      null;

    const text = buildWhatsAppText(customerName, assignedStaff);

    const whatsappUrl = `https://wa.me/${professionalWhatsapp}?text=${text}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  if (!shouldShowBooking) return null;

  return (
    <section className="booking-section" id="agendamento">
      <div className="booking-card">
        <div className="booking-head">
          <div>
            <span className="eyebrow">Agendamento</span>
            <h2>Escolha o melhor horário</h2>
            <p>
              Você selecionou serviço com agenda online. Agora escolha uma data,
              profissional e horário disponível.
            </p>
          </div>

          <div className="booking-badge">
            <strong>Solicitação pendente</strong>
            <span>O profissional confirma ou cancela pelo painel.</span>
          </div>
        </div>

        <div className="booking-service-box">
          <div>
            <span>Serviço selecionado</span>
            <strong>
              {bookingServices.length > 1
                ? `${bookingServices.length} serviços selecionados`
                : selectedService?.name}
            </strong>

            <small>{bookingServices.map((service) => service.name).join(" • ")}</small>
          </div>

          {bookingServices.length > 1 && (
            <select
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                setSelectedSlot(null);
                setBookingCreated(null);
              }}
            >
              {bookingServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {usingStaffSystem && (
          <div className="booking-staff-box">
            <div>
              <span>Profissional</span>
              <strong>Escolha quem vai atender</strong>
              <small>
                Você pode escolher um profissional específico ou deixar o sistema
                encontrar alguém disponível.
              </small>
            </div>

            <select
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                setSelectedSlot(null);
                setBookingCreated(null);
              }}
            >
              <option value="any">Qualquer profissional disponível</option>

              {availableStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="booking-layout">
          <div className="booking-calendar">
            <div className="calendar-header">
              <button type="button" onClick={goToPreviousMonth} aria-label="Mês anterior">
                ‹
              </button>

              <strong>
                {MONTHS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </strong>

              <button type="button" onClick={goToNextMonth} aria-label="Próximo mês">
                ›
              </button>
            </div>

            <div className="calendar-weekdays">
              {WEEK_DAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((item) => {
                const reservedCount = reservedCountForDay(item.key);

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => selectDate(item.date)}
                    className={[
                      "calendar-day",
                      !item.isCurrentMonth ? "muted" : "",
                      item.isToday ? "today" : "",
                      item.isSelected ? "selected" : "",
                      item.disabled ? "disabled" : "",
                      reservedCount > 0 ? "has-reserved" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <strong>{item.dayNumber}</strong>

                    {reservedCount > 0 && (
                      <span>
                        {reservedCount} reservado{reservedCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

                    <div className="booking-times">
            <div className="times-head">
              <div>
                <span>Horários para</span>
                <strong>{formatFullDate(selectedDate)}</strong>
              </div>

              <em>{availableCountForSelectedDay()} disponíveis</em>
            </div>

            {!isWorkingDay(selectedDate) ? (
              <div className="booking-empty-day">
                Este profissional não atende neste dia.
              </div>
            ) : (
              <div className="booking-slots">
                {slots.map((slot) => {
                  const reserved = isReserved(slot);
                  const past = isPastSlot(slot);
                  const unavailable = isUnavailable(slot);
                  const selected = selectedSlot === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      className={[
                        "booking-slot",
                        reserved ? "reserved" : "",
                        past ? "past" : "",
                        selected ? "selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleSelect(slot)}
                      disabled={unavailable}
                    >
                      <strong>{slot}</strong>
                      <span>
                        {reserved
                          ? "Reservado"
                          : past
                          ? "Indisponível"
                          : "Disponível"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="booking-summary">
          <div>
            <span>{bookingCreated ? "Solicitação enviada" : "Selecionado"}</span>
            <strong>
              {selectedSlot
                ? `${bookingServices.length} serviço(s) • ${formatFullDate(
                    selectedDate
                  )} às ${selectedSlot}`
                : "Escolha uma data e um horário"}
            </strong>

            {usingStaffSystem && selectedSlot && (
              <small>
                {selectedStaffId === "any"
                  ? "O sistema direcionará para um profissional disponível."
                  : `Profissional: ${
                      availableStaff.find((staff) => staff.id === selectedStaffId)
                        ?.nome || "selecionado"
                    }`}
              </small>
            )}
          </div>

          {bookingCreated ? (
            <button
              type="button"
              className="booking-cta"
              onClick={openWhatsAppAfterBooking}
            >
              Solicitação enviada
            </button>
          ) : (
            <button
              type="button"
              className={`booking-cta ${!selectedSlot ? "disabled" : ""}`}
              disabled={!selectedSlot}
              onClick={openClientModal}
            >
              Solicitar agendamento
            </button>
          )}
        </div>
      </div>

      {showClientModal && (
        <div className="booking-modal-backdrop" role="presentation">
          <div className="booking-modal" role="dialog" aria-modal="true">
            <div className="booking-modal-head">
              <div>
                <span className="eyebrow">Dados do cliente</span>
                <h3>Finalize sua solicitação</h3>
                <p>
                  Informe seus dados para o profissional encontrar seu agendamento
                  no painel.
                </p>
              </div>

              <button
                type="button"
                className="booking-modal-close"
                onClick={() => setShowClientModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitBookingRequest} className="booking-client-form">
              <label>
                <span>Nome</span>
                <input
                  value={clientForm.firstName}
                  onChange={(e) => updateClientForm("firstName", e.target.value)}
                  placeholder="Seu nome"
                  autoFocus
                />
              </label>

              <label>
                <span>Sobrenome</span>
                <input
                  value={clientForm.lastName}
                  onChange={(e) => updateClientForm("lastName", e.target.value)}
                  placeholder="Seu sobrenome"
                />
              </label>

              <label className="full">
                <span>WhatsApp com DDD</span>
                <input
                  value={clientForm.phone}
                  onChange={(e) => updateClientForm("phone", e.target.value)}
                  placeholder="Ex: 79999999999"
                />
              </label>

              <label className="full">
                <span>Observação opcional</span>
                <textarea
                  value={clientForm.note}
                  onChange={(e) => updateClientForm("note", e.target.value)}
                  placeholder="Alguma informação importante para o atendimento?"
                />
              </label>

              <div className="booking-modal-summary">
                <strong>
                  {formatFullDate(selectedDate)} às {selectedSlot}
                </strong>

                <span>
                  {bookingServices.map((service) => service.name).join(" • ")}
                </span>

                {usingStaffSystem && (
                  <span>
                    {selectedStaffId === "any"
                      ? "Profissional: qualquer disponível"
                      : `Profissional: ${
                          availableStaff.find((staff) => staff.id === selectedStaffId)
                            ?.nome || "selecionado"
                        }`}
                  </span>
                )}
              </div>

              <div className="booking-modal-actions">
                <button
                  type="button"
                  className="booking-modal-secondary"
                  onClick={() => setShowClientModal(false)}
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  className="booking-modal-primary"
                  disabled={creatingBooking}
                >
                  {creatingBooking ? "Enviando..." : "Enviar solicitação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}