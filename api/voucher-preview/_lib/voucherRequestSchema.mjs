function getFieldValue(source, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(source, alias)) {
      return source[alias];
    }
  }

  return "";
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function normalizeDigits(value) {
  return sanitizeText(value).replace(/\D/g, "");
}

function sanitizeEmail(value) {
  return sanitizeText(value).toLowerCase();
}

function sanitizeInteger(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function sanitizePercentage(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return null;
  }

  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function sanitizeOptionalPercentage(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = sanitizePercentage(value);

  return parsed === null ? null : parsed;
}

function sanitizeOptionalInteger(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = sanitizeInteger(value);

  return parsed === null ? null : parsed;
}

function getSaoPauloParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(date);

  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function formatDateForSheet(date) {
  const parts = getSaoPauloParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDateTimeForSheet(date) {
  const parts = getSaoPauloParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function addDays(date, daysToAdd) {
  return new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
}

function parseTipoSolicitacao(value) {
  const normalized = sanitizeText(value).toLowerCase();

  if (normalized.includes("desconto")) {
    return {
      key: "desconto",
      label: "Desconto",
      suggestedValidityDays: 15
    };
  }

  if (normalized.includes("parcel")) {
    return {
      key: "parcelamento",
      label: "Parcelamento",
      suggestedValidityDays: 10
    };
  }

  return null;
}

export function normalizeCnpj(value) {
  return normalizeDigits(value);
}

export function resolveSchoolDisplayName(record) {
  if (!record) {
    return "";
  }

  const candidateKeys = ["Escola", "NomeEscola", "RazaoSocial", "NomeFantasia", "School"];

  for (const key of candidateKeys) {
    const resolvedValue = sanitizeText(record[key]);

    if (resolvedValue) {
      return resolvedValue;
    }
  }

  return "";
}

export function buildNewVoucherRequestRecord(payload, options = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const currentDate = options.now instanceof Date ? options.now : new Date();
  const fallbackSchoolName = sanitizeText(options.fallbackSchoolName);
  const escola = sanitizeText(getFieldValue(source, ["Escola", "escola"])) || fallbackSchoolName;
  const cnpj = normalizeCnpj(getFieldValue(source, ["CNPJ", "cnpj"]));
  const ticket = sanitizeText(getFieldValue(source, ["Ticket", "ticket"]));
  const nomeSolicitante = sanitizeText(getFieldValue(source, ["NomeSolicitante", "nomeSolicitante"]));
  const emailRetorno = sanitizeEmail(getFieldValue(source, ["EmailRetorno", "emailRetorno"]));
  const tipoSolicitacao = parseTipoSolicitacao(getFieldValue(source, ["TipoSolicitacao", "tipoSolicitacao"]));
  const nomeAluno = sanitizeText(getFieldValue(source, ["NomeAluno", "nomeAluno"]));
  const turma = sanitizeText(getFieldValue(source, ["Turma", "turma"]));
  const tipoMatricula = sanitizeText(getFieldValue(source, ["TipoMatricula", "tipoMatricula"]));
  const responsavel1Lex = sanitizeText(getFieldValue(source, ["Responsavel1LEX", "responsavel1LEX"]));
  const cpfResponsavel1 = normalizeDigits(getFieldValue(source, ["CPFResponsavel1", "cpfResponsavel1"]));
  const responsavel2Lex = sanitizeText(getFieldValue(source, ["Responsavel2LEX", "responsavel2LEX"]));
  const cpfResponsavel2 = normalizeDigits(getFieldValue(source, ["CPFResponsavel2", "cpfResponsavel2"]));
  const justificativa = sanitizeText(getFieldValue(source, ["Justificativa", "justificativa"]));
  const observacoes = sanitizeText(getFieldValue(source, ["Observacoes", "observacoes"]));
  const percentualDescontoSolicitado = sanitizePercentage(
    getFieldValue(source, ["PercentualDescontoSolicitado", "percentualDescontoSolicitado"])
  );
  const quantidadeParcelasSolicitadas = sanitizeInteger(
    getFieldValue(source, ["QuantidadeParcelasSolicitadas", "quantidadeParcelasSolicitadas"])
  );
  const errors = [];

  if (!escola) {
    errors.push("Escola obrigatoria.");
  }

  if (cnpj.length !== 14) {
    errors.push("CNPJ obrigatorio com 14 digitos.");
  }

  if (!nomeSolicitante) {
    errors.push("NomeSolicitante obrigatorio.");
  }

  if (!emailRetorno || !emailRetorno.includes("@")) {
    errors.push("EmailRetorno obrigatorio e deve ser valido.");
  }

  if (!tipoSolicitacao) {
    errors.push("TipoSolicitacao deve ser Desconto ou Parcelamento.");
  }

  if (!nomeAluno) {
    errors.push("NomeAluno obrigatorio.");
  }

  if (!turma) {
    errors.push("Turma obrigatoria.");
  }

  if (!tipoMatricula) {
    errors.push("TipoMatricula obrigatoria.");
  }

  if (!justificativa) {
    errors.push("Justificativa obrigatoria.");
  }

  if (
    tipoSolicitacao?.key === "desconto" &&
    (percentualDescontoSolicitado === null || percentualDescontoSolicitado <= 0)
  ) {
    errors.push("PercentualDescontoSolicitado obrigatorio para solicitacao de desconto.");
  }

  if (
    tipoSolicitacao?.key === "parcelamento" &&
    (quantidadeParcelasSolicitadas === null || quantidadeParcelasSolicitadas < 1)
  ) {
    errors.push("QuantidadeParcelasSolicitadas obrigatoria para solicitacao de parcelamento.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    record: {
      DataHora: formatDateTimeForSheet(currentDate),
      Escola: escola,
      CNPJ: cnpj,
      Ticket: ticket,
      NomeSolicitante: nomeSolicitante,
      EmailRetorno: emailRetorno,
      TipoSolicitacao: tipoSolicitacao.label,
      NomeAluno: nomeAluno,
      Turma: turma,
      TipoMatricula: tipoMatricula,
      Responsavel1LEX: responsavel1Lex,
      CPFResponsavel1: cpfResponsavel1,
      Responsavel2LEX: responsavel2Lex,
      CPFResponsavel2: cpfResponsavel2,
      Justificativa: justificativa,
      Observacoes: observacoes,
      PercentualDescontoSolicitado: tipoSolicitacao.key === "desconto" ? percentualDescontoSolicitado : "",
      QuantidadeParcelasSolicitadas: tipoSolicitacao.key === "parcelamento" ? quantidadeParcelasSolicitadas : "",
      DataValidadeSugerida: formatDateForSheet(addDays(currentDate, tipoSolicitacao.suggestedValidityDays)),
      SituacaoSolicitacao: "Recebido",
      AprovadoPor: "",
      DataAnalise: "",
      PercentualDescontoAprovado: "",
      QuantidadeParcelasAprovadas: "",
      CodigoVoucher: "",
      DataValidadeFinal: "",
      ObservacaoInternaRetorno: ""
    }
  };
}

export function toSchoolRequestView(record) {
  return {
    DataHora: record.DataHora,
    Escola: record.Escola,
    CNPJ: record.CNPJ,
    Ticket: record.Ticket,
    TipoSolicitacao: record.TipoSolicitacao,
    NomeAluno: record.NomeAluno,
    Turma: record.Turma,
    TipoMatricula: record.TipoMatricula,
    SituacaoSolicitacao: record.SituacaoSolicitacao,
    DataValidadeSugerida: record.DataValidadeSugerida,
    PercentualDescontoSolicitado: record.PercentualDescontoSolicitado,
    QuantidadeParcelasSolicitadas: record.QuantidadeParcelasSolicitadas,
    PercentualDescontoAprovado: record.PercentualDescontoAprovado,
    QuantidadeParcelasAprovadas: record.QuantidadeParcelasAprovadas,
    CodigoVoucher: record.CodigoVoucher,
    DataValidadeFinal: record.DataValidadeFinal,
    ObservacaoInternaRetorno: record.ObservacaoInternaRetorno
  };
}

export function buildSafUpdatePayload(payload, currentRecord) {
  const source = payload && typeof payload === "object" ? payload : {};
  const rowNumber = Number(source.rowNumber);
  const rawUpdates = source.updates && typeof source.updates === "object" ? source.updates : {};
  const nextSituacao = sanitizeText(rawUpdates.SituacaoSolicitacao);
  const nextAprovadoPor = sanitizeText(rawUpdates.AprovadoPor);
  const nextDataAnalise = sanitizeText(rawUpdates.DataAnalise);
  const nextPercentualAprovado = sanitizeOptionalPercentage(rawUpdates.PercentualDescontoAprovado);
  const nextParcelasAprovadas = sanitizeOptionalInteger(rawUpdates.QuantidadeParcelasAprovadas);
  const nextCodigoVoucher = sanitizeText(rawUpdates.CodigoVoucher);
  const nextDataValidadeFinal = sanitizeText(rawUpdates.DataValidadeFinal);
  const nextObservacaoInterna = sanitizeText(rawUpdates.ObservacaoInternaRetorno);
  const tipoSolicitacao = sanitizeText(currentRecord?.TipoSolicitacao).toLowerCase();
  const isDiscount = tipoSolicitacao.includes("desconto");
  const isInstallments = tipoSolicitacao.includes("parcel");
  const errors = [];

  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    errors.push("rowNumber invalido para atualizacao.");
  }

  if (!nextSituacao) {
    errors.push("SituacaoSolicitacao obrigatoria.");
  }

  if (nextPercentualAprovado === null) {
    errors.push("PercentualDescontoAprovado deve estar entre 0 e 100.");
  }

  if (nextParcelasAprovadas === null) {
    errors.push("QuantidadeParcelasAprovadas deve ser um numero inteiro positivo.");
  }

  if (isDiscount && nextParcelasAprovadas !== "") {
    errors.push("QuantidadeParcelasAprovadas nao se aplica a solicitacoes de desconto.");
  }

  if (isInstallments && nextPercentualAprovado !== "") {
    errors.push("PercentualDescontoAprovado nao se aplica a solicitacoes de parcelamento.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    rowNumber,
    updates: {
      SituacaoSolicitacao: nextSituacao,
      AprovadoPor: nextAprovadoPor,
      DataAnalise: nextDataAnalise,
      PercentualDescontoAprovado: nextPercentualAprovado,
      QuantidadeParcelasAprovadas: nextParcelasAprovadas,
      CodigoVoucher: nextCodigoVoucher,
      DataValidadeFinal: nextDataValidadeFinal,
      ObservacaoInternaRetorno: nextObservacaoInterna
    }
  };
}
