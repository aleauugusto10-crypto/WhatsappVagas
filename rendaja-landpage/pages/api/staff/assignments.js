import { supabase } from "../../../src/lib/supabase";

function randomItem(array = []) {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

async function getAvailableStaff({ profilePageId, itemId }) {
  let query = supabase
    .from("profile_staff_services")
    .select(`
      *,
      staff:profile_staff(*)
    `)
    .eq("profile_page_id", profilePageId)
    .eq("ativo", true);

  if (itemId) {
    query = query.eq("item_id", itemId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ getAvailableStaff:", error);
    return [];
  }

  return data?.map((row) => row.staff).filter(Boolean) || [];
}

async function createAssignment({
  profilePageId,
  orderId,
  bookingId,
  itemId,
  staffId,
  assignmentType = "manual",
}) {
  const { data, error } = await supabase
    .from("profile_assignments")
    .insert({
      profile_page_id: profilePageId,
      order_id: orderId || null,
      booking_id: bookingId || null,
      item_id: itemId || null,
      staff_id: staffId,
      assignment_type: assignmentType,
      status: "assigned",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { profilePageId, orderId, bookingId } = req.query;

      if (!profilePageId) {
        return res.status(400).json({ error: "profilePageId obrigatório." });
      }

      let query = supabase
        .from("profile_assignments")
        .select(`
          *,
          staff:profile_staff(*)
        `)
        .eq("profile_page_id", profilePageId)
        .order("created_at", { ascending: false });

      if (orderId) query = query.eq("order_id", orderId);
      if (bookingId) query = query.eq("booking_id", bookingId);

      const { data, error } = await query;

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      const {
        profilePageId,
        orderId,
        bookingId,
        itemId,
        staffId,
        autoAssign = false,
      } = req.body || {};

      if (!profilePageId) {
        return res.status(400).json({ error: "profilePageId obrigatório." });
      }

      let finalStaffId = staffId || null;

      if (!finalStaffId && autoAssign) {
        const availableStaff = await getAvailableStaff({
          profilePageId,
          itemId,
        });

        if (!availableStaff.length) {
          return res.status(400).json({
            error: "Nenhum funcionário disponível para este item.",
          });
        }

        const selected = randomItem(availableStaff);
        finalStaffId = selected?.id;
      }

      if (!finalStaffId) {
        return res.status(400).json({
          error: "Nenhum funcionário definido.",
        });
      }

      const assignment = await createAssignment({
        profilePageId,
        orderId,
        bookingId,
        itemId,
        staffId: finalStaffId,
        assignmentType: autoAssign ? "automatic" : "manual",
      });

      return res.status(200).json(assignment);
    }

    if (req.method === "PATCH") {
      const { assignmentId, status } = req.body || {};

      if (!assignmentId || !status) {
        return res.status(400).json({
          error: "assignmentId e status são obrigatórios.",
        });
      }

      const { data, error } = await supabase
        .from("profile_assignments")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Método não permitido." });
  } catch (err) {
    console.error("❌ assignments api:", err);

    return res.status(500).json({
      error: err.message || "Erro interno.",
    });
  }
}