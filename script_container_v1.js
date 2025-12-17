const canvas = document.getElementById('flowCanvas');
        const ctx = canvas.getContext('2d');

        let width, height;
        let nodesBottom = [], nodesTop = [], pulses = []; 
        let COLS = 30; 
        const ROWS = 40, SPACING = 60, WAVE_SPEED = 0.01, WAVE_HEIGHT = 35; 
        const FOCAL_LENGTH = 700, CAMERA_Y = 0, CAMERA_Z = -100, GRID_OFFSET_Y = 200; 
        let time = 0;

        class Pulse {
            constructor(isTop) {
                this.isTop = isTop;
                this.active = true;
                this.centerR = Math.floor(Math.random() * (ROWS - 5)) + 2; 
                this.centerC = Math.random() * COLS; 
                this.targetC = COLS / 2;
                this.driftSpeed = 0.02 + Math.random() * 0.03;
                this.radius = 5 + Math.random() * 4; 
                this.life = 0; this.peaked = false; 
                this.fadeSpeed = 0.005 + Math.random() * 0.005; 
                this.maxIntensity = 0.25 + Math.random() * 0.15; 
            }
            update() {
                if (!this.active) return;
                if (!this.peaked) {
                    this.life += this.fadeSpeed;
                    if (this.life >= 1) { this.life = 1; this.peaked = true; }
                } else {
                    this.life -= this.fadeSpeed;
                    if (this.life <= 0) { this.life = 0; this.active = false; }
                }
                if (Math.abs(this.centerC - this.targetC) > 0.1) {
                    this.centerC += (this.centerC < this.targetC) ? this.driftSpeed : -this.driftSpeed;
                }
            }
            getStrengthAt(r, c) {
                const dist = Math.hypot(r - this.centerR, c - this.centerC);
                if (dist < this.radius) {
                    let x = dist / this.radius;
                    return (1 - (x * x)) * this.life * this.maxIntensity;
                }
                return 0;
            }
        }

        class GridNode {
            constructor(row, col, isTop) {
                this.row = row; this.col = col; this.isTop = isTop;
                this.updateBasePosition();
                this.x = this.xBase; this.y = this.yBase; this.z = this.zBase;
                this.sx = 0; this.sy = 0; this.scale = 1; this.visible = false;
            }
            updateBasePosition() {
                this.xBase = (this.col - COLS/2) * SPACING;
                this.zBase = (this.row) * SPACING; 
                this.yBase = this.isTop ? -GRID_OFFSET_Y : GRID_OFFSET_Y;
            }
            update() {
                let waveY = Math.sin(this.zBase * 0.012 - time * 1.5) * Math.cos(this.xBase * 0.008) * WAVE_HEIGHT;
                this.y = this.isTop ? this.yBase - waveY : this.yBase + waveY;
                let perspectiveZ = this.z - CAMERA_Z;
                if (perspectiveZ > 0) {
                    this.scale = FOCAL_LENGTH / perspectiveZ;
                    this.sx = this.x * this.scale + width / 2;
                    this.sy = (this.y - CAMERA_Y) * this.scale + height / 2; 
                    this.visible = (this.sx > -50 && this.sx < width + 50 && this.sy > -50 && this.sy < height + 50);
                } else { this.visible = false; }
            }
        }

        function spawnPulses() {
            if (Math.random() < 0.02) { 
                let isTop = Math.random() > 0.5;
                let newPulse = new Pulse(isTop);
                let overlap = false;
                for (let p of pulses) {
                    if (p.isTop === newPulse.isTop && p.active) {
                        if (Math.hypot(p.centerR - newPulse.centerR, p.centerC - newPulse.centerC) < (p.radius + newPulse.radius) * 1.5) { overlap = true; break; }
                    }
                }
                if (!overlap) pulses.push(newPulse);
            }
            for (let i = pulses.length - 1; i >= 0; i--) {
                pulses[i].update();
                if (!pulses[i].active) pulses.splice(i, 1);
            }
        }

        function drawGrid(nodeArray, isTop) {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    let n = nodeArray[r * COLS + c];
                    if (!n || !n.visible) continue;
                    let pulseStrength = 0;
                    for (let p of pulses) { if (p.isTop === isTop) pulseStrength += p.getStrengthAt(r, c); }
                    pulseStrength = Math.min(0.5, pulseStrength);
                    let alpha = (0.25 + pulseStrength) * Math.min(1, n.scale * 1.5); 
                    ctx.strokeStyle = `rgba(${135 + 80 * pulseStrength}, ${206 + 40 * pulseStrength}, 250, ${alpha})`;
                    ctx.lineWidth = 1 + (pulseStrength * 2);
                    if (c < COLS - 1) {
                        let right = nodeArray[r * COLS + (c + 1)];
                        if (right && right.visible) { ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(right.sx, right.sy); ctx.stroke(); }
                    }
                    if (r < ROWS - 1) {
                        let down = nodeArray[(r + 1) * COLS + c];
                        if (down && down.visible) { ctx.beginPath(); ctx.moveTo(n.sx, n.sy); ctx.lineTo(down.sx, down.sy); ctx.stroke(); }
                    }
                }
            }
        }

        function init() {
            width = window.innerWidth; height = window.innerHeight;
            canvas.width = width; canvas.height = height;
            COLS = Math.ceil(width / SPACING) + 4; 
            if (COLS % 2 === 0) COLS++;
            nodesBottom = []; nodesTop = [];
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    nodesBottom.push(new GridNode(r, c, false)); 
                    nodesTop.push(new GridNode(r, c, true));   
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height); 
            time += WAVE_SPEED; 
            spawnPulses();
            nodesBottom.forEach(n => n.update());
            nodesTop.forEach(n => n.update());
            drawGrid(nodesBottom, false);
            drawGrid(nodesTop, true);
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', init);
        init();
        animate();