import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = 'https://karaokeando.onrender.com';
const WS_URL = 'wss://karaokeando.onrender.com/ws/F9J';
const ROOM_CODE = 'F9J';

// Mock song queries for variety
const QUERIES = [
  'Evidências karaoke', 'Creep Radiohead karaoke', 'Rolling in the deep karaoke',
  'Shallow Lady Gaga karaoke', 'Bohemian Rhapsody karaoke', 'Fly me to the moon karaoke',
  'Total Eclipse of the Heart karaoke', 'Imagine John Lennon karaoke', 'Dancing Queen ABBA karaoke',
  'Wonderwall Oasis karaoke'
];

export const options = {
  scenarios: {
    // Crowd: 40 passive users who just watch and send occasional reactions
    crowd: {
      executor: 'per-vu-iterations',
      vus: 40,
      iterations: 1,
      startTime: '0s',
    },
    // Singers: 10 active users who search and add songs
    singers: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1,
      startTime: '5s',
    },
  },
};

export default function () {
  const isSinger = __VU > 40; // Users 41-50 are singers
  const userName = isSinger ? `Cantor_${__VU - 40}` : `Publico_${__VU}`;
  
  // 1. Join Room via WebSocket (everyone)
  ws.connect(WS_URL, null, function (socket) {
    socket.on('open', function () {
      socket.send(JSON.stringify({
        type: 'HELLO',
        name: userName,
        role: 'mobile',
        userId: `user_${__VU}_${Math.random().toString(36).slice(2, 6)}`
      }));

      if (isSinger) {
        // Singer Logic
        sleep(Math.random() * 10); // Random offset for search start
        
        // 2. Search for a song
        const query = QUERIES[__VU - 41];
        console.log(`[Singer] ${userName} searching for: ${query}`);
        
        // Signal searching on TV via reaction
        socket.send(JSON.stringify({ type: 'REACTION', reaction: '🔍', name: userName }));
        
        const searchRes = http.get(`${BASE_URL}/api/youtube/search?q=${encodeURIComponent(query)}`);
        
        if (check(searchRes, { 'search success': (r) => r.status === 200 })) {
          const results = searchRes.json();
          if (results && results.length > 0) {
            const song = results[0];
            
            // 3. Add to Queue
            console.log(`[Singer] ${userName} adding: ${song.title}`);
            const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, JSON.stringify({
              videoId: song.videoId,
              title: song.title,
              requestedBy: userName,
              userId: `user_${__VU}_singer`
            }), { headers: { 'Content-Type': 'application/json' } });
            
            check(enqueueRes, { 'enqueue success': (r) => r.status === 200 });
            
            // Signal success on TV
            if (enqueueRes.status === 200) {
              socket.send(JSON.stringify({ type: 'REACTION', reaction: '✅', name: userName }));
            }
          }
        } else {
          errorRate.add(1);
        }
      } else {
        // Passive Crowd Logic
        for(let i=0; i<3; i++) {
           sleep(Math.random() * 30 + 10);
           socket.send(JSON.stringify({ type: 'REACTION', reaction: '👏', name: userName }));
        }
      }

      sleep(60); // Stay in the room to be seen
      socket.close();
    });
  });
}
