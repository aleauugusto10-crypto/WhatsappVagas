import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

function emptyForm() {
  return {
    nome: "",
    telefone: "",
    email: "",
    role: "staff",
positionTitle: "",
    salaryEnabled: true,
    fixedSalary: "",

    paymentFrequency: "monthly",
    nextPaymentDate: "",

    commissionType: "none",
    commissionValue: 0,
    canViewOrders: false,
canViewBookings: false,

canConfirmOrders: false,
canConfirmBookings: false,

canFinalizeOrders: false,
canFinalizeBookings: false,

receivesCommission: false,

whatsappEnabled: true,
  };
}

function roleLabel(role) {
  if (role === "manager") return "Gerente";
  if (role === "cashier") return "Caixa";
  return "Funcionário";
}

function commissionLabel(type, value) {
  if (type === "percent") return `${Number(value || 0)}%`;
  if (type === "fixed") return `R$ ${Number(value || 0).toFixed(2)}`;
  return "Sem comissão";
}

function frequencyLabel(value) {
  if (value === "weekly") return "Semanal";
  if (value === "biweekly") return "Quinzenal";
  return "Mensal";
}

export default function StaffPanel() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm());
const [editingStaff, setEditingStaff] = useState(null);
const [editForm, setEditForm] = useState(emptyForm());
const [savingEdit, setSavingEdit] = useState(false);
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const savedUser = localStorage.getItem("rendaja_user");
      const user = savedUser ? JSON.parse(savedUser) : null;

      if (!user?.id) return;

      const { data: profilePage, error: profileError } = await supabase
        .from("profiles_pages")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !profilePage) {
        console.error("Erro ao buscar perfil:", profileError);
        return;
      }

      setProfile(profilePage);

      const response = await fetch(`/api/staff?profilePageId=${profilePage.id}`);
      const json = await response.json();

      if (!response.ok) {
        console.error("Erro API staff:", json);
        setStaff([]);
        return;
      }

      setStaff(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("Erro geral loadData:", err);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }
function openEditStaff(item) {
  setEditingStaff(item);

  setEditForm({
    nome: item.nome || "",
    telefone: item.telefone || "",
    email: item.email || "",
    role: item.role || "staff",
positionTitle: item.position_title || "",
    salaryEnabled: Number(item.fixed_salary || 0) > 0,
    fixedSalary: item.fixed_salary || "",

    paymentFrequency: item.payment_frequency || "monthly",
    nextPaymentDate: item.next_payment_date || "",

    commissionType: item.commission_type || "none",
    commissionValue: item.commission_value || 0,
    canViewOrders: !!item.can_view_orders,
canViewBookings: !!item.can_view_bookings,

canConfirmOrders: !!item.can_confirm_orders,
canConfirmBookings: !!item.can_confirm_bookings,

canFinalizeOrders: !!item.can_finalize_orders,
canFinalizeBookings: !!item.can_finalize_bookings,

receivesCommission: !!item.receives_commission,

whatsappEnabled: item.whatsapp_enabled !== false,
  });

}

function updateEditField(field, value) {
  setEditForm((prev) => ({
    ...prev,
    [field]: value,
  }));
}

