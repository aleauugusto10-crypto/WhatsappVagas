import { supabase } from "../../../src/lib/supabase";

function pickRandom(list = []) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function canStaffHandleItem(staff, item) {
  const specialties = Array.isArray(staff.specialties) ? staff.specialties : [];

  if (specialties.length === 0) return true;

  const itemId = String(item?.id || "");
  const categoryId = String(item?.category_id || "");
  const type = String(item?.type || "");

  return (
    specialties.includes(itemId) ||
    specialties.includes(categoryId) ||
    specialties.includes(type) ||
    specialties.includes("all")
  );
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { profilePageId, item, preferredStaffId = null } = req.body || {};

    if (!profilePageId) {
      return res.status(400).json({ error: "profilePageId obrigatório." });
    }

    const { data: staffList, error } = await supabase
      .from("profile_staff")
      .select("*")
      .eq("profile_page_id", profilePageId)
      .eq("ativo", true);

    if (error) throw error;

    const availableStaff = (staffList || []).filter((staff) =>
      canStaffHandleItem(staff, item)
    );

    if (availableStaff.length === 0) {
      return res.status(200).json({
        assigned: null,
        message: "Nenhum funcionário disponível para este item.",
      });
    }

    if (preferredStaffId) {
      const preferred = availableStaff.find(
        (staff) => String(staff.id) === String(preferredStaffId)
      );

      if (preferred) {
        return res.status(200).json({
          assigned: preferred,
          assignment_type: "preferred",
        });
      }
    }

    const assigned = pickRandom(availableStaff);

    return res.status(200).json({
      assigned,
      assignment_type: "automatic",
    });
  } catch (err) {
    console.error("❌ API staff/assignments:", err);
    return res.status(500).json({
      error: err.message || "Erro ao distribuir atendimento.",
    });
  }
}import { supabase } from "../../src/lib/supabase";

function randomItem(array = []) {
  if (!array.length) return null;

  return array[
    Math.floor(Math.random() * array.length)
  ];
}

async function getAvailableStaff({
  profilePageId,
  itemId,
}) {
  const { data, error } = await supabase
    .from("profile_staff_services")
    .select(`
      *,
      staff:profile_staff(*)
    `)
    .eq("profile_page_id", profilePageId)
    .eq("item_id", itemId)
    .eq("ativo", true);

  if (error) {
    console.error(
      "❌ getAvailableStaff:",
      error
    );

    return [];
  }

  return (
    data
      ?.map((row) => row.staff)
      ?.filter(Boolean) || []
  );
}

async function createAssignment({
  profilePageId,
  orderId,
  bookingId,
  itemId,
  staffId,
  assignmentType = "manual",
}) {
  const payload = {
    profile_page_id: profilePageId,

    order_id: orderId || null,
    booking_id: bookingId || null,

    item_id: itemId || null,

    staff_id: staffId,

    assignment_type: assignmentType,

    status: "assigned",
  };

  const { data, error } = await supabase
    .from("profile_assignments")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(
      "❌ createAssignment:",
      error
    );

    throw error;
  }

  return data;
}

export default async function handler(
  req,
  res
) {
  try {
    // =========================
    // GET
    // =========================

    if (req.method === "GET") {
      const {
        profilePageId,
        orderId,
        bookingId,
      } = req.query;

      let query = supabase
        .from("profile_assignments")
        .select(`
          *,
          staff:profile_staff(*)
        `)
        .eq(
          "profile_page_id",
          profilePageId
        )
        .order("created_at", {
          ascending: false,
        });

      if (orderId) {
        query = query.eq(
          "order_id",
          orderId
        );
      }

      if (bookingId) {
        query = query.eq(
          "booking_id",
          bookingId
        );
      }

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({
          error: error.message,
        });
      }

      return res.status(200).json(data || []);
    }

    // =========================
    // POST
    // =========================

    if (req.method === "POST") {
      const {
        profilePageId,
        orderId,
        bookingId,
        itemId,
        staffId,
        autoAssign = false,
      } = req.body;

      if (!profilePageId) {
        return res.status(400).json({
          error:
            "profilePageId obrigatório.",
        });
      }

      let finalStaffId = staffId;

      // =========================
      // AUTO ASSIGN
      // =========================

      if (!finalStaffId && autoAssign) {
        const availableStaff =
          await getAvailableStaff({
            profilePageId,
            itemId,
          });

        if (!availableStaff.length) {
          return res.status(400).json({
            error:
              "Nenhum profissional disponível.",
          });
        }

        const selected =
          randomItem(availableStaff);

        finalStaffId = selected.id;
      }

      if (!finalStaffId) {
        return res.status(400).json({
          error:
            "Nenhum funcionário definido.",
        });
      }

      const assignment =
        await createAssignment({
          profilePageId,
          orderId,
          bookingId,
          itemId,
          staffId: finalStaffId,

          assignmentType: autoAssign
            ? "automatic"
            : "manual",
        });

      return res
        .status(200)
        .json(assignment);
    }

    // =========================
    // PATCH
    // =========================

    if (req.method === "PATCH") {
      const {
        assignmentId,
        status,
      } = req.body;

      const { data, error } =
        await supabase
          .from("profile_assignments")
          .update({
            status,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", assignmentId)
          .select()
          .single();

      if (error) {
        return res.status(400).json({
          error: error.message,
        });
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({
      error: "Método não permitido.",
    });
  } catch (err) {
    console.error(
      "❌ assignments api:",
      err
    );

    return res.status(500).json({
      error: "Erro interno.",
    });
  }
}