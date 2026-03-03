// Retro Arcade Webapp - Frontend JavaScript

class RetroArcade {
  constructor() {
    this.games = [];
    this.filteredGames = [];
    this.currentGame = null;
    this.currentPlatform = 'dos';
    this.dosEmulator = null;
    this.nesEmulator = null;
    this.nesFrameId = null;
    this.romData = null;
    this.init();
  }

  async init() {
    this.cacheDOM();
    this.bindEvents();
    await this.loadGames();
    this.setupNES();
  }

  cacheDOM() {
    this.dom = {
      menuView: document.getElementById('menu-view'),
      playerView: document.getElementById('player-view'),
      gamesGrid: document.getElementById('games-grid'),
      gameSearch: document.getElementById('game-search'),
      categoryFilter: document.getElementById('category-filter'),
      backBtn: document.getElementById('back-btn'),
      gameTitle: document.getElementById('game-title'),
      emulatorContainer: document.getElementById('emulator-container'),
      controlsBtn: document.getElementById('controls-btn'),
      controlsPanel: document.getElementById('game-controls-panel'),
      controlsText: document.getElementById('controls-text'),
      helpBtn: document.getElementById('help-btn'),
      helpModal: document.getElementById('help-modal'),
      errorToast: document.getElementById('error-toast'),
      closeButtons: document.querySelectorAll('.close-btn'),
      platformButtons: document.querySelectorAll('.platform-btn'),
      nesRomLoader: document.getElementById('nes-rom-loader'),
      romUrlInput: document.getElementById('rom-url-input'),
      loadRomBtn: document.getElementById('load-rom-btn'),
      romFileInput: document.getElementById('rom-file-input')
    };
  }

