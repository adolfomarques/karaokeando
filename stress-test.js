import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '60s', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be under 500ms
    errors: ['rate<0.1'],              // Error rate should be less than 10%
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = 'F9J';
const ARTISTS = ['Evidências', 'Linkin Park', 'Anitta', 'Queen', 'Sertanejo 2024'];

function getRandomArtist() {
  return ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
}

export default function () {
  // Step 1: Check if room exists (public endpoint)
  const roomExistsRes = http.get(`${BASE_URL}/api/rooms/${ROOM_CODE}/exists`);
  check(roomExistsRes, {
    'room exists status is 200': (r) => r.status === 200,
  });

  // Step 2: Get room state (public endpoint)
  const roomStateRes = http.get(`${BASE_URL}/api/rooms/${ROOM_CODE}/state`);
  const roomOk = check(roomStateRes, {
    'room state status is 200': (r) => r.status === 200,
    'room state has queue': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.queue !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!roomOk) {
    errorRate.add(1);
  }

  // Step 3: YouTube Search (5 times with think time)
  for (let i = 0; i < 5; i++) {
    const artist = getRandomArtist();
    const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(artist)}`);
    
    const searchOk = check(searchRes, {
      'search status is 200': (r) => r.status === 200,
      'search returns results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch (e) {
          return false;
        }
      },
    });

    if (!searchOk) {
      errorRate.add(1);
    }

    sleep(3);  // Think time between searches
  }

  // Step 4: Get song library
  const songsRes = http.get(`${BASE_URL}/api/songs`);
  check(songsRes, {
    'songs library status is 200': (r) => r.status === 200,
  });

  // Step 5: Get public score meta
  const scoreMetaRes = http.get(`${BASE_URL}/api/public/score-meta`);
  check(scoreMetaRes, {
    'score meta status is 200': (r) => r.status === 200,
  });

  sleep(1);  // Brief pause between iterations
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stress-test-report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '';
  const colors = opts.enableColors || false;
  
  let output = '\n';
  output += `${indent}=== STRESS TEST RESULTS ===\n`;
  output += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}Failed Requests: ${data.metrics.http_req_failed?.values.passes || 0}\n`;
  output += `${indent}Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `${indent}P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  output += `${indent}Error Rate: ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%\n`;
  
  return output;
}
