export default function ToggleGroup({ value, onChange, options, ariaLabel, shouldHighlightOption }) {
  return (
    <div className="toggle-group" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const shouldHighlight = isSelected && (shouldHighlightOption ? shouldHighlightOption(option.value) : true);
        const className = isSelected ? (shouldHighlight ? "is-selected is-active" : "is-selected") : "";

        return (
        <button
          key={String(option.value)}
          className={className}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
        );
      })}
    </div>
  );
}
