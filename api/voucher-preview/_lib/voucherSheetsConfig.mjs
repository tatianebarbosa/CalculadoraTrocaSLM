export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";

export const SOLICITACOES_VOUCHER_HEADERS = [
  "DataHora",
  "Escola",
  "CNPJ",
  "Ticket",
  "NomeSolicitante",
  "EmailRetorno",
  "TipoSolicitacao",
  "NomeAluno",
  "Turma",
  "TipoMatricula",
  "Responsavel1LEX",
  "CPFResponsavel1",
  "Responsavel2LEX",
  "CPFResponsavel2",
  "Justificativa",
  "Observacoes",
  "PercentualDescontoSolicitado",
  "QuantidadeParcelasSolicitadas",
  "DataValidadeSugerida",
  "SituacaoSolicitacao",
  "AprovadoPor",
  "DataAnalise",
  "PercentualDescontoAprovado",
  "QuantidadeParcelasAprovadas",
  "CodigoVoucher",
  "DataValidadeFinal",
  "ObservacaoInternaRetorno"
];

export const EDITABLE_SAF_RETURN_FIELDS = [
  "SituacaoSolicitacao",
  "AprovadoPor",
  "DataAnalise",
  "PercentualDescontoAprovado",
  "QuantidadeParcelasAprovadas",
  "CodigoVoucher",
  "DataValidadeFinal",
  "ObservacaoInternaRetorno"
];

export function getVoucherSheetsConfig() {
  const spreadsheetId = String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
  if (!spreadsheetId) {
    throw new Error("Variavel GOOGLE_SHEETS_SPREADSHEET_ID nao configurada.");
  }

  return {
    spreadsheetId,
    baseEscolasSheetName: String(process.env.GOOGLE_SHEETS_BASE_ESCOLAS_SHEET_NAME || "BaseEscolas").trim(),
    solicitacoesSheetName: String(
      process.env.GOOGLE_SHEETS_SOLICITACOES_SHEET_NAME || "SolicitacoesVoucher"
    ).trim()
  };
}
