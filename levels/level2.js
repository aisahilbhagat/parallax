window.Level2 = {
    engine: null,
    targetX: 4200,
    player: null,
    cameraX: 0,
    time: 0,
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null, 
    
    // Background parallax & Atmosphere
    clouds: [],
    stars: [],
    
    // State for control suppression
    inputBlocked: false,
    flashIntensity: 0,
    
    // Unique Level 2 State
    gateOpen: false,

    // --- PAUSE MENU STATE (Imported from Level 1) ---
    paused: false,
    pauseButtons: [],
    boundInputHandlers: {}, 
    
    // --- BACKGROUND MUSIC ---
    audioElement: null,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 2 Initialized: The Castle Approach (HD - Grass Fixed)");
        this.generateClouds();
        this.generateStars();
        this.playBackgroundMusic('/music-assets/level2.ogg');

        // Initialize Pause Menu Inputs
        this.setupPauseInput();
    },

    load: function() {
        // Safe check for character class
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(100, 600);
                this.setupLevel();
            } else {
                console.error("Critical: LevelCharacter failed to load.");
            }
        });
    },

    // --- PAUSE MENU LOGIC ---
    setupPauseInput: function() {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const btnW = 200;
        const btnH = 50;
        const startY = cy - 50;

        this.pauseButtons = [
            { id: 'resume', label: 'RESUME', x: cx - btnW/2, y: startY, w: btnW, h: btnH, hover: false },
            { id: 'home',   label: 'HOME',   x: cx - btnW/2, y: startY + 70, w: btnW, h: btnH, hover: false },
        ];

        this.boundInputHandlers.keydown = (e) => {
            if (e.key === 'Tab') {
                this.paused = !this.paused;
                if(this.paused) this.pauseButtons.forEach(b => b.hover = false);
            }
        };

        this.boundInputHandlers.mousemove = (e) => {
            if (!this.paused) return;
            const rect = window.canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (window.canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (window.canvas.height / rect.height);

            this.pauseButtons.forEach(btn => {
                btn.hover = (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h);
                if (btn.hover) document.body.style.cursor = 'pointer';
            });
            
            if (!this.pauseButtons.some(b => b.hover)) {
                document.body.style.cursor = 'default';
            }
        };

        this.boundInputHandlers.mousedown = (e) => {
            if (!this.paused) return;
            const rect = window.canvas.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (window.canvas.width / rect.width);
            const my = (e.clientY - rect.top) * (window.canvas.height / rect.height);

            this.pauseButtons.forEach(btn => {
                if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                    this.handlePauseAction(btn.id);
                }
            });
        };

        window.addEventListener('keydown', this.boundInputHandlers.keydown);
        window.addEventListener('mousemove', this.boundInputHandlers.mousemove);
        window.addEventListener('mousedown', this.boundInputHandlers.mousedown);
    },

    cleanup: function() {
        if (this.boundInputHandlers.keydown) window.removeEventListener('keydown', this.boundInputHandlers.keydown);
        if (this.boundInputHandlers.mousemove) window.removeEventListener('mousemove', this.boundInputHandlers.mousemove);
        if (this.boundInputHandlers.mousedown) window.removeEventListener('mousedown', this.boundInputHandlers.mousedown);
        document.body.style.cursor = 'default';
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
    },

    handlePauseAction: function(actionId) {
        if (actionId === 'resume') {
            this.paused = false;
            document.body.style.cursor = 'default';
        } else if (actionId === 'home') {
            window.location.reload(); 
        }
    },

    loadCharacterScript: function(callback) {
        if (window.LevelCharacter) { callback(); return; }
        const script = document.createElement('script');
        script.src = 'levelcharacter.js';
        script.onload = () => {
            if (window.LevelCharacter) callback();
            else console.error("LevelCharacter missing.");
        };
        document.body.appendChild(script);
    },

    playBackgroundMusic: function(filename) {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        this.audioElement = new Audio(filename);
        this.audioElement.loop = true;
        this.audioElement.volume = 1.0;
        this.audioElement.play().catch(err => console.log("Audio autoplay prevented or error:", err));
    },

    setupLevel: function() {
        // --- 1. PLATFORMS (Difficulty: 7) ---
        this.platforms = [
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },
            
            // The Ascent
            { x: 480, y: 600, w: 60, h: 300, type: 'stone' }, 
            { x: 720, y: 500, w: 60, h: 400, type: 'stone' }, 
            { x: 950, y: 450, w: 60, h: 450, type: 'stone' }, 
            
            // Sludge Run
            { x: 1150, y: 550, w: 400, h: 50, type: 'stone' }, 
            
            // The Bridge of Collapse
            { x: 1650, y: 500, w: 100, h: 400, type: 'pillar' },
            { x: 1900, y: 500, w: 100, h: 400, type: 'pillar' }, 
            
            // Mid-Air Safety
            { x: 2200, y: 400, w: 200, h: 50, type: 'floating' }, 

            // High Road
            { x: 2600, y: 350, w: 80, h: 50, type: 'floating' },
            { x: 2850, y: 300, w: 80, h: 50, type: 'floating' },
            { x: 3100, y: 250, w: 80, h: 50, type: 'floating' },

            // Pre-Gate Platform (CP3)
            { x: 3350, y: 400, w: 150, h: 50, type: 'floating' },

            // The Gauntlet
            { x: 3580, y: 420, w: 60, h: 20, type: 'floating' }, 
            { x: 3780, y: 450, w: 60, h: 20, type: 'floating' }, 
            
            // The Castle Grounds
            { x: 3950, y: 500, w: 800, h: 400, type: 'ground' }
        ];

        // --- CHECKPOINTS ---
        this.checkpoints = [
            { x: 1150, y: 550, active: false, id: 1 }, 
            { x: 2200, y: 400, active: false, id: 2 }, 
            { x: 3350, y: 400, active: false, id: 3 }  
        ];

        // --- 2. OBSTACLES (Tuned for Difficulty 7) ---
        this.obstacles = [
            { 
                type: 'ghost', x: 720, y: 350, range: 120, baseSpeed: 1.2, 
                aggroRadius: 140, aggroSpeed: 2.8, cooldown: 0, 
                startX: 720, dir: 1, opacity: 0.8, state: 'patrol' 
            },
            { type: 'sludge', x: 730, y: 495, w: 40, h: 10, frictionMultiplier: 0.8 }, 

            { type: 'sludge', x: 1150, y: 545, w: 400, h: 10, frictionMultiplier: 0.5 },

            { 
                type: 'ghost', x: 1350, y: 500, range: 180, baseSpeed: 1.5, 
                aggroRadius: 160, aggroSpeed: 3.5, cooldown: 0, 
                startX: 1350, dir: 1, opacity: 0.9, state: 'patrol' 
            },
            
            { 
                type: 'collapse', x: 1780, y: 500, w: 90, h: 20, 
                delayAfterLanding: 30, respawnTime: 180, 
                state: 'idle', timer: 0, platformRef: null 
            },
            { 
                type: 'collapse', x: 2050, y: 450, w: 90, h: 20, 
                delayAfterLanding: 30, respawnTime: 180, 
                state: 'idle', timer: 0, platformRef: null 
            },

            { 
                type: 'stalactite', x: 2620, y: 50, w: 40, h: 80, 
                triggerRadius: 90, fallDelay: 15, state: 'idle', vy: 0, timer: 0 
            },
            { 
                type: 'stalactite', x: 2870, y: 40, w: 40, h: 100, 
                triggerRadius: 90, fallDelay: 15, state: 'idle', vy: 0, timer: 0 
            },

            { type: 'swing', cx: 3600, cy: 100, length: 260, angleRange: 0.8, speed: 0.035, radius: 25, angle: 0 },
            { type: 'swing', cx: 3800, cy: 100, length: 260, angleRange: 0.8, speed: 0.03, radius: 25, angle: 1.5 },

            { 
                type: 'statue', x: 3980, y: 450, w: 40, h: 80, 
                fireInterval: 80, projectileSpeed: 5.5, pattern: 'horizontal', 
                timer: 0, projectiles: []
            },
            
            { type: 'darkZone', x: 2400, y: 400, radius: 250, flickerTimer: 0, currentAlpha: 0.5 }
        ];

        this.obstacles.forEach(o => {
            if (o.type === 'collapse') {
                const p = { x: o.x, y: o.y, w: o.w, h: o.h, type: 'floating' };
                this.platforms.push(p);
                o.platformRef = p;
            }
        });
    },

    generateStars: function() {
        this.stars = [];
        for(let i=0; i<150; i++) {
            this.stars.push({
                x: Math.random(), 
                y: Math.random() * 0.75, 
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.8 + 0.2,
                twinkleOffset: Math.random() * 10
            });
        }
    },

    generateClouds: function() {
        this.clouds = [];
        for(let i=0; i<25; i++) {
            this.clouds.push({
                x: Math.random() * 5000,
                y: Math.random() * 400,
                w: 100 + Math.random() * 200,
                speed: 0.05 + Math.random() * 0.15, 
                opacity: 0.1 + Math.random() * 0.15 
            });
        }
    },

    update: function() {
        if (this.paused) return;

        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;

        this.clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x + c.w < this.cameraX) c.x = this.cameraX + 1000 + Math.random() * 500;
        });

        if (!this.player) return;

        this.player.update();

        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
            }
        }

        if (this.inputBlocked || (this.player.isStunned && this.player.stunTimer > 0)) {
            this.player.vx *= 0.8; 
            if (this.player.isStunned) {
                this.player.stunTimer -= 16; 
                if (this.player.stunTimer <= 0) this.player.isStunned = false;
            }
        }

        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pLeft = this.player.x + hitbox.offsetX;
        let pRight = pLeft + hitbox.width;
        let pTop = this.player.y + hitbox.offsetY;
        let pBottom = pTop + hitbox.height;
        let pVelY = this.player.vy || 0;

        for (let plat of this.platforms) {
            if (pRight > plat.x && pLeft < plat.x + plat.w &&
                pBottom > plat.y && pTop < plat.y + plat.h) {
                
                const floorThreshold = plat.y + Math.max(15, pVelY + 5);
                if (pBottom > floorThreshold) {
                    const overlapL = pRight - plat.x;
                    const overlapR = (plat.x + plat.w) - pLeft;
                    if (overlapL < overlapR) this.player.x -= overlapL;
                    else this.player.x += overlapR;
                    this.player.vx = 0;
                    pLeft = this.player.x + hitbox.offsetX;
                    pRight = pLeft + hitbox.width;
                }
            }
        }

        let groundLevel = 1000;
        for (let plat of this.platforms) {
            if (pRight > plat.x && pLeft < plat.x + plat.w) {
                if (pBottom <= plat.y + 35) { 
                    if (plat.y < groundLevel) groundLevel = plat.y;
                }
            }
        }
        this.player.groundY = groundLevel;

        this.updateObstacles(hitbox, pLeft, pRight, pTop, pBottom);

        this.cameraX = Math.max(0, this.player.x - 300);

        if (this.player.y > 900) this.resetPlayer();
        
        if (this.player.x >= this.targetX && Math.abs(this.player.y - 500) < 100) {
            console.log("Level 2 Complete: Entered Castle!");
            if (this.engine && this.engine.handleContentComplete) {
                this.engine.handleContentComplete();
            }
        }
    },

    updateObstacles: function(hitbox, pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 

        for (let obs of this.obstacles) {
            if (obs.type === 'sludge') {
                if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pB < obs.y + 20) {
                    if (this.player.isGrounded) {
                        this.player.vx *= obs.frictionMultiplier;
                        if (Math.abs(this.player.vx) < 0.5 && Math.abs(this.player.vx) > 0.01) {
                             this.player.x += (this.player.facingRight ? 1 : -1) * 0.5;
                        }
                    }
                }
            }
            else if (obs.type === 'ghost') {
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (obs.state === 'fading') {
                    obs.opacity -= 0.05;
                    if (obs.opacity <= 0) {
                        obs.state = 'cooldown';
                        obs.opacity = 0;
                        obs.cooldown = 120; 
                    }
                } else if (obs.state === 'cooldown') {
                    obs.cooldown--;
                    if (obs.cooldown <= 0) {
                        obs.state = 'patrol';
                        obs.opacity = 0.9;
                    }
                } else {
                    if (dist < obs.aggroRadius) {
                        const dir = (cx > obs.x) ? 1 : -1;
                        obs.x += dir * obs.aggroSpeed;
                        obs.cooldown++; 
                        if (obs.cooldown > 90) obs.state = 'fading'; 
                    } else {
                        obs.x += obs.dir * obs.baseSpeed;
                        if (obs.x > obs.startX + obs.range) obs.dir = -1;
                        if (obs.x < obs.startX - obs.range) obs.dir = 1;
                        obs.cooldown = 0;
                    }
                    if (Math.abs(cx - obs.x) < 20 && Math.abs(cy - obs.y) < 30) {
                        this.applyStun(200);
                        this.player.vx = (cx > obs.x) ? 10 : -10; 
                        this.player.vy = -5;
                        obs.state = 'fading'; 
                    }
                }
            }
            else if (obs.type === 'collapse') {
                if (obs.state === 'idle') {
                    if (this.player.isGrounded && pR > obs.x && pL < obs.x + obs.w && Math.abs(pB - obs.y) < 10) {
                        obs.state = 'shaking';
                        obs.timer = obs.delayAfterLanding;
                    }
                } else if (obs.state === 'shaking') {
                    obs.timer--;
                    if (obs.timer <= 0) {
                        obs.state = 'fallen';
                        obs.timer = obs.respawnTime;
                        if (obs.platformRef) obs.platformRef.y = 9000;
                        this.playSound('crumble');
                    }
                } else if (obs.state === 'fallen') {
                    obs.timer--;
                    if (obs.timer <= 0) {
                        obs.state = 'idle';
                        if (obs.platformRef) obs.platformRef.y = obs.y;
                    }
                }
            }
            else if (obs.type === 'stalactite') {
                if (obs.state === 'idle') {
                    if (Math.abs(cx - obs.x) < obs.triggerRadius && pB > obs.y) {
                        obs.state = 'triggered';
                        obs.timer = obs.fallDelay;
                    }
                } else if (obs.state === 'triggered') {
                    obs.timer--;
                    if (obs.timer <= 0) {
                        obs.state = 'falling';
                        obs.vy = 0;
                    }
                } else if (obs.state === 'falling') {
                    obs.vy += 0.6; 
                    obs.y += obs.vy;
                    if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pT < obs.y + obs.h) {
                        this.resetPlayer();
                    }
                    if (obs.y > 900) obs.state = 'gone';
                }
            }
            else if (obs.type === 'swing') {
                const time = this.time * 20; 
                const currentAngle = Math.sin(time * obs.speed) * obs.angleRange;
                const bx = obs.cx + Math.sin(currentAngle) * obs.length;
                const by = obs.cy + Math.cos(currentAngle) * obs.length;
                obs.bx = bx; obs.by = by;
                const dx = cx - bx;
                const dy = cy - by;
                if (Math.hypot(dx, dy) < (obs.radius + 18)) { 
                    this.applyStun(400);
                    this.player.vx = (dx > 0) ? 8 : -8; 
                    this.player.vy = -5;
                }
            }
            else if (obs.type === 'statue') {
                obs.timer++;
                if (obs.timer > obs.fireInterval) {
                    obs.timer = 0;
                    let vx = (obs.pattern === 'horizontal') ? -obs.projectileSpeed : -obs.projectileSpeed;
                    let vy = 0;
                    obs.projectiles.push({ x: obs.x, y: obs.y + 20, vx: vx, vy: vy, life: 200 });
                }
                for (let i = obs.projectiles.length - 1; i >= 0; i--) {
                    let p = obs.projectiles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life--;
                    if (Math.abs(cx - p.x) < 15 && Math.abs(cy - p.y) < 25) {
                        this.resetPlayer(); 
                    }
                    if (p.life <= 0) obs.projectiles.splice(i, 1);
                }
            }
            else if (obs.type === 'darkZone') {
                obs.flickerTimer++;
                if (obs.flickerTimer > 35) { 
                    obs.flickerTimer = 0;
                    obs.currentAlpha = 0.5 + Math.random() * 0.2; 
                }
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.radius) {
                }
            }
        }
    },

    resetPlayer: function() {
        if (this.activeCheckpoint) {
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
        } else {
            this.player.x = 100;
            this.player.y = 600;
        }
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.flashIntensity = 0;
        this.inputBlocked = false;
        
        this.obstacles.forEach(o => {
            if (o.type === 'collapse') {
                o.state = 'idle';
                if (o.platformRef) o.platformRef.y = o.y;
            }
            if (o.type === 'stalactite' && o.state === 'gone') {
                o.state = 'idle';
                o.y = 50; 
            }
        });
    },

    applyStun: function(duration) {
        this.player.isStunned = true;
        this.player.stunTimer = duration;
    },

    playSound: function(name, vol) {
        if (this.engine && this.engine.playSound) {
            this.engine.playSound(name, vol);
        }
    },

    // --- VISUAL RENDERING HELPERS ---

    drawPlatform: function(ctx, plat) {
        ctx.save();
        
        let grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
        
        // --- LEVEL 2 THEME: GOTHIC / CASTLE ---
        if (plat.type === 'ground') {
            grad.addColorStop(0, "#1a1a2e"); 
            grad.addColorStop(1, "#050505");
            ctx.fillStyle = grad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Soil Texture
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            for(let i=0; i<plat.w; i+=30) {
                if(i%60===0) ctx.fillRect(plat.x + i, plat.y + 10, 15, plat.h - 10);
            }

        } else if (plat.type === 'stone' || plat.type === 'floating') {
            grad.addColorStop(0, "#37474f"); 
            grad.addColorStop(0.5, "#263238");
            grad.addColorStop(1, "#102027");
            ctx.fillStyle = grad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            
            // Castle Bricks 
            ctx.strokeStyle = "rgba(0,0,0,0.6)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for(let y=plat.y; y<plat.y+plat.h; y+=25) {
                ctx.moveTo(plat.x, y);
                ctx.lineTo(plat.x + plat.w, y);
            }
            for(let y=plat.y; y<plat.y+plat.h; y+=25) {
                let offset = (y/25 % 2 === 0) ? 0 : 15;
                for(let x=plat.x + offset; x<plat.x+plat.w; x+=30) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y+25);
                }
            }
            ctx.stroke();

            // Highlight top (below grass)
            ctx.fillStyle = "rgba(100,100,150,0.1)";
            ctx.fillRect(plat.x, plat.y + 8, plat.w, 2);

        } else if (plat.type === 'pillar') {
            let pGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x + plat.w, plat.y);
            pGrad.addColorStop(0, "#263238");
            pGrad.addColorStop(0.3, "#3e2723"); 
            pGrad.addColorStop(0.5, "#102027");
            pGrad.addColorStop(1, "#000");
            ctx.fillStyle = pGrad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(plat.x + 10, plat.y); ctx.lineTo(plat.x + 10, plat.y + plat.h);
            ctx.moveTo(plat.x + plat.w - 10, plat.y); ctx.lineTo(plat.x + plat.w - 10, plat.y + plat.h);
            ctx.stroke();
            
            ctx.fillStyle = "#1a1a1a";
            ctx.fillRect(plat.x - 5, plat.y, plat.w + 10, 15);
            ctx.fillRect(plat.x - 5, plat.y + plat.h - 15, plat.w + 10, 15);
        }

        // --- GRASS RESTORATION ---
        // If it was grass before (ground/stone), it is grass now.
        if (plat.type === 'ground' || plat.type === 'stone') {
             // Dark lush green base
             ctx.fillStyle = "#1b5e20"; 
             ctx.fillRect(plat.x, plat.y, plat.w, 8);
             
             // HD grass blades/texture
             ctx.fillStyle = "#2e7d32";
             ctx.beginPath();
             for(let i=0; i<plat.w; i+=10) {
                 ctx.moveTo(plat.x + i, plat.y + 8);
                 ctx.lineTo(plat.x + i + 5, plat.y);
                 ctx.lineTo(plat.x + i + 10, plat.y + 8);
             }
             ctx.fill();
        }
        
        ctx.restore();
    },

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        const cx = this.player ? (this.player.x + 18) : 0;
        const cy = this.player ? (this.player.y + 30) : 0;
        let inDarkZone = null;

        for (let obs of this.obstacles) {
            if (obs.type === 'darkZone') {
                if (Math.hypot(cx - obs.x, cy - obs.y) < obs.radius) inDarkZone = obs;
            }
        }

        // --- 1. ATMOSPHERIC BACKGROUND (GOTHIC PURPLE) ---
        if (inDarkZone) {
             ctx.fillStyle = "#050005"; 
             ctx.fillRect(0, 0, w, h);
        } else {
            const grd = ctx.createLinearGradient(0, 0, 0, h);
            grd.addColorStop(0, "#1a0b2e"); // Deep Purple Top
            grd.addColorStop(0.5, "#2d1b4e"); 
            grd.addColorStop(1, "#4a3b5c"); // Foggy bottom
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, w, h);
        }

        if (!inDarkZone) {
            // Stars (Denser, fainter)
            this.stars.forEach(s => {
                const twinkle = Math.sin(this.time * 5 + s.twinkleOffset);
                const alpha = s.alpha + (twinkle * 0.1);
                ctx.fillStyle = `rgba(200, 200, 255, ${Math.max(0, Math.min(1, alpha))})`;
                ctx.beginPath();
                ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI*2);
                ctx.fill();
            });

            // Large Pale Moon
            const mx = w * 0.85;
            const my = h * 0.15;
            const mr = 50;
            const mGlow = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 3);
            mGlow.addColorStop(0, "rgba(220, 200, 255, 0.1)");
            mGlow.addColorStop(1, "rgba(220, 200, 255, 0)");
            ctx.fillStyle = mGlow;
            ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = "#e6e6fa"; // Lavender tint
            ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI*2); ctx.fill();
            
            // Craters
            ctx.fillStyle = "rgba(180,180,210,0.3)";
            ctx.beginPath(); ctx.arc(mx - 15, my + 10, 10, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(mx + 20, my - 5, 6, 0, Math.PI*2); ctx.fill();
        }

        // --- WORLD RENDER ---
        ctx.save();
        ctx.translate(-this.cameraX, 0);

        // Background Mountains (Parallax Layer)
        // Using "Buzz-free" world coordinates
        if(!inDarkZone) {
            ctx.fillStyle = "#120a1f"; // Very dark purple/black mountains
            ctx.beginPath();
            
            const step = 150; // Wider peaks for Level 2
            const startX = Math.floor(this.cameraX / step) * step - step;
            const endX = this.cameraX + w + step * 2;

            ctx.moveTo(startX, h);
            for(let x = startX; x <= endX; x += step) {
                // Sharper, spikier peaks for "Castle" vibe
                const peakH = 250 + Math.sin(x * 0.003) * 120 + Math.cos(x * 0.01) * 80;
                ctx.lineTo(x, h - peakH);
            }
            ctx.lineTo(endX, h);
            ctx.lineTo(startX, h);
            ctx.fill();
        }

        // Render Castle Gate (Background Layer)
        this.renderCastleGate(ctx);

        // Clouds (Gothic Fog)
        this.clouds.forEach(c => {
            const px = c.x - (this.cameraX * 0.15); 
            if (px + c.w > -100 && px < w + 100) {
                let cGrad = ctx.createLinearGradient(0, c.y, 0, c.y + 40);
                cGrad.addColorStop(0, `rgba(50, 40, 60, ${c.opacity})`);
                cGrad.addColorStop(1, `rgba(20, 10, 30, 0)`);
                ctx.fillStyle = cGrad;
                
                ctx.beginPath();
                ctx.roundRect(this.cameraX + px, c.y, c.w, 40, 10);
                ctx.fill();
            }
        });

        // Platforms
        for (let plat of this.platforms) {
            if (plat.y > 2000) continue; 
            this.drawPlatform(ctx, plat);
        }

        // Checkpoints (Green Spirit Fire for L2)
        this.checkpoints.forEach(cp => {
            // Post
            ctx.fillStyle = "#111";
            ctx.fillRect(cp.x - 3, cp.y - 60, 6, 60);

            // Lamp
            ctx.fillStyle = "#222";
            ctx.beginPath();
            ctx.moveTo(cp.x - 8, cp.y - 60);
            ctx.lineTo(cp.x + 8, cp.y - 60);
            ctx.lineTo(cp.x, cp.y - 45);
            ctx.fill();
            
            if (cp.active) {
                const glow = ctx.createRadialGradient(cp.x, cp.y - 60, 2, cp.x, cp.y - 60, 40);
                glow.addColorStop(0, "rgba(50, 255, 100, 1)"); 
                glow.addColorStop(1, "rgba(50, 255, 100, 0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cp.x, cp.y - 60, 40, 0, Math.PI*2);
                ctx.fill();
            } else {
                ctx.fillStyle = "rgba(50, 255, 100, 0.2)"; 
                ctx.beginPath();
                ctx.arc(cp.x, cp.y - 60, 5, 0, Math.PI*2);
                ctx.fill();
            }
        });

        this.renderObstacles(ctx);

        if (this.player) {
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.6)";
            ctx.beginPath();
            ctx.ellipse(this.player.x + 18, this.player.y + 58, 15, 4, 0, 0, Math.PI*2);
            ctx.fill();

            if (this.player.isStunned && Math.floor(this.time * 10) % 2 === 0) {
            } else {
                this.player.render(ctx);
            }
        }

        ctx.restore();
        // --- WORLD RENDER END ---

        // SCREEN EFFECTS
        if (inDarkZone) {
            const screenCx = cx - this.cameraX;
            const r = 120; 
            const grad = ctx.createRadialGradient(screenCx, cy, r, screenCx, cy, w);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.3, `rgba(10,0,15,${inDarkZone.currentAlpha})`);
            grad.addColorStop(1, "rgba(10,0,15,0.98)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.flashIntensity > 0.1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.paused) {
            this.renderPauseMenu(ctx);
            return;
        }

        ctx.fillStyle = "#ccc";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 2: The Castle Approach (HD)", 20, 30);
    },

    renderPauseMenu: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 36px monospace';
        ctx.fillText("GAME PAUSED", w/2, h/2 - 120);

        ctx.font = 'bold 24px monospace';
        for(let btn of this.pauseButtons) {
            ctx.save();
            ctx.fillStyle = btn.hover ? '#6d4c41' : '#4e342e'; 
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#3e2723';
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

            ctx.fillStyle = btn.hover ? '#ffffff' : '#d7ccc8';
            ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/2 + 8);
            ctx.restore();
        }
        
        ctx.font = "14px monospace";
        ctx.fillStyle = "#888";
        ctx.fillText("[Tab] to Resume", w/2, h - 50);

        ctx.textAlign = 'left'; 
    },

    renderCastleGate: function(ctx) {
        const gateX = this.targetX;
        const gateY = 500; 
        
        // Gate Shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(gateX + 20, gateY - 20, 160, 40);

        // Main Arch Structure (Stone Texture)
        let gGrad = ctx.createLinearGradient(gateX, gateY - 300, gateX + 200, gateY);
        gGrad.addColorStop(0, "#263238");
        gGrad.addColorStop(1, "#102027");
        ctx.fillStyle = gGrad;
        ctx.fillRect(gateX, gateY - 300, 200, 300); 
        
        // Archway hole (Black void)
        ctx.fillStyle = "#050505";
        ctx.beginPath();
        ctx.arc(gateX + 100, gateY, 70, Math.PI, 0); 
        ctx.fill();

        // Door (Dark Wood)
        ctx.fillStyle = "#2e1c15"; 
        ctx.fillRect(gateX + 30, gateY - 140, 140, 140);
        
        // Iron Bars on Door
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 4;
        ctx.beginPath();
        for(let i=0; i<=140; i+=35) {
            ctx.moveTo(gateX + 30 + i, gateY - 140);
            ctx.lineTo(gateX + 30 + i, gateY);
        }
        ctx.stroke();

        // Battlements
        ctx.fillStyle = "#263238";
        ctx.fillRect(gateX - 20, gateY - 320, 40, 60);
        ctx.fillRect(gateX + 180, gateY - 320, 40, 60);
        
        // Torches
        const flicker = Math.random() * 5;
        // Torch stands
        ctx.fillStyle = "#111";
        ctx.fillRect(gateX + 15, gateY - 200, 10, 20);
        ctx.fillRect(gateX + 175, gateY - 200, 10, 20);
        
        // Fire
        ctx.fillStyle = "rgba(255, 100, 0, 0.8)";
        ctx.beginPath();
        ctx.arc(gateX + 20, gateY - 210, 8 + flicker, 0, Math.PI*2);
        ctx.arc(gateX + 180, gateY - 210, 8 + flicker, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(gateX + 20, gateY - 210, 4, 0, Math.PI*2);
        ctx.arc(gateX + 180, gateY - 210, 4, 0, Math.PI*2);
        ctx.fill();
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'sludge') {
                // Bubbling Goo (Darker, oilier for L2)
                let gooGrad = ctx.createLinearGradient(0, obs.y, 0, obs.y + obs.h);
                gooGrad.addColorStop(0, "#2e1c15");
                gooGrad.addColorStop(1, "#100a08");
                ctx.fillStyle = gooGrad;
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                
                if (Math.random() > 0.9) {
                    ctx.fillStyle = "#4e342e";
                    const bx = obs.x + Math.random() * obs.w;
                    ctx.beginPath(); ctx.arc(bx, obs.y + Math.random()*5, 3, 0, Math.PI*2); ctx.fill();
                }
            }
            else if (obs.type === 'ghost') {
                if (obs.opacity > 0) {
                    ctx.save();
                    ctx.shadowColor = "rgba(200, 100, 100, 0.6)"; // Reddish aura for aggressive ghosts
                    ctx.shadowBlur = 15;

                    let gGrad = ctx.createRadialGradient(obs.x, obs.y, 5, obs.x, obs.y, 25);
                    gGrad.addColorStop(0, `rgba(220, 200, 220, ${obs.opacity})`);
                    gGrad.addColorStop(1, `rgba(50, 0, 50, 0)`);
                    ctx.fillStyle = gGrad;
                    
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, 20, Math.PI, 0);
                    // Ragged bottom
                    const wave = Math.sin(this.time * 8) * 3;
                    ctx.lineTo(obs.x + 20, obs.y + 40 + wave);
                    ctx.lineTo(obs.x, obs.y + 35 - wave);
                    ctx.lineTo(obs.x - 20, obs.y + 40 + wave);
                    ctx.fill();
                    
                    // Red eyes
                    ctx.fillStyle = "#ff0000";
                    ctx.shadowColor = "red";
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.arc(obs.x - 8, obs.y - 5, 3, 0, Math.PI*2);
                    ctx.arc(obs.x + 8, obs.y - 5, 3, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.restore();
                }
            }
            else if (obs.type === 'statue') {
                // Gargoyle-ish stone
                ctx.fillStyle = "#4e342e"; 
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                
                // Eyes glow before shooting
                if (obs.timer > obs.fireInterval - 20) {
                    ctx.fillStyle = "orange";
                    ctx.fillRect(obs.x + 5, obs.y + 10, 10, 5);
                }

                // Fireballs
                for (let p of obs.projectiles) {
                    ctx.fillStyle = "#ff5722"; 
                    ctx.shadowColor = "orange";
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
            else if (obs.type === 'collapse') {
                if (obs.state !== 'fallen') {
                    // Weathered Stone
                    ctx.fillStyle = "#5d4037";
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    
                    // Cracks
                    ctx.strokeStyle = "#3e2723";
                    ctx.beginPath();
                    ctx.moveTo(obs.x + 10, obs.y); ctx.lineTo(obs.x + 30, obs.y + 15);
                    ctx.moveTo(obs.x + 60, obs.y + 20); ctx.lineTo(obs.x + 80, obs.y);
                    ctx.stroke();

                    if (obs.state === 'shaking') {
                        ctx.strokeStyle = "#ff0000";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
                    }
                }
            }
            else if (obs.type === 'stalactite') {
                if (obs.state !== 'gone') {
                    // Sharp Rock
                    ctx.fillStyle = "#4e342e"; 
                    ctx.beginPath();
                    ctx.moveTo(obs.x, obs.y);
                    ctx.lineTo(obs.x + obs.w, obs.y);
                    ctx.lineTo(obs.x + obs.w/2, obs.y + obs.h);
                    ctx.fill();
                }
            }
            else if (obs.type === 'swing') {
                // Iron Chain
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                // Gold Candelabra
                ctx.fillStyle = "#ffb300"; 
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by, 15, 0, Math.PI*2);
                ctx.fill();
                
                // Blue Magic Fire
                const flicker = Math.random() * 5;
                let fGrad = ctx.createRadialGradient(obs.bx, obs.by - 20, 2, obs.bx, obs.by - 20, 15 + flicker);
                fGrad.addColorStop(0, "white");
                fGrad.addColorStop(0.2, "cyan");
                fGrad.addColorStop(1, "rgba(0,0,200,0)");
                
                ctx.fillStyle = fGrad; 
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by - 20, 15 + flicker, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
};