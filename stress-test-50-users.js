import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const searchSuccess = new Counter('search_success');
const enqueueSuccess = new Counter('enqueue_success');

export const options = {
  scenarios: {
    stress_test: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '30m',
    },
  },
  thresholds: {
    errors: ['rate<0.5'],
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = 'F9J';

const SEARCH_QUERIES = [
  "queen bohemian rhapsody", "beatles help", "lady gaga bad romance",
  "bruno mars just way you are", "coldplay viva la vida", "rihanna umbrella",
  "drake god's plan", "taylor swift shake it off", "ed sheeran perfect",
  "beyoncé single ladies", "michael jackson thriller", "elvis presley hound dog",
  "frank sinatra my way", "adele rolling in the deep", "justin bieber sorry",
  "katy perry firework", "shakira whenever wherever", "madonna like a virgin",
  "prince purple rain", "guns n roses november rain", "nirvana smell like teen spirit",
  "metallica nothing else matters", "ac dc back in black", "aerosmith i dont want to miss a thing",
  "maroon 5 sugar", "the weeknd blinding lights", "post malone circles",
  "billie eilish bad guy", "dua lipa don't start now", "harry styles as it was",
  "olivia rodrigo drivers license", "doja cat say so", "sza good days",
  "bad bunny daiquiri", "j balvin mi gente", "anitta envolvilev",
  "luisa sonza evaporate", "wesley safadao", "banda calypso",
  "luan santana te esperando", "jorge e mateus tiempo",
  "henrique e juliano rendicao", "marilia mendona todo mundo",
  "ze neto e cristiano", "simone e simaria"
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
  const iterId = __ITER;
  const uniqueId = `${vuId}_${iterId}_${randomString(6)}`;
  const name = `User_${uniqueId}`;
  const email = `user_${uniqueId}@test.com`;

  console.log(`[VU ${vuId}] Starting user ${name}`);

  // Stagger start times: 6 seconds between each user to avoid rate limit
  // With 50 users and 10/min limit, need 5 minutes total
  const staggerDelay = (vuId - 1) * 6;
  sleep(staggerDelay);

  // --- 1. Register Guest ---
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
    console.log(`[VU ${vuId}] Registration Failed: ${regRes.status} - ${regRes.body}`);
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

  // --- 2. Search (with unique query to avoid cache) ---
  // Wait 10 seconds after registration before searching (rate limit spacing)
  sleep(10);
  
  const baseQuery = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const uniqueSalt = randomString(8);
  const searchTerm = `${baseQuery} ${uniqueSalt}`;
  
  console.log(`[VU ${vuId}] Searching for: ${searchTerm}`);

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
    console.log(`[VU ${vuId}] Search Failed: ${searchRes.status} - ${searchTerm} - ${searchRes.body}`);
    errorRate.add(1);
    return;
  }

  searchSuccess.add(1);
  const results = JSON.parse(searchRes.body);
  
  const video = results[Math.floor(Math.random() * Math.min(results.length, 5))];
  console.log(`[VU ${vuId}] Selected: ${video.title} (${video.videoId})`);

  // --- 3. Enqueue (add to queue) ---
  sleep(Math.random() * 3 + 1);
  
  const enqueuePayload = JSON.stringify({
    videoId: video.videoId,
    title: video.title,
    requestedBy: name,
    userId: u_id,
    deviceFingerprint: `user_${uniqueId}`
  });

  const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
    headers: authHeaders
  });

  const enqueueOk = check(enqueueRes, {
    'enqueued': (r) => r.status === 200,
  });

  if (!enqueueOk) {
    console.log(`[VU ${vuId}] Enqueue Failed: ${enqueueRes.status} - ${enqueueRes.body}`);
    errorRate.add(1);
  } else {
    enqueueSuccess.add(1);
    console.log(`[VU ${vuId}] SUCCESS: Added "${video.title}" to queue!`);
  }

  sleep(1);
}

export function handleSummary(data) {
  const totalSearches = data.metrics.search_success?.values?.count || 0;
  const totalEnqueues = data.metrics.enqueue_success?.values?.count || 0;
  const totalErrors = data.metrics.errors?.values?.count || 0;
  
  const report = {
    ...data,
    custom_summary: {
      total_users_attempted: 50,
      successful_searches: totalSearches,
      successful_enqueues: totalEnqueues,
      total_errors: totalErrors,
      success_rate: totalEnqueues > 0 ? ((totalEnqueues / 50) * 100).toFixed(2) + '%' : '0%',
    }
  };

  return {
    'stdout': textSummary(data, { indent: ' ' }),
    'stress-test-50-report.json': JSON.stringify(report, null, 2),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  const totalSearches = data.metrics.search_success?.values?.count || 0;
  const totalEnqueues = data.metrics.enqueue_success?.values?.count || 0;
  const totalErrors = data.metrics.errors?.values?.count || 0;
  
  let output = '\n';
  output += `${indent}=== STRESS TEST 50 USERS - ROOM F9J ===\n`;
  output += `${indent}Target Room         : ${ROOM_CODE}\n`;
  output += `${indent}Total VUs (Users)   : ${data.metrics.vus?.values.max || data.vus || 50}\n`;
  output += `${indent}Successful Searches : ${totalSearches}\n`;
  output += `${indent}Successful Enqueues : ${totalEnqueues}\n`;
  output += `${indent}Total Errors        : ${totalErrors}\n`;
  output += `${indent}Success Rate        : ${((totalEnqueues / 50) * 100).toFixed(2)}%\n`;
  output += `${indent}Total HTTP Requests : ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}Avg Response Time   : ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `${indent}Max Response Time    : ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  
  if (data.metrics.checks) {
    const checks = data.metrics.checks.values;
    output += `${indent}Total Checks        : ${checks.passes + checks.fails}\n`;
    output += `${indent}Passed Checks       : ${checks.passes}\n`;
    output += `${indent}Failed Checks       : ${checks.fails}\n`;
  }
  
  return output;
}
