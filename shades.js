document.addEventListener('DOMContentLoaded', function() {
    // Color palettes definition (these could be generated programmatically in a more advanced version)
    const palettes = {
        monochromatic: ['#e6f2ff', '#bfd9ff', '#99c2ff', '#6699ff', '#3366ff'],
        analogous: ['#ff9999', '#ffcc99', '#ffff99', '#ccff99', '#99ffcc'],
        complementary: ['#ff5555', '#ff9999', '#ffffff', '#9999ff', '#5555ff'],
        splitComplementary: ['#ff6600', '#ff9933', '#33cc99', '#66cc99', '#cc33cc'],
        triadic: ['#ff5555', '#55ff55', '#5555ff', '#ff5555', '#5555ff']
    };
    
    // Game elements
    const scrambledMatrix = document.getElementById('scrambled-matrix');
    const solutionMatrix = document.getElementById('solution-matrix');
    const messageArea = document.getElementById('message');
    const checkButton = document.getElementById('check-button');
    const hintButton = document.getElementById('hint-button');
    const resetButton = document.getElementById('reset-button');
    
    // Game state
    let draggedTile = null;
    let activeTiles = [];
    let blunders = 0;
    let startTime = null;
    let timerInterval = null;
    let solutionVisible = false; // Track if solution is currently shown
    let paletteTypesVisible = false; // Track if palette types are visible
    
    // Initialize game
    function initGame() {
        // Clear matrices
        scrambledMatrix.innerHTML = '';
        solutionMatrix.innerHTML = '';
        messageArea.textContent = '';
        messageArea.className = 'message-area';
        
        // Reset game stats
        blunders = 0;
        updateBlunderDisplay();
        
        // Reset and start timer
        startTime = new Date();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        
        // Reset visibility states
        solutionVisible = false;
        paletteTypesVisible = false;
        
        // Hide palette types UI
        const rowLabels = document.querySelector('.row-labels');
        rowLabels.classList.remove('visible');
        
        // Reset palette button text
        const paletteButton = document.getElementById('palette-button');
        if (paletteButton) {
            paletteButton.textContent = "Show Palette Types";
        }
        
        // Create all color tiles
        const allColors = [];
        Object.values(palettes).forEach(palette => {
            allColors.push(...palette);
        });
        
        // Create scrambled tiles
        const scrambledColors = [...allColors].sort(() => Math.random() - 0.5);
        scrambledColors.forEach((color, index) => {
            const tile = createTile(color, index, 'scrambled');
            tile.dataset.originalIndex = index; // Store original position
            scrambledMatrix.appendChild(tile);
        });
        
        // Create solution matrix with locked center column
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                // Calculate the index in a 5x5 grid
                const index = row * 5 + col;
                
                // For center column (col = 2), place locked tiles with the correct colors
                if (col === 2) {
                    const paletteType = Object.keys(palettes)[row];
                    const palette = palettes[paletteType];
                    const centerTile = createTile(palette[2], index, 'locked');
                    centerTile.classList.add('locked');
                    solutionMatrix.appendChild(centerTile);
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
        const paletteType = Object.keys(palettes)[targetRow];
        const correctPalette = palettes[paletteType];
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
                draggedTile.style.opacity = '1';
            }, 500);
            
            messageArea.textContent = "Cannot place duplicate colors in the same row!";
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
                    draggedTile.style.opacity = '1';
                }, 500);
                
                messageArea.textContent = "Tiles can only be moved within the same row!";
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
                messageArea.textContent = "Right color, wrong position in the row!";
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
                    draggedTile.style.opacity = '1';
                }, 500);
                
                messageArea.textContent = "This tile doesn't belong in this row!";
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
                messageArea.textContent = "Right color, wrong position in the row!";
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
            checkButton.textContent = "Hide Solution";
        } else {
            // Hide the solution and restore the current state
            hideSolution();
            checkButton.textContent = "Show Solution";
        }
    }
    
    // Function to show the correct solution
    function showSolution() {
        // Save current state to be able to restore it
        saveBoardState();
        
        // Clear the solution matrix except for the center column
        clearSolutionMatrix();
        
        // Place all tiles in their correct positions
        for (let row = 0; row < 5; row++) {
            const paletteType = Object.keys(palettes)[row];
            const correctPalette = palettes[paletteType];
            
            // For each row, collect all colors needed (excluding the center which is already there)
            const colorsNeeded = [];
            for (let col = 0; col < 5; col++) {
                if (col !== 2) { // Skip center column
                    colorsNeeded.push(correctPalette[col]);
                }
            }
            
            // Place these colors in the available slots for this row
            let colorsPlaced = 0;
            for (let col = 0; col < 5; col++) {
                if (col === 2) continue; // Skip the center column as it's already filled
                
                const index = row * 5 + col;
                const colorToPlace = colorsNeeded[colorsPlaced];
                colorsPlaced++;
                
                // Create a tile with the correct color
                const newTile = createTile(colorToPlace, index, 'solution');
                newTile.classList.add('solution-tile'); // Mark as part of the solution
                
                // Find the slot to replace
                const slot = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                if (slot) {
                    slot.parentNode.replaceChild(newTile, slot);
                }
            }
        }
        
        messageArea.textContent = "👀 Solution shown. Click 'Hide Solution' to continue your game.";
        messageArea.className = 'message-area hint';
    }
    
    // Function to hide the solution and restore the previous state
    function hideSolution() {
        // Restore the board to its previous state
        restoreBoardState();
        
        messageArea.textContent = "Continue arranging the tiles to complete the puzzle!";
        messageArea.className = 'message-area';
    }
    
    // Function to save the current state of the board
    function saveBoardState() {
        // We'll store the state in a global variable
        window.savedState = [];
        
        // For each position in the solution matrix
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const index = row * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                
                if (tile && !tile.classList.contains('empty-slot')) {
                    // Save the color and position
                    window.savedState.push({
                        index: index,
                        color: tile.dataset.color,
                        locked: tile.classList.contains('locked')
                    });
                }
            }
        }
    }
    
    // Function to clear the solution matrix except for the center column
    function clearSolutionMatrix() {
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (col === 2) continue; // Skip center column
                
                const index = row * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                
                if (tile && !tile.classList.contains('locked')) {
                    // Create an empty slot
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
        // First clear the board (except center column)
        clearSolutionMatrix();
        
        // Then restore each saved tile
        if (window.savedState) {
            window.savedState.forEach(saved => {
                // Skip locked tiles (they're already there)
                if (saved.locked) return;
                
                const index = saved.index;
                const slot = solutionMatrix.querySelector(`.tile[data-index="${index}"]`);
                
                if (slot) {
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
        for (let row = 0; row < 5; row++) {
            const paletteType = Object.keys(palettes)[row];
            const correctPalette = palettes[paletteType];
            
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
        
        messageArea.textContent = `🎉 Congratulations! You solved it in ${minutes}m ${seconds}s with ${blunders} blunders!`;
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
        // Find the three rows with the fewest tiles placed
        const rowCompletion = [0, 0, 0, 0, 0]; // Track how many tiles are placed in each row
        
        // Count placed tiles in each row (excluding the locked center tile)
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (col === 2) continue; // Skip center column (it's always filled)
                
                const index = row * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]:not(.empty-slot)`);
                
                if (tile && !tile.classList.contains('empty-slot')) {
                    rowCompletion[row]++;
                }
            }
        }
        
        // Find the three rows with the least completion
        const rowIndices = [0, 1, 2, 3, 4];
        rowIndices.sort((a, b) => rowCompletion[a] - rowCompletion[b]);
        const rowsNeedingHelp = rowIndices.slice(0, 3);
        
        // Text hints based on which rows need help
        const hintMessages = {
            0: "Monochromatic palettes show different brightness levels of the same color.",
            1: "Analogous palettes contain colors that are next to each other on the color wheel.",
            2: "Complementary palettes use colors from opposite sides of the color wheel.",
            3: "Split complementary palettes use a color and two colors adjacent to its complement.",
            4: "Triadic palettes use three colors evenly spaced around the color wheel."
        };
        
        // Choose one of the rows needing help and give specific hint
        const focusRow = rowsNeedingHelp[0];
        const paletteType = Object.keys(palettes)[focusRow];
        const palette = palettes[paletteType];
        
        // Find an empty slot to suggest a tile for
        let suggestedCol = -1;
        let suggestedColor = null;
        
        // First check if columns 0 and 1 are empty
        for (let col of [0, 1]) {
            const index = focusRow * 5 + col;
            const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]:not(.empty-slot)`);
            
            if (!tile || tile.classList.contains('empty-slot')) {
                suggestedCol = col;
                suggestedColor = palette[col];
                break;
            }
        }
        
        // If columns 0 and 1 are filled, check columns 3 and 4
        if (suggestedCol === -1) {
            for (let col of [3, 4]) {
                const index = focusRow * 5 + col;
                const tile = solutionMatrix.querySelector(`.tile[data-index="${index}"]:not(.empty-slot)`);
                
                if (!tile || tile.classList.contains('empty-slot')) {
                    suggestedCol = col;
                    suggestedColor = palette[col];
                    break;
                }
            }
        }
        
        // Highlight the color in scrambled matrix
        let highlightedTile = null;
        if (suggestedColor) {
            const scrambledTiles = scrambledMatrix.querySelectorAll('.tile');
            
            for (const tile of scrambledTiles) {
                if (tile.dataset.color === suggestedColor) {
                    // Add highlighting to this tile
                    tile.style.boxShadow = '0 0 15px gold, 0 0 8px gold';
                    tile.style.transform = 'scale(1.1)';
                    highlightedTile = tile;
                    break;
                }
            }
        }
        
        // Remove highlighting after 3 seconds
        if (highlightedTile) {
            setTimeout(() => {
                if (highlightedTile.parentNode) { // Check if the tile is still in the DOM
                    highlightedTile.style.boxShadow = '';
                    highlightedTile.style.transform = '';
                }
            }, 3000);
        }
        
        // Generate message for the rows that need help
        let hintText = '💡 Hint: Focus on these rows: ';
        rowsNeedingHelp.forEach((rowIndex, i) => {
            hintText += `Row ${rowIndex + 1} (${hintMessages[rowIndex].split(' ')[0]})`;
            if (i < rowsNeedingHelp.length - 1) {
                hintText += ', ';
            }
        });
        
        messageArea.textContent = hintText;
        messageArea.className = 'message-area hint';
    }
    
    // Add a method to verify the solution and show a success message when correct
    function checkCompletedSolution() {
        // Only verify if solution is not currently being shown
        if (!solutionVisible) {
            verifySolution();
        }
    }
    
    // Function to toggle palette type visibility
    function togglePaletteTypes() {
        paletteTypesVisible = !paletteTypesVisible;
        
        const rowLabels = document.querySelector('.row-labels');
        const paletteButton = document.getElementById('palette-button');
        
        if (paletteTypesVisible) {
            // Show palette types
            rowLabels.classList.add('visible');
            paletteButton.textContent = "Hide Palette Types";
            
            // Show a message explaining palette types
            messageArea.textContent = "Palette types shown. Each row corresponds to a different color relationship pattern.";
            messageArea.className = 'message-area hint';
        } else {
            // Hide palette types
            rowLabels.classList.remove('visible');
            paletteButton.textContent = "Show Palette Types";
            
            // Clear message area if it's showing the palette message
            if (messageArea.textContent.includes("Palette types shown")) {
                messageArea.textContent = "";
                messageArea.className = 'message-area';
            }
        }
    }
    
    // Event listeners
    checkButton.addEventListener('click', checkSolution);
    hintButton.addEventListener('click', showHint);
    const paletteButton = document.getElementById('palette-button');
    paletteButton.addEventListener('click', togglePaletteTypes);
    resetButton.addEventListener('click', initGame);
    
    // Initialize the game
    initGame();
});