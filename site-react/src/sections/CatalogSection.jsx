import { EDITABLE_CATALOG_FIELDS } from "../config/appConfig";
import CatalogValueCell from "../components/catalog/CatalogValueCell";
import { getCatalogTotals } from "../lib/catalogApi";
import { formatMoney } from "../lib/formatters";

export default function CatalogSection({
  catalog,
  canEditCatalog,
  isCatalogUnlocked,
  isCatalogLoading,
  isCatalogSaving,
  catalogNotice,
  catalogNoticeType,
  shouldShowCatalogNotice,
  onUnlockOpen,
  onSave,
  onReset,
  onLock,
  onValueChange
}) {
  return (
    <section className="panel panel--base" id="base">
      <div className="section-title section-title--inline-action">
        <div>
          <p className="section-title__eyebrow">Base interna</p>
          <h3 className="section-title__subheading">Valores por turma</h3>
          <p className="section-title__summary">Referência de valores usada pela análise para cada composição de material.</p>
        </div>

        {canEditCatalog && !isCatalogUnlocked ? (
          <button
            className="catalog-editor__button catalog-editor__button--primary catalog-editor__button--compact"
            type="button"
            onClick={onUnlockOpen}
            disabled={isCatalogLoading}
          >
            Liberar edição
          </button>
        ) : null}

        {canEditCatalog && isCatalogUnlocked ? (
          <div className="catalog-editor__actions catalog-editor__actions--header">
            <button
              className="catalog-editor__button catalog-editor__button--primary"
              type="button"
              onClick={onSave}
              disabled={isCatalogSaving || isCatalogLoading}
            >
              {isCatalogSaving ? "Salvando alterações..." : "Salvar alterações"}
            </button>
            <button className="catalog-editor__button catalog-editor__button--danger" type="button" onClick={onReset}>
              Restaurar valores
            </button>
            <button className="catalog-editor__button" type="button" onClick={onLock} aria-label="Fechar edição sem salvar">
              Fechar
            </button>
          </div>
        ) : null}
      </div>

      {shouldShowCatalogNotice && catalogNotice ? (
        <div className="catalog-editor">
          <p
            className={
              catalogNoticeType === "error"
                ? "catalog-editor__feedback catalog-editor__feedback--error"
                : "catalog-editor__feedback catalog-editor__feedback--success"
            }
          >
            {catalogNotice}
          </p>
        </div>
      ) : null}

      <div className="catalog-table__wrap">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Turma</th>
              <th>SLM base</th>
              <th>Workbook</th>
              <th>Matemática Aplicada</th>
              <th>Pearson Math</th>
              <th>Pearson Science</th>
              <th>Total obrigatório</th>
              <th>Total com os Pearson</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((item) => {
              const { totalObrigatorio, totalComPearsons } = getCatalogTotals(item);

              return (
                <tr key={item.turma}>
                  <td data-label="Turma">{item.turma}</td>
                  {EDITABLE_CATALOG_FIELDS.map((field) => (
                    <td key={`${item.turma}-${field.key}`} data-label={field.label}>
                      <CatalogValueCell
                        value={item[field.key]}
                        editable={canEditCatalog && isCatalogUnlocked}
                        onChange={(rawValue) => onValueChange(item.turma, field.key, rawValue)}
                      />
                    </td>
                  ))}
                  <td data-label="Total obrigatório">{formatMoney(totalObrigatorio)}</td>
                  <td data-label="Total com os Pearson">{formatMoney(totalComPearsons)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