async function updateStaff(e) {
  e.preventDefault();

  if (!editingStaff?.id || savingEdit) return;

  try {
    setSavingEdit(true);

    const response = await fetch("/api/staff", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        staffId: editingStaff.id,
        updates: {
          nome: editForm.nome,
          telefone: editForm.telefone,
          email: editForm.email,
          role: editForm.role,

          positionTitle: editForm.positionTitle,
          canViewOrders: editForm.canViewOrders,
canViewBookings: editForm.canViewBookings,

canConfirmOrders: editForm.canConfirmOrders,
canConfirmBookings: editForm.canConfirmBookings,

canFinalizeOrders: editForm.canFinalizeOrders,
canFinalizeBookings: editForm.canFinalizeBookings,

receivesCommission: editForm.receivesCommission,

whatsappEnabled: editForm.whatsappEnabled,

fixedSalary: editForm.salaryEnabled
  ? Number(editForm.fixedSalary || 0)
  : 0,

paymentFrequency: editForm.paymentFrequency || "monthly",
nextPaymentDate: editForm.nextPaymentDate || null,

commissionType: editForm.commissionType || "none",
commissionValue:
            editForm.commissionType === "none"
              ? 0
              : Number(editForm.commissionValue || 0),
        },
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(json.error || "Erro ao atualizar funcionário.");
      return;
    }

    setEditingStaff(null);
    setEditForm(emptyForm());

    await loadData();

    alert("Funcionário atualizado!");
  } catch (err) {
    console.error(err);
    alert("Erro ao atualizar funcionário.");
  } finally {
    setSavingEdit(false);
  }
}
  async function createStaff(e) {
    e.preventDefault();

    if (!profile?.id) return;

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profilePageId: profile.id,

          nome: form.nome,
          telefone: form.telefone,
          email: form.email,
          role: form.role,
positionTitle: form.positionTitle,
          fixedSalary: form.salaryEnabled
  ? Number(form.fixedSalary || 0)
  : 0,
          paymentFrequency: form.paymentFrequency || "monthly",
          nextPaymentDate: form.nextPaymentDate || null,

          commissionType: form.commissionType || "none",
          commissionValue:
            form.commissionType === "none"
              ? 0
              : Number(form.commissionValue || 0),
              canViewOrders: form.canViewOrders,
canViewBookings: form.canViewBookings,

canConfirmOrders: form.canConfirmOrders,
canConfirmBookings: form.canConfirmBookings,

canFinalizeOrders: form.canFinalizeOrders,
canFinalizeBookings: form.canFinalizeBookings,

receivesCommission: form.receivesCommission,

whatsappEnabled: form.whatsappEnabled,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        alert(json.error || "Erro ao criar funcionário.");
        return;
      }

      setForm(emptyForm());
      await loadData();

      alert("Funcionário criado!");
    } catch (err) {
      console.error(err);
      alert("Erro ao criar funcionário.");
    }
  }

  async function disableStaff(staffId) {
    const ok = confirm("Deseja desativar este funcionário?");
    if (!ok) return;

    try {
      const response = await fetch("/api/staff", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staffId }),
      });

      if (!response.ok) {
        alert("Erro ao remover.");
        return;
      }

      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-spinner" />
      </div>
    );
  }

  return (
    <div className="staff-page">
      <div className="staff-hero">
        <div>
          <span>Equipe</span>
          <h1>Funcionários</h1>
          <p>
            Gerencie acessos, cargos, salários, comissão e pagamentos da equipe.
          </p>
        </div>

        <div className="staff-hero-badge">
          <strong>{staff.length}</strong>
          <small>integrante{staff.length !== 1 ? "s" : ""}</small>
        </div>
      </div>

      <div className="staff-layout">
        <form className="staff-create-card" onSubmit={createStaff}>
          <div className="staff-card-head">
            <div>
              <span>Novo membro</span>
              <h3>Criar funcionário</h3>
            </div>
          </div>

          <div className="staff-form-grid">
            


            <label className="field">
              <span>Nome completo</span>
              <input
                value={form.nome}
                onChange={(e) => updateField("nome", e.target.value)}
                placeholder="Nome do funcionário"
              />
            </label>

            <label className="field">
              <span>Telefone</span>
              <input
                value={form.telefone}
                onChange={(e) => updateField("telefone", e.target.value)}
                placeholder="(79) 99999-9999"
              />
            </label>

            <label className="field full">
              <span>Email</span>
              <input
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="email@empresa.com"
              />
            </label>

            <label className="field">
              <span>Cargo</span>
              <select
                value={form.role}
                onChange={(e) => updateField("role", e.target.value)}
              >
                <option value="staff">Funcionário</option>
                <option value="manager">Gerente</option>
                <option value="cashier">Caixa</option>
              </select>
            </label>
<label className="field">
  <span>Função / cargo visível</span>
  <input
    value={form.positionTitle}
    onChange={(e) => updateField("positionTitle", e.target.value)}
    placeholder="Ex: Vendedor, Barbeiro, Atendente"
  />
</label>
<div className="field full salary-block">
  {form.salaryEnabled && (
    <label className="field">
      <span>Salário fixo</span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={form.fixedSalary}
        onChange={(e) =>
          updateField(
            "fixedSalary",
            e.target.value
          )
        }
        placeholder="Ex: 1500"
      />
    </label>
  )}

  <button
    type="button"
    className={`salary-toggle ${
      !form.salaryEnabled ? "active" : ""
    }`}
    onClick={() =>
      updateField(
        "salaryEnabled",
        !form.salaryEnabled
      )
    }
  >
    <div className="salary-toggle-info">
      <strong>
        Apenas comissão
      </strong>

      <small>
        Funcionário sem salário fixo
      </small>
    </div>

    <div className="salary-toggle-switch">
      <i />
    </div>
  </button>
</div>

            <label className="field">
              <span>Frequência de pagamento</span>
              <select
                value={form.paymentFrequency}
                onChange={(e) =>
                  updateField("paymentFrequency", e.target.value)
                }
              >
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
                <option value="monthly">Mensal</option>
              </select>
            </label>

            <label className="field full">
              <span>Próxima data de pagamento</span>
              <input
                type="date"
                value={form.nextPaymentDate}
                onChange={(e) =>
                  updateField("nextPaymentDate", e.target.value)
                }
              />
            </label>

            <label className="field">
              <span>Tipo comissão</span>
              <select
                value={form.commissionType}
                onChange={(e) => updateField("commissionType", e.target.value)}
              >
                <option value="none">Sem comissão</option>
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </label>

            {form.commissionType !== "none" && (
              <label className="field">
                <span>Valor da comissão</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.commissionValue}
                  onChange={(e) =>
                    updateField("commissionValue", e.target.value)
                  }
                  placeholder={
                    form.commissionType === "percent" ? "Ex: 10" : "Ex: 5"
                  }
                />
              </label>
              
            )}
          </div>

