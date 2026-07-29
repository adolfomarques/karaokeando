# 🚀 Plano Estruturado de Teste Automatizado de Carga (20 Usuários Simultâneos)
> **Karaoke Factory — Validação de Alta Concorrência, Busca, Fila e TV Player**

---

## 📌 1. Visão Geral e Objetivo

Este documento define a estratégia completa e os scripts executáveis para realizar um **teste automatizado de ponta a ponta** simulando **20 pessoas utilizando simultaneamente** a plataforma *Karaoke Factory* no seu próprio domínio (`https://karaokefactory.org`).

### O cenário simulado:
- **1 TV Display (Modo TV):** Conectada na sala recebendo a fila de reprodução e tocando os vídeos em tempo real.
- **20 Usuários Participantes (Modo Singer/Mobile):** 
  - Entram na mesma sala simultaneamente.
  - Efetuam buscas concorrentes de músicas no YouTube.
  - Adicionam músicas na fila de reprodução.
  - Enviam reações animadas em tempo real (`🎤`, `🔥`, `👏`, `❤️`, `⭐`).
  - Acompanham a atualização síncrona da fila via WebSocket.

---

## 🔍 2. Mapeamento de Potenciais Gargalos e Problemas

Ao rodar 20 usuários ao mesmo tempo, a plataforma passa por 4 camadas críticas:

| Camada | Potencial Problema | Como o Teste Valida | Solução de Mitigação |
| :--- | :--- | :--- | :--- |
| **YouTube API / Search** | Rate limit (HTTP 429) ou tempo de espera alto em buscas concorrentes. | Mede latência do endpoint `/api/youtube/search` com 20 requisições simultâneas. | Fila interna de concorrência (`YT_DLP_MAX_CONCURRENT = 10`) + Cache em memória e `localStorage`. |
| **WebSockets (Fastify)** | Mensagens perdidas, desconexão por estouro de buffer ou gargalo na transmissão da fila. | Envia rajadas de eventos `REACTION` e monitora tempo de propagação para a TV. | Pings/Pongs automáticos a cada 25s e broadcasting em lote (batching). |
| **Banco de Dados (Prisma)** | Locks de escrita concorrente ao adicionar músicas na biblioteca/fila simultaneamente. | Executa requisições `/api/rooms/:code/enqueue` em paralelo. | Modo WAL no SQLite / PostgreSQL connection pooling. |
| **TV Player (Frontend)** | VAZAMENTO de memória no Iframe do YouTube após trocar 15-20 músicas consecutivas. | Monitora estabilidade do Player e recarregamento da fila. | Destruição limpa de instâncias do player e reciclagem do container DOM. |

---

## 🛠️ 3. Ferramentas e Arquitetura do Teste

Utilizamos uma abordagem de **Dupla Camada**:

1. **Camada 1 (Carga de Protocolo - Node.js + WebSockets):**
   - Rápido, leve, sem consumo excessivo de RAM local.
   - Simula conexões reais de socket e chamadas HTTP de 20 usuários.
   - **Script:** `simular_20_usuarios.js`

2. **Camada 2 (Navegador Real E2E - Playwright):**
   - Abre contextos reais de navegador em headless.
   - Valida renderização do DOM, interações de clique e sincronia do player de vídeo.
   - **Script:** `frontend/e2e/simulacao_20_navegadores.spec.ts`

---

## 📜 4. Script 1: Teste de Carga de Protocolo Node.js (`simular_20_usuarios.js`)

Este script simula os 20 usuários conectando via WebSocket e fazendo requisições HTTP reais de busca e envio de música na sua sala.

### Arquivo: `simular_20_usuarios.js`

