// English language strings for Shades game
window.en = {  
  buttons: {
    showSolution: "Show Solution",
    hideSolution: "Hide Solution",
    showHint: "Show Hint",
    hintWithCountdown: "Hint ({seconds}s)",
    resetGame: "Reset Game"
  },
  
  stats: {
    time: "Time",
    blunders: "Blunders", 
    hints: "Hints"
  },
  
  messages: {
    duplicateColor: "Cannot place duplicate colors in the same row!",
    wrongRow: "This tile doesn't belong in this row!",
    wrongPosition: "Right color, wrong position in the row!",
    sameRowOnly: "Tiles can only be moved within the same row!",
    showingSolution: "👀 Solution shown. Click 'Hide Solution' to continue your game.",
    continueArranging: "Continue arranging the tiles to complete the puzzle!",
    showingHint: "💡 Showing all tiles incorrectly placed within the palette",
    congratulations: "🎉 Congratulations! You solved it in {minutes}m {seconds}s with {blunders} blunders and {hintsUsed} hints used!"
  },
  
  howToPlay: {
    title: "How to Play:",
    instructions: "Drag tiles from the Scrambled Matrix on the left and drop them into the Solution Matrix on the right. Each row in the Solution Matrix represents a different type of color palette. The locked tiles provide hints about each palette type. Arrange tiles to match the correct color relationships. Click \"Show Hint\" for help or \"Show Solution\" to reveal the correct arrangement."
  },
  
  paletteTypes: {
    monochromatic: {
      name: "Monochromatic",
      description: "Variations in lightness of a single hue"
    },
    analogous: {
      name: "Analogous",
      description: "Adjacent colors on the color wheel"
    },
    triadic: {
      name: "Triadic",
      description: "Three equidistant colors"
    },
    splitComplementary: {
      name: "Split Complementary",
      description: "Base + two flanking colors"
    },
    complementary: {
      name: "Complementary",
      description: "Opposite colors on the color wheel"
    }
  }
};