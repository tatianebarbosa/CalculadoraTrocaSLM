# Voucher Preview | Google Sheets API

## Escopo desta etapa

- Integracao server-side isolada em `api/voucher-preview/*`.
- Nenhuma dependencia externa nova foi adicionada.
- Nada e ativado em producao: as rotas exigem `VOUCHER_PREVIEW_API_ENABLED=true` e continuam bloqueadas quando `VERCEL_ENV=production`.
- A tela `/voucher-preview/` agora concentra duas areas isoladas:
  - area da escola para nova solicitacao e consulta por CNPJ
  - painel interno SAF para triagem, analise e retorno

## Dependencias

- Obrigatorias para o projeto nesta etapa: nenhuma.
- As funcoes usam apenas recursos nativos do runtime Node do Vercel: `fetch`, `crypto`, `URL`, `URLSearchParams` e `Response`.
- Opcional para testes locais completos de funcoes: Vercel CLI (`vercel dev`), se voce quiser simular as rotas API localmente.
- Em `site-react`, o Vite dev/preview encaminha `/api/voucher-preview/*` para os mesmos handlers server-side da pasta `api/`.

## Variaveis de ambiente

### Obrigatorias

- `VOUCHER_PREVIEW_API_ENABLED`
  - Valor esperado em Preview/Development: `true`
  - Em Production: deixar ausente ou `false`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
  - Valor: `1GKhPwS8A37rzKJCwHYj6e-mU_0PyNcqeOARG2W-eKFo`

### Credenciais da Google Service Account

Escolha um dos formatos abaixo.

#### Opcao recomendada

- `GOOGLE_SERVICE_ACCOUNT_JSON`
  - Conteudo completo do JSON da Service Account em uma unica variavel

#### Opcao alternativa

- `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - Quando colar no Vercel, preserve a chave com quebras de linha ou use `\n`

### Opcionais

- `GOOGLE_SHEETS_BASE_ESCOLAS_SHEET_NAME`
  - Default: `BaseEscolas`
- `GOOGLE_SHEETS_SOLICITACOES_SHEET_NAME`
  - Default: `SolicitacoesVoucher`

## Rotas criadas

- `POST /api/voucher-preview/requests`
  - Registra nova solicitacao na aba `SolicitacoesVoucher`
  - Preenche automaticamente:
    - `DataHora`
    - `SituacaoSolicitacao = Recebido`
    - `DataValidadeSugerida`
  - Regras de validade:
    - `Desconto` = 15 dias corridos
    - `Parcelamento` = 10 dias corridos

- `GET /api/voucher-preview/requests/by-cnpj?cnpj=...`
  - Consulta inicial da escola por CNPJ
  - Retorna:
    - escola encontrada em `BaseEscolas`
    - historico de solicitacoes da escola em formato reduzido

- `GET /api/voucher-preview/saf/requests`
  - Leitura da fila interna do painel SAF
  - Filtros suportados:
    - `search` ou `q`
    - `cnpj`
    - `status`
    - `tipo`
    - `ticket`
    - `sort`
    - `limit`

- `PATCH /api/voucher-preview/saf/requests`
  - Atualiza o retorno interno da solicitacao na propria linha da planilha
  - Campos editaveis:
    - `SituacaoSolicitacao`
    - `AprovadoPor`
    - `DataAnalise`
    - `PercentualDescontoAprovado`
    - `QuantidadeParcelasAprovadas`
    - `CodigoVoucher`
    - `DataValidadeFinal`
    - `ObservacaoInternaRetorno`

## Teste local da interface

1. Defina no shell as variaveis:
   - `VOUCHER_PREVIEW_API_ENABLED=true`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - credencial Google (`GOOGLE_SERVICE_ACCOUNT_JSON` ou email/chave)
2. Rode `npm run dev` dentro de `site-react`.
3. Abra `http://localhost:5173/voucher-preview/`.
4. Entre com o codigo interno do preview.
5. Teste os dois blocos da pagina:
   - area da escola: criar solicitacao e consultar por CNPJ
   - painel SAF: listar, filtrar, abrir detalhe e salvar retorno

## Estrutura tecnica criada

- `api/voucher-preview/_lib/googleServiceAccountAuth.mjs`
  - Gera JWT assinado com RS256 e troca por access token OAuth 2.0
- `api/voucher-preview/_lib/googleSheetsClient.mjs`
  - Cliente minimo para `values.get`, `values.append` e `values.update`
- `api/voucher-preview/_lib/voucherRequestSchema.mjs`
  - Validacao, normalizacao e regras da solicitacao
- `api/voucher-preview/_lib/voucherSheetsRepository.mjs`
  - Leitura/escrita das abas `BaseEscolas` e `SolicitacoesVoucher`
- `site-react/src/voucher/components/VoucherSchoolWorkspace.jsx`
  - Workspace isolada com area da escola e painel SAF no mesmo preview
- `site-react/src/voucher/components/VoucherSafPanel.jsx`
  - Lista interna, filtros, detalhe e salvamento do retorno

## Payload base para criacao

```json
{
  "Escola": "Maple Bear Exemplo",
  "CNPJ": "12.345.678/0001-90",
  "Ticket": "TCK-12345",
  "NomeSolicitante": "Fulano de Tal",
  "EmailRetorno": "contato@escola.com",
  "TipoSolicitacao": "Desconto",
  "NomeAluno": "Aluno Exemplo",
  "Turma": "Year 3",
  "TipoMatricula": "Nova matricula",
  "Responsavel1LEX": "Responsavel Um",
  "CPFResponsavel1": "12345678901",
  "Responsavel2LEX": "",
  "CPFResponsavel2": "",
  "Justificativa": "Necessario ajuste comercial.",
  "Observacoes": "",
  "PercentualDescontoSolicitado": 10,
  "QuantidadeParcelasSolicitadas": ""
}
```

Para parcelamento, use `TipoSolicitacao = Parcelamento` e envie `QuantidadeParcelasSolicitadas`.
