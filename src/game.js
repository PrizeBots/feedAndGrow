<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game</title>
    <style>
        canvas {
            border: 1px solid black;
        }
    </style>
</head>
<body>
<canvas id="canvas" width="400" height="400"></canvas>
<script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    let player = { x: 200, y: 200, size: 20, hearts: 3 };
    let circles = [];
    let score = 0;
    let attack = false;
    let gameRunning = false;

    const keys = {};

    document.addEventListener('keydown', (e) => keys[e.code] = true);
    document.addEventListener('keyup', (e) => keys[e.code] = false);
    canvas.addEventListener('click', () => attack = true);

    function spawnCircle() {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        circles.push({ x, y, size: 10, dx: (player.x - x) / 100, dy: (player.y - y) / 100 });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw player
        ctx.fillStyle = 'red';
        ctx.fillRect(player.x, player.y, player.size, player.size);

        // Draw sword attack
        if (attack) {
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            ctx.moveTo(player.x + player.size / 2, player.y + player.size / 2);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.stroke();
            attack = false;
        }

        // Draw circles
        ctx.fillStyle = 'blue';
        for (const circle of circles) {
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circle.size, 0, Math.PI * 2);
            ctx.fill();
            circle.x += circle.dx;
            circle.y += circle.dy;
        }

        // Draw hearts
        ctx.fillStyle = 'red';
        for (let i = 0; i < player.hearts; i++) {
            ctx.fillRect(i * 25, 0, 20, 20);
        }

        // Player movement
        if (keys['KeyW']) player.y -= 2;
        if (keys['KeyS']) player.y += 2;
        if (keys['KeyA']) player.x -= 2;
        if (keys['KeyD']) player.x += 2;

        // Circle collisions
        for (let i = circles.length - 1; i >= 0; i--) {
            if (Math.abs(player.x + player.size / 2 - circles[i].x) < player.size / 2 + circles[i].size &&
                Math.abs(player.y + player.size / 2 - circles[i].y) < player.size / 2 + circles[i].size) {
                player.hearts--;
                circles.splice(i, 1);
                if (player.hearts <= 0) {
                    gameRunning = false;
                    alert('Game Over. Score: ' + score);
                }
            }
        }

        if (gameRunning) requestAnimationFrame(draw);
    }

    function startGame() {
        gameRunning = true;
        setInterval(() => spawnCircle(), 1000);
        setTimeout(() => {
            if (gameRunning) {
                gameRunning = false;
                alert('Round Over. Score: ' + score);
            }
        }, 60000);
        draw();
    }

    startGame();
</script>
</body>
</html>
