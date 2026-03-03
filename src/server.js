import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(compression());
app.use(cors());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'nes-arcade', timestamp: new Date().toISOString() });
});

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Cache for games list
let gamesCache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fetch games from retrobrews/nes-games GitHub repo
async function fetchGamesFromGitHub() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: '/repos/retrobrews/nes-games/contents?ref=master',
      method: 'GET',
      headers: {
        'User-Agent': 'NES-Arcade/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const files = JSON.parse(data);
          const games = [];
          
          // Group .nes files with their .png and .txt
          const nesFiles = files.filter(f => f.name.endsWith('.nes'));
          
          for (const nes of nesFiles) {
            const baseName = nes.name.replace('.nes', '');
            const png = files.find(f => f.name === baseName + '.png');
            const txt = files.find(f => f.name === baseName + '.txt');
            
            // Clean up name for display
            const displayName = baseName
              .replace(/-/g, ' ')
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, str => str.toUpperCase())
              .trim();
            
            games.push({
              id: baseName,
              name: displayName,
              romUrl: `https://raw.githubusercontent.com/retrobrews/nes-games/master/${nes.name}`,
              screenshot: png ? `https://raw.githubusercontent.com/retrobrews/nes-games/master/${png.name}` : null,
              description: txt ? `https://raw.githubusercontent.com/retrobrews/nes-games/master/${txt.name}` : null,
              category: 'Homebrew',
              source: 'retrobrews'
            });
          }
          
          resolve(games);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// API route to get list of available games
app.get('/api/games', async (req, res) => {
  try {
    // Use cache if valid
    const now = Date.now();
    if (gamesCache && (now - cacheTime) < CACHE_TTL) {
      return res.json({ games: gamesCache, cached: true });
    }
    
    // Fetch from GitHub
    const games = await fetchGamesFromGitHub();
    gamesCache = games;
    cacheTime = now;
    
    console.log(`Loaded ${games.length} games from GitHub`);
    res.json({ games, cached: false });
  } catch (error) {
    console.error('Error loading games:', error);
    // Return cached data if available, else empty
    res.json({ games: gamesCache || [], error: 'Failed to fetch games' });
  }
});

// API route to search games
app.get('/api/games/search', async (req, res) => {
  try {
    const query = (req.query.q || '').toLowerCase();
    
    // Use cache or fetch
    const now = Date.now();
    if (!gamesCache || (now - cacheTime) >= CACHE_TTL) {
      gamesCache = await fetchGamesFromGitHub();
      cacheTime = now;
    }
    
    const filtered = gamesCache.filter(g => 
      g.name.toLowerCase().includes(query) ||
      g.id.toLowerCase().includes(query)
    );
    
    res.json({ games: filtered, query });
  } catch (error) {
    console.error('Error searching games:', error);
    res.json({ games: [], error: error.message });
  }
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 NES Arcade Webapp running on port ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

export default app;