  bindEvents() {
    // Platform switching
    this.dom.platformButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchPlatform(btn.dataset.platform));
    });

    // Search functionality
    this.dom.gameSearch.addEventListener('input', () => this.filterGames());
    this.dom.categoryFilter.addEventListener('change', () => this.filterGames());

    // Navigation
    this.dom.backBtn.addEventListener('click', () => this.backToMenu());

    // Controls panel
    this.dom.controlsBtn.addEventListener('click', () => this.showControls());
    this.dom.controlsPanel.querySelector('.close-btn').addEventListener('click', () => this.hideControls());

    // Help modal
    this.dom.helpBtn.addEventListener('click', () => this.showHelp());
    this.dom.helpModal.querySelector('.close-btn').addEventListener('click', () => this.hideHelp());

    // NES ROM loading
    this.dom.loadRomBtn.addEventListener('click', () => this.loadCustomROM());
    this.dom.romUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loadCustomROM();
    });
    this.dom.romFileInput.addEventListener('change', (e) => this.loadROMFile(e));

    // Close all modals on outside click
    this.dom.helpModal.addEventListener('click', (e) => {
      if (e.target === this.dom.helpModal) this.hideHelp();
    });

    // Close controls panel on outside click
    this.dom.controlsPanel.addEventListener('click', (e) => {
      if (e.target === this.dom.controlsPanel) this.hideControls();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideHelp();
        this.hideControls();
      }
      if (e.key === 'F11') {
        e.preventDefault();
        this.toggleFullscreen();
      }
    });
  }

  switchPlatform(platform) {
    this.currentPlatform = platform;
    
    // Update UI
    this.dom.platformButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.platform === platform);
    });
    
    // Show/hide NES ROM loader
    if (platform === 'nes') {
      this.dom.nesRomLoader.classList.remove('hidden');
    } else {
      this.dom.nesRomLoader.classList.add('hidden');
    }
    
    // Filter games by platform
    this.filterGames();
  }

  async loadGames() {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      this.games = data.games || [];
      this.filteredGames = [...this.games];
      this.populateCategories();
      this.renderGames();
    } catch (error) {
      this.showError('Failed to load games. Please check the server.');
      this.dom.gamesGrid.innerHTML = '<div class="error">Failed to load games</div>';
    }
  }

  populateCategories() {
    const categories = [...new Set(this.games.map(game => game.category))];
    categories.sort();
    
    this.dom.categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      this.dom.categoryFilter.appendChild(option);
    });
  }

  filterGames() {
    const searchTerm = this.dom.gameSearch.value.toLowerCase();
    const category = this.dom.categoryFilter.value;

    this.filteredGames = this.games.filter(game => {
      const matchesPlatform = game.platform === this.currentPlatform;
      const matchesSearch = game.name.toLowerCase().includes(searchTerm) ||
                           game.description.toLowerCase().includes(searchTerm);
      const matchesCategory = category === 'all' || game.category === category;
      return matchesPlatform && matchesSearch && matchesCategory;
    });

    this.renderGames();
  }

  renderGames() {
    if (this.filteredGames.length === 0) {
      this.dom.gamesGrid.innerHTML = `<div class="loading">${this.currentPlatform === 'nes' ? 'No NES games loaded. Use custom ROM below.' : 'No games found'}</div>`;
      return;
    }

    this.dom.gamesGrid.innerHTML = this.filteredGames.map(game => `
      <div class="game-card" data-id="${game.id}">
        <div class="game-card-image">
          ${game.screenshot ? `<img src="${game.screenshot}" alt="${game.name}" onerror="this.style.display='none';this.parentElement.innerHTML='🕹️'">` : '🕹️'}
          ${game.platform ? `<span class="game-platform-badge">${game.platform.toUpperCase()}</span>` : ''}
        </div>
        <div class="game-card-content">
          <h3 class="game-card-title">${game.name}</h3>
          <p class="game-card-category">${game.category}</p>
          ${game.year ? `<p class="game-card-year">${game.year}</p>` : ''}
        </div>
      </div>
    `).join('');

    // Add click listeners to game cards
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => this.loadGame(card.dataset.id));
    });
  }

  async loadGame(gameId) {
    this.currentGame = this.games.find(game => game.id === gameId);
    if (!this.currentGame) {
      this.showError('Game not found');
      return;
    }

    // Update UI
    this.dom.gameTitle.textContent = this.currentGame.name;
    
    const controls = this.getControlsText();
    this.dom.controlsText.textContent = controls;
    
    // Show player view
    this.dom.menuView.classList.add('hidden');
    this.dom.playerView.classList.remove('hidden');

    // Load emulator based on platform
    if (this.currentPlatform === 'nes') {
      await this.loadNESEmulator(this.currentGame.romPath);
    } else {
      await this.loadDOSEmulator();
    }
  }

  getControlsText() {
    if (this.currentPlatform === 'nes') {
      return 'Arrow keys: D-Pad | Z: A Button | X: B Button | Enter: Start | Shift: Select';
    }
    return this.currentGame.controls || 'Arrow keys: Move | Z: Action | X: Alt Action | Enter: Start';
  }

  async loadDOSEmulator() {
    this.dom.emulatorContainer.innerHTML = '<div class="emulator-loading">Loading DOS Emulator...</div>';

    try {
      const options = {
        scale: 1.5,
        aspectRatio: 4/3,
        fullscreen: false
      };

      if (typeof Dos === 'undefined') {
        throw new Error('js-dos library not loaded. Please check your internet connection.');
      }

      const canvas = document.createElement('canvas');
      canvas.id = 'dos-canvas';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      this.dom.emulatorContainer.innerHTML = '';
      this.dom.emulatorContainer.appendChild(canvas);

      const bundleUrl = this.currentGame.romPath;
      const ci = Dos(canvas, options);
      
      await ci.fs.extract(bundleUrl);
      await ci.main(['/game.exe']);
      
      this.dosEmulator = ci;
    } catch (error) {
      console.error('DOS Emulator load error:', error);
      this.showError(`Failed to load game: ${error.message}`);
      this.dom.emulatorContainer.innerHTML = `
        <div class="error-container">
          <p class="error-message">Failed to load DOS emulator</p>
          <p class="error-detail">${error.message}</p>
          <p class="error-tip">Make sure the ROM file exists at: ${this.currentGame.romPath}</p>
        </div>
      `;
    }
  }

  setupNES() {
    if (typeof jsnes === 'undefined') {
      console.error('jsnes library not loaded');
      return;
    }

    this.nesEmulator = new jsnes.NES({
      onFrame: this.onFrame.bind(this),
      onAudioSample: this.onAudioSample.bind(this)
    });
  }

  onFrame(buffer) {
    const imageData = this.nesImageData;
    if (!imageData) return;

    for (let i = 0; i < 256 * 240; i++) {
      const color = buffer[i];
      imageData.data[i * 4] = color & 0xff;
      imageData.data[i * 4 + 1] = (color >> 8) & 0xff;
      imageData.data[i * 4 + 2] = (color >> 16) & 0xff;
      imageData.data[i * 4 + 3] = 0xff;
    }
  }

  onAudioSample() {
  }

  async loadNESEmulator(romPath) {
    this.dom.emulatorContainer.innerHTML = '<div class="emulator-loading">Loading NES Emulator...</div>';

    try {
      if (typeof jsnes === 'undefined') {
        throw new Error('jsnes library not loaded. Please check your internet connection.');
      }

      const canvas = document.createElement('canvas');
      canvas.id = 'nes-canvas';
      canvas.width = 256;
      canvas.height = 240;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.imageRendering = 'pixelated';
      this.dom.emulatorContainer.innerHTML = '';
      this.dom.emulatorContainer.appendChild(canvas);

      this.nesCanvas = canvas;
      this.nesCtx = canvas.getContext('2d');
      this.nesImageData = this.nesCtx.createImageData(256, 240);

      const romData = await this.fetchROM(romPath);
      this.nesEmulator.loadROM(romData);

      this.setupNESControls();

      this.nesFrameId = requestAnimationFrame(this.nesFrameLoop.bind(this));
    } catch (error) {
      console.error('NES Emulator load error:', error);
      this.showError(`Failed to load NES game: ${error.message}`);
      this.dom.emulatorContainer.innerHTML = `
        <div class="error-container">
          <p class="error-message">Failed to load NES emulator</p>
          <p class="error-detail">${error.message}</p>
        </div>
      `;
    }
  }

  async fetchROM(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ROM: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  nesFrameLoop() {
    this.nesEmulator.frame();
    this.nesCtx.putImageData(this.nesImageData, 0, 0);
    this.nesFrameId = requestAnimationFrame(this.nesFrameLoop.bind(this));
  }

  setupNESControls() {
    const nesKeys = {
      'ArrowLeft': jsnes.Controller.BUTTON_LEFT,
      'ArrowRight': jsnes.Controller.BUTTON_RIGHT,
      'ArrowUp': jsnes.Controller.BUTTON_UP,
      'ArrowDown': jsnes.Controller.BUTTON_DOWN,
      'z': jsnes.Controller.BUTTON_A,
      'x': jsnes.Controller.BUTTON_B,
      'Enter': jsnes.Controller.BUTTON_START,
      'Shift': jsnes.Controller.BUTTON_SELECT
    };

    document.addEventListener('keydown', (e) => {
      if (this.currentPlatform !== 'nes' || !this.nesEmulator) return;
      
      const button = nesKeys[e.key];
      if (button !== undefined) {
        this.nesEmulator.buttonDown(1, button);
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (this.currentPlatform !== 'nes' || !this.nesEmulator) return;
      
      const button = nesKeys[e.key];
      if (button !== undefined) {
        this.nesEmulator.buttonUp(1, button);
      }
    });
  }

  async loadCustomROM() {
    const url = this.dom.romUrlInput.value.trim();
    if (!url) {
      this.showError('Please enter a ROM URL');
      return;
    }

    try {
      this.currentGame = {
        id: 'custom-nes',
        name: 'Custom ROM',
        platform: 'nes',
        romPath: url
      };

      this.dom.gameTitle.textContent = 'Custom NES ROM';
      this.dom.controlsText.textContent = 'Arrow keys: D-Pad | Z: A Button | X: B Button | Enter: Start | Shift: Select';
      
      this.dom.menuView.classList.add('hidden');
      this.dom.playerView.classList.remove('hidden');
      
      await this.loadNESEmulator(url);
      this.dom.romUrlInput.value = '';
    } catch (error) {
      this.showError(`Failed to load ROM: ${error.message}`);
    }
  }

  async loadROMFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const romData = new Uint8Array(arrayBuffer);

      this.currentGame = {
        id: 'file-nes',
        name: file.name.replace('.nes', ''),
        platform: 'nes'
      };

      this.dom.gameTitle.textContent = file.name;
      this.dom.controlsText.textContent = 'Arrow keys: D-Pad | Z: A Button | X: B Button | Enter: Start | Shift: Select';
      
      this.dom.menuView.classList.add('hidden');
      this.dom.playerView.classList.remove('hidden');

      const canvas = document.createElement('canvas');
      canvas.id = 'nes-canvas';
      canvas.width = 256;
      canvas.height = 240;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.imageRendering = 'pixelated';
      this.dom.emulatorContainer.innerHTML = '';
      this.dom.emulatorContainer.appendChild(canvas);

      this.nesCanvas = canvas;
      this.nesCtx = canvas.getContext('2d');
      this.nesImageData = this.nesCtx.createImageData(256, 240);

      this.nesEmulator.loadROM(romData);
      this.setupNESControls();
      this.nesFrameId = requestAnimationFrame(this.nesFrameLoop.bind(this));
    } catch (error) {
      this.showError(`Failed to load ROM: ${error.message}`);
    }
  }

  backToMenu() {
    if (this.dosEmulator) {
      try {
        this.dosEmulator.exit();
      } catch (error) {
        console.error('Error stopping DOS emulator:', error);
      }
      this.dosEmulator = null;
    }

    if (this.nesFrameId) {
      cancelAnimationFrame(this.nesFrameId);
      this.nesFrameId = null;
    }

    this.dom.playerView.classList.add('hidden');
    this.dom.menuView.classList.remove('hidden');
    this.currentGame = null;
  }

  showControls() {
    this.dom.controlsPanel.classList.remove('hidden');
  }

  hideControls() {
    this.dom.controlsPanel.classList.add('hidden');
  }

  showHelp() {
    this.dom.helpModal.classList.remove('hidden');
  }

  hideHelp() {
    this.dom.helpModal.classList.add('hidden');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  showError(message) {
    this.dom.errorToast.textContent = message;
    this.dom.errorToast.classList.remove('hidden');
    setTimeout(() => {
      this.dom.errorToast.classList.add('hidden');
    }, 5000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.arcade = new RetroArcade();
});