```javascript
import WebSocket from 'ws';
import fetch from 'node-fetch';

const DOMAIN = process.env.TARGET_DOMAIN || 'https://api.karaokefactory.org';
const WS_DOMAIN = process.env.TARGET_WS || 'wss://api.karaokefactory.org';
const ROOM_CODE = process.argv[2] || 'TEST20';
const USER_COUNT = 20;

const SEARCH_QUERIES = [
  'Evidências karaoke', 'Bohemian Rhapsody karaoke', 'Creep Radiohead karaoke',
  'Shallow Lady Gaga karaoke', 'Rolling in the Deep karaoke', 'Fly Me to the Moon karaoke',
  'Total Eclipse of the Heart karaoke', 'Imagine John Lennon karaoke', 'Dancing Queen ABBA karaoke',
  'Wonderwall Oasis karaoke', 'Sweet Child O Mine karaoke', 'Hotel California karaoke',
  'Billie Jean karaoke', 'Smells Like Teen Spirit karaoke', 'Take On Me karaoke',
  'I Will Survive karaoke', 'Livin on a Prayer karaoke', 'Like a Prayer karaoke',
  'Uptown Funk karaoke', 'Despacito karaoke'
];

const REACTIONS = ['🔥', '🎤', '👏', '❤️', '⭐', '🎉'];

console.log(`\n🚀 INICIANDO SIMULAÇÃO DE CARGA: ${USER_COUNT} USUÁRIOS NA SALA [${ROOM_CODE}]`);
console.log(`🌐 Alvo: ${DOMAIN}\n`);

const metrics = {
  registered: 0,
  connected: 0,
  searchesSuccess: 0,
  searchesFailed: 0,
  enqueuedSuccess: 0,
  enqueuedFailed: 0,
  reactionsSent: 0,
  searchTimesMs: [],
};

async function runUserSimulation(index) {
  const userId = `user_sim_${index + 1}_${Math.random().toString(36).substring(2, 6)}`;
  const userName = `Cantor_Simulado_${index + 1}`;
  const userEmail = `simulacao_${index + 1}_${Date.now()}@test.com`;

  try {
    // 1. Cadastrar Guest
    const regRes = await fetch(`${DOMAIN}/api/auth/register-guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: userName, email: userEmail, phone: '11999999999' }),
    });

    if (!regRes.ok) {
      console.error(`❌ [${userName}] Falha no cadastro: HTTP ${regRes.status}`);
      return;
    }
    const regData = await regRes.json();
    const token = regData.token;
    metrics.registered++;

    // 2. Conectar WebSocket
    const ws = new WebSocket(`${WS_DOMAIN}/ws/${ROOM_CODE}`);

    ws.on('open', async () => {
      metrics.connected++;
      ws.send(JSON.stringify({ type: 'HELLO', token, name: userName, role: 'mobile', userId }));

      // 3. Simular busca concorrente com atraso aleatório
      await new Promise(r => setTimeout(r, Math.random() * 3000 + 500));

      const query = SEARCH_QUERIES[index % SEARCH_QUERIES.length];
      const startTime = Date.now();

      try {
        const searchRes = await fetch(`${DOMAIN}/api/youtube/search?q=${encodeURIComponent(query)}`);
        const searchDuration = Date.now() - startTime;
        metrics.searchTimesMs.push(searchDuration);

        if (searchRes.ok) {
          const results = await searchRes.json();
          metrics.searchesSuccess++;
          console.log(`✅ [${userName}] Busca "${query}" concluída em ${searchDuration}ms (${results.length} resultados)`);

          if (results && results.length > 0) {
            const song = results[0];
            
            // 4. Adicionar Música na Fila
            await new Promise(r => setTimeout(r, Math.random() * 1500 + 500));
            const enqueueRes = await fetch(`${DOMAIN}/api/rooms/${ROOM_CODE}/enqueue`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                videoId: song.videoId,
                title: song.title,
                requestedBy: userName,
                userId: userId,
              }),
            });

            if (enqueueRes.ok) {
              metrics.enqueuedSuccess++;
              console.log(`🎵 [${userName}] MÚSICA ADICIONADA: "${song.title.substring(0, 35)}..."`);
            } else {
              metrics.enqueuedFailed++;
            }
          }
        } else {
          metrics.searchesFailed++;
        }
      } catch (err) {
        metrics.searchesFailed++;
      }

      // 5. Enviar reações interativas via WebSocket
      for (let r = 0; r < 4; r++) {
        await new Promise(res => setTimeout(res, Math.random() * 4000 + 2000));
        const reaction = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
        ws.send(JSON.stringify({ type: 'REACTION', reaction, name: userName, userId }));
        metrics.reactionsSent++;
      }

      setTimeout(() => ws.close(), 5000);
    });

    ws.on('error', (e) => console.error(`⚠️ [${userName}] Erro de Socket:`, e.message));
  } catch (err) {
    console.error(`💥 [${userName}] Exceção:`, err.message);
  }
}

