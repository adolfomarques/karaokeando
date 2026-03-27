import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = 'https://karaokeando.onrender.com';
const WS_URL = 'wss://karaokeando.onrender.com/ws/F9J';
const ROOM_CODE = 'F9J';
const ARTISTS = ['Evidências', 'Linkin Park', 'Anitta', 'Queen', 'Sertanejo 2024'];

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay for 2 minutes
    { duration: '15s', target: 0 },   // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.15'],             // Allow some errors on free tier
  },
};

function getRandomArtist() {
  return ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
}

export default function () {
  // 1. Register/Login as Guest
  const userName = `StressUser_${__VU}_${__ITER}`;
  const registrationPayload = JSON.stringify({
    name: userName,
    email: `stress_${__VU}_${Math.random().toString(36).slice(2)}@test.com`,
    phone: '11999999999',
  });

  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, registrationPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const regOk = check(regRes, {
    'reg status is 200': (r) => r.status === 200 || r.status === 201,
  });

  if (!regOk) {
    errorRate.add(1);
    return;
  }

  const token = regRes.json().token;
  const userId = regRes.json().user.id;

  // 2. Connect to WebSocket to appear in the room
  ws.connect(WS_URL, null, function (socket) {
    socket.on('open', function () {
      // 3. Send HELLO to identify as a participant
      socket.send(JSON.stringify({
        type: 'HELLO',
        token: token,
        name: userName,
        role: 'mobile'
      }));

      // 4. Interaction Loop (Search 3 times)
      for (let i = 0; i < 3; i++) {
        sleep(Math.random() * 5 + 2); // Random delay between actions

        const artist = getRandomArtist();
        const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(artist)}`);
        
        const searchOk = check(searchRes, {
          'search successful': (r) => r.status === 200,
        });

        if (searchOk) {
           // 5. Send REACTION to make it visible on TV
           socket.send(JSON.stringify({
             type: 'REACTION',
             reaction: '🔍',
             name: userName,
             userId: userId
           }));
        } else {
          errorRate.add(1);
        }
      }

      // Briefly stay in the room then disconnect
      sleep(10);
      socket.close();
    });

    socket.on('error', function (e) {
      errorRate.add(1);
    });
  });
}
