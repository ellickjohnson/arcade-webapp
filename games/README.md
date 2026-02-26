# Retro Arcade - Games Directory

This directory contains the game ROM files and metadata for the Retro Arcade web application.

## Directory Structure

```
games/
├── action/
│   ├── space-invaders/
│   │   ├── info.json      # Game metadata
│   │   ├── game.zip       # DOS game ROM (required)
│   │   └── screenshot.png # Optional screenshot
│   └── pacman/
│       ├── info.json
│       ├── game.zip
│       └── screenshot.png
├── adventure/
│   └── ...
├── puzzle/
│   └── ...
└── shooter/
    └── ...
```

## How to Add Games

### Step 1: Create Game Directory

Create a directory for your game under the appropriate category:

```bash
mkdir -p games/your-category/your-game-name
```

Available categories: `action`, `adventure`, `puzzle`, `sports`, `shooter`

### Step 2: Create info.json

Create an `info.json` file in the game directory with the following structure:

```json
{
  "name": "Game Title",
  "description": "Brief description of the game",
  "controls": "Arrow Keys: Move | Space: Action | P: Pause",
  "year": "1990",
  "publisher": "Publisher Name",
  "genre": "Genre",
  "players": 1
}
```

Required fields:
- `name`: Display name of the game
- `description`: Brief description shown in the game menu
- `controls`: Control instructions for players

Optional fields:
- `year`: Release year
- `publisher`: Publisher name
- `genre`: Game genre
- `players`: Number of players (1 or 2)

### Step 3: Add Game ROM

Place your DOS game file (must be a .zip archive) in the game directory:

```bash
# The file MUST be named game.zip
/path/to/your-game.zip -> games/category/game-name/game.zip
```

**Important:**
- The file must be named `game.zip`
- The zip should contain the DOS game files
- Include the main executable (usually game.exe)

### Step 4: Add Screenshot (Optional)

Add a screenshot image to display in the game menu:

```bash
# Image formats: png, jpg, jpeg, gif
/path/to/screenshot.png -> games/category/game-name/screenshot.png
```

## Supported ROM Formats

- **DOS Games**: .zip archives containing DOS executables (.exe, .com)
- The emulator uses js-dos library
- All games must be DOS-compatible

## Game Categories

- **action**: Action games (platformers, shooters)
- **adventure**: Adventure games (RPGs, text adventures)
- **puzzle**: Puzzle games
- **sports**: Sports games
- **shooter**: First-person shooters, shmups

## Example: Adding a New Game

Let's add "Doom II" as an example:

```bash
# 1. Create directory
mkdir -p games/shooter/doom-ii

# 2. Create info.json
cat > games/shooter/doom-ii/info.json << EOF
{
  "name": "Doom II",
  "description": "The legendary first-person shooter. Battle through hell on Earth with improved weapons and larger levels.",
  "controls": "WASD: Move | Mouse: Look | Left Click: Fire | E: Open Door | Space: Switch Weapon",
  "year": "1994",
  "publisher": "id Software",
  "genre": "FPS",
  "players": 4
}
