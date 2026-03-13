export default function MessageCard({ title, body, buttonLabel, onCopy, copied }) {
  return (
    <section className="message-card">
      <div className="section-title">
        <div>
          <h3>{title}</h3>
        </div>
        <button
          className={copied ? "copy-button message-card__copy-button is-copied" : "copy-button message-card__copy-button"}
          type="button"
          onClick={onCopy}
        >
          {copied ? "Copiado" : buttonLabel}
        </button>
      </div>
      <p>{body}</p>
    </section>
  );
}
