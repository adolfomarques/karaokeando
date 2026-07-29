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
console.log(`🌐 Alvo API: ${DOMAIN}`);
console.log(`⚡ Alvo WebSocket: ${WS_DOMAIN}\n`);

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
