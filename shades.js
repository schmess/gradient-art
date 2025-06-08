const en = window.en;

document.addEventListener('DOMContentLoaded', function() {
    // Use en global variable from en.js (loaded in HTML before this file)
    
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
    
    // Initialize game
    function initGame() {
        // Clear matrices
        scrambledMatrix.innerHTML = '';
        solutionMatrix.innerHTML = '';
        messageArea.textContent = '';
        messageArea.className = 'message-area';
        
        // Reset game stats
        blunders = 0;
        hintsUsed = 0;
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
        
        // Reset and start timer
        startTime = new Date();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        
        // Reset visibility states
        solutionVisible = false;
        firstMoveMade = false;
        
        // Create all color tiles for scrambled matrix
        const allColors = [];
        puzzleData.paletteTypes.forEach(type => {
            allColors.push(...puzzleData.palettes[type]);
        });
        
        // Create scrambled tiles
        const scrambledColors = [...allColors].sort(() => Math.random() - 0.5);
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
                    emptySlot.addEventListener('dragover', handleDragOver);
                    emptySlot.addEventListener('drop', handleDrop);
                    solutionMatrix.appendChild(emptySlot);
                }
            }
        }
        
        // Update active tiles
        updateActiveTiles();
    }
    
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
        
        // Check if this is a center column tile (always locked)
        const col = index % 5;
        const isLockedPosition = col === 2;
        
        if (isLockedPosition && type === 'solution') {
            tile.classList.add('locked');
        } else if (type === 'scrambled' || type === 'solution') {
            // Make tiles draggable except for locked ones
            tile.draggable = true;
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragend', handleDragEnd);
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
        
        // Check for duplicate color in the row (except for the one we're moving)
        const hasDuplicate = rowTiles.some(tile => 
            tile.color === tileColor && 
            (!isMovingWithinSolution || (isMovingWithinSolution && parseInt(draggedTile.dataset.index) !== tile.index))
        );
        
        // If there's a duplicate and this isn't the tile we're moving within the row, show error
        if (hasDuplicate) {
            // Duplicate color - count as blunder
            blunders++;
            updateBlunderDisplay();
            
            // Visual feedback for error
            const tempTile = createTile(tileColor, targetIndex, 'solution');
            tempTile.classList.add('shake');
            
            // Temporarily show the tile in the wrong position with shake animation
            this.parentNode.replaceChild(tempTile, this);
            
            // After animation, restore empty slot
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
            
            messageArea.textContent = en.messages.duplicateColor;
            messageArea.className = 'message-area error';
            
            return;
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
                
                // Temporarily show the tile in the wrong position with shake animation
                this.parentNode.replaceChild(tempTile, this);
                
                // After animation, restore empty slot
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
            
            // Check if the tile is in the correct position within the row
            const correctPositionInRow = colorPositionInPalette === targetCol;
            
            // Create a new tile for the target position
            const newTile = createTile(tileColor, targetIndex, 'solution');
            
            // If the tile is in the wrong position within the row, show visual feedback and count a blunder
            if (!correctPositionInRow) {
                // Wrong position - count as blunder
                blunders++;
                updateBlunderDisplay();
                
                // Visual feedback for wrong position
                newTile.classList.add('wrong-position');
                
                // Show message
                messageArea.textContent = en.messages.wrongPosition;
                messageArea.className = 'message-area error';
                
                // Remove the animation class after it completes
                setTimeout(() => {
                    if (newTile.parentNode) { // Check if tile is still in the DOM
                        newTile.classList.remove('wrong-position');
                    }
                }, 500);
            } else {
                // Correct position - show positive feedback
                newTile.classList.add('correct-position');
                
                // Clear any messages
                messageArea.textContent = "";
                messageArea.className = 'message-area';
                
                // Remove the animation class after it completes
                setTimeout(() => {
                    if (newTile.parentNode) { // Check if tile is still in the DOM
                        newTile.classList.remove('correct-position');
                    }
                }, 500);
            }
            
            // Replace the empty slot with the new tile
            this.parentNode.replaceChild(newTile, this);
        } else {
            // Coming from scrambled matrix
            
            // Only allow placement in correct row
            if (!colorInPalette) {
                // Incorrect row - count as blunder
                blunders++;
                updateBlunderDisplay();
                
                // Visual feedback for error
                const tempTile = createTile(tileColor, targetIndex, 'solution');
                tempTile.classList.add('shake');
                
                // Temporarily show the tile in the wrong position with shake animation
                this.parentNode.replaceChild(tempTile, this);
                
                // After animation, restore empty slot and return tile to scrambled matrix
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
            
            // Check if the tile is in the correct position within the row
            const correctPositionInRow = colorPositionInPalette === targetCol;
            
            // Create a new tile for the solution matrix
            const newTile = createTile(tileColor, targetIndex, 'solution');
            
            // If the tile is in the wrong position within the row, show visual feedback and count a blunder
            if (!correctPositionInRow) {
                // Wrong position - count as blunder
                blunders++;
                updateBlunderDisplay();
                
                // Visual feedback for wrong position
                newTile.classList.add('wrong-position');
                
                // Show message
                messageArea.textContent = en.messages.wrongPosition;
                messageArea.className = 'message-area error';
                
                // Remove the animation class after it completes
                setTimeout(() => {
                    if (newTile.parentNode) { // Check if tile is still in the DOM
                        newTile.classList.remove('wrong-position');
                    }
                }, 500);
            } else {
                // Correct position - show positive feedback
                newTile.classList.add('correct-position');
                
                // Clear any messages
                messageArea.textContent = "";
                messageArea.className = 'message-area';
                
                // Remove the animation class after it completes
                setTimeout(() => {
                    if (newTile.parentNode) { // Check if tile is still in the DOM
                        newTile.classList.remove('correct-position');
                    }
                }, 500);
            }
            
            // Replace the empty slot with the new tile
            this.parentNode.replaceChild(newTile, this);
            
            // Remove the dragged tile from scrambled matrix
            draggedTile.parentNode.removeChild(draggedTile);
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
    
    // Function to verify if the solution is correct
    function verifySolution() {
        let allCorrect = true;
        
        // Check each row
        for (let row = 0; row < puzzleData.paletteTypes.length; row++) {
            const paletteType = puzzleData.paletteTypes[row];
            const correctPalette = puzzleData.palettes[paletteType];
            
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
            
            // Check if colors match the correct palette (order doesn't matter)
            const rowColors = rowTiles.map(tile => tile.dataset.color);
            
            // Create a frequency map of colors
            const correctColorCounts = {};
            const rowColorCounts = {};
            
            for (const color of correctPalette) {
                correctColorCounts[color] = (correctColorCounts[color] || 0) + 1;
            }
            
            for (const color of rowColors) {
                rowColorCounts[color] = (rowColorCounts[color] || 0) + 1;
            }
            
            // Check if both maps have the same keys and values
            const colorsMatch = Object.keys(correctColorCounts).length === Object.keys(rowColorCounts).length &&
                Object.keys(correctColorCounts).every(key => 
                    correctColorCounts[key] === rowColorCounts[key]
                );
            
            if (!colorsMatch) {
                allCorrect = false;
            }
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
    
    // Show success message
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
    
    // Function to toggle palette type visibility - Removed
    
    // Event listeners
    checkButton.addEventListener('click', checkSolution);
    hintButton.addEventListener('click', showHint);
    resetButton.addEventListener('click', initGame);
    
    // Initialize the game
    initGame();
});