async function main() {
  const promises = [];
  for (let i = 0; i < USER_COUNT; i++) {
    promises.push(runUserSimulation(i));
    // Pequeno espaçamento de 150ms para disparar rajada realista
    await new Promise(r => setTimeout(r, 150));
  }

  await Promise.all(promises);

  // Aguardar finalização dos sockets
  await new Promise(r => setTimeout(r, 18000));

  // Relatório Final
  console.log('\n============================================================');
  console.log('📊 RELATÓRIO FINAL DE VALIDAÇÃO DE CARGA (20 USUÁRIOS)');
  console.log('============================================================');
  console.log(`✅ Usuários Registrados:  ${metrics.registered} / ${USER_COUNT}`);
  console.log(`⚡ Sockets Conectados:   ${metrics.connected} / ${USER_COUNT}`);
  console.log(`🔍 Buscas bem-sucedidas: ${metrics.searchesSuccess} (Falhas: ${metrics.searchesFailed})`);
  console.log(`🎵 Músicas na Fila:      ${metrics.enqueuedSuccess} (Falhas: ${metrics.enqueuedFailed})`);
  console.log(`🔥 Reações Enviadas:     ${metrics.reactionsSent}`);

  if (metrics.searchTimesMs.length > 0) {
    const avgSearch = Math.round(metrics.searchTimesMs.reduce((a, b) => a + b, 0) / metrics.searchTimesMs.length);
    const maxSearch = Math.max(...metrics.searchTimesMs);
    console.log(`⏱️ Tempo Médio de Busca: ${avgSearch}ms | Máximo: ${maxSearch}ms`);
  }
  console.log('============================================================\n');
}

main();
```

---

## 🎭 5. Script 2: Teste E2E de Navegador Real com Playwright (`frontend/e2e/simulacao_20_navegadores.spec.ts`)

Este script abre **1 janela de TV** e **20 participantes em abas simuladas** utilizando o framework Playwright.

```typescript
import { test, expect, chromium } from '@playwright/test';

