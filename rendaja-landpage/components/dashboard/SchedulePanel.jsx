import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase";

function statusLabel(status) {
  if (status === "confirmed") return "Confirmado";
  if (status === "completed") return "Finalizado";
  if (status === "cancelled") return "Cancelado";
  if (status === "pending") return "Pendente";
  return status || "Pendente";
}

function formatDateBR(date) {
  if (!date) return "Sem data";

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function getServiceNames(booking) {
  const services = Array.isArray(booking.services) ? booking.services : [];

  if (!services.length) return "Serviço não informado";

  return services
    .map((item) => item.name || item.title || "Serviço")
    .join(" • ");
}

export default function SchedulePanel() {
  const [bookings, setBookings] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  async function loadSchedule() {
    try {
      setLoading(true);

      const savedUser = localStorage.getItem("rendaja_user");
      const user = savedUser ? JSON.parse(savedUser) : null;

      if (!user?.id) return;

      const { data: profile } = await supabase
        .from("profiles_pages")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.id) return;

      const [bookingsReq, staffReq] = await Promise.all([
        supabase
          .from("profile_bookings")
          .select("*")
          .eq("profile_page_id", profile.id)
          .order("date", { ascending: true })
          .order("time", { ascending: true }),

        supabase
          .from("profile_staff")
          .select("*")
          .eq("profile_page_id", profile.id)
          .eq("ativo", true)
          .order("nome", { ascending: true }),
      ]);

      if (bookingsReq.error) throw bookingsReq.error;
      if (staffReq.error) throw staffReq.error;

      setBookings(bookingsReq.data || []);
      setStaffMembers(staffReq.data || []);
    } catch (err) {
      console.error("Erro agenda:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBookings = useMemo(() => {
    if (selectedStaffId === "all") return bookings;

    return bookings.filter((booking) => {
      const bookingStaffId =
        booking.staff_id ||
        booking.assigned_staff_id ||
        booking.staffId;

      return String(bookingStaffId) === String(selectedStaffId);
    });
  }, [bookings, selectedStaffId]);

  if (loading) {
    return <div className="dashboard-loading">Carregando agenda...</div>;
  }

  return (
    <div className="dashboard-section schedule-dashboard">
      <div className="dashboard-page-header schedule-page-head">
        <div>
          <span className="dashboard-eyebrow">Agenda</span>
          <h2>Agenda da equipe</h2>
          <p>Visualize os agendamentos por profissional, data e status.</p>
        </div>

        <button type="button" className="finance-secondary-button" onClick={loadSchedule}>
          Atualizar
        </button>
      </div>

      <div className="schedule-staff-carousel">
        <button
          type="button"
          className={selectedStaffId === "all" ? "active" : ""}
          onClick={() => setSelectedStaffId("all")}
        >
          <span>👥</span>
          <strong>Todos</strong>
          <small>{bookings.length} agenda(s)</small>
        </button>

        {staffMembers.map((staff) => {
          const total = bookings.filter((booking) => {
            const bookingStaffId =
              booking.staff_id ||
              booking.assigned_staff_id ||
              booking.staffId;

            return String(bookingStaffId) === String(staff.id);
          }).length;

          return (
            <button
              key={staff.id}
              type="button"
              className={selectedStaffId === staff.id ? "active" : ""}
              onClick={() => setSelectedStaffId(staff.id)}
            >
              <span>{staff.nome?.[0] || "F"}</span>
              <strong>{staff.nome}</strong>
              <small>{total} agenda(s)</small>
            </button>
          );
        })}
      </div>

      <div className="schedule-grid">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className={`schedule-card ${booking.status || "pending"}`}>
            <div className="schedule-card-top">
              <span>{formatDateBR(booking.date)}</span>
              <strong>{booking.time || "--:--"}</strong>
            </div>

            <div className="schedule-card-body">
              <h3>{booking.customer_name || "Cliente"}</h3>
              <p>{getServiceNames(booking)}</p>

              {(booking.staff_name || booking.assigned_staff_name) && (
                <small>
                  Profissional: {booking.staff_name || booking.assigned_staff_name}
                </small>
              )}
            </div>

            <div className="schedule-card-footer">
              <span className={`schedule-status ${booking.status || "pending"}`}>
                {statusLabel(booking.status)}
              </span>

              {booking.customer_phone && (
                <a
                  href={`https://wa.me/55${String(booking.customer_phone).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="dashboard-empty schedule-empty">
            Nenhum agendamento encontrado para esta seleção.
          </div>
        )}
      </div>
    </div>
  );
}