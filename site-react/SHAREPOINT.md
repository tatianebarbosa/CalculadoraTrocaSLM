# Publicacao no SharePoint

## Cenario recomendado

Usar uma biblioteca de documentos do proprio SharePoint, de preferencia `Site Assets`, com uma pasta dedicada para a calculadora.

Exemplo de pasta:

- `Site Assets/calculadora-troca`

## Antes do build

1. Copie `.env.sharepoint.example` para `.env.sharepoint`.
2. Ajuste `VITE_SITE_BASE_PATH` com o caminho exato da pasta no seu SharePoint.

Exemplo:

```env
VITE_SITE_BASE_PATH=/sites/TimeSAF/SiteAssets/calculadora-troca/
```

## Gerar a build

Dentro de `site-react`, rode:

```bash
npm run build:sharepoint
```

Esse comando:

- atualiza `public/catalog.json`
- gera a pasta `dist`
- monta os caminhos dos assets apontando para a pasta do SharePoint

## Publicar no SharePoint

1. Abra o site do SharePoint.
2. Entre na biblioteca `Site Assets` ou em outra biblioteca aprovada pelo time.
3. Crie a pasta `calculadora-troca`.
4. Envie todo o conteudo da pasta `dist` para dentro dessa pasta.
5. Abra o `index.html` publicado para testar.

## Como divulgar internamente

- Usar o link direto do `index.html`.
- Adicionar esse link em um menu, botao ou web part de Quick Links no SharePoint.
- Evitar Script Editor ou outras insercoes de script em pagina moderna.

## Observacoes

- Este projeto foi preparado para uso interno/restrito.
- O login continua sendo apenas controle visual.
- A versao publicada no SharePoint fica em modo somente leitura para a base.
- Se a pasta no SharePoint mudar, gere uma nova build com o `VITE_SITE_BASE_PATH` atualizado.

## Referencias Microsoft

- Custom script em SharePoint: https://learn.microsoft.com/en-us/sharepoint/allow-or-prevent-custom-script
- Quick Links em pagina moderna: https://support.microsoft.com/en-us/office/use-the-quick-links-web-part-e1df7561-209d-4362-96d4-469f85ab2a82
- Tipos de arquivo em bibliotecas: https://support.microsoft.com/en-us/office/types-of-files-that-cannot-be-added-to-a-list-or-library-30be234d-e551-4c2a-8de8-f8546ffbf5b3
