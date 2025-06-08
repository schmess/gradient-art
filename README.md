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
- Mobile-optimized touch controls with responsive design
- Performance-optimized animations and transitions

## How to Play

1. Drag tiles from the Scrambled Matrix on the left and drop them into the Solution Matrix on the right
2. Each row represents a different color palette type
3. The locked tiles provide hints about the correct positions
4. Arrange tiles to match the correct color relationships
5. Click "Show Hint" for help or "Show Solution" to reveal the correct arrangement

## Development

### Prerequisites

- Node.js and npm

### Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/schmess/gradient-art.git
cd gradient-art
npm install
```

### Development Server

Start the development server:

```bash
npm start
```

This will start a webpack dev server at http://localhost:8080 with hot module replacement.

### Building for Production

Build the project for production:

```bash
npm run build
```

This will create a `dist` directory with compressed, hashed assets ready for deployment.

### Build for Development

To build the project for development (with source maps):

```bash
npm run build:dev
```

### Serving the Build

To serve the built files locally:

```bash
npm run serve
```

### Deployment

Deploy to GitHub Pages:

```bash
npm run deploy
```

## Project Structure

- `src/` - Source files
  - `index.js` - Main entry point
  - `game.js` - Game logic
  - `en.js` - Localization strings
  - `style.css` - Styling
- `dist/` - Built files (generated with content hashing for cache busting)
- `webpack.config.js` - Webpack configuration

## Customization

- Add new languages by creating additional localization files following the structure of `en.js`
- Modify the puzzle configuration in the `puzzleData` object in `game.js` to create different puzzle scenarios

## License

ISC