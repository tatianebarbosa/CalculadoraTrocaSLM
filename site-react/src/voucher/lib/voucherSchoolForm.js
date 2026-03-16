export const REQUEST_TYPE_OPTIONS = [
  { label: "Desconto", value: "Desconto" },
  { label: "Parcelamento", value: "Parcelamento" }
];

export const INITIAL_VOUCHER_REQUEST_FORM = {
  Escola: "",
  CNPJ: "",
  Ticket: "",
  NomeSolicitante: "",
  EmailRetorno: "",
  TipoSolicitacao: "Desconto",
  NomeAluno: "",
  Turma: "Year 3",
  TipoMatricula: "",
  Responsavel1LEX: "",
  CPFResponsavel1: "",
  Responsavel2LEX: "",
  CPFResponsavel2: "",
  Justificativa: "",
  Observacoes: "",
  PercentualDescontoSolicitado: "",
  QuantidadeParcelasSolicitadas: ""
};

function sanitizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeDigits(value, maxLength = Number.POSITIVE_INFINITY) {
  return sanitizeText(value).replace(/\D/g, "").slice(0, maxLength);
}

export function normalizeCnpj(value) {
  return normalizeDigits(value, 14);
}

export function normalizeCpf(value) {
  return normalizeDigits(value, 11);
}

export function formatCnpjInput(value) {
  const digits = normalizeCnpj(value);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 8),
    digits.slice(8, 12),
    digits.slice(12, 14)
  ].filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "";
  }

  if (digits.length <= 5) {
    return `${parts[0]}.${parts[1] || ""}`.replace(/\.$/, "");
  }

  if (digits.length <= 8) {
    return `${parts[0]}.${parts[1]}.${parts[2] || ""}`.replace(/\.$/, "");
  }

  if (digits.length <= 12) {
    return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3] || ""}`.replace(/\/$/, "");
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}/${parts[3]}-${parts[4]}`;
}

export function formatCpfInput(value) {
  const digits = normalizeCpf(value);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)].filter(Boolean);

  if (parts.length <= 1) {
    return parts[0] || "";
  }

  if (digits.length <= 6) {
    return `${parts[0]}.${parts[1] || ""}`.replace(/\.$/, "");
  }

  if (digits.length <= 9) {
    return `${parts[0]}.${parts[1]}.${parts[2] || ""}`.replace(/\.$/, "");
  }

  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
}

function parsePositiveNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parsePositiveInteger(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function validateVoucherRequestForm(form) {
  const nextErrors = {};

  if (!sanitizeText(form.Escola)) {
    nextErrors.Escola = "Informe a escola.";
  }

  if (normalizeCnpj(form.CNPJ).length !== 14) {
    nextErrors.CNPJ = "Informe um CNPJ valido com 14 digitos.";
  }

  if (!sanitizeText(form.NomeSolicitante)) {
    nextErrors.NomeSolicitante = "Informe o nome do solicitante.";
  }

  const email = sanitizeText(form.EmailRetorno).toLowerCase();
  if (!email || !email.includes("@")) {
    nextErrors.EmailRetorno = "Informe um email valido para retorno.";
  }

  if (!sanitizeText(form.TipoSolicitacao)) {
    nextErrors.TipoSolicitacao = "Selecione o tipo da solicitacao.";
  }

  if (!sanitizeText(form.NomeAluno)) {
    nextErrors.NomeAluno = "Informe o nome do aluno.";
  }

  if (!sanitizeText(form.Turma)) {
    nextErrors.Turma = "Selecione a turma.";
  }

  if (!sanitizeText(form.TipoMatricula)) {
    nextErrors.TipoMatricula = "Informe o tipo de matricula.";
  }

  if (!sanitizeText(form.Justificativa)) {
    nextErrors.Justificativa = "Descreva a justificativa.";
  }

  if (form.CPFResponsavel1 && normalizeCpf(form.CPFResponsavel1).length !== 11) {
    nextErrors.CPFResponsavel1 = "CPF invalido.";
  }

  if (form.CPFResponsavel2 && normalizeCpf(form.CPFResponsavel2).length !== 11) {
    nextErrors.CPFResponsavel2 = "CPF invalido.";
  }

  if (form.TipoSolicitacao === "Desconto") {
    const percentual = parsePositiveNumber(form.PercentualDescontoSolicitado);

    if (percentual === null || percentual > 100) {
      nextErrors.PercentualDescontoSolicitado = "Informe um percentual entre 0,01 e 100.";
    }
  }

  if (form.TipoSolicitacao === "Parcelamento") {
    const parcelas = parsePositiveInteger(form.QuantidadeParcelasSolicitadas);

    if (parcelas === null) {
      nextErrors.QuantidadeParcelasSolicitadas = "Informe a quantidade de parcelas.";
    }
  }

  return nextErrors;
}

export function buildVoucherRequestPayload(form) {
  const tipoSolicitacao = sanitizeText(form.TipoSolicitacao);

  return {
    Escola: sanitizeText(form.Escola),
    CNPJ: normalizeCnpj(form.CNPJ),
    Ticket: sanitizeText(form.Ticket),
    NomeSolicitante: sanitizeText(form.NomeSolicitante),
    EmailRetorno: sanitizeText(form.EmailRetorno).toLowerCase(),
    TipoSolicitacao: tipoSolicitacao,
    NomeAluno: sanitizeText(form.NomeAluno),
    Turma: sanitizeText(form.Turma),
    TipoMatricula: sanitizeText(form.TipoMatricula),
    Responsavel1LEX: sanitizeText(form.Responsavel1LEX),
    CPFResponsavel1: normalizeCpf(form.CPFResponsavel1),
    Responsavel2LEX: sanitizeText(form.Responsavel2LEX),
    CPFResponsavel2: normalizeCpf(form.CPFResponsavel2),
    Justificativa: sanitizeText(form.Justificativa),
    Observacoes: sanitizeText(form.Observacoes),
    PercentualDescontoSolicitado:
      tipoSolicitacao === "Desconto" ? parsePositiveNumber(form.PercentualDescontoSolicitado) : "",
    QuantidadeParcelasSolicitadas:
      tipoSolicitacao === "Parcelamento" ? parsePositiveInteger(form.QuantidadeParcelasSolicitadas) : ""
  };
}

export function buildPostSubmitFormState(form) {
  return {
    ...INITIAL_VOUCHER_REQUEST_FORM,
    Escola: sanitizeText(form.Escola),
    CNPJ: formatCnpjInput(form.CNPJ),
    NomeSolicitante: sanitizeText(form.NomeSolicitante),
    EmailRetorno: sanitizeText(form.EmailRetorno).toLowerCase(),
    TipoMatricula: sanitizeText(form.TipoMatricula)
  };
}
