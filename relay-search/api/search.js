import { Innertube, UniversalCache } from 'youtubei.js';

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Missing query' });
  }

  try {
    // Basic CORS (can be more restrictive)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const youtube = await Innertube.create({ 
      cache: new UniversalCache(false), 
      generate_session_locally: true 
    });
    
    const searchTerm = q + " karaoke";
    const search = await youtube.search(searchTerm, { type: 'video' });
    
    const results = search.videos.filter(v => v.type === 'Video').map(v => ({
      videoId: v.id,
      title: v.title.text,
      thumbnail: v.thumbnails[0]?.url || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
      channelTitle: v.author.name
    }));

    // Cache responses for 1 hour on Vercel Edge
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(results);
  } catch (err) {
    console.error('Relay error:', err);
    res.status(500).json({ 
      error: 'RELAY_FAILED', 
      message: err.message,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });
  }
}
