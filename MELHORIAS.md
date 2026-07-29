# Melhorias Pendentes — Karaoke Factory

## ✅ Já implementadas (nesta sessão)
- videoInfoCache com limite de 1000 entradas
- N+1 no prewarm substituído por batch `findMany`
- Fisher-Yates shuffle no lugar de `sort(random)`
- Paginação em `/api/admin/users`, `/api/admin/songs`, `/api/songs`
- `socket.on("error")` no WebSocket
- `console.log` de reação removido do frontend
- Log de visibilidade mudado para `console.debug`

---

## 🔴 Críticas (fazer o quanto antes)

### 1. Segredos no repositório
- `backend/.env` contém `DATABASE_URL` com senha, `JWT_SECRET=supersecret123`, `ADMIN_KEY=admin123`
- Raiz `.env` contém token GitHub
- **Ação:** Adicionar `.env` ao `.gitignore`, rodar `git rm --cached .env backend/.env`, gerar novo JWT_SECRET, atualizar no Render

### 2. Email admin hardcoded
- `backend/src/routes/auth.ts:375,466,606` — `"adolfomarques@gmail.com"` em 3 lugares
- `backend/src/routes/auth.ts:650` — `"https://karaokefactory.org"` hardcoded
- **Ação:** Criar env vars `ADMIN_EMAIL` e `APP_URL`

### 3. Rate limit de busca desabilitado
- `backend/src/server.ts` — função `isSearchRateLimited()` existe (linha 118) mas nunca é chamada (comentado na linha ~1263)
- **Ação:** Descomentar a chamada e testar

---

## 🟠 Médio Prazo

### 4. Monólito server.ts (1760 linhas)
- Quebrar em módulos: `websocket/handler.ts`, `rooms/state.ts`, `search/youtube.ts`, `api/songs.ts`, `api/analytics.ts`

### 5. Tratamento de erro offline (frontend)
- Quando WebSocket cai, não há notificação visual pro usuário
- `sendReaction` falha silenciosamente se WS desconectado
- **Ação:** Adicionar toast/indicador de conexão

### 6. Endpoints sem paginação adicionais
- `/api/admin/rooms` (se existir)
- `/api/admin/playlists`
- Verificar outros

### 7. Cache sem limite (room state)
- `visitedSet` em `rooms.ts:260` cresce sem limite — limpar após 1h

### 8. Dependência não utilizada
- `google-auth-library` no `package.json` mas nunca importada
- **Ação:** Remover do package.json

---

## 🟡 UX & Frontend

### 9. Componentes grandes
- `RoomMobile.tsx` (~2068 linhas)
- `RoomTV.tsx` (~1880 linhas)
- Quebrar em componentes menores

### 10. Loading states
- Botão "Wait" genérico — substituir por spinner/skeleton
- Adicionar loading na busca de músicas

### 11. Error/Empty states
- Tela quando sala não existe
- Tela quando busca retorna vazio
- Tela quando WebSocket desconecta

### 12. i18n — verificar traduções faltando
- Strings hardcoded em inglês no meio do código

---

## 🔵 DevOps

### 13. Zero testes
- Sem testes unitários ou de integração
- **Mínimo:** teste de health check da API

### 14. Sem monitoramento
- Sem Sentry ou similar para capturar erros em produção
- Backend usa `console.log` em vez do logger estruturado do Fastify

### 15. Health check no Render
- `healthCheckPath: ""` — configurar para `/api/health`

### 16. Dockerfile — camadas de cache
- `npm ci` e `prisma generate` poderiam ser otimizados com multi-stage build

### 17. promote_admin.ts
- Cria `new PrismaClient()` próprio em vez de reutilizar o de `lib/prisma.ts`
