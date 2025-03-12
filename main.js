let canvas = document.getElementById("myCanvas");
let c = canvas.getContext("2d");
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;

let simMinWidth = 1.5;
let cScale = Math.min(canvas.width, canvas.height) / simMinWidth;

function cX(pos) { return canvas.width / 2 + pos.x * cScale; }
function cY(pos) { return canvas.height * 0.6 - pos.y * cScale; }

let scene = {
    currentSimulation: 'pendulum',
    gravity: -10.0,
    dt: 0.01,
    numSubSteps: 10000,
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
    speedMultiplier: 3
};

function switchSimulation(type) {
    scene.currentSimulation = type;
    document.getElementById('system-info').style.display = type === 'threebody' ? 'block' : 'none';
    document.getElementById('speed-control').style.display = type === 'threebody' ? 'block' : 'none';
    
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
}

function setupScene() {
    if (scene.currentSimulation === 'pendulum') {
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

        scene.system1 = new Pendulum(true, "#FF3030", masses1, lengths1, angles1, -0.3);
        scene.system2 = new Pendulum(true, "#30FF30", masses2, lengths2, angles2, 0.3);

        const hands = ['Rock', 'Paper', 'Scissors'];
        scene.system1.assignHands(hands);
        scene.system2.assignHands(hands);
    } else {
        scene.system1 = new ThreeBodySystem("#FF3030", -0.3);
        scene.system2 = new ThreeBodySystem("#30FF30", 0.3);
    }
    
    scene.paused = true;
    document.getElementById("result").innerHTML = "";
    
    if (scene.timerInterval) {
        clearInterval(scene.timerInterval);
    }
    scene.timer = 10;
    updateTimerDisplay();
    updateHandDisplays({ emoji: '🪨' }, { emoji: '🪨' });
    
    if (scene.autoplayTimeout) {
        clearTimeout(scene.autoplayTimeout);
    }
}

function simulate() {
    if (scene.paused)
        return;
        
    const sdt = scene.dt / scene.numSubSteps;
    const trailGap = Math.max(1, Math.floor(scene.numSubSteps / 60));

    let isMoving = false;
    const velocityThreshold = 0.1;

    for (let step = 0; step < scene.numSubSteps; step++) {
        if (scene.system1) {
            if (scene.currentSimulation === 'pendulum') {
                scene.system1.simulate(sdt, scene.gravity);
            } else {
                scene.system1.simulate(sdt);
                scene.system1.checkBounds();
            }
            
            if (step % trailGap == 0) {
                scene.system1.updateTrail();
            }

            if (scene.currentSimulation === 'pendulum') {
                for (let i = 1; i < scene.system1.vel.length; i++) {
                    if (Math.abs(scene.system1.vel[i].x) > velocityThreshold || 
                        Math.abs(scene.system1.vel[i].y) > velocityThreshold) {
                        isMoving = true;
                        break;
                    }
                }
            } else {
                scene.system1.bodies.forEach(body => {
                    if (Math.sqrt(body.vel.x * body.vel.x + body.vel.y * body.vel.y) > velocityThreshold) {
                        isMoving = true;
                    }
                });
            }
        }
        
        if (scene.system2) {
            if (scene.currentSimulation === 'pendulum') {
                scene.system2.simulate(sdt, scene.gravity);
            } else {
                scene.system2.simulate(sdt);
                scene.system2.checkBounds();
            }
            
            if (step % trailGap == 0) {
                scene.system2.updateTrail();
            }

            if (scene.currentSimulation === 'pendulum') {
                for (let i = 1; i < scene.system2.vel.length; i++) {
                    if (Math.abs(scene.system2.vel[i].x) > velocityThreshold || 
                        Math.abs(scene.system2.vel[i].y) > velocityThreshold) {
                        isMoving = true;
                        break;
                    }
                }
            } else {
                scene.system2.bodies.forEach(body => {
                    if (Math.sqrt(body.vel.x * body.vel.x + body.vel.y * body.vel.y) > velocityThreshold) {
                        isMoving = true;
                    }
                });
            }
        }

        if (step % trailGap == 0) {
            const move1 = scene.system1.determineMove(true);
            const move2 = scene.system2.determineMove(true);
            updateHandDisplays(move1, move2);
        }
    }

    if (!isMoving && scene.timer === 10) {
        startTimer();
    }
}

function draw() {
    c.fillStyle = "#000000";
    c.fillRect(0, 0, canvas.width, canvas.height);
    
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
    
    scene.matchHistory.forEach(item => {
        const resultClass = item.result.includes('1') ? 'win' : 
                          item.result.includes('2') ? 'lose' : 'draw';
        historyDiv.innerHTML += `
            <div class="history-item ${resultClass}">
                ${item.timestamp} - P1: ${item.move1} vs P2: ${item.move2} - ${item.result}
            </div>
        `;
    });
}

function updateHandDisplays(move1, move2) {
    const hand1 = document.getElementById('hand1');
    const hand2 = document.getElementById('hand2');
    
    if (move1.state) {
        hand1.innerHTML = `${move1.emoji}<br><small>${move1.state}</small>`;
    } else {
        hand1.innerHTML = move1.emoji;
    }
    
    if (move2.state) {
        hand2.innerHTML = `${move2.emoji}<br><small>${move2.state}</small>`;
    } else {
        hand2.innerHTML = move2.emoji;
    }
}

function updateTimerDisplay() {
    document.getElementById('timer').innerHTML = scene.timer;
}

function startTimer() {
    if (scene.timerInterval) {
        clearInterval(scene.timerInterval);
    }
    scene.timer = 10;
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
    const btn = document.getElementById('autoplayBtn');
    if (scene.autoplay) {
        btn.textContent = 'Stop Autoplay';
        btn.classList.add('active');
        scene.speedMultiplier = 5;
        scene.dt = 0.001 * scene.speedMultiplier;
        document.getElementById("speedSlider").value = "5";
        document.getElementById("speed").innerHTML = "5x";
        if (scene.paused) {
            setupScene();
            scene.paused = false;
            startTimer();
        }
    } else {
        btn.textContent = 'Start Autoplay';
        btn.classList.remove('active');
        scene.speedMultiplier = 3;
        scene.dt = 0.001 * scene.speedMultiplier;
        document.getElementById("speedSlider").value = "3";
        document.getElementById("speed").innerHTML = "3x";
        if (scene.autoplayTimeout) {
            clearTimeout(scene.autoplayTimeout);
            scene.autoplayTimeout = null;
        }
    }
}

function step() {
    scene.paused = false;
    simulate();
    scene.paused = true;
}

function run() {
    scene.paused = false;
    startTimer();
}

function startNewGame() {
    setupScene();
    run();
}

function update() {
    simulate();
    draw();
    requestAnimationFrame(update);
}

document.getElementById("stepsSlider").oninput = function() {
    const steps = [100, 500, 1000, 2000, 5000, 10000];
    scene.numSubSteps = steps[Number(this.value)];
    document.getElementById("steps").innerHTML = scene.numSubSteps.toString();
}

document.getElementById("speedSlider").oninput = function() {
    scene.speedMultiplier = Number(this.value);
    scene.dt = 0.001 * scene.speedMultiplier;
    document.getElementById("speed").innerHTML = scene.speedMultiplier + "x";
}

setupScene();
update();