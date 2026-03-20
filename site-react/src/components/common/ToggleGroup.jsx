export default function ToggleGroup({
  value,
  onChange,
  options,
  ariaLabel,
  shouldHighlightOption,
  isOptionDisabled
}) {
  return (
    <div className="toggle-group" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const isDisabled = isOptionDisabled ? isOptionDisabled(option.value) : false;
        const shouldHighlight = isSelected && (shouldHighlightOption ? shouldHighlightOption(option.value) : true);
        const className = [
          isSelected ? (shouldHighlight ? "is-selected is-active" : "is-selected") : "",
          isDisabled ? "is-disabled" : ""
        ]
          .filter(Boolean)
          .join(" ");

        return (
        <button
          key={String(option.value)}
          className={className}
          type="button"
          disabled={isDisabled}
          aria-pressed={isSelected}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
        );
      })}
    </div>
  );
}
