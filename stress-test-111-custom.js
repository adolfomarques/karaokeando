import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const songsAdded = Counter('songs_added');

export const options = {
  scenarios: {
    stress_111_users: {
      executor: 'per-vu-iterations',
      vus: 111,
      iterations: 1,
      maxDuration: '15m',
    },
  },
  thresholds: {
    errors: ['rate<0.1'],
  },
};

const BASE_URL = 'https://karaokeando.onrender.com';
const ROOM_CODE = '2HV';

const YOUTUBE_SEARCH_QUERIES = [
  'Bohemian Rhapsody Queen',
  'Despacito Luis Fonsi',
  'Gangnam Style Psy',
  'Never Gonna Give You Up',
  'Sweet Child O Mine',
  'Back In Black AC DC',
  'Numb Linkin Park',
  'Counting Stars OneRepublic',
  'Shape of You Ed Sheeran',
  'Uptown Funk Bruno Mars',
  'Shakira Waka Waka',
  'Michael Jackson Thriller',
  'Los del Rio Macarena',
  'Rick Astley Never Gonna',
  'Blue Da Ba Dee Eiffel 65',
  'Crazy Gnarls Barkley',
  'Evidências Chitãozinho',
  'Carnaval Todas as Letras',
  'Sambe de Primeira',
  'AI O Amor É Assim',
  'Agora Tudo Mudou',
  'Dança Kuduro',
  'Believer Imagine Dragons',
  'Perfect Ed Sheeran',
  'Hello Adele',
  'Rolling in the Deep',
  'Someone Like You',
  'Chandelier Sia',
  'Cheap Thrills Sia',
  'Titanium David Guetta',
  'Levels Avicii',
  'Wake Me Up Avicii',
  'Don\'t Let Me Down The Chainsmokers',
  'Closer The Chainsmokers',
  'Havana Camila Cabello',
  'Thank U Next Ariana Grande',
  '7 Rings Ariana Grande',
  'Positions Ariana Grande',
  'Driver\'s License Olivia',
  'Deja Vu Olivia Rodrigo',
  'Good 4 U Olivia Rodrigo',
  'Montero Lil Nas X',
  'Old Town Road Lil Nas X',
  'Peaches Justin Bieber',
  'Stay The Kid LAROI',
  'Heat Waves Glass Animals',
  'Bad Habits Ed Sheeran',
  'Shivers Ed Sheeran',
  'As It Was Harry Styles',
  'Watermelon Sugar Harry Styles',
  'Circles Post Malone',
  'Sunflower Post Malone',
  'Rockstar Post Malone',
  'Blinding Lights The Weeknd',
  'Save Your Tears',
  'Levitating Dua Lipa',
  'Don\'t Start Now Dua Lipa',
  'Physical Dua Lipa',
  'Rain On Me Lady Gaga',
  'Stupid Love Lady Gaga',
  'Bad Guy Billie Eilish',
  'Lovely Billie Eilish',
  'Everything I Wanted',
  'Comedy Gold',
  'Enemies Imagine Dragons',
  'Bones Imagine Dragons',
  'Thunder Imagine Dragons',
  'Believer Imagine Dragons',
  'Natural Imagine Dragons',
  'Enemy Imagine Dragons',
  'Stressed Out Twenty One Pilots',
  'Heathens Twenty One Pilots',
  'Ride Twenty One Pilots',
  'Sicko Mode Travis Scott',
  'God\'s Plan Drake',
  'In My Feelings Drake',
  'Old Town Road',
  'Lucid Dreams Juice WRLD',
  'Sad! Juice WRLD',
  'Happier Marshmello',
  'Alone Marshmello',
  'Faded Alan Walker',
  'Sing Me To Sleep',
  'Darkside Alan Walker',
];

const TARGET_SONGS = 66;

function randomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

let globalSongCount = 0;

