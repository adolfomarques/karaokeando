import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const searchSuccess = new Counter('search_success');
const searchEmpty = new Counter('search_empty');
const searchError = new Counter('search_error');
const enqueueSuccess = new Counter('enqueue_success');
const enqueueError = new Counter('enqueue_error');
const registrationSuccess = new Counter('registration_success');
const registrationError = new Counter('registration_error');

const searchDuration = new Trend('search_duration');
const enqueueDuration = new Trend('enqueue_duration');
const registrationDuration = new Trend('registration_duration');

export const options = {
  scenarios: {
    stress_test: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '30m',
    },
  },
  thresholds: {
    errors: ['rate<0.3'],
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = 'F9J';
const TARGET_SONGS = 57;

const QUERIES = [
  "queen bohemian rhapsody karaoke",
  "beatles help karaoke",
  "lady gaga bad romance karaoke",
  "bruno mars karaoke",
  "coldplay viva la vida karaoke",
  "rihanna umbrella karaoke",
  "drake gods plan karaoke",
  "taylor swift karaoke",
  "ed sheeran perfect karaoke",
  "beyoncé single ladies karaoke",
  "michael jackson thriller karaoke",
  "elvis presley hound dog karaoke",
  "frank sinatra my way karaoke",
  "adele rolling in the deep karaoke",
  "justin bieber sorry karaoke",
  "katy perry firework karaoke",
  "shakira whenever wherever karaoke",
  "madonna like a virgin karaoke",
  "prince purple rain karaoke",
  "guns n roses november rain karaoke",
  "nirvana smell like teen spirit karaoke",
  "metallica nothing else matters karaoke",
  "ac dc back in black karaoke",
  "aerosmith i dont want to miss a thing karaoke",
  "maroon 5 sugar karaoke",
  "the weeknd blinding lights karaoke",
  "post malone circles karaoke",
  "billie eilish bad guy karaoke",
  "dua lipa dont start now karaoke",
  "harry styles as it was karaoke",
  "olivia rodrigo drivers license karaoke",
  "doja cat say so karaoke",
  "sza good days karaoke",
  "bad bunny daiquiri karaoke",
  "j balvin mi gente karaoke",
  "anitta envolvilev karaoke",
  "luisa sonza evaporate karaoke",
  "wesley safadão karaoke",
  "banda calypso karaoke",
  "luan santana te esperando karaoke",
  "jorge e Mateus tempo karaoke",
  "henrique e juliano karaoke",
  "marilia mendonca karaoke",
  "ze neto e cristiano karaoke",
  "simone e simaria karaoke",
  "sertanejo karaoke",
  "pagode karaoke",
  "samba karaoke",
  "forró karaoke",
  "axé karaoke",
  "funk karaoke",
  "mpb karaoke",
  "rock n roll karaoke",
  "pop internacional karaoke",
  "anos 80 karaoke",
  "anos 90 karaoke",
  "romantico karaoke",
  "festa karaoke",
];

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomQuery() {
  const base = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const salt = randomString(8);
  return `${base} ${salt}`;
}

function getRandomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const uniqueId = `${vuId}_${iterId}_${randomString(6)}`;
  const name = `User_${uniqueId}`;
  const email = `user_${uniqueId}@test.com`;
  
  const fakeIP = getRandomIP();

  const headersWithIP = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Forwarded-For': fakeIP,
    'X-Real-IP': fakeIP,
    'Client-IP': fakeIP,
  });

  const baseHeaders = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': fakeIP,
    'X-Real-IP': fakeIP,
  };

  const staggerDelay = (vuId - 1) * 2;
  sleep(staggerDelay);

  // === 1. Registration ===
  const regStart = Date.now();
  const regPayload = JSON.stringify({
    name: name,
    email: email,
    phone: '11999999999'
  });

  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, regPayload, { headers: baseHeaders });
  registrationDuration.add(Date.now() - regStart);
  
  const regOk = check(regRes, {
    'registered': (r) => r.status === 200,
  });

  if (!regOk) {
    console.log(`[VU ${vuId}] Registration Failed: ${regRes.status} - ${regRes.body.substring(0, 100)}`);
    registrationError.add(1);
    errorRate.add(1);
    return;
  }

  registrationSuccess.add(1);
  const regData = JSON.parse(regRes.body);
  const token = regData.token;

  // === 2. Search with retry ===
  sleep(1 + Math.random() * 2);
  
  let searchResults = null;
  let selectedVideo = null;
  let searchAttempts = 0;
  
  while (searchAttempts < 3 && !selectedVideo) {
    searchAttempts++;
    const searchTerm = getRandomQuery();
    
    const searchStart = Date.now();
    const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(searchTerm)}`, {
      headers: headersWithIP(token)
    });
    searchDuration.add(Date.now() - searchStart);
    
    if (searchRes.status !== 200) {
      console.log(`[VU ${vuId}] Search HTTP error: ${searchRes.status}`);
      searchError.add(1);
      sleep(2);
      continue;
    }
    
    try {
      const body = JSON.parse(searchRes.body);
      
      if (!Array.isArray(body) || body.length === 0) {
        console.log(`[VU ${vuId}] Empty results: ${searchTerm.substring(0, 30)}`);
        searchEmpty.add(1);
        sleep(1);
        continue;
      }
      
      searchSuccess.add(1);
      searchResults = body;
      
      const maxIndex = Math.min(body.length, 5);
      selectedVideo = body[Math.floor(Math.random() * maxIndex)];
      console.log(`[VU ${vuId}] Found: ${selectedVideo.title.substring(0, 40)}`);
      
    } catch (e) {
      console.log(`[VU ${vuId}] Parse error: ${e.message}`);
      searchError.add(1);
      sleep(2);
    }
  }
  
  if (!selectedVideo) {
    console.log(`[VU ${vuId}] Failed to find video after attempts`);
    return;
  }

  // === 3. Enqueue ===
  sleep(0.5 + Math.random() * 1);
  
  const enqueueStart = Date.now();
  const enqueuePayload = JSON.stringify({
    videoId: selectedVideo.videoId,
    title: selectedVideo.title,
    requestedBy: name,
    userId: regData.user.id,
    deviceFingerprint: `user_${uniqueId}`
  });

  const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
    headers: headersWithIP(token)
  });
  enqueueDuration.add(Date.now() - enqueueStart);

  const enqueueOk = check(enqueueRes, {
    'enqueued': (r) => r.status === 200,
  });

  if (!enqueueOk) {
    console.log(`[VU ${vuId}] Enqueue Failed: ${enqueueRes.status} - ${enqueueRes.body.substring(0, 100)}`);
    enqueueError.add(1);
    errorRate.add(1);
  } else {
    enqueueSuccess.add(1);
    console.log(`[VU ${vuId}] ✓ Added: ${selectedVideo.title.substring(0, 40)}`);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const totalReg = data.metrics.registration_success?.values?.count || 0;
  const totalSearchOk = data.metrics.search_success?.values?.count || 0;
  const totalSearchEmpty = data.metrics.search_empty?.values?.count || 0;
  const totalSearchErr = data.metrics.search_error?.values?.count || 0;
  const totalEnqueue = data.metrics.enqueue_success?.values?.count || 0;
  const totalEnqueueErr = data.metrics.enqueue_error?.values?.count || 0;
  const totalRegErr = data.metrics.registration_error?.values?.count || 0;
  
  const httpCount = data.metrics.http_reqs?.values?.count || 0;
  const duration = data.metrics.http_req_duration;
  
  const successRate = ((totalEnqueue / 100) * 100).toFixed(2);
  
  const report = {
    test_info: {
      target_users: 100,
      target_songs: TARGET_SONGS,
      room: ROOM_CODE,
      url: BASE_URL,
      technique: "Multi-IP simulation via X-Forwarded-For headers",
    },
    results: {
      registrations_ok: totalReg,
      registrations_fail: totalRegErr,
      searches_ok: totalSearchOk,
      searches_empty: totalSearchEmpty,
      searches_error: totalSearchErr,
      songs_added: totalEnqueue,
      enqueue_fail: totalEnqueueErr,
      success_rate: successRate + '%',
    },
    performance: {
      total_requests: httpCount,
      avg_ms: duration?.values?.avg?.toFixed(2) || 0,
      p50_ms: duration?.values?.med?.toFixed(2) || 0,
      p95_ms: duration?.values?.['p(95)']?.toFixed(2) || 0,
      max_ms: duration?.values?.max?.toFixed(2) || 0,
    },
    checks: data.metrics.checks,
  };

  return {
    'stdout': textSummary(report),
    'stress-test-100-final-report.json': JSON.stringify(report, null, 2),
  };
}

function textSummary(r) {
  let out = '\n';
  out += `═══════════════════════════════════════════════════════════════════\n`;
  out += `     STRESS TEST 100 USUÁRIOS - ${TARGET_SONGS} MÚSICAS - SALA ${ROOM_CODE}\n`;
  out += `═══════════════════════════════════════════════════════════════════\n\n`;
  
  out += `🎯 OBJETIVO\n`;
  out += `   Usuários: 100 | Músicas: ${TARGET_SONGS} | Sala: ${ROOM_CODE}\n\n`;
  
  out += `📊 RESULTADOS\n`;
  out += `───────────────────────────────────────────────────────────────────\n`;
  out += `   ✓ Cadastros      : ${r.results.registrations_ok} / 100\n`;
  out += `   ✓ Buscas OK      : ${r.results.searches_ok}\n`;
  out += `   ○ Buscas Vazias  : ${r.results.searches_empty}\n`;
  out += `   ✗ Buscas Erro    : ${r.results.searches_error}\n`;
  out += `   ✓ Músicas Adicionadas: ${r.results.songs_added} / ${TARGET_SONGS} (${r.results.success_rate})\n`;
  out += `   ✗ Erros Enqueue  : ${r.results.enqueue_fail}\n\n`;
  
  out += `⚡ PERFORMANCE\n`;
  out += `───────────────────────────────────────────────────────────────────\n`;
  out += `   Requisições HTTP: ${r.performance.total_requests}\n`;
  out += `   Tempo Médio     : ${r.performance.avg_ms}ms\n`;
  out += `   P50            : ${r.performance.p50_ms}ms\n`;
  out += `   P95            : ${r.performance.p95_ms}ms\n`;
  out += `   Máximo         : ${r.performance.max_ms}ms\n\n`;
  
  out += `═══════════════════════════════════════════════════════════════════\n`;
  return out;
}
