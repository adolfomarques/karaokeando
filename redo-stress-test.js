import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be under 2s (relaxed for free tier)
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
  // Step 1: Register as Guest (Crucial for testing DB connection limit)
  const registrationPayload = JSON.stringify({
    name: `User_${__VU}_${__ITER}`,
    email: `test_${__VU}_${__ITER}@example.com`,
    phone: '11999999999',
  });

  const regParams = {
    headers: { 'Content-Type': 'application/json' },
  };

  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, registrationPayload, regParams);
  
  const regOk = check(regRes, {
    'registration status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  if (!regOk) {
    errorRate.add(1);
    // If registration fails, we might still continue to other steps if we have a token from elsewhere,
    // but usually, we want to see the impact of this failure.
  }

  // Step 2: Check room exists
  const roomExistsRes = http.get(`${BASE_URL}/api/rooms/${ROOM_CODE}/exists`);
  check(roomExistsRes, {
    'room exists status is 200': (r) => r.status === 200,
  });

  // Step 3: YouTube Search (3 times as requested in the "last" test)
  for (let i = 0; i < 3; i++) {
    const artist = getRandomArtist();
    const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(artist)}`);
    
    const searchOk = check(searchRes, {
      'search status is 200': (r) => r.status === 200,
    });

    if (!searchOk) {
      errorRate.add(1);
    }

    sleep(2);  // Short think time
  }

  // Step 4: Final library check
  const songsRes = http.get(`${BASE_URL}/api/songs`);
  check(songsRes, {
    'songs library status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
