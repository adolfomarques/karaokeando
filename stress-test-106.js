import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    stress_test_106_queue: {
      executor: 'per-vu-iterations',
      vus: 106,
      iterations: 1,
      maxDuration: '10m',
    },
  },
  thresholds: {
    errors: ['rate<0.1'], 
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = 'F9J';

const FIXED_VIDEOS = [
  { videoId: "dQw4w9WgXcQ", title: "Karaokê - Never Gonna Give You Up" },
  { videoId: "9bZkp7q19f0", title: "Karaokê - Gangnam Style" },
  { videoId: "L_jWHffIx5E", title: "Karaokê - Despacito" },
  { videoId: "fJ9rUzIMcZQ", title: "Karaokê - Bohemian Rhapsody" },
  { videoId: "1w7OgIMMRc4", title: "Karaokê - Sweet Child O' Mine" },
  { videoId: "v2AC41dglnM", title: "Karaokê - Back In Black" },
  { videoId: "kXYiU_JCYtU", title: "Karaokê - Numb" },
  { videoId: "hT_nvWreIhg", title: "Karaokê - Counting Stars" }
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
  const name = `STRESS_USER_${vuId}_${randomString(3)}`;

  // 1. Registro (Espalhado em 40s)
  sleep(Math.random() * 40);
  
  const regPayload = JSON.stringify({
    name: name,
    email: `k106_${vuId}_${randomString(8)}@stress.test`,
    phone: '119' + (10000000 + vuId)
  });
  
  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, regPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const regOk = check(regRes, { 'registered ok': (r) => r.status === 200 });
  if (!regOk) {
    console.log(`[VU ${vuId}] REG FAIL: ${regRes.status} ${regRes.body}`);
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

  // 2. Ação Principal (86 Adicionam, 20 Observam)
  if (vuId <= 86) {
    // Simula tempo de "decisão"
    sleep(5 + Math.random() * 15);
    
    const video = FIXED_VIDEOS[Math.floor(Math.random() * FIXED_VIDEOS.length)];
    
    const enqueuePayload = JSON.stringify({
      videoId: video.videoId,
      title: video.title,
      requestedBy: name,
      userId: u_id,
      deviceFingerprint: `dv106_${vuId}_${randomString(8)}`
    });

    const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
      headers: authHeaders
    });

    const enqueueOk = check(enqueueRes, { 'enqueued ok': (r) => r.status === 200 });

    if (!enqueueOk) {
      console.log(`[VU ${vuId}] ENQUEUE FAIL: ${enqueueRes.status} ${enqueueRes.body}`);
      errorRate.add(1);
    } else {
      console.log(`[VU ${vuId}] ✅ SUCESSO: Adicionou: "${video.title}"`);
    }
  }

  // 3. Monitoramento de Estado (Loop para manter carga no servidor)
  for (let i = 0; i < 4; i++) {
    sleep(15 + Math.random() * 20);
    const stateRes = http.get(`${BASE_URL}/api/rooms/${ROOM_CODE}/state`, { headers: authHeaders });
    check(stateRes, { 'state fetched': (r) => r.status === 200 });
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'stress_test_106_queue_report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  let output = '\n=== KARAOKEANDO - TESTE DE FILA PURA (106 USUÁRIOS) ===\n';
  output += `VUs Ativos             : ${data.metrics.vus.values.max}\n`;
  output += `Requisições HTTP Totais: ${data.metrics.http_reqs.values.count}\n`;
  output += `Falhas HTTP            : ${data.metrics.http_req_failed.values.passes}\n`;
  output += `Sucesso nas Checagens  : ${(data.metrics.checks.values.rate * 100).toFixed(2)}%\n`;
  output += `Latência Média (ms)    : ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `Latência p(95) (ms)    : ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  output += `======================================================\n`;
  return output;
}