<div className="staff-permissions">
  <strong className="staff-permissions-title">
    Permissões
  </strong>

  <div className="staff-permissions-grid">
    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={form.canViewOrders}
        onChange={(e) =>
          updateField("canViewOrders", e.target.checked)
        }
      />

      <span>Ver pedidos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={form.canConfirmOrders}
        onChange={(e) =>
          updateField("canConfirmOrders", e.target.checked)
        }
      />

      <span>Confirmar pedidos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={form.canFinalizeOrders}
        onChange={(e) =>
          updateField("canFinalizeOrders", e.target.checked)
        }
      />

      <span>Finalizar pedidos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={form.canViewBookings}
        onChange={(e) =>
          updateField("canViewBookings", e.target.checked)
        }
      />

      <span>Ver agendamentos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={form.canConfirmBookings}
        onChange={(e) =>
          updateField("canConfirmBookings", e.target.checked)
        }
      />

      <span>Confirmar agendamentos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={form.canFinalizeBookings}
        onChange={(e) =>
          updateField("canFinalizeBookings", e.target.checked)
        }
      />

      <span>Finalizar agendamentos</span>
    </label>
  </div>
</div>
          <button type="submit" className="staff-submit-button">
            Criar funcionário
          </button>
        </form>

        <div className="staff-list-card">
          <div className="staff-card-head">
            <div>
              <span>Equipe</span>
              <h3>Membros cadastrados</h3>
            </div>
          </div>

          <div className="staff-list">
            {staff.map((item) => (
              <div
  key={item.id}
  className="staff-user-card"
  onClick={() => openEditStaff(item)}
>
                <div className="staff-user-avatar">
                  {item.nome?.[0] || "F"}
                </div>

                <div className="staff-user-content">
                  <div className="staff-user-top">
                    <strong>
  {item.nome}
  {item.position_title ? ` - ${item.position_title}` : ""}
</strong>
                    <span>{roleLabel(item.role)}</span>
                  </div>

                  <small>{item.email}</small>
                  <p>{item.telefone}</p>

                  <p>
                    Salário: R$ {Number(item.fixed_salary || 0).toFixed(2)} •{" "}
                    {frequencyLabel(item.payment_frequency)}
                  </p>

                  <p>
                    Comissão:{" "}
                    {commissionLabel(
                      item.commission_type,
                      item.commission_value
                    )}
                  </p>
<p>
  Comissão atual: R$ {Number(item.pending_commission_amount || 0).toFixed(2)}
</p>
{item.affiliate_code && (
  <div className="staff-affiliate-box">
    <small>Link de comissão</small>
<a
  href={`${window.location.origin}/p/${profile?.slug}?ref=${item.affiliate_code}`}
  target="_blank"
  rel="noreferrer"
  onClick={(e) => e.stopPropagation()}
>
  {window.location.origin}/p/{profile?.slug}?ref={item.affiliate_code}
</a>
  </div>
)}
                  {item.next_payment_date && (
                    <p>Próximo pagamento: {item.next_payment_date}</p>
                  )}
                </div>

            <button
  type="button"
  className="staff-remove-button"
  onClick={(e) => {
    e.stopPropagation();
    disableStaff(item.id);
  }}
>
  Remover
</button>
              </div>
            ))}

            {staff.length === 0 && (
              <div className="staff-empty">
                Nenhum funcionário cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      </div>
      {editingStaff && (
  <div
    className="staff-modal-backdrop"
    onClick={() => setEditingStaff(null)}
  >
    <form
      className="staff-edit-modal"
      onSubmit={updateStaff}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="staff-modal-close"
        onClick={() => setEditingStaff(null)}
      >
        ×
      </button>

      <span>Editar membro</span>
      <h3>{editingStaff.nome}</h3>

      <div className="staff-form-grid">
        <label className="field">
          <span>Nome completo</span>
          <input
            value={editForm.nome}
            onChange={(e) => updateEditField("nome", e.target.value)}
          />
        </label>

        <label className="field">
          <span>Telefone</span>
          <input
            value={editForm.telefone}
            onChange={(e) => updateEditField("telefone", e.target.value)}
          />
        </label>

        <label className="field full">
          <span>Email</span>
          <input
            value={editForm.email}
            onChange={(e) => updateEditField("email", e.target.value)}
          />
        </label>

        <label className="field">
          <span>Cargo</span>
          <select
            value={editForm.role}
            onChange={(e) => updateEditField("role", e.target.value)}
          >
            <option value="staff">Funcionário</option>
            <option value="manager">Gerente</option>
            <option value="cashier">Caixa</option>
          </select>
        </label>
<label className="field">
  <span>Função / cargo visível</span>
  <input
    value={editForm.positionTitle}
    onChange={(e) => updateEditField("positionTitle", e.target.value)}
    placeholder="Ex: Vendedor, Barbeiro, Atendente"
  />
</label>
        <div className="field full salary-block">
          {editForm.salaryEnabled && (
            <label className="field">
              <span>Salário fixo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.fixedSalary}
                onChange={(e) =>
                  updateEditField("fixedSalary", e.target.value)
                }
              />
            </label>
          )}

          <button
            type="button"
            className={`salary-toggle ${
              !editForm.salaryEnabled ? "active" : ""
            }`}
            onClick={() =>
              updateEditField("salaryEnabled", !editForm.salaryEnabled)
            }
          >
            <div className="salary-toggle-info">
              <strong>Apenas comissão</strong>
              <small>Funcionário sem salário fixo</small>
            </div>

            <div className="salary-toggle-switch">
              <i />
            </div>
          </button>
        </div>

        <label className="field">
          <span>Frequência de pagamento</span>
          <select
            value={editForm.paymentFrequency}
            onChange={(e) =>
              updateEditField("paymentFrequency", e.target.value)
            }
          >
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quinzenal</option>
            <option value="monthly">Mensal</option>
          </select>
        </label>

        <label className="field full">
          <span>Próxima data de pagamento</span>
          <input
            type="date"
            value={editForm.nextPaymentDate}
            onChange={(e) =>
              updateEditField("nextPaymentDate", e.target.value)
            }
          />
        </label>

        <label className="field">
          <span>Tipo comissão</span>
          <select
            value={editForm.commissionType}
            onChange={(e) =>
              updateEditField("commissionType", e.target.value)
            }
          >
            <option value="none">Sem comissão</option>
            <option value="percent">Percentual</option>
            <option value="fixed">Valor fixo</option>
          </select>
        </label>

        {editForm.commissionType !== "none" && (
          <label className="field">
            <span>Valor da comissão</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editForm.commissionValue}
              onChange={(e) =>
                updateEditField("commissionValue", e.target.value)
              }
            />
          </label>
        )}
      </div>

      <button
        type="submit"
        className="staff-submit-button"
        disabled={savingEdit}
      >
        {savingEdit ? "Salvando..." : "Salvar alterações"}
      </button>
      <div className="staff-permissions">
  <strong className="staff-permissions-title">
    Permissões
  </strong>

  <div className="staff-permissions-grid">
    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={editForm.canViewOrders}
        onChange={(e) =>
          updateEditField("canViewOrders", e.target.checked)
        }
      />
      <span>Ver pedidos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={editForm.canConfirmOrders}
        onChange={(e) =>
          updateEditField("canConfirmOrders", e.target.checked)
        }
      />
      <span>Confirmar pedidos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={editForm.canFinalizeOrders}
        onChange={(e) =>
          updateEditField("canFinalizeOrders", e.target.checked)
        }
      />
      <span>Finalizar pedidos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={editForm.canViewBookings}
        onChange={(e) =>
          updateEditField("canViewBookings", e.target.checked)
        }
      />
      <span>Ver agendamentos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={editForm.canConfirmBookings}
        onChange={(e) =>
          updateEditField("canConfirmBookings", e.target.checked)
        }
      />
      <span>Confirmar agendamentos</span>
    </label>

    <label className="staff-permission-item">
      <input
        type="checkbox"
        checked={editForm.canFinalizeBookings}
        onChange={(e) =>
          updateEditField("canFinalizeBookings", e.target.checked)
        }
      />
      <span>Finalizar agendamentos</span>
    </label>
  </div>
</div>
    </form>
  </div>
)}
    </div>
  );
}