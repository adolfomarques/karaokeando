import { Innertube, UniversalCache } from 'youtubei.js';

export default async (req, context) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  
  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
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

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate'
      }
    });
  } catch (err) {
    console.error('Relay error:', err);
    return new Response(JSON.stringify({ 
      error: 'RELAY_FAILED', 
      message: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/api/search"
};
