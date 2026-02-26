import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRoutes from './health-check.js';

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

// Health check routes
app.use('/health', healthRoutes);

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Serve game ROMs from games directory
const gamesPath = path.join(__dirname, '../games');
app.use('/games', express.static(gamesPath));

// API route to get list of available games
app.get('/api/games', async (req, res) => {
  try {
    const fs = await import('fs');
    const gamesDir = path.join(__dirname, '../games');
    
    if (!fs.existsSync(gamesDir)) {
      return res.json({ games: [] });
    }
    
    const categories = fs.readdirSync(gamesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const games = [];
    
    for (const category of categories) {
      const categoryPath = path.join(gamesDir, category);
      const gameFolders = fs.readdirSync(categoryPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const game of gameFolders) {
        const gamePath = path.join(categoryPath, game);
        const infoPath = path.join(gamePath, 'info.json');
        
        if (fs.existsSync(infoPath)) {
          const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
          games.push({
            id: `${category}/${game}`,
            category,
            name: info.name || game,
            description: info.description || '',
            controls: info.controls || '',
            year: info.year || '',
            publisher: info.publisher || '',
            screenshot: info.screenshot || `/games/${category}/${game}/screenshot.png`,
            romPath: `/games/${category}/${game}/game.zip`
          });
        }
      }
    }
    
    res.json({ games });
  } catch (error) {
    console.error('Error loading games:', error);
    res.status(500).json({ error: 'Failed to load games', games: [] });
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
  console.log(`🕹️  Retro Arcade Webapp running on port ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

export default app;
