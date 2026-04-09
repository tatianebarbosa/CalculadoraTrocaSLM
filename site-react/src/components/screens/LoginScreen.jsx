export default function LoginScreen({ logoUrl, accessCode, onAccessCodeChange, onSubmit, errorMessage }) {
  return (
    <div className="page-frame">
      <div className="top-strip" aria-hidden="true" />
      <div className="app-shell app-shell--login">
        <main className="login-layout">
          <section className="login-hero">
            <div className="login-hero__brand site-header__brand">
              <img className="site-header__logo" src={logoUrl} alt="" aria-hidden="true" />
              <span className="site-header__brand-name">Maple Bear</span>
            </div>
            <p className="page-intro__eyebrow">Assistente operacional</p>
            <h1>
              <span className="page-intro__title-lock">Assistente de</span>
              <span className="page-intro__title-lock">Troca de Material</span>
            </h1>
            <p className="page-intro__subtitle">
              Ferramenta interna para analisar a troca de material entre o pedido principal e a nova compra.
            </p>
          </section>

          <section className="login-card">
            <span className="login-card__eyebrow">Acesso interno</span>
            <h2>Entrar no assistente</h2>
            <p className="login-card__intro">
              Digite o código da equipe para acessar a calculadora.
            </p>

            <form className="login-form" name="maple-bear-login" autoComplete="on" onSubmit={onSubmit}>
              <label className="login-form__manager-anchor" htmlFor="login-username">
                Usuário
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  value="time.saf"
                  autoComplete="username"
                  readOnly
                  tabIndex={-1}
                />
              </label>

              <label className="field" htmlFor="access-code">
                <input
                  className="login-form__input"
                  id="access-code"
                  name="password"
                  type="password"
                  value={accessCode}
                  onChange={(event) => onAccessCodeChange(event.target.value)}
                  placeholder="Digite o código"
                  autoComplete="current-password"
                  autoFocus
                />
              </label>

              {errorMessage ? <p className="login-card__feedback is-error">{errorMessage}</p> : null}

              <button className="login-card__submit" type="submit" disabled={!accessCode.trim()}>
                Entrar
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
