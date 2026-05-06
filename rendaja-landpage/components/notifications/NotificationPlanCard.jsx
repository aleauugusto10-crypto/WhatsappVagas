export default function NotificationPlanCard({
  plan,
  onSelect,
}) {
  return (
    <article
      className={`notificationPlanCard ${
        plan.highlight ? "highlight" : ""
      }`}
    >
      {plan.highlight && (
        <div className="notificationPlanBadge">
          MAIS ESCOLHIDO
        </div>
      )}

      <h2>{plan.name}</h2>

      <strong>
        R$ {Number(plan.price).toFixed(2).replace(".", ",")}
      </strong>

      <p>{plan.description}</p>

      <ul>
        {Array.isArray(plan.features) &&
          plan.features.map((feature) => (
            <li key={feature}>
              ✅ {feature}
            </li>
          ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(plan)}
      >
        Contratar plano
      </button>
    </article>
  );
}