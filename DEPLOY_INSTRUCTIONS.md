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
