export default function ToggleGroup({ value, onChange, options, ariaLabel }) {
  return (
    <div className="toggle-group" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          className={value === option.value ? "is-active" : ""}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
