import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    stress_test: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '5m',
    },
  },
  thresholds: {
    errors: ['rate<0.2'], // Allow up to 20% error for this extreme test
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = 'F9J';

const SEARCH_QUERIES = [
  "queen", "beatles", "lady gaga", "bruno mars", "coldplay",
  "rihanna", "drake", "taylor swift", "ed sheeran", "beyonce",
  "michael jackson", "elvis presley", "frank sinatra", "adele",
  "justin bieber", "katy perry", "shakira", "madonna", "prince",
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
  const name = `K6_User_${vuId}_${randomString(4)}`;
  const email = `k6_${vuId}_${randomString(6)}@stress.com`;

  // --- Staggered Startup (spread users over 30s) ---
  sleep(Math.random() * 30);

  // --- 1. Step: Register Guest ---
  const regPayload = JSON.stringify({
    name: name,
    email: email,
    phone: '11999999999'
  });
  
  const regParams = {
    headers: { 'Content-Type': 'application/json' },
  };

  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, regPayload, regParams);
  
  const regOk = check(regRes, {
    'registered': (r) => r.status === 200,
  });

  if (!regOk) {
    console.log(`[VU ${vuId}] Reg Fail: ${regRes.status} ${regRes.body}`);
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

  // --- 2. Step: Search (Staggered HEAVILY to avoid YouTube IP block) ---
  // Spread searches over a 2-minute window
  sleep(Math.random() * 120); 
  
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const salt = randomString(4);
  const searchTerm = `${query} ${salt}`;
  
  const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(searchTerm)}`, {
    headers: authHeaders
  });

  const searchOk = check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body) && body.length > 0;
      } catch (e) {
        return false;
      }
    },
  });

  if (!searchOk) {
    console.log(`[VU ${vuId}] Search Fail/Empty: ${searchRes.status} ${searchTerm}`);
    errorRate.add(1);
    return;
  }

  const results = JSON.parse(searchRes.body);
  const video = results[0];

  // --- 3. Step: Enqueue ---
  sleep(Math.random() * 5); // Simulating choice
  
  const enqueuePayload = JSON.stringify({
    videoId: video.videoId,
    title: video.title,
    requestedBy: name,
    userId: u_id,
    deviceFingerprint: `k6_${vuId}_${randomString(10)}`
  });

  const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
    headers: authHeaders
  });

  const enqueueOk = check(enqueueRes, {
    'enqueued': (r) => r.status === 200,
  });

  if (!enqueueOk) {
    console.log(`[VU ${vuId}] Enqueue Fail: ${enqueueRes.status} ${enqueueRes.body}`);
    errorRate.add(1);
  } else {
    console.log(`[VU ${vuId}] SUCCESS: Added "${video.title}" to queue!`);
  }

  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stress-test-report-v3.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  let output = '\n';
  output += `${indent}=== KARAOKE FACTORY STRESS TEST REPORT ===\n`;
  output += `${indent}Total Users (VUs)  : ${data.metrics.vus?.values.max || data.vus || '--'}\n`;
  output += `${indent}Checks Success Rate: ${(data.metrics.checks?.values.rate * 100 || 0).toFixed(2)}%\n`;
  output += `${indent}Total Search Req   : ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}Search Error Rate  : ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%\n`;
  output += `${indent}Avg Resp Duration  : ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `${indent}Max Resp Duration  : ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  
  if (data.metrics.checks) {
    const checks = data.metrics.checks.values;
    output += `${indent}Total Checks       : ${checks.passes + checks.fails}\n`;
    output += `${indent}Passed Checks      : ${checks.passes}\n`;
    output += `${indent}Failed Checks      : ${checks.fails}\n`;
  }
  
  return output;
}
