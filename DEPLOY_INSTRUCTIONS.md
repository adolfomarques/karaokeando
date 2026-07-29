# Guia Rápido de Deploy (Netlify)

Este guia foi criado para auxiliar você (ou qualquer outra Inteligência Artificial que for ajudar no futuro) a realizar e corrigir o deploy do projeto "Karaoke Factory" corretamente.

## Contexto e Estrutura

O projeto não possui um \`package.json\` na raiz. Ele é dividido em:
- \`/frontend\`: Aplicação React / Vite.
- \`/backend\`: API Node.js (se aplicável, com hospedagem separada).

O deploy do site (Frontend) está configurado para o **Netlify**.

## Ferramenta de Deploy (CLI)

O comando principal para fazer o deploy via terminal de forma confiável (utilizando a configuração local correta e subindo com base nas configurações da conta já conectada) é:

```bash
npx netlify-cli deploy --prod --build
```

O argumento \`--build\` instrui o Netlify a primeiro executar a pipeline de build (\`npm run build\`) e, só então, publicar a pasta \`frontend/dist\`.

O argumento \`--prod\` é o que garante que esta será a versão pública em produção (site ao vivo), em vez de apenas um "deploy preview" na URL padrão.

---

## Como o \`netlify.toml\` deve estar configurado

Se encontrar falhas no deploy, **verifique sempre o arquivo \`netlify.toml\`** na raiz do projeto. Ele deve estar assim:

```toml
[build]
  command = "cd frontend && npm install && npm run build"
  publish = "frontend/dist"

# Redirecionamento obrigatório para que React Router (SPA) funcione na Netlify
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### ⚠️ Erros Comuns de Deploy para a IA (ATENÇÃO, LLMs)
1. **Erro de Caminho:** Não utilize \`base = "frontend"\` no \`netlify.toml\` a menos que entenda que isso altera a resolução do caminho do \`publish\`. O mais seguro e estável em repositórios "mono-repo" falsos é utilizar o comando explícito (\`cd frontend && ... \`) e definir explicitamente o publish (\`frontend/dist\`) na raiz do toml.
2. **Scripts Python:** Sempre valide se todas as novas modificações HTML/JSX passam pelas regras do validador. Se você tentar commitar e subir um deploy, convém rodar \`python3 .agent/scripts/checklist.py .\` para assegurar a qualidade de UI/UX exigida. Se algo ali falhar, você não deve prosseguir com o deploy até corrigir o erro.

## Resumo dos Passos do Workflow

1. Realizar as modificações no código em \`frontend/src/*\`;
2. Testar o checklist: \`python3 .agent/scripts/checklist.py .\`;
3. Se aprovar, executar logado no CLI local: \`npx netlify-cli deploy --prod --build\`;
4. E então realizar um commit no Git e enviar para seu repositório remoto.

---

## Deploy do Backend (Render via GitHub Actions)

O backend é publicado automaticamente no Render por meio do workflow:

- `/.github/workflows/deploy-backend.yml`

Esse workflow dispara em push na branch `main` quando há mudanças em `backend/**` e usa **Deploy Hook URL** (sem CLI e sem token de sessão expirar).

### Configuração obrigatória (GitHub Secrets)

No repositório do GitHub, configure este secret:

- `RENDER_DEPLOY_HOOK_URL`: URL do Deploy Hook do serviço no Render.

### Como obter o Deploy Hook no Render

1. Abra o serviço do backend no Render;
2. Vá até a seção de Deploy Hooks;
3. Crie (ou copie) um hook;
4. Cole a URL no secret `RENDER_DEPLOY_HOOK_URL` no GitHub.

### Observações importantes

- Se o workflow falhar com `Missing secret: RENDER_DEPLOY_HOOK_URL`, o secret não foi criado ou está vazio.
- O erro antigo de token expirado (`your token is expired`) ocorria no fluxo anterior baseado em Render CLI/API key.

### ⚠️ DNS do Backend (api.karaokefactory.org)

O domínio `api.karaokefactory.org` **não possui registro DNS configurado** (NXDOMAIN). O backend real está acessível em:

```
https://karaokeando.onrender.com
```

Se o frontend apresentar erro `⚠️ Erro de conexão` ao tentar entrar em uma sala, verifique:
1. O serviço no Render está ativo (plano free pode hibernar após inatividade);
2. O `VITE_API_URL` em `frontend/.env.production` está apontando para a URL correta.

**Para usar o domínio customizado (`api.karaokefactory.org`):**
1. Adicione um registro CNAME em `api.karaokefactory.org` apontando para o domínio `.onrender.com` do serviço;
2. Configure o domínio customizado no dashboard do Render (Settings → Custom Domain).

Enquanto o DNS não for configurado, mantenha `VITE_API_URL=https://karaokeando.onrender.com` em `frontend/.env.production`.
