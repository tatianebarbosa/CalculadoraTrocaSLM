import Field from "../../components/common/Field";
import DropdownSelect from "../../components/common/DropdownSelect";
import ToggleGroup from "../../components/common/ToggleGroup";
import { REQUEST_TYPE_OPTIONS } from "../lib/voucherSchoolForm";

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="voucher-school__field-error">{message}</span>;
}

function SectionBlock({ eyebrow, title, description, children }) {
  return (
    <article className="voucher-school__form-block">
      <header className="voucher-school__form-block-header">
        <div>
          <span className="voucher-school__form-block-eyebrow">{eyebrow}</span>
          <h4>{title}</h4>
        </div>
        <p>{description}</p>
      </header>
      {children}
    </article>
  );
}

function HighlightCard({ label, value, detail }) {
  return (
    <article className="voucher-school__highlight-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function VoucherRequestFormSection({
  form,
  errors,
  turmaOptions,
  isSubmitting,
  isCnpjLocked,
  identifiedCnpj,
  onFieldChange,
  onSubmit,
  onLookupSchool,
  isSchoolLookupLoading,
  schoolLookupFeedback,
  submitFeedback
}) {
  const requestTypeDetail =
    form.TipoSolicitacao === "Parcelamento"
      ? "Informe a quantidade de parcelas que a escola deseja submeter para analise."
      : "Informe o percentual de desconto desejado para seguir na analise do time SAF.";

  return (
    <section className="voucher-school__surface voucher-school__surface--form">
      <header className="voucher-school__panel-header voucher-school__panel-header--split">
        <div className="voucher-school__panel-copy-block">
          <p className="voucher-school__panel-eyebrow">Nova solicitacao</p>
          <h3>Envie seu pedido com um preenchimento mais claro e acolhedor</h3>
          <p className="voucher-school__panel-copy">
            Organizamos a solicitacao em blocos simples para que a escola envie o contexto completo sem lidar com uma
            tela pesada ou com cara de sistema interno.
          </p>
        </div>

        <div className="voucher-school__panel-aside">
          <span className="voucher-school__panel-badge">Fluxo dedicado</span>
          <strong>{form.TipoSolicitacao || "Desconto"}</strong>
          <p>O envio segue para a fila isolada do voucher-preview e o retorno continua centralizado pelo mesmo fluxo.</p>
        </div>
      </header>

      {submitFeedback ? (
        <div className={`voucher-school__feedback is-${submitFeedback.type}`.trim()}>{submitFeedback.message}</div>
      ) : null}

      <div className="voucher-school__highlight-grid">
        <HighlightCard
          label="Escola"
          value={form.Escola || "Nome da escola"}
          detail={
            isCnpjLocked
              ? "Os dados principais ja entram vinculados ao CNPJ identificado no acesso."
              : "Se o CNPJ estiver na base, a escola pode ser preenchida automaticamente."
          }
        />
        <HighlightCard label="Tipo de pedido" value={form.TipoSolicitacao || "Desconto"} detail={requestTypeDetail} />
        <HighlightCard
          label="Retorno"
          value={form.EmailRetorno || "Seu e-mail de acompanhamento"}
          detail="Utilize um e-mail valido para receber o retorno do atendimento com mais agilidade."
        />
      </div>

      <form className="voucher-school__form voucher-school__form--stacked" onSubmit={onSubmit}>
        <SectionBlock
          eyebrow="Etapa 1"
          title="Dados da escola"
          description="Confirme as informacoes principais da unidade e de quem esta abrindo a solicitacao."
        >
          <div className="form-grid voucher-school__form-grid voucher-school__form-grid--airy">
            <Field className="field--full" label="Nome da escola">
              <>
                <input
                  className="voucher-school__input"
                  type="text"
                  value={form.Escola}
                  onChange={(event) => onFieldChange("Escola", event.target.value)}
                  placeholder="Nome da escola"
                />
                <FieldError message={errors.Escola} />
              </>
            </Field>

            <Field
              className="field--full"
              label={isCnpjLocked ? "CNPJ vinculado ao acesso" : "CNPJ da escola"}
              hint={
                isCnpjLocked
                  ? "Este CNPJ foi recebido automaticamente na identificacao da escola."
                  : "Se desejar, use a base para localizar automaticamente o nome da escola."
              }
            >
              <>
                <div className="voucher-school__field-action">
                  <input
                    className="voucher-school__input"
                    type="text"
                    inputMode="numeric"
                    value={isCnpjLocked ? identifiedCnpj : form.CNPJ}
                    onChange={(event) => onFieldChange("CNPJ", event.target.value)}
                    placeholder="00.000.000/0000-00"
                    readOnly={isCnpjLocked}
                  />
                  {!isCnpjLocked ? (
                    <button
                      className="voucher-school__secondary-button"
                      type="button"
                      onClick={onLookupSchool}
                      disabled={isSchoolLookupLoading}
                    >
                      {isSchoolLookupLoading ? "Buscando..." : "Preencher escola"}
                    </button>
                  ) : null}
                </div>
                <FieldError message={errors.CNPJ} />
              </>
            </Field>

            {schoolLookupFeedback ? (
              <div className={`voucher-school__feedback is-${schoolLookupFeedback.type} field--full`.trim()}>
                {schoolLookupFeedback.message}
              </div>
            ) : null}

            <Field label="Numero do ticket">
              <input
                className="voucher-school__input"
                type="text"
                value={form.Ticket}
                onChange={(event) => onFieldChange("Ticket", event.target.value)}
                placeholder="Opcional"
              />
            </Field>

            <Field label="Seu nome">
              <>
                <input
                  className="voucher-school__input"
                  type="text"
                  value={form.NomeSolicitante}
                  onChange={(event) => onFieldChange("NomeSolicitante", event.target.value)}
                  placeholder="Responsavel pela solicitacao"
                />
                <FieldError message={errors.NomeSolicitante} />
              </>
            </Field>

            <Field className="field--full" label="E-mail para retorno">
              <>
                <input
                  className="voucher-school__input"
                  type="email"
                  value={form.EmailRetorno}
                  onChange={(event) => onFieldChange("EmailRetorno", event.target.value)}
                  placeholder="email@escola.com"
                />
                <FieldError message={errors.EmailRetorno} />
              </>
            </Field>
          </div>
        </SectionBlock>

        <SectionBlock
          eyebrow="Etapa 2"
          title="Dados do aluno"
          description="Esses dados ajudam o time SAF a contextualizar a solicitacao rapidamente."
        >
          <div className="form-grid voucher-school__form-grid voucher-school__form-grid--airy">
            <Field label="Nome do aluno">
              <>
                <input
                  className="voucher-school__input"
                  type="text"
                  value={form.NomeAluno}
                  onChange={(event) => onFieldChange("NomeAluno", event.target.value)}
                  placeholder="Aluno"
                />
                <FieldError message={errors.NomeAluno} />
              </>
            </Field>

            <Field label="Turma">
              <>
                <DropdownSelect
                  value={form.Turma}
                  onChange={(selectedValue) => onFieldChange("Turma", selectedValue)}
                  options={turmaOptions}
                  ariaLabel="Turma da solicitacao"
                />
                <FieldError message={errors.Turma} />
              </>
            </Field>

            <Field className="field--full" label="Tipo de matricula">
              <>
                <input
                  className="voucher-school__input"
                  type="text"
                  value={form.TipoMatricula}
                  onChange={(event) => onFieldChange("TipoMatricula", event.target.value)}
                  placeholder="Ex.: Nova matricula"
                />
                <FieldError message={errors.TipoMatricula} />
              </>
            </Field>
          </div>
        </SectionBlock>

        <SectionBlock
          eyebrow="Etapa 3"
          title="Responsaveis"
          description="Preencha os responsaveis apenas com os dados necessarios para apoiar a analise."
        >
          <div className="form-grid voucher-school__form-grid voucher-school__form-grid--airy">
            <Field label="Responsavel principal">
              <input
                className="voucher-school__input"
                type="text"
                value={form.Responsavel1LEX}
                onChange={(event) => onFieldChange("Responsavel1LEX", event.target.value)}
                placeholder="Opcional"
              />
            </Field>

            <Field label="CPF do responsavel principal">
              <>
                <input
                  className="voucher-school__input"
                  type="text"
                  inputMode="numeric"
                  value={form.CPFResponsavel1}
                  onChange={(event) => onFieldChange("CPFResponsavel1", event.target.value)}
                  placeholder="000.000.000-00"
                />
                <FieldError message={errors.CPFResponsavel1} />
              </>
            </Field>

            <Field label="Responsavel complementar">
              <input
                className="voucher-school__input"
                type="text"
                value={form.Responsavel2LEX}
                onChange={(event) => onFieldChange("Responsavel2LEX", event.target.value)}
                placeholder="Opcional"
              />
            </Field>

            <Field label="CPF do responsavel complementar">
              <>
                <input
                  className="voucher-school__input"
                  type="text"
                  inputMode="numeric"
                  value={form.CPFResponsavel2}
                  onChange={(event) => onFieldChange("CPFResponsavel2", event.target.value)}
                  placeholder="000.000.000-00"
                />
                <FieldError message={errors.CPFResponsavel2} />
              </>
            </Field>
          </div>
        </SectionBlock>

        <SectionBlock
          eyebrow="Etapa 4"
          title="Tipo da solicitacao"
          description="Selecione o apoio desejado e informe apenas os dados que fazem sentido para esse tipo de pedido."
        >
          <div className="voucher-school__request-type-layout">
            <Field className="field--full" label="Como voce deseja seguir com esta solicitacao?">
              <>
                <ToggleGroup
                  ariaLabel="Tipo da solicitacao de voucher"
                  value={form.TipoSolicitacao}
                  onChange={(value) => onFieldChange("TipoSolicitacao", value)}
                  options={REQUEST_TYPE_OPTIONS}
                  shouldHighlightOption={() => true}
                />
                <FieldError message={errors.TipoSolicitacao} />
              </>
            </Field>

            <div className="voucher-school__request-type-panel">
              <span>{form.TipoSolicitacao === "Parcelamento" ? "Parcelamento" : "Desconto"}</span>
              <strong>
                {form.TipoSolicitacao === "Parcelamento"
                  ? "Informe a quantidade de parcelas desejada."
                  : "Informe o percentual que deve seguir para analise."}
              </strong>
              <p>{requestTypeDetail}</p>
            </div>

            {form.TipoSolicitacao === "Desconto" ? (
              <Field label="Percentual solicitado (%)">
                <>
                  <input
                    className="voucher-school__input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.PercentualDescontoSolicitado}
                    onChange={(event) => onFieldChange("PercentualDescontoSolicitado", event.target.value)}
                    placeholder="Ex.: 10"
                  />
                  <FieldError message={errors.PercentualDescontoSolicitado} />
                </>
              </Field>
            ) : null}

            {form.TipoSolicitacao === "Parcelamento" ? (
              <Field label="Quantidade de parcelas desejada">
                <>
                  <input
                    className="voucher-school__input"
                    type="number"
                    min="1"
                    step="1"
                    value={form.QuantidadeParcelasSolicitadas}
                    onChange={(event) => onFieldChange("QuantidadeParcelasSolicitadas", event.target.value)}
                    placeholder="Ex.: 4"
                  />
                  <FieldError message={errors.QuantidadeParcelasSolicitadas} />
                </>
              </Field>
            ) : null}
          </div>
        </SectionBlock>

        <SectionBlock
          eyebrow="Etapa 5"
          title="Justificativa"
          description="Explique o contexto da escola para que a analise aconteca com mais rapidez e clareza."
        >
          <div className="form-grid voucher-school__form-grid voucher-school__form-grid--airy">
            <Field className="field--full" label="Conte o motivo principal da solicitacao">
              <>
                <textarea
                  className="voucher-school__textarea"
                  rows="5"
                  value={form.Justificativa}
                  onChange={(event) => onFieldChange("Justificativa", event.target.value)}
                  placeholder="Descreva o contexto da solicitacao."
                />
                <FieldError message={errors.Justificativa} />
              </>
            </Field>

            <Field className="field--full" label="Observacoes complementares">
              <textarea
                className="voucher-school__textarea"
                rows="4"
                value={form.Observacoes}
                onChange={(event) => onFieldChange("Observacoes", event.target.value)}
                placeholder="Use este campo para detalhes adicionais, se necessario."
              />
            </Field>
          </div>
        </SectionBlock>

        <div className="voucher-school__form-footer">
          <p>
            Revise as informacoes principais antes do envio. Assim que o pedido entrar na fila, ele podera ser
            acompanhado pela area de consulta do mesmo modulo.
          </p>
          <button className="voucher-school__primary-button voucher-school__primary-button--large" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando solicitacao..." : "Enviar solicitacao"}
          </button>
        </div>
      </form>
    </section>
  );
}