export default function () {
  const vuId = __VU;
  const name = `USER_${vuId}_${randomString(3)}`;
  
  console.log(`[VU ${vuId}] 🎤 Iniciando teste na sala ${ROOM_CODE}`);

  sleep(Math.random() * 20);

  const regPayload = JSON.stringify({
    name: name,
    email: `k111_${vuId}_${randomString(8)}@stress.test`,
    phone: '119' + (90000000 + vuId)
  });

  const regRes = http.post(`${BASE_URL}/api/auth/register-guest`, regPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  const regOk = check(regRes, { 'registered ok': (r) => r.status === 200 });
  if (!regOk) {
    console.log(`[VU ${vuId}] ❌ REG FAIL: ${regRes.status} ${regRes.body}`);
    errorRate.add(1);
    return;
  }

  console.log(`[VU ${vuId}] ✅ Registrado como: ${name}`);

  const regData = JSON.parse(regRes.body);
  const token = regData.token;
  const u_id = regData.user.id;
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  sleep(2 + Math.random() * 5);

  const stateRes = http.get(`${BASE_URL}/api/rooms/${ROOM_CODE}/state`, { headers: authHeaders });
  if (stateRes.status === 200) {
    const stateData = JSON.parse(stateRes.body);
    const currentSongs = stateData.queue?.length || 0;
    console.log(`[VU ${vuId}] 📊 Estado atual: ${currentSongs} músicas na fila, ${stateData.participants?.length || 0} participantes`);
  }

  if (globalSongCount < TARGET_SONGS) {
    sleep(3 + Math.random() * 10);
    
    const searchQuery = YOUTUBE_SEARCH_QUERIES[Math.floor(Math.random() * YOUTUBE_SEARCH_QUERIES.length)];
    
    const searchRes = http.get(`${BASE_URL}/api/songs/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: authHeaders
    });

    if (searchRes.status === 200) {
      const searchData = JSON.parse(searchRes.body);
      
      if (searchData.results && searchData.results.length > 0) {
        const video = searchData.results[0];
        
        if (globalSongCount >= TARGET_SONGS) {
          console.log(`[VU ${vuId}] ⏭️ Limite de ${TARGET_SONGS} músicas atingido, apenas observando`);
        } else {
          const enqueuePayload = JSON.stringify({
            videoId: video.videoId,
            title: video.title,
            requestedBy: name,
            userId: u_id,
            deviceFingerprint: `dv111_${vuId}_${randomString(8)}`
          });

          const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
            headers: authHeaders
          });

          const enqueueOk = check(enqueueRes, { 'enqueued ok': (r) => r.status === 200 });

          if (!enqueueOk) {
            console.log(`[VU ${vuId}] ❌ ENQUEUE FAIL: ${enqueueRes.status} ${enqueueRes.body}`);
            errorRate.add(1);
          } else {
            globalSongCount++;
            songsAdded.add(1);
            console.log(`[VU ${vuId}] 🎵 Adicionou: "${video.title}" (${globalSongCount}/${TARGET_SONGS})`);
          }
        }
      } else {
        console.log(`[VU ${vuId}] ⚠️ Sem resultados para: ${searchQuery}`);
      }
    } else {
      console.log(`[VU ${vuId}] ❌ SEARCH FAIL: ${searchRes.status}`);
    }
  }

  sleep(2 + Math.random() * 3);

  for (let i = 0; i < 5; i++) {
    sleep(8 + Math.random() * 12);
    
    if (Math.random() < 0.3 && globalSongCount < TARGET_SONGS) {
      const searchQuery = YOUTUBE_SEARCH_QUERIES[Math.floor(Math.random() * YOUTUBE_SEARCH_QUERIES.length)];
      
      const searchRes = http.get(`${BASE_URL}/api/songs/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: authHeaders
      });

      if (searchRes.status === 200) {
        const searchData = JSON.parse(searchRes.body);
        
        if (searchData.results && searchData.results.length > 0) {
          const video = searchData.results[Math.floor(Math.random() * Math.min(3, searchData.results.length))];
          
          const enqueuePayload = JSON.stringify({
            videoId: video.videoId,
            title: video.title,
            requestedBy: name,
            userId: u_id,
            deviceFingerprint: `dv111_${vuId}_${randomString(8)}`
          });

          const enqueueRes = http.post(`${BASE_URL}/api/rooms/${ROOM_CODE}/enqueue`, enqueuePayload, {
            headers: authHeaders
          });

          if (enqueueRes.status === 200) {
            globalSongCount++;
            songsAdded.add(1);
            console.log(`[VU ${vuId}] 🎵 (loop ${i+1}) Adicionou: "${video.title}" (${globalSongCount}/${TARGET_SONGS})`);
          }
        }
      }
    }
    
    const stateRes = http.get(`${BASE_URL}/api/rooms/${ROOM_CODE}/state`, { headers: authHeaders });
    if (stateRes.status === 200) {
      const stateData = JSON.parse(stateRes.body);
      console.log(`[VU ${vuId}] 📊 Estado: ${stateData.queue?.length || 0} músicas, ${stateData.participants?.length || 0} participantes`);
    }
  }

  console.log(`[VU ${vuId}] ✅ Teste concluído para ${name}`);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'stress_test_111_custom_report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  let output = '\n';
  output += '╔════════════════════════════════════════════════════════════╗\n';
  output += '║     KARAOKEANDO - TESTE STRESS 111 USUÁRIOS              ║\n';
  output += '║     Sala: 2HV | Músicas: 66 | Busca YouTube Real           ║\n';
  output += '╚════════════════════════════════════════════════════════════╝\n\n';
  output += `VUs Ativos              : ${data.metrics.vus.values.max}\n`;
  output += `Requisições HTTP Totais : ${data.metrics.http_reqs.values.count}\n`;
  output += `Músicas Adicionadas     : ${data.metrics.songs_added?.values?.count || 0}\n`;
  output += `Taxa de Erro            : ${(data.metrics.errors?.values?.rate || 0 * 100).toFixed(2)}%\n`;
  output += `Sucesso nas Checagens   : ${(data.metrics.checks.values.rate * 100).toFixed(2)}%\n`;
  output += `Latência Média (ms)     : ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `Latência p(95) (ms)     : ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  output += `Latência Máxima (ms)    : ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  output += '════════════════════════════════════════════════════════════\n';
  return output;
}
