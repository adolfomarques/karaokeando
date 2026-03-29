import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const searchSuccess = new Counter('search_success');
const enqueueSuccess = new Counter('enqueue_success');

export const options = {
  scenarios: {
    real_stress: {
      executor: 'per-vu-iterations',
      vus: 113,
      iterations: 1,
      maxDuration: '10m',
    },
  },
  thresholds: {
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = '2HV';
const TOTAL_ENQUEUE_TARGET = 66;

const QUERIES = [
  "péricles", "thiaguinho", "sorriso maroto", "ferrugem", "ludmilla",
  "anitta", "jorge e mateus", "maiara e maraisa", "marília mendança",
  "alcione", "djavan", "caetano veloso", "gilberto gil", "mpb",
  "rock nacional", "legião urbana", "skank", "jota quest", "queen",
  "abba", "bon jovi", "guns n roses", "linkin park", "evanescence"
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
  const uniqueId = `${vuId}_${randomString(4)}`;
  const name = `Bot_${uniqueId}`;
  
  const staggerDelay = (vuId - 1) * 0.4;
  sleep(staggerDelay);

  const regPayload = JSON.stringify({
    name: name,
    email: `test_${uniqueId}@mock.com`,
    phone: '11900000000'
  });
  
  const headers = { 'Content-Type': 'application/json' };
  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, regPayload, { headers });
  
  if (regRes.status !== 200) {
    errorRate.add(1);
    return;
  }

  const { token, user } = JSON.parse(regRes.body);
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  sleep(Math.random() * 2 + 1);

  const baseQuery = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const salt = randomString(8);
  const searchTerm = `${baseQuery} ${salt}`;

  const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(searchTerm)}`, {
    headers: authHeaders
  });

  const searchOk = check(searchRes, {
    'search successful': (r) => r.status === 200,
  });

  if (!searchOk) {
    errorRate.add(1);
    return;
  }

  searchSuccess.add(1);
  const results = JSON.parse(searchRes.body);

  if (results && results.length > 0) {
    if (Math.random() < (TOTAL_ENQUEUE_TARGET / 113)) {
      const video = results[0];
      
      const enqueuePayload = JSON.stringify({
        videoId: video.videoId,
        title: video.title,
        requestedBy: name,
        userId: user.id,
        deviceFingerprint: `device_${uniqueId}`
      });

      const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
        headers: authHeaders
      });

      if (enqueueRes.status === 200) {
        enqueueSuccess.add(1);
        console.log(`[VU ${vuId}] Adicionou: ${video.title}`);
      } else {
        errorRate.add(1);
      }
    }
  }

  sleep(2);
}
