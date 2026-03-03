import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Serve game ROMs from games directory
const gamesPath = path.join(__dirname, '../games');
app.use('/roms', express.static(gamesPath));

// Built-in NES game library (public domain/homebrew ROMs)
const BUILTIN_NES_GAMES = [
  {
    id: 'nes/little-medusa',
    name: 'Little Medusa',
    category: 'Puzzle',
    platform: 'nes',
    description: 'A puzzle game where you help Medusa escape a maze',
    year: '2010',
    romPath: 'https://raw.githubusercontent.com/freeman12x/nes-roms/main/homebrew/little-medusa.nes',
    screenshot: null
  },
  {
    id: 'nes/neko',
    name: 'Neko',
    category: 'Action',
    platform: 'nes',
    description: 'A cute cat adventure game',
    year: '2011',
    romPath: 'https://raw.githubusercontent.com/freeman12x/nes-roms/main/homebrew/neko.nes',
    screenshot: null
  },
  {
    id: 'nes/concentration-room',
    name: 'Concentration Room',
    category: 'Puzzle',
    platform: 'nes',
    description: 'A memory matching game',
    year: '2010',
    romPath: 'https://raw.githubusercontent.com/freeman12x/nes-roms/main/homebrew/concentration-room.nes',
    screenshot: null
  },
  {
    id: 'nes/driar',
    name: 'Driar',
    category: 'Adventure',
    platform: 'nes',
    description: 'A dragon-themed platformer',
    year: '2011',
    romPath: 'https://raw.githubusercontent.com/freeman12x/nes-roms/main/homebrew/driar.nes',
    screenshot: null
  }
];

// Built-in DOS games (existing structure)
const BUILTIN_DOS_GAMES = [];

// API route to get list of available games
app.get('/api/games', async (req, res) => {
  try {
    const fs = await import('fs');
    const gamesDir = path.join(__dirname, '../games');
    const games = [...BUILTIN_NES_GAMES];
    
    // Also scan local games directory for additional ROMs
    if (fs.existsSync(gamesDir)) {
      const categories = fs.readdirSync(gamesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const category of categories) {
        const categoryPath = path.join(gamesDir, category);
        const items = fs.readdirSync(categoryPath, { withFileTypes: true });
        
        for (const item of items) {
          if (item.isFile() && item.name.endsWith('.nes')) {
            const name = item.name.replace('.nes', '').replace(/-/g, ' ');
            games.push({
              id: `local/${category}/${item.name}`,
              name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              category: category.charAt(0).toUpperCase() + category.slice(1),
              description: 'Local ROM',
              romUrl: `/roms/${category}/${item.name}`,
              screenshot: null
            });
          }
        }
      }
    }
    
    res.json({ games });
  } catch (error) {
    console.error('Error loading games:', error);
    res.json({ games: BUILTIN_NES_GAMES });
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
  console.log(`🕹️  Games available: ${BUILTIN_NES_GAMES.length} built-in`);
});

export default app;
