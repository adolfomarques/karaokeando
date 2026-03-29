import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    stress_test_100: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '15m',
    },
  },
  thresholds: {
    errors: ['rate<0.8'], // Permite erros pois o YouTube vai bloquear em algum momento
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = 'F9J';

const SEARCH_QUERIES = [
  "Taylor Swift", "Queen", "Beatles", "Adele", "Coldplay", "Bruno Mars", "Dua Lipa", "Ed Sheeran",
  "Rihanna", "Drake", "The Weeknd", "Lady Gaga", "Beyonce", "Harry Styles", "Post Malone", "Katy Perry",
  "Imagine Dragons", "Ariana Grande", "Maroon 5", "Michael Jackson", "Sia", "Eminem", "Billie Eilish",
  "Shawn Mendes", "Sam Smith", "Metallica", "ACDC", "Nirvana", "Linkin Park", "Bon Jovi", "U2",
  "Elton John", "Frank Sinatra", "Elvis Presley", "Guns N Roses", "Rolling Stones", "David Bowie"
];

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function () {
  const vuId = __VU;
  const name = `BURST_USER_${vuId}_${randomString(3)}`;

  // --- 1. Step: Register Guest (Staggered over 100s) ---
  sleep(vuId * 1.0); 
  
  const regPayload = JSON.stringify({
    name: name,
    email: `k100_${vuId}_${randomString(6)}@stress.test`,
    phone: '119' + (10000000 + vuId)
  });
  
  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, regPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const regOk = check(regRes, { 'registered': (r) => r.status === 200 });
  if (!regOk) {
    console.log(`[VU ${vuId}] REG FAIL: ${regRes.status}`);
    errorRate.add(1);
    return;
  }

  const regData = JSON.parse(regRes.body);
  const token = regData.token;
  const u_id = regData.user.id;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // --- 2. Step: Burst Logic (Buscas ao mesmo tempo em grupos de 10) ---
  // Grupo 1 (VUs 1-10) busca aos 120s
  // Grupo 2 (VUs 11-20) busca aos 150s, etc.
  const group = Math.floor((vuId - 1) / 10);
  const waitTime = 120 + (group * 35); // 35s entre rajadas de 10 pessoas
  
  // Adiciona um pequeno jitter de 0-5s dentro do grupo para não ser "frame-perfect"
  sleep(waitTime - (vuId * 1.0) + (Math.random() * 5)); 
  
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const salt = randomString(5); // Bypass cache server-side
  const searchTerm = `${query} ${salt}`;
  
  const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(searchTerm)}`, {
    headers: authHeaders
  });

  const searchOk = check(searchRes, {
    'search status 200': (r) => r.status === 200,
    'search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length > 0;
      } catch (e) { return false; }
    },
  });

  if (!searchOk) {
    console.log(`[VU ${vuId}] SEARCH FAIL/EMPTY: ${searchRes.status} for "${searchTerm}"`);
    errorRate.add(1);
    // Se a busca falhou (bloqueio do YT), tentamos uma busca de fallback sem salt para ver se o cache salva
    // Mas o usuário pediu "nao usar o cache", então apenas registramos a falha.
    return;
  }

  const results = JSON.parse(searchRes.body);
  const video = results[0];

  // --- 3. Step: Enqueue ---
  sleep(2 + Math.random() * 5); // Pensando qual música escolher
  
  const enqueuePayload = JSON.stringify({
    videoId: video.videoId,
    title: video.title,
    requestedBy: name,
    userId: u_id,
    deviceFingerprint: `dv100_${vuId}_${randomString(8)}`
  });

  const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
    headers: authHeaders
  });

  const enqueueOk = check(enqueueRes, { 'enqueued': (r) => r.status === 200 });

  if (!enqueueOk) {
    console.log(`[VU ${vuId}] ENQUEUE FAIL: ${enqueueRes.status} ${enqueueRes.body}`);
    errorRate.add(1);
  } else {
    console.log(`[VU ${vuId}] ✅ SUCESSO: Adicionou "${video.title}"`);
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'stress_test_100_burst_report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  let output = '\n=== KARAOKE FACTORY - ESTRESSE 100 USUÁRIOS (RAJADAS) ===\n';
  output += `VUs Ativos             : ${data.metrics.vus.values.max}\n`;
  output += `Taxa de Sucesso Geral  : ${(data.metrics.checks.values.rate * 100).toFixed(2)}%\n`;
  output += `Requisições HTTP Totais: ${data.metrics.http_reqs.values.count}\n`;
  output += `Falhas HTTP            : ${data.metrics.http_req_failed.values.passes}\n`;
  output += `Latência Média (ms)    : ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `P95 Latência (ms)      : ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  return output;
}
