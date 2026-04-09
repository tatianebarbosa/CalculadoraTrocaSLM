export default function InfoDot({ text, ariaLabel = "Ver informação" }) {
  return (
    <span className="info-dot">
      <button className="info-dot__trigger" type="button" aria-label={ariaLabel}>
        <svg className="info-dot__icon" viewBox="0 0 16 16" aria-hidden="true">
          <circle className="info-dot__outline" cx="8" cy="8" r="6.1" fill="none" />
          <path
            className="info-dot__glyph"
            d="M6.55 6.15a1.72 1.72 0 1 1 2.58 1.49c-.7.38-1.13.88-1.13 1.63"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle className="info-dot__dot" cx="8" cy="11.55" r="0.72" />
        </svg>
      </button>
      <span className="info-dot__tooltip" role="tooltip">
        {text}
      </span>
    </span>
  );
}
