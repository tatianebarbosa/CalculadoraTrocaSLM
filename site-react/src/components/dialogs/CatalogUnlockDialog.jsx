export default function CatalogUnlockDialog({ accessCode, onAccessCodeChange, onSubmit, onClose, errorMessage }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="catalog-unlock-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-unlock-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="catalog-unlock-dialog__eyebrow">Edição da base</span>
        <h3 id="catalog-unlock-title">Digite a senha</h3>
        <p className="catalog-unlock-dialog__intro">Use o mesmo código do login para liberar os ajustes.</p>

        <form className="catalog-unlock-dialog__form" onSubmit={onSubmit}>
          <input
            className="catalog-unlock-dialog__input"
            type="password"
            value={accessCode}
            onChange={(event) => onAccessCodeChange(event.target.value)}
            placeholder="Digite o código"
            autoComplete="current-password"
            autoFocus
          />

          {errorMessage ? <p className="catalog-unlock-dialog__error">{errorMessage}</p> : null}

          <div className="catalog-unlock-dialog__actions">
            <button className="catalog-editor__button" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="catalog-editor__button catalog-editor__button--primary" type="submit" disabled={!accessCode.trim()}>
              Liberar ajuste
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
