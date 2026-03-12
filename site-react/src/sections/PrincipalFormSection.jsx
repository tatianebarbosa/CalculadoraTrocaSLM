import { BOOLEAN_OPTIONS, PEARSON_HINT_TEXT, VOUCHER_MODE_OPTIONS } from "../config/appConfig";
import Field from "../components/common/Field";
import DropdownSelect from "../components/common/DropdownSelect";
import ToggleGroup from "../components/common/ToggleGroup";
import FocusCard from "../components/cards/FocusCard";
import { formatMoney } from "../lib/formatters";

export default function PrincipalFormSection({
  form,
  turmaOptions,
  principalFocusRows,
  calc,
  updateForm,
  handleNumberChange,
  handleNumberFocus
}) {
  return (
    <section className="panel panel--form panel--principal" id="pedido">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Pedido principal</p>
          <h3>Entrada do pedido principal</h3>
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

        <Field label="Pearson Math">
          <ToggleGroup
            ariaLabel="Pearson Math do pedido principal"
            value={form.principalPearsonMath}
            onChange={(value) => updateForm("principalPearsonMath", value)}
            options={BOOLEAN_OPTIONS}
          />
        </Field>

        <Field label="Pearson Science">
          <ToggleGroup
            ariaLabel="Pearson Science do pedido principal"
            value={form.principalPearsonScience}
            onChange={(value) => updateForm("principalPearsonScience", value)}
            options={BOOLEAN_OPTIONS}
          />
        </Field>

        <p className="field-note field-note--full">{PEARSON_HINT_TEXT}</p>

        <Field className="field--full" label="Voucher no SLM">
          <div className="compound-field">
            <ToggleGroup
              ariaLabel="Modo do voucher principal"
              value={form.principalVoucherMode}
              onChange={(value) => updateForm("principalVoucherMode", value)}
              options={VOUCHER_MODE_OPTIONS}
            />
            <input
              type="number"
              min="0"
              max={form.principalVoucherMode === "percent" ? "100" : undefined}
              step="1"
              value={form.principalVoucherValue}
              onFocus={handleNumberFocus}
              onChange={(event) => handleNumberChange("principalVoucherValue", event.target.value)}
            />
          </div>
        </Field>

        <Field className="field--full" label="Valor dos juros">
          <input
            type="number"
            min="0"
            step="1"
            value={form.jurosValor}
            onFocus={handleNumberFocus}
            onChange={(event) => handleNumberChange("jurosValor", event.target.value)}
          />
        </Field>
      </div>

      <FocusCard
        title="Resumo do pedido principal"
        valueLabel="Valor considerado"
        value={formatMoney(calc.principal.paidMaterials)}
        rows={principalFocusRows}
      />
    </section>
  );
}
