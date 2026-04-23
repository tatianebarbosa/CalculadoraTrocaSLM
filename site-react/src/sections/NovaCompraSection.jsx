import { BOOLEAN_OPTIONS, PEARSON_HINT_TEXT, VOUCHER_MODE_OPTIONS } from "../config/appConfig";
import Field from "../components/common/Field";
import InfoDot from "../components/common/InfoDot";
import DropdownSelect from "../components/common/DropdownSelect";
import ToggleGroup from "../components/common/ToggleGroup";
import FocusCard from "../components/cards/FocusCard";
import { formatMoney } from "../lib/formatters";

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

export default function NovaCompraSection({
  form,
  turmaOptions,
  novaPearsonAvailability,
  novaPearsonValues,
  novaFocusRows,
  calc,
  updateForm,
  handleNumberChange,
  handleNumberFocus
}) {
  const pearsonMathLabel = buildPearsonLabel(
    "Pearson Math",
    novaPearsonValues.math,
    "Ver regra de desconto do Pearson para Pearson Math"
  );

  const pearsonScienceLabel = buildPearsonLabel(
    "Pearson Science",
    novaPearsonValues.science,
    "Ver regra de desconto do Pearson para Pearson Science"
  );

  return (
    <section className="panel panel--form panel--nova" id="nova">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Nova compra</p>
          <h3>Dados da nova compra</h3>
        </div>
      </div>

      <div className="form-grid">
        <Field className="field--full" label="Turma">
          <DropdownSelect
            value={form.novaTurma}
            onChange={(selectedValue) => updateForm("novaTurma", selectedValue)}
            options={turmaOptions}
            ariaLabel="Turma da nova compra"
          />
        </Field>

        <Field className="field--full field--toggle-compact" label={pearsonMathLabel}>
          <ToggleGroup
            ariaLabel="Pearson Math da nova compra"
            value={form.novaPearsonMath}
            onChange={(value) => updateForm("novaPearsonMath", value)}
            options={BOOLEAN_OPTIONS}
            shouldHighlightOption={(optionValue) => optionValue === true}
            isOptionDisabled={(optionValue) => optionValue === true && !novaPearsonAvailability.math}
          />
        </Field>

        <Field className="field--full field--toggle-compact" label={pearsonScienceLabel}>
          <ToggleGroup
            ariaLabel="Pearson Science da nova compra"
            value={form.novaPearsonScience}
            onChange={(value) => updateForm("novaPearsonScience", value)}
            options={BOOLEAN_OPTIONS}
            shouldHighlightOption={(optionValue) => optionValue === true}
            isOptionDisabled={(optionValue) => optionValue === true && !novaPearsonAvailability.science}
          />
        </Field>

        <Field className="field--full" label="Voucher no SLM">
          <div className="compound-field">
            <ToggleGroup
              ariaLabel="Modo do voucher da nova compra"
              value={form.novaVoucherMode}
              onChange={(value) => updateForm("novaVoucherMode", value)}
              options={VOUCHER_MODE_OPTIONS}
              shouldHighlightOption={() => Number(form.novaVoucherValue) > 0}
            />
            <input
              type="number"
              min="0"
              max={form.novaVoucherMode === "percent" ? "100" : undefined}
              step="1"
              value={form.novaVoucherValue}
              onFocus={handleNumberFocus}
              onChange={(event) => handleNumberChange("novaVoucherValue", event.target.value)}
            />
          </div>
        </Field>
      </div>

      <FocusCard
        title="Resumo da nova compra"
        valueLabel="Valor considerado"
        value={formatMoney(calc.nova.paidMaterials)}
        rows={novaFocusRows}
      />
    </section>
  );
}
