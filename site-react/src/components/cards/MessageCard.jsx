export default function MessageCard({ title, body, buttonLabel, onCopy, copied }) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

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

      <div className="message-card__body">
        {blocks.map((block, blockIndex) => {
          const lines = block
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const isList = lines.length > 0 && lines.every((line) => line.startsWith("- "));

          if (isList) {
            return (
              <ul key={`${title}-list-${blockIndex}`} className="message-card__list">
                {lines.map((line, lineIndex) => (
                  <li key={`${title}-item-${blockIndex}-${lineIndex}`}>{line.replace(/^-+\s*/, "")}</li>
                ))}
              </ul>
            );
          }

          return (
            <p key={`${title}-paragraph-${blockIndex}`} className="message-card__paragraph">
              {block}
            </p>
          );
        })}
      </div>
    </section>
  );
}
