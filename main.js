let canvas = document.getElementById("myCanvas");
let c = canvas.getContext("2d");
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;

// Create an offscreen canvas for trail rasterization
let trailCanvas = document.createElement('canvas');
let trailContext = trailCanvas.getContext('2d');
trailCanvas.width = canvas.width;
trailCanvas.height = canvas.height;

let simMinWidth = 1.5;
let cScale = Math.min(canvas.width, canvas.height) / simMinWidth;

// Performance optimization flags
let useRequestAnimationFrame = true;
let lastFrameTime = 0;
let frameCount = 0;
let fpsUpdateInterval = 500; // Update FPS every 500ms
let lastFpsUpdate = 0;
let currentFps = 0;

function cX(pos) { return canvas.width / 2 + pos.x * cScale; }
function cY(pos) { return canvas.height * 0.6 - pos.y * cScale; }

let scene = {
    currentSimulation: 'pendulum',
    gravity: -10.0,
    dt: 0.01,
    numSubSteps: 1000, // Fixed value, no longer dynamically adjusted
    paused: true,
    system1: null,
    system2: null,
    scores: {
        player1: 0,
        player2: 0
    },
    timer: 10,
    timerInterval: null,
    matchHistory: [],
    autoplay: false,
    autoplayTimeout: null,
    nextGameDelay: 3000,
    trailRasterization: {
        enabled: true,
        interval: 10, // seconds
        lastRasterTime: 0,
        fadeAmount: 0.05, // How much to fade the old trails on each rasterization
        keepCompleteTrail: false, // New option to keep complete trail
        adaptiveRasterization: true, // Enable adaptive rasterization based on performance
        minInterval: 2, // Minimum rasterization interval in seconds
        maxInterval: 15, // Maximum rasterization interval in seconds
        substepCounter: 0, // Counter for substeps
        substepRasterInterval: 1000, // Rasterize every 1000 substeps
        useSubstepRasterization: true // Default to substep-based rasterization
    },
    performance: {
        adaptiveSubsteps: false, // Disabled - no longer adjusting substeps
        minFps: 30, // Target minimum FPS
        maxSubsteps: 2000, // Maximum allowed substeps (no longer used)
        minSubsteps: 500, // Minimum allowed substeps (no longer used)
        lastPerformanceCheck: 0,
        performanceCheckInterval: 2000, // Check performance every 2 seconds
        adaptiveTrailLength: true, // New option to adjust trail length based on performance
        maxTrailLength: 200, // Default max trail length
        minTrailLength: 50 // Minimum trail length for low performance
    }
};

function toggleSimulation() {
    const toggle = document.getElementById('simulationToggle');
    const newType = toggle.checked ? 'threebody' : 'pendulum';
    switchSimulation(newType);
}

function switchSimulation(type) {
    scene.currentSimulation = type;
    
    if (scene.timerInterval) {
        clearInterval(scene.timerInterval);
    }
    if (scene.autoplayTimeout) {
        clearTimeout(scene.autoplayTimeout);
    }
    
    scene.scores.player1 = 0;
    scene.scores.player2 = 0;
    scene.matchHistory = [];
    updateHistoryDisplay();
    startNewGame();
    
    // Update the checkbox state to match the current simulation
    document.getElementById('simulationToggle').checked = type === 'threebody';
}

// Function to generate a random color in hex format
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Function to get complementary color
function getComplementaryColor(hexColor) {
    // Remove the # if present
    hexColor = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Get complementary RGB values (255 - value)
    const compR = 255 - r;
    const compG = 255 - g;
    const compB = 255 - b;
    
    // Convert back to hex
    return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
}

// Function to generate a pair of complementary colors
function getComplementaryColorPair() {
    const baseColor = getRandomColor();
    const compColor = getComplementaryColor(baseColor);
    return [baseColor, compColor];
}

// Function to generate a set of 6 complementary colors for the three-body system
function getThreeBodyColorSet() {
    // Generate first color pair
    const [color1, color4] = getComplementaryColorPair();
    
    // Generate second color pair by rotating hue by 120 degrees
    const color2 = rotateHue(color1, 120);
    const color5 = getComplementaryColor(color2);
    
    // Generate third color pair by rotating hue by 240 degrees
    const color3 = rotateHue(color1, 240);
    const color6 = getComplementaryColor(color3);
    
    return [
        [color1, color2, color3], // First system colors
        [color4, color5, color6]  // Second system colors
    ];
}

