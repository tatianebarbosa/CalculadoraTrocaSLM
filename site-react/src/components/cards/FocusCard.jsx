export default function FocusCard({ title, valueLabel, value, rows }) {
  return (
    <div className="focus-card">
      <span className="focus-card__title">{title}</span>
      <div className="focus-card__value">
        <span>{valueLabel}</span>
        <strong>{value}</strong>
      </div>
      <div className="focus-card__rows">
        {rows.map(([label, content]) => (
          <div className="focus-card__row" key={label}>
            <span>{label}</span>
            <strong>{content}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
