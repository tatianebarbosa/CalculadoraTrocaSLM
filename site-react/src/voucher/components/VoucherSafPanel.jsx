import { useEffect, useState } from "react";
import { listSafVoucherRequests, updateSafVoucherRequest, VoucherPreviewApiError } from "../lib/voucherPreviewApi";
import { buildSafUpdatePayload, createSafReturnForm, SAF_FILTER_INITIAL_STATE } from "../lib/voucherSafPanel";
import VoucherSafDetailModal from "./VoucherSafDetailModal";
import VoucherSafRequestTable from "./VoucherSafRequestTable";

function buildApiHint(error) {
  if (!(error instanceof VoucherPreviewApiError)) {
    return null;
  }

  if (error.status === 404) {
    return "A API interna SAF do voucher-preview esta desabilitada neste ambiente.";
  }

  return null;
}

function createEmptySafData() {
  return {
    totalRecords: 0,
    filteredRecords: 0,
    summaryByStatus: {},
    summaryByTipo: {},
    filterOptions: {
      statuses: [],
      tipos: []
    },
    records: []
  };
}

export default function VoucherSafPanel() {
  const [filters, setFilters] = useState(SAF_FILTER_INITIAL_STATE);
  const [appliedFilters, setAppliedFilters] = useState(SAF_FILTER_INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [safData, setSafData] = useState(createEmptySafData());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [returnForm, setReturnForm] = useState(createSafReturnForm(null));

  async function loadRequests(nextFilters = appliedFilters, options = {}) {
    setIsLoading(true);
    setFeedback(null);

    try {
      const data = await listSafVoucherRequests(nextFilters);

      setSafData(data || createEmptySafData());
      setAppliedFilters(nextFilters);

      if (options.keepSelectedRowNumber) {
        const refreshedRecord = (data?.records || []).find((record) => record.rowNumber === options.keepSelectedRowNumber);
        if (refreshedRecord) {
          setSelectedRecord(refreshedRecord);
          setReturnForm(createSafReturnForm(refreshedRecord));
        }
      }
    } catch (error) {
      const apiHint = buildApiHint(error);

      setFeedback({
        type: "error",
        message: apiHint || (error instanceof Error ? error.message : "Falha ao carregar o painel SAF.")
      });
      setSafData(createEmptySafData());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(SAF_FILTER_INITIAL_STATE);
  }, []);

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    loadRequests(filters);
  }

  function handleClearFilters() {
    setFilters(SAF_FILTER_INITIAL_STATE);
    loadRequests(SAF_FILTER_INITIAL_STATE);
  }

  function handleSelectRecord(record) {
    setSelectedRecord(record);
    setReturnForm(createSafReturnForm(record));
    setSaveFeedback(null);
  }

  function handleCloseModal() {
    setSelectedRecord(null);
    setReturnForm(createSafReturnForm(null));
    setSaveFeedback(null);
  }

  function handleReturnFieldChange(key, value) {
    setReturnForm((current) => ({
      ...current,
      [key]: value
    }));
    setSaveFeedback(null);
  }

  async function handleSaveReturn() {
    if (!selectedRecord) {
      return;
    }

    setIsSaving(true);
    setSaveFeedback({
      type: "info",
      message: "Salvando retorno SAF na planilha..."
    });

    try {
      const payload = buildSafUpdatePayload(returnForm, selectedRecord);
      const response = await updateSafVoucherRequest(payload);
      const updatedRecord = response?.record;

      if (updatedRecord) {
        setSelectedRecord(updatedRecord);
        setReturnForm(createSafReturnForm(updatedRecord));
        setSafData((current) => ({
          ...current,
          records: current.records.map((record) => (record.rowNumber === updatedRecord.rowNumber ? updatedRecord : record))
        }));
      }

      setSaveFeedback({
        type: "success",
        message: "Retorno SAF salvo com sucesso."
      });
      await loadRequests(appliedFilters, {
        keepSelectedRowNumber: selectedRecord.rowNumber
      });
    } catch (error) {
      const apiHint = buildApiHint(error);

      setSaveFeedback({
        type: "error",
        message: apiHint || (error instanceof Error ? error.message : "Falha ao salvar o retorno SAF.")
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="voucher-preview__zone voucher-preview__zone--saf">
      <div className="section-title">
        <div>
          <p className="section-title__eyebrow">Painel SAF</p>
          <h3>Triagem, analise e retorno operacional</h3>
        </div>
      </div>

      <p className="voucher-school__section-copy">
        Area interna para o time SAF acompanhar a fila, analisar detalhes da solicitacao e devolver o retorno direto na
        planilha.
      </p>

      <form className="voucher-saf__filters" onSubmit={handleFilterSubmit}>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => handleFilterChange("search", event.target.value)}
          placeholder="Buscar por escola, CNPJ ou ticket"
        />
        <select value={filters.tipo} onChange={(event) => handleFilterChange("tipo", event.target.value)}>
          <option value="">Todos os tipos</option>
          {safData.filterOptions.tipos.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(event) => handleFilterChange("status", event.target.value)}>
          <option value="">Todas as situacoes</option>
          {safData.filterOptions.statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button className="voucher-school__primary-button" type="submit" disabled={isLoading}>
          {isLoading ? "Atualizando..." : "Aplicar filtros"}
        </button>
        <button className="voucher-school__secondary-button" type="button" onClick={handleClearFilters}>
          Limpar
        </button>
      </form>

      <VoucherSafRequestTable
        records={safData.records}
        summary={safData}
        isLoading={isLoading}
        feedback={feedback}
        onSelectRecord={handleSelectRecord}
      />

      {selectedRecord ? (
        <VoucherSafDetailModal
          record={selectedRecord}
          returnForm={returnForm}
          saveFeedback={saveFeedback}
          isSaving={isSaving}
          onClose={handleCloseModal}
          onReturnFieldChange={handleReturnFieldChange}
          onSave={handleSaveReturn}
        />
      ) : null}
    </section>
  );
}
