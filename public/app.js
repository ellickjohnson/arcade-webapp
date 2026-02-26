// Retro Arcade Webapp - Frontend JavaScript

class RetroArcade {
  constructor() {
    this.games = [];
    this.filteredGames = [];
    this.currentGame = null;
    this.emulator = null;
    this.init();
  }

  async init() {
    this.cacheDOM();
    this.bindEvents();
    await this.loadGames();
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
      closeButtons: document.querySelectorAll('.close-btn')
    };
  }

  bindEvents() {
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
      const matchesSearch = game.name.toLowerCase().includes(searchTerm) ||
                           game.description.toLowerCase().includes(searchTerm);
      const matchesCategory = category === 'all' || game.category === category;
      return matchesSearch && matchesCategory;
    });

    this.renderGames();
  }

  renderGames() {
    if (this.filteredGames.length === 0) {
      this.dom.gamesGrid.innerHTML = '<div class="loading">No games found</div>';
      return;
    }

    this.dom.gamesGrid.innerHTML = this.filteredGames.map(game => `
      <div class="game-card" data-id="${game.id}">
        <div class="game-card-image">
          ${game.screenshot ? `<img src="${game.screenshot}" alt="${game.name}" onerror="this.style.display='none';this.parentElement.innerHTML='🕹️'">` : '🕹️'}
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
    this.dom.controlsText.textContent = this.currentGame.controls || 'Use keyboard controls shown in game';
    
    // Show player view
    this.dom.menuView.classList.add('hidden');
    this.dom.playerView.classList.remove('hidden');

    // Load emulator
    await this.loadEmulator();
  }

  async loadEmulator() {
    this.dom.emulatorContainer.innerHTML = '<div class="emulator-loading">Loading Emulator...</div>';

    try {
      const options = {
        scale: 1.5,
        aspectRatio: 4/3,
        fullscreen: false
      };

      // Check if js-dos is available
      if (typeof Dos === 'undefined') {
        throw new Error('js-dos library not loaded. Please check your internet connection.');
      }

      // Create canvas element
      const canvas = document.createElement('canvas');
      canvas.id = 'dos-canvas';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      this.dom.emulatorContainer.innerHTML = '';
      this.dom.emulatorContainer.appendChild(canvas);

      // Initialize js-dos emulator
      const bundleUrl = this.currentGame.romPath;
      const ci = Dos(canvas, options);
      
      // Load the game
      await ci.fs.extract(bundleUrl);
      await ci.main(['/game.exe']);
      
      this.emulator = ci;
    } catch (error) {
      console.error('Emulator load error:', error);
      this.showError(`Failed to load game: ${error.message}`);
      this.dom.emulatorContainer.innerHTML = `
        <div class="error-container">
          <p class="error-message">Failed to load emulator</p>
          <p class="error-detail">${error.message}</p>
          <p class="error-tip">Make sure the ROM file exists at: ${this.currentGame.romPath}</p>
        </div>
      `;
    }
  }

  backToMenu() {
    // Stop emulator if running
    if (this.emulator) {
      try {
        this.emulator.exit();
      } catch (error) {
        console.error('Error stopping emulator:', error);
      }
      this.emulator = null;
    }

    // Switch views
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.arcade = new RetroArcade();
});
