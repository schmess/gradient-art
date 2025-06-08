# The Gradient Artist: Color Theory Puzzle Game

A browser-based puzzle game that teaches color theory through interactive gameplay.

## Game Description

The Gradient Artist is an educational puzzle game that teaches color theory through interactive tile-based gameplay. Players reconstruct scrambled color palettes by manipulating tiles in a 5x5 matrix, where each row represents a different color palette type.

## Features

- Drag and drop tiles to arrange them in the correct order
- Different palette types (Monochromatic, Analogous, Triadic, Split Complementary, Complementary)
- Visual feedback for correct and incorrect placements
- Hint system with 10-second countdown
- Score tracking for blunders and hints used
- Fully localized text (currently in English)

## How to Play

1. Drag tiles from the Scrambled Matrix on the left and drop them into the Solution Matrix on the right
2. Each row represents a different color palette type
3. The locked tiles provide hints about the correct positions
4. Arrange tiles to match the correct color relationships
5. Click "Show Hint" for help or "Show Solution" to reveal the correct arrangement

## Running Locally

### Option 1: Using a local server (recommended)

1. Navigate to the project directory in your terminal
2. Run the local server: `node server.js`
3. Open your browser and go to `http://localhost:3000`

### Option 2: Direct file opening

You can open the `index.html` file directly in your browser, but the localization feature might not work due to CORS restrictions when loading local files. The game will fall back to hardcoded English strings in this case.

## Customization

- Add new languages by creating additional localization files (e.g., `fr.json`, `es.json`) following the structure of `en.json`
- Modify the puzzle configuration in the `puzzleData` object in `shades.js` to create different puzzle scenarios

## License

[MIT License](LICENSE)