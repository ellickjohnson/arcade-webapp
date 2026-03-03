// NES Arcade - Simple Working Frontend
(function() {
  // State
  let allGames = [];
  let currentGame = null;
  let nes = null;
  let audioCtx = null;
  let frameBuffer = null;
  let animationId = null;

  // DOM Elements
  const menuView = document.getElementById('menu-view');
  const playerView = document.getElementById('player-view');
  const gamesGrid = document.getElementById('games-grid');
  const searchInput = document.getElementById('search-input');
  const gameTitle = document.getElementById('game-title');
  const nesCanvas = document.getElementById('nes-canvas');
  const loadingOverlay = document.getElementById('loading-overlay');
  const controlsPanel = document.getElementById('controls-panel');
  const toast = document.getElementById('toast');

  // Initialize
  async function init() {
    setupEventListeners();
    await loadGames();
  }

  function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', debounce(filterGames, 200));
    
    // Back button
    document.getElementById('back-btn').addEventListener('click', backToMenu);
    
    // Fullscreen
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    
    // Controls
    document.getElementById('controls-btn').addEventListener('click', () => {
      controlsPanel.classList.remove('hidden');
    });
    document.getElementById('close-controls').addEventListener('click', () => {
      controlsPanel.classList.add('hidden');
    });
    controlsPanel.addEventListener('click', (e) => {
      if (e.target === controlsPanel) controlsPanel.classList.add('hidden');
    });
  }

  async function loadGames() {
    gamesGrid.innerHTML = '<div class="loading">Loading games...</div>';
    
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      allGames = data.games || [];
      console.log(`Loaded ${allGames.length} games`);
      renderGames(allGames);
    } catch (e) {
      console.error('Failed to load games:', e);
      gamesGrid.innerHTML = '<div class="error">Failed to load games. <button onclick="location.reload()">Retry</button></div>';
    }
  }

  function filterGames() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      renderGames(allGames);
      return;
    }
    
    const filtered = allGames.filter(g => 
      g.name.toLowerCase().includes(query) ||
      g.id.toLowerCase().includes(query)
    );
    renderGames(filtered);
  }

  function renderGames(games) {
    if (games.length === 0) {
      gamesGrid.innerHTML = '<div class="no-games">No games found</div>';
      return;
    }

    gamesGrid.innerHTML = games.map(game => `
      <div class="game-card" data-id="${game.id}" data-url="${game.romUrl}" data-name="${escapeHtml(game.name)}">
        <div class="game-thumb">
          ${game.screenshot 
            ? `<img src="${game.screenshot}" alt="${escapeHtml(game.name)}" loading="lazy" onerror="this.parentElement.innerHTML='🎮'">`
            : '🎮'}
        </div>
        <div class="game-info">
          <div class="game-name">${escapeHtml(game.name)}</div>
          <div class="game-category">${game.category || 'Homebrew'}</div>
        </div>
      </div>
    `).join('');

    // Add click handlers
    gamesGrid.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        const name = card.dataset.name;
        loadGame(url, name);
      });
    });
  }

  async function loadGame(romUrl, gameName) {
    currentGame = { url: romUrl, name: gameName };
    
    // Show player view
    menuView.classList.add('hidden');
    playerView.classList.remove('hidden');
    gameTitle.textContent = gameName;
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.querySelector('.loading-text').textContent = 'Downloading ROM...';

    try {
      // Download ROM
      const res = await fetch(romUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const arrayBuffer = await res.arrayBuffer();
      const romData = new Uint8Array(arrayBuffer);
      
      loadingOverlay.querySelector('.loading-text').textContent = 'Starting emulator...';
      
      // Initialize NES
      initNES(romData);
      
      loadingOverlay.classList.add('hidden');
      showToast('Game loaded! Use arrow keys + Z/X to play');
      
    } catch (e) {
      console.error('Failed to load game:', e);
      loadingOverlay.querySelector('.loading-text').textContent = `Error: ${e.message}`;
      showToast(`Failed to load game: ${e.message}`);
    }
  }

  function initNES(romData) {
    // Stop previous emulator
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (nes) {
      nes = null;
    }

    // Setup canvas
    const ctx = nesCanvas.getContext('2d');
    frameBuffer = ctx.createImageData(256, 240);

    // Initialize jsnes
    nes = new jsnes.NES({
      onFrame: (buffer) => {
        for (let i = 0; i < buffer.length; i++) {
          const pixel = buffer[i];
          const offset = i * 4;
          frameBuffer.data[offset] = (pixel >> 16) & 0xFF;
          frameBuffer.data[offset + 1] = (pixel >> 8) & 0xFF;
          frameBuffer.data[offset + 2] = pixel & 0xFF;
          frameBuffer.data[offset + 3] = 0xFF;
        }
        ctx.putImageData(frameBuffer, 0, 0);
      },
      onAudioSample: (left, right) => {
        // Skip audio for simplicity
      }
    });

    // Convert ROM to string
    let romString = '';
    for (let i = 0; i < romData.length; i++) {
      romString += String.fromCharCode(romData[i]);
    }

    // Load ROM
    nes.loadROM(romString);

    // Start emulation loop
    let lastTime = 0;
    const frameTime = 1000 / 60;

    function frame(timestamp) {
      if (!nes) return;
      
      const delta = timestamp - lastTime;
      if (delta >= frameTime) {
        nes.frame();
        lastTime = timestamp - (delta % frameTime);
      }
      animationId = requestAnimationFrame(frame);
    }
    
    animationId = requestAnimationFrame(frame);

    // Setup keyboard
    setupKeyboard();
    
    // Focus canvas
    nesCanvas.focus();
  }

  function setupKeyboard() {
    const keys = {
      'ArrowUp': jsnes.Controller.BUTTON_UP,
      'ArrowDown': jsnes.Controller.BUTTON_DOWN,
      'ArrowLeft': jsnes.Controller.BUTTON_LEFT,
      'ArrowRight': jsnes.Controller.BUTTON_RIGHT,
      'z': jsnes.Controller.BUTTON_A,
      'Z': jsnes.Controller.BUTTON_A,
      'x': jsnes.Controller.BUTTON_B,
      'X': jsnes.Controller.BUTTON_B,
      'Enter': jsnes.Controller.BUTTON_START,
      'Shift': jsnes.Controller.BUTTON_SELECT
    };

    document.onkeydown = (e) => {
      if (keys[e.key] !== undefined) {
        nes.buttonDown(1, keys[e.key]);
        e.preventDefault();
      }
    };

    document.onkeyup = (e) => {
      if (keys[e.key] !== undefined) {
        nes.buttonUp(1, keys[e.key]);
        e.preventDefault();
      }
    };
  }

  function backToMenu() {
    // Stop emulator
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    nes = null;
    document.onkeydown = null;
    document.onkeyup = null;

    // Switch views
    playerView.classList.add('hidden');
    menuView.classList.remove('hidden');
    currentGame = null;
  }

  function toggleFullscreen() {
    const container = document.getElementById('emulator-container');
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(e => showToast('Fullscreen not available'));
    } else {
      document.exitFullscreen();
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
  }

  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Start
  init();
})();
