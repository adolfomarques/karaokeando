import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const additionsCounter = new Counter('song_additions');

const BASE_URL = 'https://karaokeando.onrender.com';
const WS_URL = 'wss://karaokeando.onrender.com/ws/F9J';
const ROOM_CODE = 'F9J';

const ARTISTS = [
  'Queen', 'Linkin Park', 'Anitta', 'Sertanejo 2024', 'Pop 80s', 
  'The Beatles', 'Michael Jackson', 'Taylor Swift', 'Dua Lipa', 'Imagine Dragons',
  'Coldplay', 'Bruno Mars', 'Ed Sheeran', 'Beyoncé', 'Rihanna', 
  'Eminem', 'Dr Dre', 'Snoop Dogg', 'Lady Gaga', 'Katy Perry'
];

export const options = {
  scenarios: {
    stress_test: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '15m',
    },
  },
  thresholds: {
    errors: ['rate<0.3'], 
  },
};

export default function () {
  // 1. Escalonamento: 10s entre cada usuário para segurança do IP
  const staggerDelay = (__VU - 1) * 10; 
  console.log(`[VU ${__VU}] Iniciando espera de ${staggerDelay}s para segurança de IP...`);
  sleep(staggerDelay);

  // 2. Registro de Convidado
  const userName = `Stress_${__VU}_${Math.random().toString(36).slice(2, 6)}`;
  const regPayload = JSON.stringify({
    name: userName,
    email: `stress_${__VU}_${Date.now()}@test.com`,
    phone: '11999999999',
  });

  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, regPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!check(regRes, { 'reg ok': (r) => r.status === 200 || r.status === 201 })) {
    errorRate.add(1);
    return;
  }

  const token = regRes.json().token;
  const userId = regRes.json().user.id;

  // 3. Conexão WebSocket
  const wsRes = ws.connect(WS_URL, null, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type: 'HELLO',
        token: token,
        name: userName,
        role: 'mobile'
      }));

      // 4. Busca no YouTube (Artista + Número para burlar o cache mas ainda ter resultados)
      const artist = ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
      const randomQuery = `${artist} ${Math.floor(Math.random() * 9999)}`;
      console.log(`[VU ${__VU}] Buscando: "${randomQuery}" para forçar canal real do YT...`);
      
      const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(randomQuery)}&userId=${userId}&roomCode=${ROOM_CODE}`);

      if (!check(searchRes, { 'search success': (r) => r.status === 200 })) {
        errorRate.add(1);
        socket.close();
        return;
      }

      const results = searchRes.json();
      if (results && results.length > 0) {
        // Escolhe um resultado aleatório entre os primeiros para não todos pegarem a mesma música
        const randomIndex = Math.floor(Math.random() * Math.min(results.length, 5));
        const song = results[randomIndex]; 
        
        // 5. Adição à Fila
        const enqueuePayload = JSON.stringify({
          videoId: song.videoId,
          title: song.title,
          requestedBy: userName,
          userId: userId,
          deviceFingerprint: `stress_device_${__VU}_${Math.random()}`
        });

        const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (check(enqueueRes, { 'enqueue success': (r) => r.status === 200 })) {
          additionsCounter.add(1);
          console.log(`[VU ${__VU}] SUCESSO! Música "${song.title}" adicionada à fila.`);
        } else {
          console.error(`[VU ${__VU}] Falha no enqueue: ${enqueueRes.body}`);
          errorRate.add(1);
        }
      } else {
        console.warn(`[VU ${__VU}] YouTube não retornou resultados para: ${randomQuery}`);
        errorRate.add(1);
      }

      sleep(10);
      socket.close();
    });

    socket.on('error', function (e) {
      errorRate.add(1);
    });
  });
}