// Function to rotate hue of a color by specified degrees
function rotateHue(hexColor, degrees) {
    // Remove the # if present
    hexColor = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16) / 255;
    const g = parseInt(hexColor.substr(2, 2), 16) / 255;
    const b = parseInt(hexColor.substr(4, 2), 16) / 255;
    
    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        
        h /= 6;
    }
    
    // Rotate hue
    h = (h + degrees / 360) % 1;
    
    // Convert back to RGB
    let r1, g1, b1;
    
    if (s === 0) {
        r1 = g1 = b1 = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r1 = hue2rgb(p, q, h + 1/3);
        g1 = hue2rgb(p, q, h);
        b1 = hue2rgb(p, q, h - 1/3);
    }
    
    // Convert back to hex
    const toHex = (x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function setupScene() {
    // Clear the trail canvas when starting a new game
    trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    scene.trailRasterization.lastRasterTime = Date.now();
    scene.trailRasterization.substepCounter = 0; // Reset substep counter
    
    if (scene.currentSimulation === 'pendulum') {
        // Generate complementary colors for the pendulum trails
        const [color1, color2] = getComplementaryColorPair();
        
        const randomLength = () => 0.1 + Math.random() * 0.1;
        const randomMass = () => 0.5 + Math.random() * 1.0;
        
        const lengths1 = [randomLength(), randomLength(), randomLength()];
        const lengths2 = [randomLength(), randomLength(), randomLength()];
        const masses1 = [randomMass(), randomMass(), randomMass()];
        const masses2 = [randomMass(), randomMass(), randomMass()];
        
        const randomVariation = () => (Math.random() - 0.5) * Math.PI / 36;

        const angles1 = [
            Math.PI + randomVariation(),
            Math.PI + randomVariation(),
            Math.PI + randomVariation()
        ];

        const angles2 = [
            Math.PI + randomVariation(),
            Math.PI + randomVariation(),
            Math.PI + randomVariation()
        ];

        scene.system1 = new Pendulum(true, color1, masses1, lengths1, angles1, -0.3);
        scene.system2 = new Pendulum(true, color2, masses2, lengths2, angles2, 0.3);

        // Add initial velocity to make the pendulums start moving
        const initialVelocity = 0.5 + Math.random() * 0.5;
        for (let i = 1; i < scene.system1.vel.length; i++) {
            scene.system1.vel[i].x = (Math.random() - 0.5) * initialVelocity;
            scene.system1.vel[i].y = (Math.random() - 0.5) * initialVelocity;
            scene.system2.vel[i].x = (Math.random() - 0.5) * initialVelocity;
            scene.system2.vel[i].y = (Math.random() - 0.5) * initialVelocity;
        }

        const hands = ['Rock', 'Paper', 'Scissors'];
        scene.system1.assignHands(hands);
        scene.system2.assignHands(hands);
        
        // Set unlimited trail option based on user preference
        scene.system1.setUnlimitedTrail(scene.trailRasterization.keepCompleteTrail);
        scene.system2.setUnlimitedTrail(scene.trailRasterization.keepCompleteTrail);
        
        // Set trail length based on performance settings
        if (!scene.trailRasterization.keepCompleteTrail) {
            scene.system1.maxTrailLength = scene.performance.maxTrailLength;
            scene.system2.maxTrailLength = scene.performance.maxTrailLength;
        }
    } else {
        // Generate 6 complementary colors for the three-body systems
        const colorSets = getThreeBodyColorSet();
        
        scene.system1 = new ThreeBodySystem(colorSets[0], -0.3);
        scene.system2 = new ThreeBodySystem(colorSets[1], 0.3);
        
        // Set unlimited trail option based on user preference
        scene.system1.setUnlimitedTrail(scene.trailRasterization.keepCompleteTrail);
        scene.system2.setUnlimitedTrail(scene.trailRasterization.keepCompleteTrail);
        
        // Set trail length based on performance settings
        if (!scene.trailRasterization.keepCompleteTrail) {
            scene.system1.maxTrailLength = scene.performance.maxTrailLength;
            scene.system2.maxTrailLength = scene.performance.maxTrailLength;
        }
    }
    
    scene.paused = true;
    document.getElementById("result").innerHTML = "";
    
    if (scene.timerInterval) {
        clearInterval(scene.timerInterval);
    }
    
    // Get round time from slider if available, otherwise use default
    const roundTimeSlider = document.getElementById('roundTimeSlider');
    if (roundTimeSlider) {
        scene.timer = parseInt(roundTimeSlider.value);
    }
    
    updateTimerDisplay();
    updateHandDisplays({ move: 'Rock' }, { move: 'Rock' });
    
    if (scene.autoplayTimeout) {
        clearTimeout(scene.autoplayTimeout);
    }
}

function simulate() {
    if (scene.paused)
        return;
        
    const sdt = scene.dt / scene.numSubSteps;
    
    // Adjust trail gap based on round time for better performance in longer matches
    const roundTimeSlider = document.getElementById('roundTimeSlider');
    const currentRoundTime = roundTimeSlider ? parseInt(roundTimeSlider.value) : 10;
    
    // Increase trail gap for longer matches
    let trailGap;
    if (currentRoundTime <= 10) {
        trailGap = Math.max(1, Math.floor(scene.numSubSteps / 30)); // Increased gap
    } else if (currentRoundTime <= 30) {
        trailGap = Math.max(1, Math.floor(scene.numSubSteps / 20)); // Increased gap
    } else {
        trailGap = Math.max(1, Math.floor(scene.numSubSteps / 10)); // Increased gap
    }

    // Check if it's time to rasterize trails based on time or other criteria
    if (shouldRasterizeTrails()) {
        rasterizeTrails();
    }

    let isMoving = false;
    const velocityThreshold = 0.1;

    // Reset substep counter if we're starting a new simulation batch
    if (scene.trailRasterization.substepCounter >= scene.numSubSteps) {
        scene.trailRasterization.substepCounter = 0;
    }

    // Performance optimization: Use fewer substeps for better performance
    for (let step = 0; step < scene.numSubSteps; step++) {
        // Increment the substep counter
        scene.trailRasterization.substepCounter++;
        
        // Check if we need to rasterize based on substep count
        if (scene.trailRasterization.substepCounter % scene.trailRasterization.substepRasterInterval === 0) {
            rasterizeTrails();
            console.log(`Rasterized trails after ${scene.trailRasterization.substepCounter} substeps`);
        }
        
        if (scene.system1) {
            if (scene.currentSimulation === 'pendulum') {
                scene.system1.simulate(sdt, scene.gravity);
            } else {
                scene.system1.simulate(sdt);
                // Only check bounds occasionally for better performance
                if (step % 10 === 0) {
                    scene.system1.checkBounds();
                }
            }
            
            if (step % trailGap == 0) {
                scene.system1.updateTrail();
            }

            // Velocity check for determining if system is still moving
            if (!isMoving) {
                if (scene.currentSimulation === 'pendulum') {
                    for (let i = 1; i < scene.system1.vel.length; i++) {
                        if (Math.abs(scene.system1.vel[i].x) > velocityThreshold || 
                            Math.abs(scene.system1.vel[i].y) > velocityThreshold) {
                            isMoving = true;
                            break;
                        }
                    }
                } else {
                    for (let i = 0; i < scene.system1.bodies.length; i++) {
                        const body = scene.system1.bodies[i];
                        if (Math.sqrt(body.vel.x * body.vel.x + body.vel.y * body.vel.y) > velocityThreshold) {
                            isMoving = true;
                            break;
                        }
                    }
                }
            }
        }
        
        if (scene.system2) {
            if (scene.currentSimulation === 'pendulum') {
                scene.system2.simulate(sdt, scene.gravity);
            } else {
                scene.system2.simulate(sdt);
                // Only check bounds occasionally for better performance
                if (step % 10 === 0) {
                    scene.system2.checkBounds();
                }
            }
            
            if (step % trailGap == 0) {
                scene.system2.updateTrail();
            }

            // Velocity check for determining if system is still moving
            if (!isMoving) {
                if (scene.currentSimulation === 'pendulum') {
                    for (let i = 1; i < scene.system2.vel.length; i++) {
                        if (Math.abs(scene.system2.vel[i].x) > velocityThreshold || 
                            Math.abs(scene.system2.vel[i].y) > velocityThreshold) {
                            isMoving = true;
                            break;
                        }
                    }
                } else {
                    for (let i = 0; i < scene.system2.bodies.length; i++) {
                        const body = scene.system2.bodies[i];
                        if (Math.sqrt(body.vel.x * body.vel.x + body.vel.y * body.vel.y) > velocityThreshold) {
                            isMoving = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    if (!isMoving && !scene.autoplay) {
        scene.paused = true;
        
        if (scene.timer > 0) {
            const move1 = scene.system1.determineMove(true);
            const move2 = scene.system2.determineMove(true);
            updateHandDisplays(move1, move2);
            
            const result = determineWinner(move1.move, move2.move);
            document.getElementById("result").innerHTML = result;
            
            if (result.includes("1")) {
                scene.scores.player1++;
            } else if (result.includes("2")) {
                scene.scores.player2++;
            }
            
            addToHistory(move1.move, move2.move, result);
            
            clearInterval(scene.timerInterval);
            scene.timer = 0;
            updateTimerDisplay();
        }
    }
}

// Function to determine if trails should be rasterized based on performance and settings
function shouldRasterizeTrails() {
    if (!scene.trailRasterization.enabled) {
        return false;
    }
    
    // If we're using substep-based rasterization, let the simulate loop handle it
    if (scene.trailRasterization.useSubstepRasterization) {
        return false;
    }
    
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - scene.trailRasterization.lastRasterTime) / 1000;
    
    // Basic time-based check
    if (elapsedSeconds >= scene.trailRasterization.interval) {
        return true;
    }
    
    // Additional check: if FPS is very low and we have a lot of trail points, force rasterization
    if (currentFps < scene.performance.minFps * 0.7) {
        // Check if we have a significant number of trail points
        let totalTrailPoints = 0;
        
        if (scene.system1) {
            if (scene.currentSimulation === 'pendulum') {
                totalTrailPoints += scene.system1.trailX.length;
            } else if (scene.system1.trails) {
                for (let i = 0; i < scene.system1.trails.length; i++) {
                    totalTrailPoints += scene.system1.trails[i].x.length;
                }
            }
        }
        
        if (scene.system2) {
            if (scene.currentSimulation === 'pendulum') {
                totalTrailPoints += scene.system2.trailX.length;
            } else if (scene.system2.trails) {
                for (let i = 0; i < scene.system2.trails.length; i++) {
                    totalTrailPoints += scene.system2.trails[i].x.length;
                }
            }
        }
        
        // If we have a lot of trail points and it's been at least 1/3 of the normal interval
        if (totalTrailPoints > scene.performance.maxTrailLength && elapsedSeconds >= scene.trailRasterization.interval / 3) {
            console.log(`Performance optimization: Forced early rasterization due to low FPS (${currentFps.toFixed(1)}) and high trail count (${totalTrailPoints})`);
            return true;
        }
    }
    
    return false;
}

function draw() {
    c.fillStyle = "#000000";
    c.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the rasterized trails first
    if (scene.trailRasterization.enabled) {
        c.drawImage(trailCanvas, 0, 0);
    }
    
    // Then draw the current trails and objects
    if (scene.system1) scene.system1.draw();
    if (scene.system2) scene.system2.draw();

    document.getElementById("score1").innerHTML = scene.scores.player1;
    document.getElementById("score2").innerHTML = scene.scores.player2;
}

function determineWinner(move1, move2) {
    if (move1 === move2) return "Draw!";
    if (
        (move1 === "Rock" && move2 === "Scissors") ||
        (move1 === "Paper" && move2 === "Rock") ||
        (move1 === "Scissors" && move2 === "Paper")
    ) {
        scene.scores.player1++;
        return "Player 1 Wins!";
    } else {
        scene.scores.player2++;
        return "Player 2 Wins!";
    }
}

function addToHistory(move1, move2, result) {
    const timestamp = new Date().toLocaleTimeString();
    const historyItem = {
        timestamp,
        move1,
        move2,
        result
    };
    scene.matchHistory.unshift(historyItem);
    if (scene.matchHistory.length > 10) {
        scene.matchHistory.pop();
    }
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyDiv = document.getElementById('history');
    historyDiv.innerHTML = '<div class="history-title">Match History</div>';
    
    // Create a table for match history
    const table = document.createElement('table');
    table.className = 'history-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>#</th>
        <th>Player 1</th>
        <th>Player 2</th>
        <th>Result</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    scene.matchHistory.forEach((item, index) => {
        const resultClass = item.result.includes('1') ? 'win' : 
                          item.result.includes('2') ? 'lose' : 'draw';
        
        const row = document.createElement('tr');
        row.className = resultClass;
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.move1}</td>
            <td>${item.move2}</td>
            <td>${item.result}</td>
        `;
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    historyDiv.appendChild(table);
}

function updateHandDisplays(move1, move2) {
    const hand1 = document.getElementById('hand1');
    const hand2 = document.getElementById('hand2');
    
    function createFontAwesomeIcon(move) {
        const svgIcon = document.createElement('i');
        switch(move.move) {
            case 'Rock': 
                svgIcon.className = 'fa-solid fa-gem';
                svgIcon.style.color = '#ff6b6b';
                break;
            case 'Paper': 
                svgIcon.className = 'fa-solid fa-file';
                svgIcon.style.color = '#4ecdc4';
                break;
            case 'Scissors': 
                svgIcon.className = 'fa-solid fa-scissors';
                svgIcon.style.color = '#ffd93d';
                break;
            default:
                svgIcon.className = 'fa-solid fa-gem';
                svgIcon.style.color = '#ff6b6b';
        }
        return svgIcon;
    }

    hand1.innerHTML = '';
    hand2.innerHTML = '';
    
    const icon1 = createFontAwesomeIcon(move1);
    const icon2 = createFontAwesomeIcon(move2);
    
    hand1.appendChild(icon1);
    hand2.appendChild(icon2);
    
    if (move1.state) {
        const stateText = document.createElement('small');
        stateText.textContent = move1.state;
        hand1.appendChild(stateText);
    }
    
    if (move2.state) {
        const stateText = document.createElement('small');
        stateText.textContent = move2.state;
        hand2.appendChild(stateText);
    }
}

function updateTimerDisplay() {
    document.getElementById('timer').innerHTML = scene.timer;
}

function startTimer() {
    if (scene.timerInterval) {
        clearInterval(scene.timerInterval);
    }
    
    // Get round time from slider
    const roundTimeSlider = document.getElementById('roundTimeSlider');
    if (roundTimeSlider) {
        scene.timer = parseInt(roundTimeSlider.value);
    }
    
    updateTimerDisplay();
    
    scene.timerInterval = setInterval(() => {
        scene.timer--;
        updateTimerDisplay();
        
        if (scene.timer <= 0) {
            clearInterval(scene.timerInterval);
            endRound();
        }
    }, 1000);
}

function endRound() {
    scene.paused = true;
    const move1 = scene.system1.determineMove(true);
    const move2 = scene.system2.determineMove(true);
    updateHandDisplays(move1, move2);
    const result = determineWinner(move1.move, move2.move);
    document.getElementById("result").innerHTML = result;
    addToHistory(move1.move, move2.move, result);

    if (scene.autoplay) {
        if (scene.autoplayTimeout) {
            clearTimeout(scene.autoplayTimeout);
        }
        document.getElementById("result").innerHTML = `${result}<br>Starting new round in 2 seconds...`;
        scene.autoplayTimeout = setTimeout(() => {
            setupScene();
            scene.paused = false;
            startTimer();
        }, 2000);
    }
}

function toggleAutoplay() {
    scene.autoplay = !scene.autoplay;
    const autoplayToggle = document.getElementById('autoplayToggle');
    
    // Check if these elements exist before trying to access them
    const disabledIcon = document.querySelector('.autoplay-icon-disabled');
    const enabledIcon = document.querySelector('.autoplay-icon-enabled');

    if (scene.autoplay) {
        if (autoplayToggle) {
            autoplayToggle.checked = true;
        }
        
        // Only modify the icons if they exist
        if (disabledIcon) disabledIcon.style.display = 'none';
        if (enabledIcon) enabledIcon.style.display = 'inline-block';

        if (scene.paused) {
            startNewGame();
        }

        scene.autoplayTimeout = setTimeout(function autoStep() {
            scene.paused = false;
            simulate();
            scene.paused = true;

            if (scene.autoplay) {
                scene.autoplayTimeout = setTimeout(autoStep, 20);
            }
        }, 20);
    } else {
        if (autoplayToggle) {
            autoplayToggle.checked = false;
        }
        
        // Only modify the icons if they exist
        if (disabledIcon) disabledIcon.style.display = 'inline-block';
        if (enabledIcon) enabledIcon.style.display = 'none';
        
        if (scene.autoplayTimeout) {
            clearTimeout(scene.autoplayTimeout);
        }
    }
}

function run() {
    scene.paused = false;
    startTimer();
}

function startNewGame() {
    setupScene();
    run();
}

function update(timestamp) {
    // Calculate FPS
    if (!lastFrameTime) {
        lastFrameTime = timestamp;
    }
    
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    frameCount++;
    
    if (timestamp - lastFpsUpdate > fpsUpdateInterval) {
        currentFps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = timestamp;
        
        // Check and adjust performance
        checkAndAdjustPerformance();
    }
    
    simulate();
    draw();
    
    if (useRequestAnimationFrame) {
        requestAnimationFrame(update);
    } else {
        setTimeout(update, 16); // Fallback to setTimeout at ~60fps
    }
}

// Modal functionality
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = "block";

    const modalContent = modal.querySelector('.modal-content');

    if (window.matchMedia("(orientation: landscape)").matches) {
        // Landscape: slide in from the left
        modalContent.style.left = "-600px"; // Start off-screen
        modalContent.style.top = "0";
        modalContent.style.width = "40%";
        modalContent.style.maxWidth = "500px";
        modalContent.style.height = "100%";
        modalContent.style.boxShadow = "5px 0 15px rgba(0, 0, 0, 0.3)";

        // Use a small timeout to ensure the transition is applied
        setTimeout(() => {
            modalContent.style.left = "0";
        }, 10);
    } else {
        // Portrait: slide in from the top
        modalContent.style.top = "-600px";  // Start off-screen
        modalContent.style.left = "0";
        modalContent.style.width = "100%";
        modalContent.style.maxWidth = "none";
        modalContent.style.height = "auto";
        modalContent.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.3)";

        setTimeout(() => {
            modalContent.style.top = "0";
        }, 10);
    }

    // Add event listeners to close buttons in this modal
    const closeButtons = modal.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.onclick = function() {
            closeModal(modalId);
        }
    });

    // Also close on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape") {
            closeModal(modalId);
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const modalContent = modal.querySelector('.modal-content');

    if (window.matchMedia("(orientation: landscape)").matches) {
        modalContent.style.left = "-600px"; // Slide out to the left
    } else {
        modalContent.style.top = "-600px"; // Slide out to the top
    }

    // Wait for the transition to complete before hiding the modal
    setTimeout(() => {
        modal.style.display = "none";
    }, 300); // 0.3s transition time
}

// Initialize the page
setupScene();
update();

// Add event listeners for the simulation selector and settings
document.addEventListener('DOMContentLoaded', function() {
    // Setup for simulation selector dropdown
    const simulationToggle = document.getElementById('simulationToggle');
    if (simulationToggle) {
        simulationToggle.addEventListener('click', function(e) {
            toggleSimulation();
            e.stopPropagation();
        });
    }
    
    // Add event listeners to close buttons on page load
    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.onclick = function() {
            const modal = button.closest('.modal');
            modal.style.display = "none";
        }
    });
    
    // Setup round time slider
    const roundTimeSlider = document.getElementById('roundTimeSlider');
    const roundTimeValue = document.getElementById('roundTimeValue');
    
    if (roundTimeSlider && roundTimeValue) {
        // Initialize with current value
        roundTimeValue.textContent = scene.timer;
        roundTimeSlider.value = scene.timer;
        
        // Update when slider changes
        roundTimeSlider.addEventListener('input', function() {
            const newTime = parseInt(this.value);
            roundTimeValue.textContent = newTime;
            scene.timer = newTime;
            updateTimerDisplay();
            
            // If timer is running, restart it with new value
            if (scene.timerInterval) {
                startTimer();
            }
        });
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        // Close any open modals
        const openModals = document.querySelectorAll('.modal[style*="display: block"]');
        openModals.forEach(modal => {
            const modalId = modal.id;
            closeModal(modalId); // Close the modal first
        });

        // Re-initialize canvas dimensions
        canvas.width = window.innerWidth - 20;
        canvas.height = window.innerHeight - 20;
        cScale = Math.min(canvas.width, canvas.height) / simMinWidth;

        // Re-open modals after a short delay to allow for layout changes
        setTimeout(() => {
            openModals.forEach(modal => {
                const modalId = modal.id;
                openModal(modalId);
            });
        }, 350); // Slightly longer than the modal transition
    });

    // Setup for trail rasterization settings
    const settingsContainer = document.querySelector('.settings-container');
    if (settingsContainer) {
        const trailSettings = document.createElement('div');
        trailSettings.className = 'setting-item';
        trailSettings.innerHTML = `
            <label for="trailRasterToggle">Trail Persistence</label>
            <div class="toggle-switch-container">
                <label class="toggle-switch">
                    <input type="checkbox" id="trailRasterToggle" ${scene.trailRasterization.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
                <span>Enable trail persistence</span>
            </div>
            
            <div class="toggle-switch-container">
                <label class="toggle-switch">
                    <input type="checkbox" id="completeTrailToggle" ${scene.trailRasterization.keepCompleteTrail ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
                <span>Keep complete trail (no limits)</span>
            </div>
            
            <div class="toggle-switch-container">
                <label class="toggle-switch">
                    <input type="checkbox" id="adaptiveRasterToggle" ${scene.trailRasterization.adaptiveRasterization ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
                <span>Adaptive trail optimization</span>
            </div>
            
            <div class="toggle-switch-container">
                <label class="toggle-switch">
                    <input type="checkbox" id="substepRasterToggle" ${scene.trailRasterization.useSubstepRasterization ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
                <span>Rasterize every 1000 substeps</span>
            </div>
            
            <label for="trailRasterIntervalSlider" style="margin-top: 15px;">Persistence Interval: <span id="trailRasterIntervalValue">${scene.trailRasterization.interval}</span> seconds</label>
            <div class="slider-container">
                <input type="range" min="2" max="15" step="1" value="${scene.trailRasterization.interval}" id="trailRasterIntervalSlider" class="slider">
            </div>
            
            <label for="trailFadeSlider" style="margin-top: 15px;">Trail Fade: <span id="trailFadeValue">${scene.trailRasterization.fadeAmount * 100}</span>%</label>
            <div class="slider-container">
                <input type="range" min="0" max="20" step="1" value="${scene.trailRasterization.fadeAmount * 100}" id="trailFadeSlider" class="slider">
            </div>
            
            <label for="maxTrailLengthSlider" style="margin-top: 15px;">Max Trail Length: <span id="maxTrailLengthValue">${scene.performance.maxTrailLength}</span> points</label>
            <div class="slider-container">
                <input type="range" min="50" max="300" step="10" value="${scene.performance.maxTrailLength}" id="maxTrailLengthSlider" class="slider">
            </div>
        `;
        
        settingsContainer.appendChild(trailSettings);
        
        // Add event listeners for the new settings
        const trailRasterToggle = document.getElementById('trailRasterToggle');
        const completeTrailToggle = document.getElementById('completeTrailToggle');
        const adaptiveRasterToggle = document.getElementById('adaptiveRasterToggle');
        const substepRasterToggle = document.getElementById('substepRasterToggle');
        const trailRasterIntervalSlider = document.getElementById('trailRasterIntervalSlider');
        const trailRasterIntervalValue = document.getElementById('trailRasterIntervalValue');
        const trailFadeSlider = document.getElementById('trailFadeSlider');
        const trailFadeValue = document.getElementById('trailFadeValue');
        const maxTrailLengthSlider = document.getElementById('maxTrailLengthSlider');
        const maxTrailLengthValue = document.getElementById('maxTrailLengthValue');
        
        if (trailRasterToggle) {
            trailRasterToggle.addEventListener('change', function() {
                scene.trailRasterization.enabled = this.checked;
                if (!this.checked) {
                    // Clear the trail canvas when disabling
                    trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
                }
            });
        }
        
        if (adaptiveRasterToggle) {
            adaptiveRasterToggle.addEventListener('change', function() {
                scene.trailRasterization.adaptiveRasterization = this.checked;
            });
        }
        
        if (substepRasterToggle) {
            substepRasterToggle.addEventListener('change', function() {
                scene.trailRasterization.useSubstepRasterization = this.checked;
                
                // Update UI based on selection
                if (this.checked) {
                    // Disable time-based rasterization options
                    if (trailRasterIntervalSlider) {
                        trailRasterIntervalSlider.disabled = true;
                        trailRasterIntervalSlider.parentNode.classList.add('disabled');
                    }
                    if (adaptiveRasterToggle) {
                        adaptiveRasterToggle.disabled = true;
                        adaptiveRasterToggle.parentNode.classList.add('disabled');
                    }
                } else {
                    // Re-enable time-based rasterization options
                    if (trailRasterIntervalSlider) {
                        trailRasterIntervalSlider.disabled = false;
                        trailRasterIntervalSlider.parentNode.classList.remove('disabled');
                    }
                    if (adaptiveRasterToggle) {
                        adaptiveRasterToggle.disabled = false;
                        adaptiveRasterToggle.parentNode.classList.remove('disabled');
                    }
                }
                
                // Reset substep counter when toggling
                scene.trailRasterization.substepCounter = 0;
            });
        }
        
        if (completeTrailToggle) {
            completeTrailToggle.addEventListener('change', function() {
                scene.trailRasterization.keepCompleteTrail = this.checked;
                
                // Update the trail length limits in both systems
                if (scene.system1 && scene.system2) {
                    if (scene.currentSimulation === 'pendulum') {
                        scene.system1.setUnlimitedTrail(this.checked);
                        scene.system2.setUnlimitedTrail(this.checked);
                    } else {
                        scene.system1.setUnlimitedTrail(this.checked);
                        scene.system2.setUnlimitedTrail(this.checked);
                    }
                }
                
                // Disable other trail options when complete trail is enabled
                if (trailRasterIntervalSlider && trailFadeSlider && maxTrailLengthSlider) {
                    if (this.checked) {
                        // When complete trail is enabled, disable rasterization options
                        trailRasterIntervalSlider.disabled = true;
                        trailFadeSlider.disabled = true;
                        maxTrailLengthSlider.disabled = true;
                        
                        // Add visual indication that options are disabled
                        trailRasterIntervalSlider.parentNode.classList.add('disabled');
                        trailFadeSlider.parentNode.classList.add('disabled');
                        maxTrailLengthSlider.parentNode.classList.add('disabled');
                        
                        // Force enable trail rasterization
                        if (trailRasterToggle) {
                            trailRasterToggle.checked = false;
                            trailRasterToggle.disabled = true;
                            scene.trailRasterization.enabled = false;
                            
                            // Clear the trail canvas when disabling rasterization
                            trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
                        }
                    } else {
                        // When complete trail is disabled, re-enable rasterization options
                        trailRasterIntervalSlider.disabled = false;
                        trailFadeSlider.disabled = false;
                        maxTrailLengthSlider.disabled = false;
                        
                        // Remove visual indication
                        trailRasterIntervalSlider.parentNode.classList.remove('disabled');
                        trailFadeSlider.parentNode.classList.remove('disabled');
                        maxTrailLengthSlider.parentNode.classList.remove('disabled');
                        
                        // Re-enable trail rasterization toggle
                        if (trailRasterToggle) {
                            trailRasterToggle.disabled = false;
                        }
                    }
                }
            });
        }
        
        if (trailRasterIntervalSlider && trailRasterIntervalValue) {
            trailRasterIntervalSlider.addEventListener('input', function() {
                const newValue = parseInt(this.value);
                trailRasterIntervalValue.textContent = newValue;
                scene.trailRasterization.interval = newValue;
            });
        }
        
        if (trailFadeSlider && trailFadeValue) {
            trailFadeSlider.addEventListener('input', function() {
                const newValue = parseInt(this.value);
                trailFadeValue.textContent = newValue;
                scene.trailRasterization.fadeAmount = newValue / 100;
            });
        }
        
        if (maxTrailLengthSlider && maxTrailLengthValue) {
            maxTrailLengthSlider.addEventListener('input', function() {
                const newValue = parseInt(this.value);
                maxTrailLengthValue.textContent = newValue;
                scene.performance.maxTrailLength = newValue;
                
                // Apply to both systems if they exist
                if (scene.system1 && scene.system2 && !scene.trailRasterization.keepCompleteTrail) {
                    if (scene.currentSimulation === 'pendulum') {
                        scene.system1.maxTrailLength = newValue;
                        scene.system2.maxTrailLength = newValue;
                    } else {
                        scene.system1.maxTrailLength = newValue;
                        scene.system2.maxTrailLength = newValue;
                    }
                }
            });
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth - 20;
        canvas.height = window.innerHeight - 20;
        
        // Resize the trail canvas too
        const oldTrailCanvas = trailCanvas;
        trailCanvas = document.createElement('canvas');
        trailContext = trailCanvas.getContext('2d');
        trailCanvas.width = canvas.width;
        trailCanvas.height = canvas.height;
        
        // Copy the old trails to the new canvas if possible
        trailContext.drawImage(oldTrailCanvas, 0, 0, trailCanvas.width, trailCanvas.height);
        
        cScale = Math.min(canvas.width, canvas.height) / simMinWidth;
    });
});

// Function to rasterize current trails to the background canvas
function rasterizeTrails() {
    // Apply a slight fade to existing trails for a nice visual effect
    trailContext.fillStyle = `rgba(0, 0, 0, ${scene.trailRasterization.fadeAmount})`;
    trailContext.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    
    // Draw current trails to the trail canvas
    if (scene.system1 && scene.system2) {
        // Batch drawing operations for better performance
        trailContext.save();
        
        // Draw system1 trails
        if (scene.currentSimulation === 'pendulum') {
            drawPendulumTrailsToCanvas(scene.system1, trailContext);
            drawPendulumTrailsToCanvas(scene.system2, trailContext);
        } else {
            drawThreeBodyTrailsToCanvas(scene.system1, trailContext);
            drawThreeBodyTrailsToCanvas(scene.system2, trailContext);
        }
        
        trailContext.restore();
        
        // Clear the current trails after rasterizing, but only if we're not keeping complete trails
        if (!scene.trailRasterization.keepCompleteTrail) {
            if (scene.currentSimulation === 'pendulum') {
                scene.system1.clearTrails();
                scene.system2.clearTrails();
            } else {
                scene.system1.clearTrails();
                scene.system2.clearTrails();
            }
        }
    }
    
    // Update the last rasterization time
    scene.trailRasterization.lastRasterTime = Date.now();
}

function drawPendulumTrailsToCanvas(pendulum, targetContext) {
    if (pendulum.trailX.length <= 1) return;
    
    // Cache the color to avoid string parsing on each draw
    const trailColor = pendulum.getTrailColor();
    targetContext.strokeStyle = trailColor;
    targetContext.lineWidth = 2.0;
    targetContext.beginPath();
    
    // For very long trails, use a simplified drawing approach
    const trailLength = pendulum.trailX.length;
    const skipFactor = trailLength > 100 && !pendulum.unlimitedTrail ? 
        Math.max(2, Math.floor(trailLength / 100)) : 1;
    
    // Convert first point from world to screen coordinates
    const firstX = cX({x: pendulum.trailX[0]});
    const firstY = cY({y: pendulum.trailY[0]});
    targetContext.moveTo(firstX, firstY);
    
    for (let i = skipFactor; i < trailLength; i += skipFactor) {
        // Convert from world to screen coordinates
        const x = cX({x: pendulum.trailX[i]});
        const y = cY({y: pendulum.trailY[i]});
        targetContext.lineTo(x, y);
    }
    
    targetContext.stroke();
}

function drawThreeBodyTrailsToCanvas(system, targetContext) {
    const zoomedScale = cScale * system.zoomScale;
    const zX = (pos) => canvas.width / 2 + pos.x * zoomedScale;
    const zY = (pos) => canvas.height / 2 + pos.y * zoomedScale;
    
    system.bodies.forEach((_, bodyIndex) => {
        if (system.trails[bodyIndex].x.length <= 1) return;
        
        // Convert hex color to rgba with transparency
        let trailColor;
        const bodyColor = system.colors[bodyIndex];
        
        if (bodyColor.startsWith('#')) {
            // Parse the hex color
            const hex = bodyColor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            trailColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        } else {
            // Fallback to default colors if not hex
            trailColor = "rgba(150, 150, 150, 0.8)";
        }
        
        targetContext.beginPath();
        targetContext.moveTo(
            zX({ x: system.trails[bodyIndex].x[0] }),
            zY({ y: system.trails[bodyIndex].y[0] })
        );
        
        const trailLength = system.trails[bodyIndex].x.length;
        
        // For very long trails, use a simplified drawing approach unless unlimited trail is enabled
        if (trailLength > 100 && !system.unlimitedTrail) {
            const skipFactor = Math.max(2, Math.floor(trailLength / 100));
            
            for (let i = skipFactor; i < trailLength; i += skipFactor) {
                targetContext.lineTo(
                    zX({ x: system.trails[bodyIndex].x[i] }),
                    zY({ y: system.trails[bodyIndex].y[i] })
                );
            }
        } else {
            // Draw every point for shorter trails or when unlimited trail is enabled
            for (let i = 1; i < trailLength; i++) {
                targetContext.lineTo(
                    zX({ x: system.trails[bodyIndex].x[i] }),
                    zY({ y: system.trails[bodyIndex].y[i] })
                );
            }
        }
        
        targetContext.strokeStyle = trailColor;
        targetContext.lineWidth = Math.max(2, 3 * system.zoomScale);
        targetContext.stroke();
    });
}

// Adaptive performance monitoring and adjustment
function checkAndAdjustPerformance() {
    const now = performance.now();
    if (now - scene.performance.lastPerformanceCheck < scene.performance.performanceCheckInterval) return;
    
    scene.performance.lastPerformanceCheck = now;
    
    // Adjust based on FPS
    if (currentFps < scene.performance.minFps) {
        // Performance is low - optimize
        
        // 1. Increase rasterization frequency (dump trails to raster more often)
        if (scene.trailRasterization.adaptiveRasterization && scene.trailRasterization.enabled) {
            const newInterval = Math.max(
                scene.trailRasterization.minInterval,
                Math.min(scene.trailRasterization.interval * 0.7, scene.trailRasterization.maxInterval)
            );
            
            if (newInterval !== scene.trailRasterization.interval) {
                scene.trailRasterization.interval = newInterval;
                console.log(`Performance optimization: Increased rasterization frequency to every ${newInterval.toFixed(1)} seconds`);
                
                // Update UI if available
                const intervalValue = document.getElementById('trailRasterIntervalValue');
                const intervalSlider = document.getElementById('trailRasterIntervalSlider');
                if (intervalValue) intervalValue.textContent = Math.round(newInterval);
                if (intervalSlider) intervalSlider.value = Math.round(newInterval);
                
                // Force an immediate rasterization to clear current trails
                rasterizeTrails();
            }
        }
        
        // 2. Reduce trail length for both systems
        if (scene.performance.adaptiveTrailLength && !scene.trailRasterization.keepCompleteTrail) {
            const newTrailLength = Math.max(
                scene.performance.minTrailLength,
                Math.floor(scene.performance.maxTrailLength * 0.7)
            );
            
            if (newTrailLength !== scene.performance.maxTrailLength) {
                scene.performance.maxTrailLength = newTrailLength;
                console.log(`Performance optimization: Reduced trail length to ${newTrailLength} points`);
                
                // Apply to both systems
                if (scene.system1 && scene.system2) {
                    if (scene.currentSimulation === 'pendulum') {
                        scene.system1.maxTrailLength = newTrailLength;
                        scene.system2.maxTrailLength = newTrailLength;
                    } else {
                        scene.system1.maxTrailLength = newTrailLength;
                        scene.system2.maxTrailLength = newTrailLength;
                    }
                }
            }
        }
    } 
    // If FPS is good, we can try to improve visual quality
    else if (currentFps > scene.performance.minFps * 1.2) {
        // 1. Decrease rasterization frequency (keep trails in memory longer)
        if (scene.trailRasterization.adaptiveRasterization && scene.trailRasterization.enabled) {
            const newInterval = Math.min(
                scene.trailRasterization.maxInterval,
                Math.max(scene.trailRasterization.interval * 1.2, scene.trailRasterization.minInterval)
            );
            
            if (newInterval !== scene.trailRasterization.interval) {
                scene.trailRasterization.interval = newInterval;
                console.log(`Performance optimization: Decreased rasterization frequency to every ${newInterval.toFixed(1)} seconds`);
                
                // Update UI if available
                const intervalValue = document.getElementById('trailRasterIntervalValue');
                const intervalSlider = document.getElementById('trailRasterIntervalSlider');
                if (intervalValue) intervalValue.textContent = Math.round(newInterval);
                if (intervalSlider) intervalSlider.value = Math.round(newInterval);
            }
        }
        
        // 2. Increase trail length for better visuals
        if (scene.performance.adaptiveTrailLength && !scene.trailRasterization.keepCompleteTrail) {
            const newTrailLength = Math.min(
                300, // Hard cap at 300 for reasonable memory usage
                Math.floor(scene.performance.maxTrailLength * 1.2)
            );
            
            if (newTrailLength !== scene.performance.maxTrailLength) {
                scene.performance.maxTrailLength = newTrailLength;
                console.log(`Performance optimization: Increased trail length to ${newTrailLength} points`);
                
                // Apply to both systems
                if (scene.system1 && scene.system2) {
                    if (scene.currentSimulation === 'pendulum') {
                        scene.system1.maxTrailLength = newTrailLength;
                        scene.system2.maxTrailLength = newTrailLength;
                    } else {
                        scene.system1.maxTrailLength = newTrailLength;
                        scene.system2.maxTrailLength = newTrailLength;
                    }
                }
            }
        }
    }
}