import { formatCnpjInput, formatCpfInput } from "./voucherSchoolForm";

export const SAF_STATUS_OPTIONS = [
  { label: "Recebido", value: "Recebido" },
  { label: "Em Analise", value: "Em Analise" },
  { label: "Aprovado", value: "Aprovado" },
  { label: "Aprovado Parcialmente", value: "Aprovado Parcialmente" },
  { label: "Reprovado", value: "Reprovado" },
  { label: "Voucher Gerado", value: "Voucher Gerado" },
  { label: "Concluido", value: "Concluido" }
];

export const SAF_FILTER_INITIAL_STATE = {
  search: "",
  tipo: "",
  status: "",
  sort: "desc",
  limit: 100
};

export const SAF_DETAIL_FIELD_GROUPS = [
  {
    title: "Dados da escola",
    fields: [
      ["DataHora", "DataHora"],
      ["Escola", "Escola"],
      ["CNPJ", "CNPJ"],
      ["Ticket", "Ticket"],
      ["NomeSolicitante", "NomeSolicitante"],
      ["EmailRetorno", "EmailRetorno"]
    ]
  },
  {
    title: "Dados do aluno",
    fields: [
      ["TipoSolicitacao", "TipoSolicitacao"],
      ["NomeAluno", "NomeAluno"],
      ["Turma", "Turma"],
      ["TipoMatricula", "TipoMatricula"],
      ["Responsavel1LEX", "Responsavel1LEX"],
      ["CPFResponsavel1", "CPFResponsavel1"],
      ["Responsavel2LEX", "Responsavel2LEX"],
      ["CPFResponsavel2", "CPFResponsavel2"]
    ]
  },
  {
    title: "Conteudo da solicitacao",
    fields: [
      ["Justificativa", "Justificativa"],
      ["Observacoes", "Observacoes"],
      ["PercentualDescontoSolicitado", "PercentualDescontoSolicitado"],
      ["QuantidadeParcelasSolicitadas", "QuantidadeParcelasSolicitadas"],
      ["DataValidadeSugerida", "DataValidadeSugerida"]
    ]
  },
  {
    title: "Retorno SAF",
    fields: [
      ["SituacaoSolicitacao", "SituacaoSolicitacao"],
      ["AprovadoPor", "AprovadoPor"],
      ["DataAnalise", "DataAnalise"],
      ["PercentualDescontoAprovado", "PercentualDescontoAprovado"],
      ["QuantidadeParcelasAprovadas", "QuantidadeParcelasAprovadas"],
      ["CodigoVoucher", "CodigoVoucher"],
      ["DataValidadeFinal", "DataValidadeFinal"],
      ["ObservacaoInternaRetorno", "ObservacaoInternaRetorno"]
    ]
  }
];

export function isDiscountRequest(record) {
  return String(record?.TipoSolicitacao || "").trim().toLowerCase().includes("desconto");
}

export function isInstallmentRequest(record) {
  return String(record?.TipoSolicitacao || "").trim().toLowerCase().includes("parcel");
}

export function createSafReturnForm(record) {
  return {
    rowNumber: record?.rowNumber || null,
    SituacaoSolicitacao: String(record?.SituacaoSolicitacao || "Recebido"),
    AprovadoPor: String(record?.AprovadoPor || ""),
    DataAnalise: String(record?.DataAnalise || ""),
    PercentualDescontoAprovado: String(record?.PercentualDescontoAprovado || ""),
    QuantidadeParcelasAprovadas: String(record?.QuantidadeParcelasAprovadas || ""),
    CodigoVoucher: String(record?.CodigoVoucher || ""),
    DataValidadeFinal: String(record?.DataValidadeFinal || ""),
    ObservacaoInternaRetorno: String(record?.ObservacaoInternaRetorno || "")
  };
}

export function buildSafUpdatePayload(form, record) {
  return {
    rowNumber: form.rowNumber || record?.rowNumber,
    updates: {
      SituacaoSolicitacao: String(form.SituacaoSolicitacao || "").trim(),
      AprovadoPor: String(form.AprovadoPor || "").trim(),
      DataAnalise: String(form.DataAnalise || "").trim(),
      PercentualDescontoAprovado: isDiscountRequest(record)
        ? String(form.PercentualDescontoAprovado || "").trim()
        : "",
      QuantidadeParcelasAprovadas: isInstallmentRequest(record)
        ? String(form.QuantidadeParcelasAprovadas || "").trim()
        : "",
      CodigoVoucher: isDiscountRequest(record) ? String(form.CodigoVoucher || "").trim() : "",
      DataValidadeFinal: String(form.DataValidadeFinal || "").trim(),
      ObservacaoInternaRetorno: String(form.ObservacaoInternaRetorno || "").trim()
    }
  };
}

export function formatSafDisplayValue(fieldKey, value) {
  if (!value) {
    return "-";
  }

  if (fieldKey === "CNPJ") {
    return formatCnpjInput(value);
  }

  if (fieldKey === "CPFResponsavel1" || fieldKey === "CPFResponsavel2") {
    return formatCpfInput(value);
  }

  return String(value);
}

export function getPrimaryCpf(record) {
  return String(record?.CPFResponsavel1 || record?.CPFResponsavel2 || "");
}
