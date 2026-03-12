# Publicacao do site

## Diretriz de acesso

- Publicar apenas em ambiente interno ou restrito.
- Tratar o login atual apenas como controle visual de uso interno.
- Nao apresentar esse codigo como camada de seguranca do site.

## Como a base funciona

- Em desenvolvimento local, a calculadora pode ler e gravar a base via `/api/base-catalog`, usando o Excel `base_powerbi_troca_slm.xlsx`.
- Na versao publicada, o site passa a ler `public/catalog.json`, que e gerado a partir do Excel no comando de build.
- A versao publicada fica em modo somente leitura. Para mudar os valores, atualize a base localmente e publique de novo.
- Se o ambiente de build nao conseguir acessar Python ou o Excel, o processo reaproveita o `public/catalog.json` ja salvo no projeto.

## Passo a passo

1. Confirme se o arquivo `../base_powerbi_troca_slm.xlsx` esta atualizado.
2. Rode `npm install` dentro de `site-react`.
3. Rode `npm run build`.
4. Publique o conteudo da pasta `dist` na hospedagem escolhida.

Para SharePoint, siga o fluxo detalhado em `SHAREPOINT.md`.

## Comandos uteis

- `npm run refresh:catalog`: recria `public/catalog.json` sem gerar a pasta `dist`.
- `npm run build`: atualiza `catalog.json` e gera a versao pronta para publicar.
- `npm run preview`: abre localmente a build final.

## Variaveis opcionais

- `VITE_SITE_BASE_PATH`: use quando o site for publicado em uma subpasta.
- `VITE_CATALOG_SOURCE=api`: forca leitura por API.
- `VITE_CATALOG_API_URL`: aponta para uma API externa de catalogo.
- `VITE_ENABLE_CATALOG_WRITE=true`: libera tentativa de gravacao por API em producao.

## Observacao importante

O codigo de acesso atual fica no frontend. Neste projeto ele deve ser entendido apenas como controle visual para um ambiente interno ou restrito, e nao como autenticacao real. Se algum dia o site precisar sair desse contexto, o login deve migrar para backend, SSO ou outro controle externo de acesso.
