document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const angleInput = document.getElementById('angle');
    const distanceInput = document.getElementById('distance');
    const shootBtn = document.getElementById('shoot-btn');
    const strokesDisplay = document.getElementById('strokes');
    const messageArea = document.getElementById('message-area');
    const splashScreen = document.getElementById('splash-screen');
    const startBtn = document.getElementById('start-btn');
    const numHolesInput = document.getElementById('num-holes');
    const startHoleInput = document.getElementById('start-hole');
    const startHoleConfig = document.getElementById('start-hole-config');
    const numPlayersInput = document.getElementById('num-players');
    const nextHoleBtn = document.getElementById('next-hole-btn');

    // Game Config
    let config = {
        totalHoles: 1,
        totalPlayers: 1,
        currentHole: 1,
        holesPlayedCount: 0
    };

    // Toggle starting hole visibility (only for single hole mode)
    numHolesInput.addEventListener('change', () => {
        if (numHolesInput.value === '1') {
            startHoleConfig.classList.remove('hidden');
        } else {
            startHoleConfig.classList.add('hidden');
        }
    });

    // LEVEL DATA
    const LEVELS = [
        // Hole 1: Par 3 - Simple Straight
        {
            par: 3,
            tee: { x: 50, y: 300 },
            hole: { x: 700, y: 300 },
            fairwayType: 'straight',
            bunkers: [],
            trees: [
                { x: 400, y: 200, radius: 20 },
                { x: 400, y: 400, radius: 20 },
                { x: 375, y: 300, radius: 25 } // Center Blocker
            ]
        },
        // Hole 2: Par 4 - Dogleg Right
        {
            par: 4,
            tee: { x: 50, y: 450 },
            hole: { x: 700, y: 100 },
            fairwayType: 'dogleg-right',
            bunkers: [{ x: 350, y: 450, rx: 40, ry: 25, rotation: 0 }],
            trees: [{ x: 400, y: 250, radius: 25 }]
        },
        // Hole 3: Par 4 - Dogleg Left
        {
            par: 4,
            tee: { x: 700, y: 450 },
            hole: { x: 100, y: 100 },
            fairwayType: 'dogleg-left',
            bunkers: [{ x: 600, y: 250, rx: 30, ry: 40, rotation: 0 }],
            trees: [{ x: 400, y: 300, radius: 30 }]
        },
        // Hole 4: Par 5 - Long S-Curve
        {
            par: 5,
            tee: { x: 50, y: 500 },
            hole: { x: 750, y: 100 },
            fairwayType: 's-curve',
            bunkers: [{ x: 350, y: 300, rx: 30, ry: 30, rotation: 0 }],
            trees: [{ x: 200, y: 500, radius: 20 }, { x: 600, y: 100, radius: 20 }]
        },
        // Hole 5: Par 3 - Island Green (simulated with bunkers)
        {
            par: 3,
            tee: { x: 50, y: 300 },
            hole: { x: 550, y: 300 },
            fairwayType: 'straight-short',
            bunkers: [
                { x: 550, y: 220, rx: 30, ry: 20, rotation: 0 }, // Top
                { x: 550, y: 380, rx: 30, ry: 20, rotation: 0 }, // Bottom
                { x: 630, y: 300, rx: 20, ry: 30, rotation: 0 }, // Back
                { x: 300, y: 300, rx: 30, ry: 30, rotation: 0 }  // PATH BLOCKER
            ],
            trees: []
        },
        // Hole 6: Par 4 - Narrow
        {
            par: 4,
            tee: { x: 50, y: 300 },
            hole: { x: 750, y: 300 },
            fairwayType: 'narrow',
            bunkers: [{ x: 400, y: 300, rx: 20, ry: 50, rotation: 0 }], // Center blocker
            trees: [
                { x: 400, y: 150, radius: 25 },
                { x: 400, y: 450, radius: 25 },
                { x: 400, y: 300, radius: 25 } // True Center Block
            ]
        },
        // Hole 7: Par 5 - Long Diagonal
        {
            par: 5,
            tee: { x: 50, y: 550 },
            hole: { x: 750, y: 50 },
            fairwayType: 'diagonal',
            bunkers: [{ x: 250, y: 400, rx: 40, ry: 40, rotation: 0 }, { x: 550, y: 200, rx: 40, ry: 40, rotation: 0 }],
            trees: [{ x: 400, y: 300, radius: 30 }]
        },
        // Hole 8: Par 4 - Standard with Trees
        {
            par: 4,
            tee: { x: 50, y: 200 },
            hole: { x: 700, y: 400 },
            fairwayType: 'standard-curved',
            bunkers: [{ x: 600, y: 300, rx: 30, ry: 30, rotation: 0 }],
            trees: [
                { x: 300, y: 300, radius: 20 },
                { x: 350, y: 250, radius: 20 },
                { x: 250, y: 350, radius: 20 } // Clump
            ]
        },
        // Hole 9: Par 4 - Precision End
        {
            par: 4,
            tee: { x: 400, y: 550 },
            hole: { x: 400, y: 50 },
            fairwayType: 'vertical-straight',
            bunkers: [{ x: 350, y: 300, rx: 20, ry: 40, rotation: 0 }, { x: 450, y: 300, rx: 20, ry: 40, rotation: 0 }], // Gate
            trees: [{ x: 400, y: 300, radius: 20 }] // Center Block
        }
    ];

    // Game State
    let ball = { x: 0, y: 0, radius: 5 };
    let hole = { x: 0, y: 0, radius: 10 };
    let bunkers = [];
    let trees = [];
    let strokes = 0;
    let par = 0;
    let gameOver = false;
    let fairwayPath = new Path2D();
    let greenPath = new Path2D();

    // Global stats for session
    let cumulativeScore = 0;
    let cumulativePar = 0;
    let sessionHoles = []; // List of hole numbers in current round
    let holeScores = [];   // Strokes per hole
    let holePars = [];     // Par per hole

    function renderScorecard(containerId = 'scorecard-container') {
        const container = document.getElementById(containerId);
        if (!container) return;

        let totalScoreS = 0;
        let totalParS = 0;
        sessionHoles.forEach((h, i) => {
            totalParS += (holePars[i] || 0);
            totalScoreS += (holeScores[i] || 0);
        });

        let html = '<table id="scorecard"><thead><tr><th>Hole</th>';
        sessionHoles.forEach((h, i) => {
            const isCurrent = (config.holes_played_count === i); // Wait, I used holesPlayedCount
            const isCurrentH = (config.holesPlayedCount === i);
            html += `<th class="${isCurrentH ? 'current-hole' : ''}">${h}</th>`;
        });
        html += '<th class="total-col">Total</th></tr></thead><tbody><tr class="par-row"><td>Par</td>';
        sessionHoles.forEach((h, i) => {
            html += `<td>${holePars[i] || '-'}</td>`;
        });
        html += `<td class="total-col">${totalParS}</td></tr><tr><td>Score</td>`;
        sessionHoles.forEach((h, i) => {
            const score = holeScores[i];
            const p = holePars[i];
            let className = '';
            if (score !== null) {
                if (score > p) className = 'score-over';
                else if (score < p) className = 'score-under';
                else className = 'score-even';
            }
            html += `<td class="${className}">${score !== null ? score : '-'}</td>`;
        });
        html += `<td class="total-col">${totalScoreS}</td></tr></tbody></table>`;
        container.innerHTML = html;

        // Also update cumulative vars for game over screen
        cumulativeScore = totalScoreS;
        cumulativePar = totalParS;
    }

    function loadLevel(levelIndex) {
        // Safe index check
        const idx = (levelIndex - 1) % LEVELS.length;
        const levelData = LEVELS[idx];

        // 1. Set Level Data
        par = levelData.par;
        ball.x = levelData.tee.x;
        ball.y = levelData.tee.y;
        hole.x = levelData.hole.x;
        hole.y = levelData.hole.y;

        // Deep copy obstacles to avoid mutating LEVELS
        bunkers = JSON.parse(JSON.stringify(levelData.bunkers));
        trees = JSON.parse(JSON.stringify(levelData.trees));

        // 2. Define Fairway
        defineFairway(levelData.fairwayType);
        defineGreen();

        // 3. Reset State
        strokes = 0;
        gameOver = false;
        isMoving = false;
        velocity = { x: 0, y: 0 };
        remainingSteps = 0;
        lastFairwayPos = null; // Will start on tee

        // 4. Update UI
        if (strokesDisplay) strokesDisplay.textContent = strokes;

        const parDisplay = document.getElementById('par-display');
        if (parDisplay) parDisplay.textContent = par;

        messageArea.textContent = ``; // Clear default message or keep empty
        messageArea.style.color = '#fff';

        const holeNumberDisplay = document.getElementById('hole-number');
        if (holeNumberDisplay) holeNumberDisplay.textContent = levelIndex;

        // Hide Button just in case
        nextHoleBtn.classList.add('hidden');

        renderScorecard();
        draw();

        // Reset Inputs
        angleInput.value = 0;
        distanceInput.value = 100;
        angleInput.focus();
        angleInput.select();
    }

    // Start Game Handler
    startBtn.addEventListener('click', () => {
        config.totalHoles = parseInt(numHolesInput.value);
        config.totalPlayers = parseInt(numPlayersInput.value);

        // Pick starting hole (only for 1 hole mode)
        if (config.totalHoles === 1) {
            config.currentHole = parseInt(startHoleInput.value);
        } else {
            config.currentHole = 1;
        }

        config.holesPlayedCount = 0;
        splashScreen.classList.add('hidden');

        // Reset totals
        cumulativeScore = 0;
        cumulativePar = 0;
        sessionHoles = [];
        holeScores = [];
        holePars = [];

        // Pre-build session hole list/pars
        let tempHole = config.currentHole;
        for (let i = 0; i < config.totalHoles; i++) {
            sessionHoles.push(tempHole);
            holePars.push(LEVELS[(tempHole - 1) % LEVELS.length].par);
            holeScores.push(null);
            tempHole = (tempHole % 9) + 1;
        }

        renderScorecard();
        loadLevel(config.currentHole);
    });

    // Define Fairway Geometry (Dynamic)
    function defineFairway(type) {
        const p = new Path2D();

        if (type === 'straight') {
            // Rounded organic rectangle
            p.moveTo(0, 260);
            p.quadraticCurveTo(0, 250, 10, 250);
            p.quadraticCurveTo(400, 230, 790, 250);
            p.quadraticCurveTo(800, 250, 800, 260);
            p.lineTo(800, 340);
            p.quadraticCurveTo(800, 350, 790, 350);
            p.quadraticCurveTo(400, 370, 10, 350);
            p.quadraticCurveTo(0, 350, 0, 340);
        } else if (type === 'dogleg-right') {
            // Sweeping organic dogleg with rounded caps
            p.moveTo(0, 410);
            p.quadraticCurveTo(0, 400, 10, 400);
            p.quadraticCurveTo(350, 400, 400, 350); // Outer bend
            p.lineTo(400, 60);
            p.quadraticCurveTo(400, 50, 410, 50);
            p.lineTo(490, 50);
            p.quadraticCurveTo(500, 50, 500, 60);
            p.lineTo(500, 440);
            p.quadraticCurveTo(500, 500, 440, 500); // Inner sweep
            p.lineTo(10, 500);
            p.quadraticCurveTo(0, 500, 0, 490);
        } else if (type === 'dogleg-left') {
            // Organic sweep left with rounded caps
            p.moveTo(800, 410);
            p.quadraticCurveTo(800, 400, 790, 400);
            p.quadraticCurveTo(450, 400, 400, 350); // Outer bend
            p.lineTo(400, 60);
            p.quadraticCurveTo(400, 50, 390, 50);
            p.lineTo(310, 50);
            p.quadraticCurveTo(300, 50, 300, 60);
            p.lineTo(300, 440);
            p.quadraticCurveTo(300, 500, 360, 500); // Inner sweep
            p.lineTo(790, 500);
            p.quadraticCurveTo(800, 500, 800, 490);
        } else if (type === 's-curve') {
            // Truly organic S-Curve with rounded caps
            p.moveTo(0, 540);
            p.quadraticCurveTo(0, 550, 10, 550);
            p.bezierCurveTo(350, 550, 350, 150, 790, 150);
            p.quadraticCurveTo(800, 150, 800, 140);
            p.lineTo(800, 60);
            p.quadraticCurveTo(800, 50, 790, 50);
            p.bezierCurveTo(250, 50, 250, 450, 10, 450);
            p.quadraticCurveTo(0, 450, 0, 460);
        } else if (type === 'straight-short') {
            p.moveTo(0, 260);
            p.quadraticCurveTo(0, 250, 10, 250);
            p.quadraticCurveTo(300, 230, 590, 250);
            p.quadraticCurveTo(600, 250, 600, 260);
            p.lineTo(600, 340);
            p.quadraticCurveTo(600, 350, 590, 350);
            p.quadraticCurveTo(300, 370, 10, 350);
            p.quadraticCurveTo(0, 350, 0, 340);
        } else if (type === 'narrow') {
            p.moveTo(0, 290);
            p.quadraticCurveTo(0, 280, 10, 280);
            p.quadraticCurveTo(400, 270, 790, 280);
            p.quadraticCurveTo(800, 280, 800, 290);
            p.lineTo(800, 310);
            p.quadraticCurveTo(800, 320, 790, 320);
            p.quadraticCurveTo(400, 330, 10, 320);
            p.quadraticCurveTo(0, 320, 0, 310);
        } else if (type === 'diagonal') {
            p.moveTo(0, 590);
            p.quadraticCurveTo(0, 600, 10, 600);
            p.quadraticCurveTo(400, 350, 790, 106.25);
            p.quadraticCurveTo(800, 100, 790, 93.75); // Rounded far end
            p.lineTo(710, 6.25);
            p.quadraticCurveTo(700, 0, 690, 6.25);
            p.quadraticCurveTo(350, 250, 10, 500);
            p.quadraticCurveTo(0, 500, 0, 510);
        } else if (type === 'standard-curved') {
            p.moveTo(0, 160);
            p.quadraticCurveTo(0, 150, 10, 150);
            p.quadraticCurveTo(400, 400, 790, 350);
            p.quadraticCurveTo(800, 350, 800, 360);
            p.lineTo(800, 440);
            p.quadraticCurveTo(800, 450, 790, 450);
            p.quadraticCurveTo(400, 500, 10, 250);
            p.quadraticCurveTo(0, 250, 0, 260);
        } else if (type === 'vertical-straight') {
            p.moveTo(360, 600);
            p.quadraticCurveTo(350, 600, 350, 590);
            p.quadraticCurveTo(330, 300, 350, 10);
            p.quadraticCurveTo(350, 0, 360, 0);
            p.lineTo(440, 0);
            p.quadraticCurveTo(450, 0, 450, 10);
            p.quadraticCurveTo(470, 300, 450, 590);
            p.quadraticCurveTo(450, 600, 440, 600);
        } else {
            // Default organic rounded
            p.moveTo(0, 260);
            p.quadraticCurveTo(0, 250, 10, 250);
            p.bezierCurveTo(200, 50, 400, 450, 590, 250);
            p.quadraticCurveTo(600, 250, 600, 260);
            p.lineTo(600, 440);
            p.quadraticCurveTo(600, 450, 590, 450);
            p.bezierCurveTo(500, 650, 300, 150, 10, 450);
            p.quadraticCurveTo(0, 450, 0, 460);
        }

        p.closePath();
        fairwayPath = p;
    }

    function defineGreen() {
        const p = new Path2D();
        p.moveTo(hole.x, hole.y - 45); // Top
        p.bezierCurveTo(hole.x + 35, hole.y - 45, hole.x + 60, hole.y - 5, hole.x + 40, hole.y + 35); // Right side lobed
        p.bezierCurveTo(hole.x + 20, hole.y + 55, hole.x - 25, hole.y + 55, hole.x - 40, hole.y + 35); // Bottom
        p.bezierCurveTo(hole.x - 60, hole.y + 5, hole.x - 40, hole.y - 40, hole.x, hole.y - 45); // Left side closing
        p.closePath();
        greenPath = p;
    }

    // Config
    const MAX_POWER = 100;
    const POWER_FACTOR = 3; // 1 Power = 3 Pixels. Max Distance = 300px.

    // Helper: Draw UI Elements
    function drawTree(ctx, x, y, radius) {
        // Shadow (offset)
        ctx.beginPath();
        ctx.arc(x + 5, y + 5, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Main Canopy (Dark Green Base)
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#145a32';
        ctx.fill();

        // Foliage Details (Lighter clusters)
        // Fixed offsets relative to radius to look "random" but consistent
        const clusters = [
            { dx: -0.4, dy: -0.4, r: 0.6, color: '#1e8449' },
            { dx: 0.4, dy: -0.4, r: 0.55, color: '#27ae60' },
            { dx: 0, dy: 0.2, r: 0.6, color: '#196f3d' },
            { dx: -0.2, dy: 0, r: 0.4, color: '#2ecc71' } // Highlight
        ];

        clusters.forEach(c => {
            ctx.beginPath();
            ctx.arc(x + c.dx * radius, y + c.dy * radius, c.r * radius, 0, Math.PI * 2);
            ctx.fillStyle = c.color;
            ctx.fill();
        });
    }

    function drawUI() {
        const dateAngle = parseFloat(angleInput.value) || 0;

        // Reorient Angle: 0 = Up, 90 = Right. 
        // Standard Canvas: 0 = Right, -90 = Up.
        // Formula: Standard = User - 90.
        const rad = ((dateAngle - 90) * Math.PI) / 180;

        // 1. Aiming Line - REMOVED per user request
        // Only showing Compass Rose and Power Bar now.


        // 2. Compass Rose (Top Right Corner)
        const cx = 740;
        const cy = 60;
        const r = 30;

        // Background
        ctx.beginPath();
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // N, E, S, W Labels
        ctx.font = '10px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('90°', cx + r + 15, cy); // Right
        ctx.fillText('180°', cx, cy + r + 10);   // Down
        ctx.fillText('270°', cx - r - 15, cy); // Left
        ctx.fillText('0°', cx, cy - r - 10); // Up

        // Arrow pointing current angle
        const arrowLen = r - 5;
        const ax = cx + Math.cos(rad) * arrowLen;
        const ay = cy + Math.sin(rad) * arrowLen;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);
        ctx.strokeStyle = '#e94560'; // Accent color
        ctx.lineWidth = 3;
        ctx.stroke();


        // 3. Power Bar (Bottom Center) - STATIC REFERENCE
        const barW = 300;
        const barH = 10;
        const barX = (canvas.width - barW) / 2;
        const barY = canvas.height - 30;

        // Draw Static Reference Gradient
        const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        grad.addColorStop(0, '#2ecc71'); // Green
        grad.addColorStop(0.5, '#f1c40f'); // Yellow
        grad.addColorStop(1, '#e74c3c'); // Red

        ctx.beginPath();
        ctx.rect(barX, barY, barW, barH);
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('0', barX, barY + 20);
        ctx.fillText('50', barX + barW / 2, barY + 20);
        ctx.fillText('100', barX + barW, barY + 20);

        // Title
        ctx.font = '12px Arial';
        ctx.fillText("Power Reference", barX + barW / 2, barY - 8);
    }

    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Rough (Base Background)
        ctx.fillStyle = '#1e8449'; // Dark Green
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Fairway (Winding Path)
        ctx.fillStyle = '#2ecc71';
        ctx.fill(fairwayPath);
        ctx.strokeStyle = '#27ae60';
        ctx.lineWidth = 2;
        ctx.stroke(fairwayPath);

        // 3. Draw Bunkers
        ctx.fillStyle = '#f1c40f'; // Sand Color
        bunkers.forEach(b => {
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.rx, b.ry, b.rotation, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // 4. Draw Trees
        // 4. Draw Trees
        trees.forEach(t => {
            drawTree(ctx, t.x, t.y, t.radius);
        });

        // 5. Draw Putting Green (Organic Shape)
        ctx.fillStyle = '#58d68d';
        ctx.fill(greenPath);
        ctx.strokeStyle = '#4cb476';
        ctx.stroke(greenPath);

        // 6. Draw Hole
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // 7. Draw Tee Box
        ctx.beginPath();
        ctx.rect(20, 280, 40, 40);
        ctx.fillStyle = '#27ae60';
        ctx.fill();

        // 8. Draw Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.closePath();
        ctx.shadowColor = 'transparent';

        // 9. Draw UI Helpers
        if (!gameOver) {
            drawUI();
        }
    }

    function isPointInEllipse(px, py, e) {
        const cos = Math.cos(e.rotation);
        const sin = Math.sin(e.rotation);
        const dx = px - e.x;
        const dy = py - e.y;
        const tdx = cos * dx + sin * dy;
        const tdy = sin * dx - cos * dy;
        return (tdx * tdx) / (e.rx * e.rx) + (tdy * tdy) / (e.ry * e.ry) <= 1;
    }

    function isColliding(x, y) {
        // Check Trees
        for (const t of trees) {
            const dx = x - t.x;
            const dy = y - t.y;
            if (dx * dx + dy * dy < (t.radius + ball.radius) ** 2) {
                return { type: 'tree' };
            }
        }
        // Check Bunkers
        for (const b of bunkers) {
            if (isPointInEllipse(x, y, b)) {
                return { type: 'bunker' };
            }
        }
        return null;
    }

    // Animation State
    let isMoving = false;
    let velocity = { x: 0, y: 0 };
    let remainingSteps = 0;
    let stepSize = 2; // Speed of ball (pixels per frame approx)
    let animationId = null;
    let startingInHazard = false;
    let hitHazard = false;
    let lastFairwayPos = null;

    function shoot() {
        if (gameOver || isMoving) return;

        const dateAngle = parseFloat(angleInput.value) || 0;
        let power = parseFloat(distanceInput.value) || 0;

        // Clamp power
        if (power > MAX_POWER) power = MAX_POWER;
        if (power < 1) power = 1;

        const distance = power * POWER_FACTOR;

        // Reorient Angle: 0 = Up.
        const rad = ((dateAngle - 90) * Math.PI) / 180;

        // Setup Animation
        velocity.x = Math.cos(rad) * stepSize;
        velocity.y = Math.sin(rad) * stepSize;
        remainingSteps = Math.floor(distance / stepSize);

        // Check initial state
        startingInHazard = isColliding(ball.x, ball.y);
        hitHazard = false;

        const startedOnFairway = ctx.isPointInPath(fairwayPath, ball.x, ball.y);
        const startedOnGreen = ctx.isPointInPath(greenPath, ball.x, ball.y);

        if (startedOnFairway || startedOnGreen) {
            lastFairwayPos = { x: ball.x, y: ball.y };
        } else {
            // If checking from OOB reset or start, ensure we have a fallback if null (though reset handles it)
            if (!lastFairwayPos) lastFairwayPos = { x: 50, y: 300 };
        }

        isMoving = true;
        messageArea.textContent = '';
        messageArea.style.color = '#fff';

        animate();
    }

    function animate() {
        if (!isMoving) return;

        // Move
        ball.x += velocity.x;
        ball.y += velocity.y;
        remainingSteps--;

        // Track Fairway Contact
        if (ctx.isPointInPath(fairwayPath, ball.x, ball.y) || ctx.isPointInPath(greenPath, ball.x, ball.y)) {
            lastFairwayPos = { x: ball.x, y: ball.y };
        }

        // 1. WIN CONDITION: Check for Dunk
        const distToHole = Math.sqrt((ball.x - hole.x) ** 2 + (ball.y - hole.y) ** 2);
        if (distToHole < hole.radius) {
            handleWin();
            return;
        }

        // 2. Collision Check
        const collision = isColliding(ball.x, ball.y);
        if (collision && !startingInHazard) {
            hitHazard = true;
            stopBall(`HIT A ${collision.type.toUpperCase()}! Ball stopped.`, '#e74c3c');
            return;
        }

        // 3. Stop Condition: Out of steam
        if (remainingSteps <= 0) {
            stopBall();
            return;
        }

        draw();
        animationId = requestAnimationFrame(animate);
    }

    function stopBall(msg = null, color = null) {
        isMoving = false;
        cancelAnimationFrame(animationId);

        strokes++;
        if (strokesDisplay) {
            strokesDisplay.textContent = strokes;
        }

        // Update scorecard live
        holeScores[config.holesPlayedCount] = strokes;
        renderScorecard();

        // 1. Check Win (if no hazard hit)
        if (!msg) {
            const distToHole = Math.sqrt((ball.x - hole.x) ** 2 + (ball.y - hole.y) ** 2);
            if (distToHole < hole.radius + 2) { // Generous stop win
                handleWin();
                return;
            }
        }

        // 2. OOB Check (Always runs unless we won)
        const endedOnFairway = ctx.isPointInPath(fairwayPath, ball.x, ball.y);
        const endedOnGreen = ctx.isPointInPath(greenPath, ball.x, ball.y);

        let finalMsg = msg;
        let finalColor = color;

        if (!endedOnFairway && !endedOnGreen) {
            if (lastFairwayPos) {
                ball.x = lastFairwayPos.x;
                ball.y = lastFairwayPos.y;

                const oobText = "OOB! Reset to edge.";
                if (finalMsg) {
                    finalMsg += " " + oobText;
                } else {
                    finalMsg = 'Ball went out of bounds. Reset to edge.';
                    finalColor = '#e67e22';
                }
            }
        }

        // 3. Display Message
        if (finalMsg) {
            messageArea.textContent = finalMsg;
            if (finalColor) messageArea.style.color = finalColor;
        } else {
            messageArea.textContent = '';
        }

        draw();
        angleInput.focus();
        angleInput.select();
    }

    function handleWin() {
        isMoving = false;
        cancelAnimationFrame(animationId);
        gameOver = true;
        strokes++; // Count the winning stroke? Usually yes.
        if (strokesDisplay) {
            strokesDisplay.textContent = strokes;
        }

        // Update scorecard live
        holeScores[config.holesPlayedCount] = strokes;
        renderScorecard();

        messageArea.textContent = 'HOLE COMPLETE! (Total Strokes: ' + strokes + ')';
        messageArea.style.color = '#2ecc71';

        if (nextHoleBtn) {
            nextHoleBtn.classList.remove('hidden');
            nextHoleBtn.focus();
        }

        draw();
    }

    // Input Input Listeners for Real-time Drawing
    distanceInput.addEventListener('change', () => {
        if (distanceInput.value > MAX_POWER) distanceInput.value = MAX_POWER;
        if (distanceInput.value < 1) distanceInput.value = 1;
        draw();
    });
    angleInput.addEventListener('change', () => {
        if (angleInput.value > 360) angleInput.value = 360;
        if (angleInput.value < 0) angleInput.value = 0;
        draw();
    });
    distanceInput.addEventListener('input', draw);
    angleInput.addEventListener('input', draw);

    // Enter Key Support
    function handleEnter(e) {
        if (e.key === 'Enter') {
            shoot();
        }
    }
    angleInput.addEventListener('keydown', handleEnter);
    distanceInput.addEventListener('keydown', handleEnter);



    // Next Hole Handler
    nextHoleBtn.addEventListener('click', () => {
        config.holesPlayedCount++;

        if (config.holesPlayedCount >= config.totalHoles) {
            // End Game
            renderScorecard('final-scorecard-container');

            const gameOverScreen = document.getElementById('game-over-screen');
            gameOverScreen.classList.remove('hidden');
            nextHoleBtn.classList.add('hidden');
        } else {
            // Go to next hole (cycling through 9)
            config.currentHole = (config.currentHole % 9) + 1;
            loadLevel(config.currentHole);
        }
    });

    // Play Again Handler
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            document.getElementById('game-over-screen').classList.add('hidden');
            splashScreen.classList.remove('hidden');
            config.currentHole = 1;
        });
    }

    shootBtn.addEventListener('click', shoot);

    draw();
    numHolesInput.focus();
    numHolesInput.select();
});
