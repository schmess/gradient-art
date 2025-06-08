const en = window.en;

// Polyfill for Array.find() method for older browsers
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        value: function(predicate) {
            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }
            
            var o = Object(this);
            var len = o.length >>> 0;
            var thisArg = arguments[1];
            
            for (var i = 0; i < len; i++) {
                var value = o[i];
                if (predicate.call(thisArg, value, i, o)) {
                    return value;
                }
            }
            return undefined;
        },
        configurable: true,
        writable: true
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Use en global variable from en.js (loaded in HTML before this file)
    
    // Check device orientation and add event listener to detect orientation changes
    const orientationOverlay = document.querySelector('.orientation-overlay');
    const gameContainer = document.querySelector('.game-container');
    
    function checkOrientation() {
        // Only apply to mobile devices (screen width less than 768px)
        if (window.innerWidth <= 768) {
            if (window.matchMedia("(orientation: portrait)").matches) {
                // Portrait mode - show overlay
                orientationOverlay.style.display = 'flex';
                gameContainer.style.visibility = 'hidden';
            } else {
                // Landscape mode - hide overlay
                orientationOverlay.style.display = 'none';
                gameContainer.style.visibility = 'visible';
            }
        } else {
            // Desktop/tablet in landscape - always show game
            orientationOverlay.style.display = 'none';
            gameContainer.style.visibility = 'visible';
        }
    }
    
    // Initial check
    checkOrientation();
    
    // Add event listener for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Game puzzle configuration in a single data structure
    const puzzleData = {
        // Palette types for each row (in order)
        paletteTypes: [
            "monochromatic",
            "analogous",
            "triadic",
            "splitComplementary",
            "complementary"
        ],
        
        // All available palettes
        palettes: {
            monochromatic: ['#e6f2ff', '#bfd9ff', '#99c2ff', '#6699ff', '#3366ff'],
            analogous: ['#ff9999', '#ffcc99', '#ffff99', '#ccff99', '#99ffcc'],
            triadic: ['#ff5555', '#55ff55', '#5555ff', '#ff5555', '#5555ff'],
            splitComplementary: ['#ff6600', '#ff9933', '#33cc99', '#66cc99', '#cc33cc'],
            complementary: ['#ff5555', '#ff9999', '#ffffff', '#9999ff', '#5555ff']
        },
        
        // Locked/visible tiles mask (true = locked/visible)
        // Each row's array represents which columns are locked
        lockedTiles: [
            [false, false, true, false, false],  // Row 1: Only center tile
            [false, true, false, true, false],   // Row 2: Columns 2 and 4
            [true, false, true, false, true],    // Row 3: Columns 1, 3, and 5
            [false, true, false, true, false],   // Row 4: Columns 2 and 4
            [false, false, true, false, false]   // Row 5: Only center tile
        ]
    };
    
    // Game elements
    const scrambledMatrix = document.getElementById('scrambled-matrix');
    const solutionMatrix = document.getElementById('solution-matrix');
    const messageArea = document.getElementById('message');
    const checkButton = document.getElementById('check-button');
    const hintButton = document.getElementById('hint-button');
    const resetButton = document.getElementById('reset-button');
    
    // Update UI text from localization
    checkButton.textContent = en.buttons.showSolution;
    hintButton.textContent = en.buttons.showHint;
    resetButton.textContent = en.buttons.resetGame;
    document.querySelector('.game-info h2').textContent = en.howToPlay.title;
    document.querySelector('.game-info p').textContent = en.howToPlay.instructions;
    
    // Update palette type names and descriptions
    const paletteTypes = document.querySelectorAll('.palette-type h3, .palette-type p');
    for (let i = 0; i < paletteTypes.length; i += 2) {
        const typeKey = puzzleData.paletteTypes[Math.floor(i/2)];
        const nameElem = paletteTypes[i];
        const descElem = paletteTypes[i + 1];
        
        if (nameElem) {
            const rowNum = Math.floor(i/2) + 1;
            nameElem.textContent = `Row ${rowNum}: ${en.paletteTypes[typeKey].name}`;
        }
        
        if (descElem) {
            descElem.textContent = en.paletteTypes[typeKey].description;
        }
    }
    
    // Update stat labels
    document.querySelectorAll('.stat-label')[0].textContent = en.stats.time;
    document.querySelectorAll('.stat-label')[1].textContent = en.stats.blunders;
    document.querySelectorAll('.stat-label')[2].textContent = en.stats.hints;
    
    // Game state
    let draggedTile = null;
    let activeTiles = [];
    let blunders = 0;
    let hintsUsed = 0; // Track how many times hints were used
    let startTime = null;
    let timerInterval = null;
    let hintCountdownInterval = null;
    let solutionVisible = false; // Track if solution is currently shown
    let firstMoveMade = false; // Track if the first move has been made
    let affirmationTimeout = null; // Track the timeout for clearing affirmations
    let finalScore = 0; // Track the final score
    
    // Colors for affirmation messages (purple and pink palette)
    const affirmationColors = [
        "#B159FF", // Purple
        "#9C27B0", // Deep Purple
        "#673AB7", // Indigo Purple
        "#FF59B6", // Pink
        "#FF4081", // Deep Pink
        "#E91E63"  // Magenta
    ];
    
    // Counter for tracking moves between affirmations
    let movesSinceLastAffirmation = 0;
    const movesRequiredForAffirmation = 12; // Show affirmation every ~12 moves
    
    // Initialize game
    function initGame() {
        console.clear(); // Clear console for clean debugging
        console.log('==== Initializing The Gradient Artist Game ====');
        
        // Hide score modal if it's open
        hideScoreModal();
        
        // Clear matrices
        scrambledMatrix.innerHTML = '';
        solutionMatrix.innerHTML = '';
        
        // Add welcome message
        messageArea.textContent = en.messages.welcome;
        messageArea.className = 'message-area hint welcome';
        
        // Reset game stats and counters
        blunders = 0;
        hintsUsed = 0;
        movesSinceLastAffirmation = 0;
        updateBlunderDisplay();
        updateHintsDisplay();
        
        // Reset hint button
        hintButton.textContent = en.buttons.showHint;
        hintButton.disabled = false;
        
        // Clear any active hint countdown
        if (hintCountdownInterval) {
            clearInterval(hintCountdownInterval);
            hintCountdownInterval = null;
        }
        
        // Clear any existing affirmation timeout
        if (affirmationTimeout) {
            clearTimeout(affirmationTimeout);
            affirmationTimeout = null;
        }
        
        // Reset and start timer
        startTime = new Date();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        
        // Reset visibility states
        solutionVisible = false;
        firstMoveMade = false;
        
        // Create color pool for scrambled matrix, excluding locked colors
        // First collect all colors from all palettes
        const allColors = [];
        puzzleData.paletteTypes.forEach(type => {
            allColors.push(...puzzleData.palettes[type]);
        });
        
        // Identify locked colors to remove from the scrambled pool
        const lockedColors = [];
        for (let row = 0; row < puzzleData.lockedTiles.length; row++) {
            const paletteType = puzzleData.paletteTypes[row];
            const palette = puzzleData.palettes[paletteType];
            
            for (let col = 0; col < puzzleData.lockedTiles[row].length; col++) {
                if (puzzleData.lockedTiles[row][col]) {
                    // This is a locked position - add its color to our exclusion list
                    lockedColors.push(palette[col]);
                }
            }
        }
        
        // Count occurrences of each locked color
        const lockedColorCounts = {};
        for (const color of lockedColors) {
            lockedColorCounts[color] = (lockedColorCounts[color] || 0) + 1;
        }
        
        console.log('Locked color occurrences:', lockedColorCounts);
        
        // Create filtered color pool, removing exactly the right number of each locked color
        const colorPool = [...allColors];
        console.log('Initial color pool size:', colorPool.length);
        
        for (const lockedColor in lockedColorCounts) {
            let remainingToRemove = lockedColorCounts[lockedColor];
            
            // Remove each locked color the exact number of times it appears locked
            for (let i = colorPool.length - 1; i >= 0 && remainingToRemove > 0; i--) {
                if (colorPool[i] === lockedColor) {
                    colorPool.splice(i, 1);
                    remainingToRemove--;
                }
            }
        }
        
        console.log('Filtered color pool size:', colorPool.length);
        
        // Create scrambled tiles from the filtered pool
        const scrambledColors = [...colorPool].sort(() => Math.random() - 0.5);
        scrambledColors.forEach((color, index) => {
            const tile = createTile(color, index, 'scrambled');
            tile.dataset.originalIndex = index; // Store original position
            scrambledMatrix.appendChild(tile);
        });
        
        // Create solution matrix with locked tiles based on puzzle data
        for (let row = 0; row < puzzleData.lockedTiles.length; row++) {
            const rowLockPattern = puzzleData.lockedTiles[row];
            const paletteType = puzzleData.paletteTypes[row];
            const palette = puzzleData.palettes[paletteType];
            
            // Track how many available colors remain for each row
            // This ensures we maintain the correct balance of colors for each palette
            const rowAvailableColors = {};
            for (const color of palette) {
                rowAvailableColors[color] = (rowAvailableColors[color] || 0) + 1;
            }
            
            // Subtract locked tiles from available count
            for (let col = 0; col < rowLockPattern.length; col++) {
                if (rowLockPattern[col]) {
                    const lockedColor = palette[col];
                    rowAvailableColors[lockedColor]--;
                }
            }
            
            // For debugging - log available colors for each row
            console.log(`Row ${row} (${paletteType}) available colors:`, rowAvailableColors);
            
            for (let col = 0; col < rowLockPattern.length; col++) {
                // Calculate the index in a 5x5 grid
                const index = row * 5 + col;
                const isLocked = rowLockPattern[col];
                
                if (isLocked) {
                    // Place locked tile with correct color
                    const lockedTile = createTile(palette[col], index, 'locked');
                    lockedTile.classList.add('locked');
                    solutionMatrix.appendChild(lockedTile);
                } else {
                    // Create empty slots for other positions
                    const emptySlot = document.createElement('div');
                    emptySlot.className = 'tile empty-slot';
                    emptySlot.dataset.index = index;
                    
                    // Store the palette type in the dataset to help with validation
                    emptySlot.dataset.paletteType = paletteType;
                    emptySlot.dataset.rowIndex = row;
                    emptySlot.dataset.colIndex = col;
                    
                    emptySlot.addEventListener('dragover', handleDragOver);
                    emptySlot.addEventListener('drop', handleDrop);
                    solutionMatrix.appendChild(emptySlot);
                }
            }
        }
        
        // Update active tiles
        updateActiveTiles();
    }
    
    // Variables for touch handling
    let touchedTile = null;
    let touchOffsetX = 0;
    let touchOffsetY = 0;
    let lastTouchedEmpty = null;
    let ghostTile = null;
    let isTouchMoving = false;
    
    // Create a color tile
    function createTile(color, index, type) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        
        // Create subtle gradient effect with the base color
        const lighterColor = lightenColor(color, 15);
        const darkerColor = darkenColor(color, 15);
        tile.style.background = `linear-gradient(135deg, ${lighterColor}, ${color} 50%, ${darkerColor})`;
        
        tile.dataset.color = color;
        tile.dataset.index = index;
        
        // Only add the locked class if this tile is explicitly a locked tile
        // We determine locking based on puzzle data, not position
        if (type === 'locked') {
            tile.classList.add('locked');
        } else if (type === 'scrambled' || type === 'solution') {
            // Make tiles draggable if they're not locked
            tile.draggable = true;
            
            // Add mouse/desktop drag events
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragend', handleDragEnd);
            
            // Add touch events for mobile
            tile.addEventListener('touchstart', handleTouchStart, { passive: false });
            tile.addEventListener('touchmove', handleTouchMove, { passive: false });
            tile.addEventListener('touchend', handleTouchEnd);
            tile.addEventListener('touchcancel', handleTouchCancel);
        }
        
        return tile;
    }
    
    // Function to hide lock emojis
    function hideLockEmojis() {
        if (!firstMoveMade) {
            firstMoveMade = true;
            const lockedTiles = document.querySelectorAll('.tile.locked');
            lockedTiles.forEach(tile => {
                tile.classList.add('hide-lock');
            });
        }
    }
    
    // Function to show a random affirmation message
    function showRandomAffirmation(force = false) {
        // Only show affirmation if enough moves have been made or force=true
        movesSinceLastAffirmation++;
        
        if (!force && movesSinceLastAffirmation < movesRequiredForAffirmation) {
            return; // Not enough moves yet, skip affirmation
        }
        
        // Reset counter when showing an affirmation
        movesSinceLastAffirmation = 0;
        
        // Clear any existing timeout
        if (affirmationTimeout) {
            clearTimeout(affirmationTimeout);
        }
        
        // Get a random affirmation
        const randomIndex = Math.floor(Math.random() * en.affirmations.length);
        const affirmation = en.affirmations[randomIndex];
        
        // Get a random color
        const colorIndex = Math.floor(Math.random() * affirmationColors.length);
        const color = affirmationColors[colorIndex];
        
        // Set the message and apply the color
        messageArea.textContent = affirmation;
        messageArea.className = 'message-area';
        messageArea.style.color = color;
        
        // Set a timeout to clear the message after 5 seconds
        affirmationTimeout = setTimeout(() => {
            // Check if the message is currently empty or already showing an affirmation
            if (messageArea.textContent === "" || en.affirmations.includes(messageArea.textContent)) {
                showRandomAffirmation(true);
            }
        }, 5000); // Show for 5 seconds
    }
    
    // Check if message area is empty and show appreciation if needed
    function checkAndShowAppreciation() {
        // Only show if the message area is empty and not already showing an affirmation
        if (messageArea.textContent === "" || messageArea.textContent === en.messages.continueArranging) {
            showRandomAffirmation(true);
        }
    }
    
    // Helper function to lighten a color
    function lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }
    
    // Helper function to darken a color
    function darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }
    
    // Drag and Drop Handlers
    function handleDragStart(e) {
        draggedTile = this;
        this.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.color);
        // Store information about the source of the drag operation
        draggedTile.dataset.sourceMatrix = this.closest('#scrambled-matrix') ? 'scrambled' : 'solution';
    }
    
    function handleDragEnd(e) {
        this.style.opacity = '1';
        draggedTile = null;
    }
    
    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary to allow drop
        }
        
        // Only allow dropping on empty slots
        if (!this.classList.contains('empty-slot')) {
            return false;
        }
        
        e.dataTransfer.dropEffect = 'move';
        return false;
    }
    
    function handleDrop(e) {
        e.preventDefault();
        
        if (!draggedTile) return;
        
        // Get the row of the drop target and color info
        const targetIndex = parseInt(this.dataset.index);
        const targetRow = Math.floor(targetIndex / 5);
        const targetCol = targetIndex % 5;
        const paletteType = puzzleData.paletteTypes[targetRow];
        const correctPalette = puzzleData.palettes[paletteType];
        const tileColor = draggedTile.dataset.color;
        
        // Check if the color belongs to the correct palette (correct row)
        const colorInPalette = correctPalette.includes(tileColor);
        const colorPositionInPalette = correctPalette.indexOf(tileColor);
        
        // Get additional information from the dataset
        const targetPaletteType = this.dataset.paletteType;
        
        // Check if we're moving from the solution matrix or the scrambled matrix
        const isMovingWithinSolution = draggedTile.dataset.sourceMatrix === 'solution';
        
        // Get all existing tiles in this row to check for duplicates
        const rowTiles = [];
        for (let col = 0; col < 5; col++) {
            const index = targetRow * 5 + col;
            const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]:not(.empty-slot)`);
            if (tile && !tile.classList.contains('empty-slot')) {
                rowTiles.push({
                    color: tile.dataset.color,
                    index: index
                });
            }
        }
        
        if (isMovingWithinSolution) {
            // If moving within solution, only allow moves within the same row
            const sourceIndex = parseInt(draggedTile.dataset.index);
            const sourceRow = Math.floor(sourceIndex / 5);
            
            if (sourceRow !== targetRow) {
                // Cannot move between rows - count as blunder
                blunders++;
                updateBlunderDisplay();
                // Visual feedback for error
                const tempTile = createTile(tileColor, targetIndex, 'solution');
                tempTile.classList.add('shake');
                this.parentNode.replaceChild(tempTile, this);
                setTimeout(() => {
                    const newEmptySlot = document.createElement('div');
                    newEmptySlot.className = 'tile empty-slot';
                    newEmptySlot.dataset.index = targetIndex;
                    newEmptySlot.addEventListener('dragover', handleDragOver);
                    newEmptySlot.addEventListener('drop', handleDrop);
                    tempTile.parentNode.replaceChild(newEmptySlot, tempTile);
                    if (draggedTile) {
                        draggedTile.style.opacity = '1';
                    }
                }, 500);
                messageArea.textContent = en.messages.sameRowOnly;
                messageArea.className = 'message-area error';
                return;
            }
            // Remove the original tile from its position
            const sourceSlot = document.createElement('div');
            sourceSlot.className = 'tile empty-slot';
            sourceSlot.dataset.index = draggedTile.dataset.index;
            sourceSlot.addEventListener('dragover', handleDragOver);
            sourceSlot.addEventListener('drop', handleDrop);
            draggedTile.parentNode.replaceChild(sourceSlot, draggedTile);
            // Place the new tile in the target position
            const newTile = createTile(tileColor, targetIndex, 'solution');
            this.parentNode.replaceChild(newTile, this);
            // Now check if the row is valid after the move
            if (!isRowValidAfterDrop(targetRow)) {
                blunders++;
                updateBlunderDisplay();
                newTile.classList.add('wrong-position');
                messageArea.textContent = en.messages.wrongPosition;
                messageArea.className = 'message-area error';
                setTimeout(() => {
                    if (newTile.parentNode) {
                        newTile.classList.remove('wrong-position');
                    }
                }, 500);
            } else {
                newTile.classList.add('correct-position');
                showRandomAffirmation();
                setTimeout(() => {
                    if (newTile.parentNode) {
                        newTile.classList.remove('correct-position');
                    }
                    
                    // After a valid move, check if message area is empty and show appreciation
                    if (messageArea.textContent === "") {
                        checkAndShowAppreciation();
                    }
                }, 500);
            }
        } else {
            // Coming from scrambled matrix
            if (!colorInPalette) {
                blunders++;
                updateBlunderDisplay();
                const tempTile = createTile(tileColor, targetIndex, 'solution');
                tempTile.classList.add('shake');
                this.parentNode.replaceChild(tempTile, this);
                setTimeout(() => {
                    const newEmptySlot = document.createElement('div');
                    newEmptySlot.className = 'tile empty-slot';
                    newEmptySlot.dataset.index = targetIndex;
                    newEmptySlot.addEventListener('dragover', handleDragOver);
                    newEmptySlot.addEventListener('drop', handleDrop);
                    tempTile.parentNode.replaceChild(newEmptySlot, tempTile);
                    if (draggedTile) {
                        draggedTile.style.opacity = '1';
                    }
                }, 500);
                messageArea.textContent = en.messages.wrongRow;
                messageArea.className = 'message-area error';
                return;
            }
            // Place the new tile in the target position
            const newTile = createTile(tileColor, targetIndex, 'solution');
            this.parentNode.replaceChild(newTile, this);
            // Remove the dragged tile from scrambled matrix
            draggedTile.parentNode.removeChild(draggedTile);
            // Now check if the row is valid after the move
            if (!isRowValidAfterDrop(targetRow)) {
                // Blunder and revert the move
                blunders++;
                updateBlunderDisplay();
                newTile.classList.add('shake');
                setTimeout(() => {
                    // Remove the tile and restore empty slot
                    const newEmptySlot = document.createElement('div');
                    newEmptySlot.className = 'tile empty-slot';
                    newEmptySlot.dataset.index = targetIndex;
                    newEmptySlot.addEventListener('dragover', handleDragOver);
                    newEmptySlot.addEventListener('drop', handleDrop);
                    if (newTile.parentNode) {
                        newTile.parentNode.replaceChild(newEmptySlot, newTile);
                    }
                    // Return a new tile to scrambled matrix
                    const scrambledTile = createTile(tileColor, scrambledMatrix.children.length, 'scrambled');
                    scrambledMatrix.appendChild(scrambledTile);
                }, 500);
                messageArea.textContent = en.messages.wrongPosition;
                messageArea.className = 'message-area error';
                return;
            } else {
                newTile.classList.add('correct-position');
                showRandomAffirmation();
                setTimeout(() => {
                    if (newTile.parentNode) {
                        newTile.classList.remove('correct-position');
                    }
                    
                    // After a valid move, check if message area is empty and show appreciation
                    if (messageArea.textContent === "") {
                        checkAndShowAppreciation();
                    }
                }, 500);
            }
        }
        
        // Update active tiles
        updateActiveTiles();
        
        // Hide lock emojis after first move
        hideLockEmojis();
        
        // Auto-check solution after each move
        checkCompletedSolution();
    }
    
    // Update tracking of active tiles
    function updateActiveTiles() {
        activeTiles = [];
        const solutionTiles = solutionMatrix.querySelectorAll('.tile:not(.empty-slot)');
        solutionTiles.forEach(tile => {
            if (!tile.classList.contains('empty-slot')) {
                activeTiles.push(tile);
            }
        });
    }
    
    // Check if the current solution is correct
    function checkSolution() {
        // Toggle between showing and hiding the solution
        solutionVisible = !solutionVisible;
        
        if (solutionVisible) {
            // Show the solution
            showSolution();
            checkButton.textContent = en.buttons.hideSolution;
        } else {
            // Hide the solution and restore the current state
            hideSolution();
            checkButton.textContent = en.buttons.showSolution;
        }
    }
    
    // Function to show the correct solution
    function showSolution() {
        // Save current state to be able to restore it
        saveBoardState();
        
        // Clear the solution matrix except for locked tiles
        clearSolutionMatrix();
        
        // Place all tiles in their correct positions
        for (let row = 0; row < puzzleData.lockedTiles.length; row++) {
            const paletteType = puzzleData.paletteTypes[row];
            const correctPalette = puzzleData.palettes[paletteType];
            
            for (let col = 0; col < puzzleData.lockedTiles[row].length; col++) {
                const index = row * 5 + col;
                const isLockedPosition = puzzleData.lockedTiles[row][col];
                
                // Skip any locked tiles (they're already there)
                if (isLockedPosition) {
                    continue;
                }
                
                // Create a tile with the correct color for this position
                const colorToPlace = correctPalette[col];
                const newTile = createTile(colorToPlace, index, 'solution');
                newTile.classList.add('solution-tile'); // Mark as part of the solution
                
                // Find the slot to replace
                const slot = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                if (slot) {
                    slot.parentNode.replaceChild(newTile, slot);
                }
            }
        }
        
        messageArea.textContent = en.messages.showingSolution;
        messageArea.className = 'message-area hint';
    }
    
    // Function to hide the solution and restore the previous state
    function hideSolution() {
        // Restore the board to its previous state
        restoreBoardState();
        
        messageArea.textContent = en.messages.continueArranging;
        messageArea.className = 'message-area';
        
        // Show a random affirmation after a short delay
        setTimeout(() => {
            checkAndShowAppreciation();
        }, 3000);
    }
    
    // Function to save the current state of the board
    function saveBoardState() {
        // We'll store the state in a global variable
        window.savedState = [];
        
        // For each position in the solution matrix
        for (let row = 0; row < puzzleData.lockedTiles.length; row++) {
            for (let col = 0; col < puzzleData.lockedTiles[row].length; col++) {
                const index = row * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                
                if (tile && !tile.classList.contains('empty-slot')) {
                    // Determine if this is a locked position based on puzzle data
                    const isLockedPosition = puzzleData.lockedTiles[row][col];
                    
                    // Save the color and position
                    window.savedState.push({
                        index: index,
                        color: tile.dataset.color,
                        locked: isLockedPosition
                    });
                }
            }
        }
    }
    
    // Function to clear the solution matrix except for locked tiles
    function clearSolutionMatrix() {
        for (let row = 0; row < puzzleData.lockedTiles.length; row++) {
            for (let col = 0; col < puzzleData.lockedTiles[row].length; col++) {
                const index = row * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                
                // Determine if this is a locked position based on puzzle data
                const isLockedPosition = puzzleData.lockedTiles[row][col];
                
                // Skip any locked tiles
                if (isLockedPosition && tile) {
                    continue;
                }
                
                // Create an empty slot for any non-locked position
                if (tile) {
                    const emptySlot = document.createElement('div');
                    emptySlot.className = 'tile empty-slot';
                    emptySlot.dataset.index = index;
                    emptySlot.addEventListener('dragover', handleDragOver);
                    emptySlot.addEventListener('drop', handleDrop);
                    
                    // Replace the tile with an empty slot
                    tile.parentNode.replaceChild(emptySlot, tile);
                }
            }
        }
    }
    
    // Function to restore the board to its saved state
    function restoreBoardState() {
        // First clear the board (except locked positions)
        clearSolutionMatrix();
        
        // Then restore each saved tile
        if (window.savedState) {
            window.savedState.forEach(saved => {
                const index = saved.index;
                const row = Math.floor(index / 5);
                const col = index % 5;
                
                // Determine if this is a locked position based on puzzle data
                const isLockedPosition = puzzleData.lockedTiles[row][col];
                
                // Skip locked tiles (they're already there)
                if (isLockedPosition) return;
                
                const slot = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                
                if (slot && !isLockedPosition) {
                    const newTile = createTile(saved.color, index, 'solution');
                    slot.parentNode.replaceChild(newTile, slot);
                }
            });
        }
    }
    
    // Function to verify if the solution is correct using brute force comparison
    function verifySolution() {
        console.log('==== Verifying Solution ====');
        let allCorrect = true;
        
        // Check each row
        for (let row = 0; row < puzzleData.paletteTypes.length; row++) {
            const paletteType = puzzleData.paletteTypes[row];
            const correctPalette = puzzleData.palettes[paletteType];
            console.log(`Checking row ${row} (${paletteType})`);
            
            // Get the tiles in this row
            const rowTiles = [];
            for (let col = 0; col < 5; col++) {
                const index = row * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                if (tile && !tile.classList.contains('empty-slot')) {
                    rowTiles.push(tile);
                }
            }
            
            // Skip incomplete rows
            if (rowTiles.length < 5) {
                allCorrect = false;
                continue;
            }
            
            // Get colors from the current row
            const rowColors = rowTiles.map(tile => tile.dataset.color);
            
            // Create a frequency map for both expected and actual colors
            const correctColorCounts = {};
            const rowColorCounts = {};
            
            // Count occurrences of colors in the correct palette
            for (const color of correctPalette) {
                correctColorCounts[color] = (correctColorCounts[color] || 0) + 1;
            }
            
            // Count occurrences of colors in the current row
            for (const color of rowColors) {
                rowColorCounts[color] = (rowColorCounts[color] || 0) + 1;
            }
            
            // Check for missing or extra colors
            const correctKeys = Object.keys(correctColorCounts);
            const rowKeys = Object.keys(rowColorCounts);
            
            console.log(`  Expected colors: ${JSON.stringify(correctColorCounts)}`);
            console.log(`  Actual colors: ${JSON.stringify(rowColorCounts)}`);
            
            // First check: make sure we have exactly the same color keys
            if (correctKeys.length !== rowKeys.length) {
                console.log('  ❌ Wrong number of unique colors');
                allCorrect = false;
                continue;
            }
            
            // Second check: make sure all expected colors are present
            const allKeysPresent = correctKeys.every(key => rowKeys.includes(key));
            if (!allKeysPresent) {
                console.log('  ❌ Missing some expected colors');
                allCorrect = false;
                continue;
            }
            
            // Third check: make sure each color appears exactly the right number of times
            const exactColorMatches = correctKeys.every(key => 
                correctColorCounts[key] === rowColorCounts[key]
            );
            
            if (!exactColorMatches) {
                console.log('  ❌ Wrong number of occurrences for some colors');
                allCorrect = false;
                continue;
            }
            
            console.log('  ✅ Row is correct!');
            
            // If needed, check color positions here (currently not required as per game rules)
        }
        
        if (allCorrect) {
            showSuccess();
        } else {
            // if needed, show puzzle is not completed message
        }
        
        return allCorrect;
    }
    
    // Helper to compare arrays
    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }
    
    // Update the blunder display
    function updateBlunderDisplay() {
        const blunderDisplay = document.getElementById('blunder-value');
        blunderDisplay.textContent = blunders;
    }
    
    // Update the hints display
    function updateHintsDisplay() {
        const hintsDisplay = document.getElementById('hints-value');
        hintsDisplay.textContent = hintsUsed;
    }
    
    // Update the timer display
    function updateTimer() {
        if (!startTime) return;
        
        const currentTime = new Date();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000);
        
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        
        const timerDisplay = document.getElementById('timer-value');
        timerDisplay.textContent = `${minutes}:${seconds}`;
    }
    
    // Calculate score based on time, blunders and hints
    function calculateScore(timeInSeconds, blunders, hintsUsed) {
        console.log('Calculating score with:', { timeInSeconds, blunders, hintsUsed });
        
        // Base score - everyone starts with 1000 points
        const baseScore = 1000;
        
        // Time bonus - faster completion gives more points
        // Maximum time bonus for completing in 60 seconds or less
        const maxTimeBonus = 500;
        const timeBonus = Math.max(0, maxTimeBonus - Math.floor(timeInSeconds / 10));
        
        // Penalties
        const blunderPenalty = blunders * 25; // Each blunder costs 25 points
        const hintPenalty = hintsUsed * 50;   // Each hint costs 50 points
        
        // Calculate final score
        const score = Math.max(0, baseScore + timeBonus - blunderPenalty - hintPenalty);
        
        console.log('Score breakdown:', {
            baseScore,
            timeBonus,
            blunderPenalty,
            hintPenalty,
            finalScore: score
        });
        
        return {
            total: score,
            baseScore,
            timeBonus,
            blunderPenalty,
            hintPenalty,
            timeInSeconds,
            blunders,
            hintsUsed
        };
    }
    
    // Show success message and score
    function showSuccess() {
        // Stop the timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Calculate final time
        const currentTime = new Date();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        
        // Calculate score
        const scoreData = calculateScore(elapsedSeconds, blunders, hintsUsed);
        finalScore = scoreData.total;
        
        const successMessage = en.messages.congratulations
            .replace('{minutes}', minutes)
            .replace('{seconds}', seconds)
            .replace('{blunders}', blunders)
            .replace('{hintsUsed}', hintsUsed);
            
        messageArea.textContent = successMessage;
        messageArea.className = 'message-area success';
        
        // Add celebration animation
        activeTiles.forEach(tile => {
            tile.classList.add('correct');
            setTimeout(() => {
                tile.classList.remove('correct');
            }, 1000);
        });
        
        // Show score modal after a short delay to allow celebration animation to play
        setTimeout(() => {
            showScoreModal(scoreData, minutes, seconds);
        }, 1500);
    }
    
    // Function to display the score modal with animation
    function showScoreModal(scoreData, minutes, seconds) {
        console.log('Showing score modal with data:', scoreData);
        
        // Get modal elements
        const scoreModal = document.getElementById('score-modal');
        const finalScoreElement = scoreModal.querySelector('.final-score');
        const baseScoreElement = scoreModal.querySelector('.base-score');
        const timeBonusElement = scoreModal.querySelector('.time-bonus');
        const blunderPenaltyElement = scoreModal.querySelector('.blunder-penalty');
        const hintPenaltyElement = scoreModal.querySelector('.hint-penalty');
        
        // Get stats elements
        const timeValueElement = scoreModal.querySelector('.time-value');
        const blundersValueElement = scoreModal.querySelector('.blunders-value');
        const hintsValueElement = scoreModal.querySelector('.hints-value');
        
        // Set values
        finalScoreElement.textContent = scoreData.total;
        baseScoreElement.textContent = scoreData.baseScore;
        timeBonusElement.textContent = `+${scoreData.timeBonus}`;
        blunderPenaltyElement.textContent = `-${scoreData.blunderPenalty}`;
        hintPenaltyElement.textContent = `-${scoreData.hintPenalty}`;
        
        // Format time for display
        const formattedMinutes = Math.floor(scoreData.timeInSeconds / 60).toString().padStart(2, '0');
        const formattedSeconds = (scoreData.timeInSeconds % 60).toString().padStart(2, '0');
        
        // Set stats values
        timeValueElement.textContent = `${formattedMinutes}:${formattedSeconds}`;
        blundersValueElement.textContent = scoreData.blunders;
        hintsValueElement.textContent = scoreData.hintsUsed;
        
        // Show the modal with flex display for centering
        scoreModal.style.display = 'flex';
        
        // Set up event listener for the Play Again button
        const playAgainButton = document.getElementById('play-again-button');
        
        // Remove any existing event listeners to prevent duplicates
        const newPlayAgainButton = playAgainButton.cloneNode(true);
        playAgainButton.parentNode.replaceChild(newPlayAgainButton, playAgainButton);
        
        // Add new event listener
        newPlayAgainButton.addEventListener('click', () => {
            hideScoreModal();
            initGame();
        });
    }
    
    // Function to hide the score modal
    function hideScoreModal() {
        const scoreModal = document.getElementById('score-modal');
        scoreModal.style.display = 'none';
    }
    
    // Show hint
    function showHint() {
        // Increment hints used counter
        hintsUsed++;
        updateHintsDisplay();
        
        // Disable the hint button while the countdown is active
        hintButton.disabled = true;
        
        // Find all tiles that are placed in the wrong position
        let misplacedTilesFound = 0;
        
        for (let row = 0; row < puzzleData.paletteTypes.length; row++) {
            const paletteType = puzzleData.paletteTypes[row];
            const correctPalette = puzzleData.palettes[paletteType];
            
            // Check each tile in this row
            for (let col = 0; col < 5; col++) {
                // Skip locked tiles
                if (puzzleData.lockedTiles[row][col]) continue;
                
                const index = row * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]:not(.empty-slot)`);
                
                // If there's a tile in this position
                if (tile && !tile.classList.contains('empty-slot')) {
                    const tileColor = tile.dataset.color;
                    
                    // Check if the color belongs to this palette
                    if (correctPalette.includes(tileColor)) {
                        // Check if it's in the correct position
                        const correctPosition = correctPalette.indexOf(tileColor);
                        
                        if (correctPosition !== col) {
                            // This tile is in the wrong position
                            tile.classList.add('wrong-position');
                            misplacedTilesFound++;
                        }
                    }
                }
            }
        }
        
        // Show message
        messageArea.textContent = en.messages.showingHint;
        messageArea.className = 'message-area hint';
        
        // Start countdown from 10 seconds
        let countdownTime = 10;
        
        // Update button text with countdown
        hintButton.textContent = en.buttons.hintWithCountdown.replace('{seconds}', countdownTime);
        
        // Clear any existing countdown
        if (hintCountdownInterval) {
            clearInterval(hintCountdownInterval);
        }
        
        // Set up countdown interval
        hintCountdownInterval = setInterval(() => {
            countdownTime--;
            
            // Update button text
            hintButton.textContent = en.buttons.hintWithCountdown.replace('{seconds}', countdownTime);
            
            // When countdown reaches 0
            if (countdownTime <= 0) {
                // Clear the interval
                clearInterval(hintCountdownInterval);
                
                // Remove highlighting from all tiles
                const allTiles = solutionMatrix.querySelectorAll('.tile');
                allTiles.forEach(tile => {
                    tile.classList.remove('wrong-position');
                });
                
                // Reset button text and enable it
                hintButton.textContent = en.buttons.showHint;
                hintButton.disabled = false;
                
                // Clear message
                messageArea.textContent = "";
                messageArea.className = 'message-area';
            }
        }, 1000);
    }
    
    // Add a method to verify the solution and show a success message when correct
    function checkCompletedSolution() {
        // Only verify if solution is not currently being shown
        if (!solutionVisible) {
            verifySolution();
        }
    }
    
    // Touch event handlers for mobile devices
    function handleTouchStart(e) {
        // Prevent default behavior to avoid scrolling
        e.preventDefault();
        
        // Only handle non-locked tiles
        if (this.classList.contains('locked')) {
            return;
        }
        
        // Store the touched tile
        touchedTile = this;
        
        // Remember if this is from scrambled or solution matrix
        touchedTile.dataset.sourceMatrix = this.closest('#scrambled-matrix') ? 'scrambled' : 'solution';
        
        // Get touch position relative to the tile
        const touch = e.touches[0];
        const rect = touchedTile.getBoundingClientRect();
        touchOffsetX = touch.clientX - rect.left;
        touchOffsetY = touch.clientY - rect.top;
        
        // Create ghost tile for visual feedback immediately
        createGhostTile(touch.clientX, touch.clientY);
        
        // Add visual feedback
        touchedTile.style.opacity = '0.4';
        
        // Immediately set isTouchMoving to true to allow dragging right away
        isTouchMoving = true;
        
        // Hide lock emojis after first touch
        hideLockEmojis();
    }
    
    function handleTouchMove(e) {
        if (!touchedTile) return;
        
        // Prevent default behavior to avoid scrolling
        e.preventDefault();
        
        // Set flag to indicate movement (to distinguish from tap)
        isTouchMoving = true;
        
        const touch = e.touches[0];
        
        // Move the ghost tile - use performance optimized movement
        moveGhostTile(touch.clientX, touch.clientY);
        
        // Throttle the slot detection to improve performance
        // This helps ensure smooth movement even during rapid motion
        if (!window.touchMoveThrottle) {
            window.touchMoveThrottle = true;
            
            // Use requestAnimationFrame for better performance
            requestAnimationFrame(() => {
                // Detect if we're over an empty slot - ensure cross-browser compatibility
                let elementsAtPoint = [];
                
                // Use elementsFromPoint if available, otherwise fall back to elementFromPoint
                if (document.elementsFromPoint) {
                    elementsAtPoint = document.elementsFromPoint(touch.clientX, touch.clientY);
                } else if (document.elementFromPoint) {
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (element) elementsAtPoint = [element];
                }
                
                const emptySlotElement = elementsAtPoint.find(el => 
                    el.classList && el.classList.contains('empty-slot')
                );
                
                // Reset previous highlighting
                if (lastTouchedEmpty && lastTouchedEmpty !== emptySlotElement) {
                    lastTouchedEmpty.classList.remove('touch-hover');
                }
                
                // Highlight the current empty slot
                if (emptySlotElement) {
                    emptySlotElement.classList.add('touch-hover');
                    lastTouchedEmpty = emptySlotElement;
                }
                
                // Reset throttle
                window.touchMoveThrottle = false;
            });
        }
    }
    
    function handleTouchEnd(e) {
        if (!touchedTile) return;
        
        // Remove ghost tile
        removeGhostTile();
        
        // Reset opacity of the original tile
        touchedTile.style.opacity = '1';
        
        // Only process if there was actual movement (not just a tap)
        if (isTouchMoving) {
            // Get the touch position
            const touch = e.changedTouches[0];
            
            // Find the element at the touch position - ensure cross-browser compatibility
            let elementsAtPoint = [];
            
            // Use elementsFromPoint if available, otherwise fall back to elementFromPoint
            if (document.elementsFromPoint) {
                elementsAtPoint = document.elementsFromPoint(touch.clientX, touch.clientY);
            } else if (document.elementFromPoint) {
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element) elementsAtPoint = [element];
            }
            
            const emptySlotElement = elementsAtPoint.find(el => 
                el.classList && el.classList.contains('empty-slot')
            );
            
            // If we have an empty slot, simulate a drop
            if (emptySlotElement) {
                // Reset highlight
                emptySlotElement.classList.remove('touch-hover');
                
                // Set draggedTile (used by handleDrop)
                draggedTile = touchedTile;
                
                // Call the drop handler
                handleDrop.call(emptySlotElement, { preventDefault: () => {} });
            }
        }
        
        // Reset touch tracking variables
        touchedTile = null;
        lastTouchedEmpty = null;
        isTouchMoving = false;
    }
    
    function handleTouchCancel() {
        // Clean up
        if (touchedTile) {
            touchedTile.style.opacity = '1';
        }
        removeGhostTile();
        
        // Reset touch tracking variables
        touchedTile = null;
        lastTouchedEmpty = null;
        isTouchMoving = false;
    }
    
    // Helper functions for touch interactions
    function createGhostTile(x, y) {
        // Remove any existing ghost
        removeGhostTile();
        
        // Create a clone of the touched tile
        ghostTile = touchedTile.cloneNode(true);
        ghostTile.classList.add('ghost-tile');
        ghostTile.style.position = 'fixed';
        ghostTile.style.zIndex = '1000';
        ghostTile.style.opacity = '0.8';
        ghostTile.style.pointerEvents = 'none'; // Allow touches to pass through
        
        // Position the ghost at the right spot
        moveGhostTile(x, y);
        
        // Add to document with immediate rendering for better performance
        requestAnimationFrame(() => {
            document.body.appendChild(ghostTile);
        });
    }
    
    function moveGhostTile(x, y) {
        if (!ghostTile) return;
        
        // Position the ghost tile centered on the touch point
        // Use transform for better performance instead of left/top
        const translateX = x - touchOffsetX;
        const translateY = y - touchOffsetY;
        
        // Use requestAnimationFrame for smoother animation
        requestAnimationFrame(() => {
            ghostTile.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
        });
    }
    
    function removeGhostTile() {
        if (ghostTile && ghostTile.parentNode) {
            ghostTile.parentNode.removeChild(ghostTile);
            ghostTile = null;
        }
        
        // Also remove any touch-hover class from empty slots
        document.querySelectorAll('.empty-slot.touch-hover').forEach(slot => {
            slot.classList.remove('touch-hover');
        });
    }
    
    // Helper to check if a row's colors are valid compared to the solution row
    function isRowValidAfterDrop(rowIndex) {
        // Get the correct palette for this row
        const paletteType = puzzleData.paletteTypes[rowIndex];
        const correctPalette = puzzleData.palettes[paletteType];
        // Build color count for the solution row
        const solutionColorCounts = {};
        for (const color of correctPalette) {
            solutionColorCounts[color] = (solutionColorCounts[color] || 0) + 1;
        }
        // Build color count for the current row (post-drop)
        const currentColorCounts = {};
        for (let col = 0; col < 5; col++) {
            const index = rowIndex * 5 + col;
            const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]:not(.empty-slot)`);
            if (tile) {
                const color = tile.dataset.color;
                currentColorCounts[color] = (currentColorCounts[color] || 0) + 1;
            }
        }
        // 1. All colors in current row must be in solution row
        for (const color in currentColorCounts) {
            if (!(color in solutionColorCounts)) {
                return false;
            }
        }
        // 2. No color in current row can exceed its count in solution row
        for (const color in currentColorCounts) {
            if (currentColorCounts[color] > solutionColorCounts[color]) {
                return false;
            }
        }
        return true;
    }
    
    // Event listeners
    checkButton.addEventListener('click', checkSolution);
    hintButton.addEventListener('click', showHint);
    resetButton.addEventListener('click', initGame);

    // Add event listener for the hidden finish button
    const finishButton = document.getElementById('finish-button');
    if (finishButton) {
        finishButton.addEventListener('click', function() {
            showSuccess();
        });
    }
    
    // Initialize the game
    initGame();

    // Expose showSuccess for the finish button
    window.showSuccess = showSuccess;
});