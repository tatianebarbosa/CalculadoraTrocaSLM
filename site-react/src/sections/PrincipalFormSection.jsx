import { useEffect, useState } from "react";
import { BOOLEAN_OPTIONS, PEARSON_HINT_TEXT } from "../config/appConfig";
import Field from "../components/common/Field";
import InfoDot from "../components/common/InfoDot";
import DropdownSelect from "../components/common/DropdownSelect";
import ToggleGroup from "../components/common/ToggleGroup";
import FocusCard from "../components/cards/FocusCard";
import { formatMoney } from "../lib/formatters";

const paidAmountFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatPaidAmountInput(value) {
  return Number(value) > 0 ? paidAmountFormatter.format(Number(value)) : "";
}

function buildPearsonLabel(title, amount, ariaLabel) {
  return (
    <>
      <span className="field-label-inline">
        <span>{title}</span>
        {amount > 0 ? <span className="field-label-inline__meta">({formatMoney(amount)})</span> : null}
      </span>
      <InfoDot text={PEARSON_HINT_TEXT} ariaLabel={ariaLabel} />
    </>
  );
}

export default function PrincipalFormSection({
  form,
  turmaOptions,
  principalPearsonAvailability,
  principalPearsonValues,
  principalFocusRows,
  calc,
  updateForm,
  handleNumberChange,
  handleNumberFocus
}) {
  const [paidAmountInput, setPaidAmountInput] = useState(() => formatPaidAmountInput(form.principalPaidAmount));
  const [isPaidAmountFocused, setIsPaidAmountFocused] = useState(false);

  useEffect(() => {
    if (!isPaidAmountFocused) {
      setPaidAmountInput(formatPaidAmountInput(form.principalPaidAmount));
    }
  }, [form.principalPaidAmount, isPaidAmountFocused]);

  function handlePaidAmountFocus(event) {
    setIsPaidAmountFocused(true);
    handleNumberFocus(event);
  }

  function handlePaidAmountBlur() {
    setIsPaidAmountFocused(false);
    setPaidAmountInput(formatPaidAmountInput(form.principalPaidAmount));
  }

  function handlePaidAmountChange(event) {
    const nextValue = event.target.value;
    setPaidAmountInput(nextValue);
    handleNumberChange("principalPaidAmount", nextValue);
  }

  const pearsonMathLabel = buildPearsonLabel(
    "Pearson Math",
    principalPearsonValues.math,
    "Ver regra de desconto do Pearson para Pearson Math"
  );

  const pearsonScienceLabel = buildPearsonLabel(
    "Pearson Science",
    principalPearsonValues.science,
    "Ver regra de desconto do Pearson para Pearson Science"
  );

  return (
    <section className="panel panel--form panel--principal" id="pedido">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Pedido principal</p>
          <h3>Dados do pedido principal</h3>
          <p className="section-title__summary">Defina a base financeira do pedido original para calcular o crédito disponível.</p>
        </div>
      </div>

      <div className="form-grid">
        <Field className="field--full" label="Turma">
          <DropdownSelect
            value={form.principalTurma}
            onChange={(selectedValue) => updateForm("principalTurma", selectedValue)}
            options={turmaOptions}
            ariaLabel="Turma do pedido principal"
          />
        </Field>

        <Field label={pearsonMathLabel}>
          <ToggleGroup
            ariaLabel="Pearson Math do pedido principal"
            value={form.principalPearsonMath}
            onChange={(value) => updateForm("principalPearsonMath", value)}
            options={BOOLEAN_OPTIONS}
            shouldHighlightOption={(optionValue) => optionValue === true}
            isOptionDisabled={(optionValue) => optionValue === true && !principalPearsonAvailability.math}
          />
        </Field>

        <Field label={pearsonScienceLabel}>
          <ToggleGroup
            ariaLabel="Pearson Science do pedido principal"
            value={form.principalPearsonScience}
            onChange={(value) => updateForm("principalPearsonScience", value)}
            options={BOOLEAN_OPTIONS}
            shouldHighlightOption={(optionValue) => optionValue === true}
            isOptionDisabled={(optionValue) => optionValue === true && !principalPearsonAvailability.science}
          />
        </Field>

        <Field
          className="field--full"
          label="Valor efetivamente pago"
          hint="Preencha este campo com o valor efetivamente pago quando o pedido tiver sido realizado com voucher."
        >
          <input
            type="text"
            inputMode="decimal"
            placeholder="Ex.: 3.562,35"
            value={paidAmountInput}
            onFocus={handlePaidAmountFocus}
            onBlur={handlePaidAmountBlur}
            onChange={handlePaidAmountChange}
          />
        </Field>

        <Field className="field--full" label="Pedido com juros?">
          <ToggleGroup
            ariaLabel="Pedido principal com juros"
            value={form.principalHasJuros}
            onChange={(value) => updateForm("principalHasJuros", value)}
            options={BOOLEAN_OPTIONS}
            shouldHighlightOption={(optionValue) => optionValue === true}
          />
        </Field>
      </div>

      <FocusCard
        title="Resumo do pedido principal"
        valueLabel="Crédito considerado"
        value={formatMoney(calc.principalCredit)}
        rows={principalFocusRows}
      />
    </section>
  );
}
