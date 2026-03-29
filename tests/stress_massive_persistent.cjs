const BASE_URL = "https://karaokeando.onrender.com";
const ROOM_CODE = "F9J"; // Sala de teste
const USER_COUNT = 50; // +15 users as requested

const ARTISTS = [
  "Dua Lipa", "Ed Sheeran", "The Weeknd", "Miley Cyrus", "Harry Styles", 
  "Bad Bunny", "Rosalía", "Kendrick Lamar", "Sza", "Doja Cat", 
  "Olivia Rodrigo", "Post Malone", "Travis Scott", "Drake", "Beyoncé", 
  "Lady Gaga", "Shakira", "Katy Perry", "Rihanna", "Adele"
];

async function runTest() {
  console.log(`🚀 Iniciando Teste Massivo (Persistent Cache) com ${USER_COUNT} usuários...`);
  const startTime = Date.now();
  const successfulSearches = [];
  const successfulEnqueues = [];
  const errors = [];

  // Agrupando em lotes de 4 para não estourar o limite de 5 requisições por IP a cada 10s da produção
  const BATCH_SIZE = 4;
  for (let i = 0; i < USER_COUNT; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, USER_COUNT - i) }).map(async (_, idx) => {
      const userIndex = i + idx;
      const userId = `massive_user_${userIndex}_${Date.now()}`;
      const nickname = `Tester_${userIndex + 1}`;
      const artist = ARTISTS[userIndex % ARTISTS.length];
      const query = `${artist} karaoke ${Math.floor(Math.random() * 10000)}`;

      try {
        console.log(`[User ${userIndex+1}] Pesquisando: "${query}"...`);
        const searchRes = await fetch(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(query)}&userId=${userId}`);
        
        if (!searchRes.ok) {
           throw new Error(`Search failed with status: ${searchRes.status}`);
        }

        const searchData = await searchRes.json();
        
        if (searchData && searchData.length > 0) {
          successfulSearches.push(userIndex);
          const video = searchData[0];
          
          console.log(`[User ${userIndex+1}] Adicionando: "${video.title}"...`);
          const enqueueRes = await fetch(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: video.videoId,
              title: video.title,
              requestedBy: nickname,
              userId: userId
            })
          });

          if (!enqueueRes.ok) throw new Error(`Enqueue failed with status: ${enqueueRes.status}`);
          
          const enqueueData = await enqueueRes.json();
          
          if (enqueueData && (enqueueData.success || enqueueData.ok)) {
            successfulEnqueues.push(userIndex);
            console.log(`✅ [User ${userIndex+1}] Sucesso!`);
          } else {
             throw new Error(`Enqueue returned unsuccessful: ${JSON.stringify(enqueueData)}`);
          }
        } else {
           throw new Error(`No search results returned for query`);
        }
      } catch (err) {
        console.error(`❌ Erro no Usuário ${userIndex+1}:`, err.message);
        errors.push({ user: userIndex+1, error: err.message });
      }
    });

    await Promise.all(batch);
    if (i + BATCH_SIZE < USER_COUNT) {
      console.log(`\n⏳ Esperando 10 segundos para resetar o rate limit de IP da produção...\n`);
      await new Promise(r => setTimeout(r, 10500));
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log("\n📊 RELATÓRIO DO TESTE MASSIVO:");
  console.log(`- Duração: ${duration.toFixed(2)}s`);
  console.log(`- Usuários Totais: ${USER_COUNT}`);
  console.log(`- Buscas com Sucesso: ${successfulSearches.length}`);
  console.log(`- Adições à Fila com Sucesso: ${successfulEnqueues.length}`);
  console.log(`- Erros: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log("- Detalhes dos Erros:", JSON.stringify(errors, null, 2));
  }

  process.exit(errors.length === 0 ? 0 : 1);
}

runTest();
