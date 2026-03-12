import { formatMoney } from "../../lib/formatters";

export default function CatalogValueCell({ value, editable, onChange }) {
  if (!editable) {
    return formatMoney(value);
  }

  return (
    <input
      className="catalog-table__input"
      type="number"
      inputMode="decimal"
      min="0"
      step="0.01"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