test('Simulação E2E: 20 Usuários no Domínio Real', async () => {
  const TARGET_URL = process.env.TEST_URL || 'https://karaokefactory.org';
  const ROOM_CODE = `PERF${Math.floor(Math.random() * 900 + 100)}`;

  console.log(`🚀 Iniciando teste E2E na URL: ${TARGET_URL} | Sala: ${ROOM_CODE}`);

  const browser = await chromium.launch({ headless: true });

  // 1. Abrir Tela de TV
  const tvContext = await browser.newContext();
  const tvPage = await tvContext.newPage();
  await tvPage.goto(`${TARGET_URL}/room/${ROOM_CODE}/tv`);
  console.log('📺 Tela de TV aberta e aguardando fila...');

  // 2. Abrir 20 Participantes simultâneos
  const userPromises = Array.from({ length: 20 }).map(async (_, index) => {
    const userContext = await browser.newContext();
    const page = await userContext.newPage();
    
    // Entrar na sala
    await page.goto(`${TARGET_URL}/room/${ROOM_CODE}`);
    
    // Preencher nome se modal de guest abrir
    const nameInput = page.locator('input[placeholder*="nome"], input[placeholder*="name"]');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(`Singer_${index + 1}`);
      await page.click('button:has-text("Entrar"), button:has-text("Join")');
    }

    // Pesquisar música
    const searchInput = page.locator('input[placeholder*="música"], input[placeholder*="song"], input[aria-label*="busca"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Evidencias karaoke');
      await page.keyboard.press('Enter');
      
      // Clicar no primeiro botão de adicionar
      const addBtn = page.locator('button:has-text("Adicionar"), button:has-text("Add")').first();
      if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addBtn.click();
        console.log(`👤 Singer_${index + 1} adicionou música com sucesso!`);
      }
    }

    await userContext.close();
  });

  await Promise.all(userPromises);

  // 3. Validar se a TV recebeu as músicas na fila
  await tvPage.waitForTimeout(5000);
  const queueCount = await tvPage.locator('.queue-item, [data-testid="queue-item"]').count();
  console.log(`📊 Total de itens detectados na fila da TV: ${queueCount}`);

  expect(queueCount).toBeGreaterThan(0);

  await browser.close();
});
```

---

## 📊 6. Métricas de Sucesso e Critérios de Aprovação (KPIs)

Para considerar a aplicação **100% pronta para festas com alta concorrência**, ela deve atender aos seguintes critérios durante o teste com 20 usuários:

| Métrica | Meta Aceitável | Alerta Amarelo | Falha Crítica |
| :--- | :--- | :--- | :--- |
| **Taxa de Sucesso na Busca** | $\ge 95\%$ | $85\% - 94\%$ | $< 85\%$ |
| **Tempo Médio de Resposta da Busca** | $< 1.500\text{ms}$ | $1.500\text{ms} - 3.500\text{ms}$ | $> 5.000\text{ms}$ |
| **Conexão WebSocket** | $100\%$ Mantidas | $1-2$ Quedas com reconexão | $> 3$ Quedas definitivas |
| **Sucesso de Enfileiramento** | $100\%$ Sem duplicação | Atraso $> 2\text{s}$ | Perda de pedido |
| **Uso de Memória no Player TV** | Sem crescimento contínuo | Aumento leve $< 100\text{MB}$ | Crash de Iframe / Memory Leak |

---

## 🛠️ 7. Guia de Solução de Problemas (Troubleshooting Runbook)

Se o teste revelar problemas, utilize o guia de correção rápida:

### Problem 1: Buscas lentas ou erro `HTTP 429` (Muitas requisições ao YouTube)
- **Causa:** 20 pessoas digitando e buscando ao mesmo tempo estouram a taxa da API do YouTube.
- **Solução no Backend:**
  - O sistema já possui um **limitador de concorrência (`YT_DLP_MAX_CONCURRENT = 10`)** em `backend/src/server.ts`.
  - O backend notifica o frontend com a mensagem de socket `SEARCH_QUEUE_POSITION` para informar a posição na fila ao usuário.
  - **Recomendação:** Manter o cache de buscas ativo por pelo menos 24 horas no servidor.

### Problem 2: Músicas não aparecem na TV imediatamente
- **Causa:** O evento de broadcast do WebSocket foi bloqueado ou atrasado por congestionamento da rede.
- **Solução:**
  - Garantir que o envio da mensagem `ROOM_STATE_UPDATE` use o canal direto sem bloqueio de I/O síncrono.

### Problem 3: O Player da TV travou após tocar várias músicas
- **Causa:** O Iframe do YouTube acumula memória JavaScript quando mantido na tela indefinidamente.
- **Solução:**
  - No `RoomTV.tsx`, implementar destruição do elemento do player (`player.destroy()`) ao trocar de música e recriar o container Iframe limpo.

---

## 🏁 8. Passo a Passo de Execução e Validação Final

### Passo 1: Instalar dependência do script de simulação
```bash
npm install ws node-fetch
```

### Passo 2: Executar a simulação de 20 usuários
```bash
node simular_20_usuarios.js SUASALA
```

### Passo 3: Validação Visual
1. Abra em seu navegador: `https://karaokefactory.org/room/SUASALA/tv`
2. Assista ao vivo as músicas sendo enfileiradas automaticamente e os emojis de reação flutuando na tela enquanto os 20 usuários virtuais cantam e interagem!
