document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const angleInput = document.getElementById('angle');
    const distanceInput = document.getElementById('distance');
    const shootBtn = document.getElementById('shoot-btn');
    const strokesDisplay = document.getElementById('strokes');
    const messageArea = document.getElementById('message-area');

    // Game State
    let ball = { x: 50, y: 300, radius: 5 };
    const hole = { x: 700, y: 300, radius: 10 };
    let strokes = 0;
    let gameOver = false;
    let fairwayPath = new Path2D();

    // Define Fairway Geometry (Wider)
    function defineFairway() {
        const p = new Path2D();
        p.moveTo(0, 250); // Start Top-Left
        p.bezierCurveTo(200, 50, 400, 450, 600, 250);
        p.lineTo(800, 250); // Straight to right edge
        p.lineTo(800, 450); // Down to bottom thickness
        p.bezierCurveTo(500, 650, 300, 150, 0, 450); // Return path
        p.closePath();
        fairwayPath = p;
    }
    defineFairway();

    // Hazards Definition
    let bunkers = [
        { x: 300, y: 150, rx: 40, ry: 25, rotation: Math.PI / 4 },
        { x: 500, y: 450, rx: 50, ry: 30, rotation: -Math.PI / 6 }
    ];

    // Filter bunkers: Keep only those that touch the fairway
    bunkers = bunkers.filter(b => {
        // Check center
        if (ctx.isPointInPath(fairwayPath, b.x, b.y)) return true;

        // Check 4 perimeter points to catch partial overlaps
        const cos = Math.cos(b.rotation);
        const sin = Math.sin(b.rotation);
        const points = [
            { dx: b.rx, dy: 0 }, { dx: -b.rx, dy: 0 },
            { dx: 0, dy: b.ry }, { dx: 0, dy: -b.ry }
        ];
        for (const p of points) {
            const px = b.x + p.dx * cos - p.dy * sin;
            const py = b.y + p.dx * sin + p.dy * cos;
            if (ctx.isPointInPath(fairwayPath, px, py)) return true;
        }
        return false;
    });

    // Trees - blocking obstacles
    const trees = [
        { x: 300, y: 250, radius: 20 },
        { x: 450, y: 200, radius: 25 },
        { x: 400, y: 400, radius: 20 },
        { x: 600, y: 350, radius: 30 }
    ];

    // Config
    const MAX_POWER = 100;
    const POWER_FACTOR = 2; // 1 Power = 2 Pixels. Max Distance = 200px (Matches Power Bar Width).

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
        const barW = 200;
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
        ctx.beginPath();
        ctx.moveTo(hole.x, hole.y - 45); // Top
        ctx.bezierCurveTo(hole.x + 35, hole.y - 45, hole.x + 60, hole.y - 5, hole.x + 40, hole.y + 35); // Right side lobed
        ctx.bezierCurveTo(hole.x + 20, hole.y + 55, hole.x - 25, hole.y + 55, hole.x - 40, hole.y + 35); // Bottom
        ctx.bezierCurveTo(hole.x - 60, hole.y + 5, hole.x - 40, hole.y - 40, hole.x, hole.y - 45); // Left side closing
        ctx.fillStyle = '#58d68d';
        ctx.fill();
        ctx.strokeStyle = '#4cb476';
        ctx.stroke();

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
        if (startedOnFairway) {
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
        if (ctx.isPointInPath(fairwayPath, ball.x, ball.y)) {
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
        strokesDisplay.textContent = strokes;

        if (msg) {
            messageArea.textContent = msg;
            if (color) messageArea.style.color = color;
        } else {
            // Standard check for near hole stop (if dunk didn't catch it very close)
            const distToHole = Math.sqrt((ball.x - hole.x) ** 2 + (ball.y - hole.y) ** 2);
            if (distToHole < hole.radius + 2) { // Generous stop win
                handleWin();
                return;
            }

            // OOB Check
            const endedOnFairway = ctx.isPointInPath(fairwayPath, ball.x, ball.y);
            if (!endedOnFairway) {
                if (lastFairwayPos) {
                    // Add a small delay so user sees where it landed before reset? 
                    // For now, instant reset is fine or we can animate it.
                    // Let's do instant reset for OOB to be clear.
                    ball.x = lastFairwayPos.x;
                    ball.y = lastFairwayPos.y;
                    messageArea.textContent = 'Ball went out of bounds. Reset to edge of fairway.';
                    messageArea.style.color = '#e67e22';
                }
            } else {
                messageArea.textContent = '';
            }
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
        strokesDisplay.textContent = strokes;
        messageArea.textContent = 'HOLE COMPLETE! (Total Strokes: ' + strokes + ')';
        messageArea.style.color = '#2ecc71';
        draw();
    }

    // Input Input Listeners for Real-time Drawing
    distanceInput.addEventListener('change', () => {
        if (distanceInput.value > MAX_POWER) distanceInput.value = MAX_POWER;
        if (distanceInput.value < 1) distanceInput.value = 1;
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

    shootBtn.addEventListener('click', shoot);

    draw();
    angleInput.focus();
    angleInput.select();
});
