# 🛰️ Karaoke Search Relay

Este código foi criado para ser um **"Satélite de Busca"**. 
Ele distribui as requisições de busca para IPs diferentes do servidor principal (Render), prevenindo o bloqueio do YouTube por excesso de requisições.

## 🚀 Como fazer o Deploy (Grátis)

###  opcion 1: Vercel (Recomendado)
1. Instale a CLI: `npm install -g vercel`
2. Na pasta `relay-search`, rode: `vercel`
3. O endpoint final será: `https://seu-projeto.vercel.app/api/search`

### opcion 2: Netlify
1. No Netlify, escolha "Deploy manually".
2. Arraste a pasta `relay-search` inteira para a área de upload.
3. O endpoint final será: `https://seu-projeto.netlify.app/.netlify/functions/search` (ou `/api/search` se o `netlify.toml` estiver configurado).

## ⚙️ Como usar no Sistema Principal

Após o deploy, pegue a URL gerada e configure-a como um relay no seu `frontend/src/api.ts` ou passe para o seu backend.

**Exemplo de teste direto no navegador:**
`https://sua-url-de-relay.vercel.app/api/search?q=evidencias`

## 🛡️ Por que isso é seguro?
*   O Relay não guarda dados dos usuários.
*   Ele apenas traduz a busca para o YouTube usando o IP da infraestrutura da Vercel/Netlify.
*   Se um IP for bloqueado, o próximo deploy da Vercel usará outro IP.

---
**💡 Dica de Mestre:** Crie 2 ou 3 desses satélites (ex: um na Vercel, um no Netlify, um no Cloudflare) para ter redundância infinita!
