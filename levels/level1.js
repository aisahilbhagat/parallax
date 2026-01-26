window.Level1 = {
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
    
    // State for jump scare / freeze effects
    inputBlocked: false,
    flashIntensity: 0,
    phantomX: -1000,

    // --- TUTORIAL UI STATE (NEW) ---
    tutorialState: { alpha: 0 },
    tutorialHiding: false,

    // --- PAUSE MENU STATE ---
    paused: false,
    pauseButtons: [],
    boundInputHandlers: {}, 
    
    // --- BACKGROUND MUSIC ---
    audioElement: null,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 1 Initialized: The Windy Peaks (High Res)");
        this.generateClouds();
        this.generateStars();
        this.playBackgroundMusic('/music-assets/level1.ogg');
        this.setupPauseInput();

        // --- TUTORIAL ANIMATION TRIGGER ---
        // Reset state
        this.tutorialState.alpha = 0;
        this.tutorialHiding = false;

        if (window.anime) {
            // Fade in
            anime({
                targets: this.tutorialState,
                alpha: 1,
                duration: 1500,
                delay: 500,
                easing: 'easeInOutQuad'
            });
        }
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(100, 600);
                this.setupLevel();
            } else {
                console.error("Critical: LevelCharacter failed to load.");
            }
        });
    },

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
        // --- 1. STATIC PLATFORMS & SAFE ZONES ---
        this.platforms = [
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },
            { x: 400, y: 650, w: 100, h: 250, type: 'stone' },
            { x: 600, y: 600, w: 200, h: 300, type: 'stone' },
            
            // Ascent
            { x: 900, y: 550, w: 100, h: 400, type: 'pillar' },
            { x: 1100, y: 450, w: 100, h: 500, type: 'pillar' },
            { x: 1300, y: 350, w: 300, h: 600, type: 'ground' }, 

            // Gap Pillars
            { x: 1700, y: 350, w: 80, h: 600, type: 'pillar' },
            { x: 1950, y: 350, w: 80, h: 600, type: 'pillar' },
            { x: 2200, y: 300, w: 80, h: 600, type: 'pillar' },
            
            // Safe Breath Zone (Mid-Level)
            { x: 2350, y: 300, w: 150, h: 600, type: 'stone' }, 

            { x: 2900, y: 500, w: 300, h: 50, type: 'floating' }, 
            
            // Safe Breath Zone (Pre-Climax)
            { x: 3150, y: 400, w: 120, h: 50, type: 'floating' }, 
            
            // Final Stretch
            { x: 3300, y: 450, w: 80, h: 50, type: 'floating' },
            { x: 3500, y: 400, w: 80, h: 50, type: 'floating' },
            { x: 3700, y: 350, w: 80, h: 50, type: 'floating' },
            
            // Goal
            { x: 3900, y: 300, w: 500, h: 600, type: 'ground' }
        ];

        // --- CHECKPOINTS ---
        this.checkpoints = [
            { x: 1350, y: 350, active: false, id: 1 },
            { x: 2400, y: 300, active: false, id: 2 },
            { x: 3200, y: 400, active: false, id: 3 }
        ];

        // --- 2. OBSTACLES & TRAPS ---
        this.obstacles = [
            { type: 'sludge', x: 700, y: 595, w: 100, h: 10, frictionMultiplier: 0.6 },
            { type: 'sludge', x: 1300, y: 345, w: 300, h: 10, frictionMultiplier: 0.6 },

            { 
                type: 'ghost', x: 1950, y: 300, range: 200, baseSpeed: 1, 
                aggroRadius: 130, aggroSpeed: 2.8, cooldown: 0, 
                startX: 1950, dir: 1, opacity: 0.8, state: 'patrol' 
            },
            { 
                type: 'ghost', x: 3600, y: 350, range: 150, baseSpeed: 1.2, 
                aggroRadius: 130, aggroSpeed: 3.0, cooldown: 0, 
                startX: 3600, dir: -1, opacity: 0.8, state: 'patrol' 
            },

            { 
                type: 'statue', x: 2100, y: 250, w: 40, h: 80, 
                fireInterval: 120, projectileSpeed: 4, pattern: 'horizontal',
                timer: 0, projectiles: []
            },
            { 
                type: 'statue', x: 3400, y: 400, w: 40, h: 80, 
                fireInterval: 150, projectileSpeed: 4, pattern: 'diagonal',
                timer: 60, projectiles: []
            },

            { 
                type: 'collapse', x: 2550, y: 250, w: 300, h: 50, 
                delayAfterLanding: 50, respawnTime: 180, 
                state: 'idle', timer: 0, platformRef: null 
            },

            { type: 'darkZone', x: 2750, y: 400, radius: 280, flickerTimer: 0, currentAlpha: 0.6 },

            { 
                type: 'stalactite', x: 2900, y: 100, w: 40, h: 80, 
                triggerRadius: 100, fallDelay: 20, state: 'idle', vy: 0, timer: 0 
            },
            { 
                type: 'stalactite', x: 2980, y: 80, w: 50, h: 100, 
                triggerRadius: 100, fallDelay: 25, state: 'idle', vy: 0, timer: 0 
            },

            { type: 'swing', cx: 3340, cy: 100, length: 180, angleRange: 0.6, speed: 0.025, radius: 24, angle: 0 },
            { type: 'swing', cx: 3540, cy: 100, length: 180, angleRange: 0.6, speed: 0.03, radius: 24, angle: 1 },
            { type: 'swing', cx: 3740, cy: 100, length: 180, angleRange: 0.6, speed: 0.025, radius: 24, angle: 2 },

            { type: 'audioZone', x: 1700, y: 350, radius: 200, volumeMax: 0.8 },
            { type: 'audioZone', x: 3500, y: 400, radius: 200, volumeMax: 1.0 },

            { type: 'jumpscare', x: this.targetX - 80, y: 400, triggerRadius: 100, triggered: false }
        ];

        const collapser = this.obstacles.find(o => o.type === 'collapse');
        if (collapser) {
            const p = { x: collapser.x, y: collapser.y, w: collapser.w, h: collapser.h, type: 'floating' };
            this.platforms.push(p);
            collapser.platformRef = p;
        }
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
        for(let i=0; i<20; i++) {
            this.clouds.push({
                x: Math.random() * 5000,
                y: Math.random() * 400,
                w: 100 + Math.random() * 200,
                speed: 0.1 + Math.random() * 0.2, 
                opacity: 0.1 + Math.random() * 0.2 
            });
        }
    },

    update: function() {
        if (this.paused) return;

        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;

        // --- TUTORIAL FADE OUT LOGIC ---
        // Fade out after ~8 seconds (this.time increases by ~3.0 per second at 60fps)
        if (this.time > 25 && !this.tutorialHiding && this.tutorialState.alpha > 0) {
            this.tutorialHiding = true;
            if (window.anime) {
                anime({
                    targets: this.tutorialState,
                    alpha: 0,
                    duration: 2000,
                    easing: 'easeOutQuad'
                });
            }
        }

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
            this.player.vx = 0; 
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
        if (this.player.x >= this.targetX) {
            console.log("Level 1 Complete!");
            if (this.engine && this.engine.handleContentComplete) {
                this.engine.handleContentComplete();
            }
        }
    },

    updateObstacles: function(hitbox, pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 

        for (let obs of this.obstacles) {
            if (obs.type === 'movingSpike') {
                if (obs.delay > 0) obs.delay--;
                else {
                    obs.timer += 0.05; 
                    obs.x = obs.startX + Math.sin(obs.timer) * obs.amplitude;
                }
                if (pR > obs.x && pL < obs.x + obs.w && pB > obs.y && pT < obs.y + obs.h) {
                    this.resetPlayer(); 
                }
            }
            else if (obs.type === 'sludge') {
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
                        obs.opacity = 0.8;
                    }
                } else {
                    if (dist < obs.aggroRadius) {
                        const dir = (cx > obs.x) ? 1 : -1;
                        obs.x += dir * obs.aggroSpeed;
                        obs.cooldown++; 
                        if (obs.cooldown > 60) obs.state = 'fading'; 
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
            else if (obs.type === 'statue') {
                obs.timer++;
                if (obs.timer > obs.fireInterval) {
                    obs.timer = 0;
                    let vx = (obs.pattern === 'horizontal') ? -obs.projectileSpeed : -obs.projectileSpeed;
                    let vy = (obs.pattern === 'diagonal') ? -2 : 0;
                    obs.projectiles.push({ x: obs.x, y: obs.y + 20, vx: vx, vy: vy, life: 200 });
                }
                for (let i = obs.projectiles.length - 1; i >= 0; i--) {
                    let p = obs.projectiles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (obs.pattern === 'diagonal') p.vy += 0.1; 
                    p.life--;
                    if (Math.abs(cx - p.x) < 15 && Math.abs(cy - p.y) < 25) {
                        this.resetPlayer(); 
                    }
                    if (p.life <= 0) obs.projectiles.splice(i, 1);
                }
            }
            else if (obs.type === 'collapse') {
                if (obs.state === 'idle') {
                    if (this.player.isGrounded && pR > obs.x && pL < obs.x + obs.w && Math.abs(pB - obs.y) < 5) {
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
            else if (obs.type === 'darkZone') {
                obs.flickerTimer++;
                if (obs.flickerTimer > 35) { 
                    obs.flickerTimer = 0;
                    obs.currentAlpha = 0.5 + Math.random() * 0.2; 
                }
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.radius) {
                    this.player.vx *= 0.85; 
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
                    obs.vy += 0.5;
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
                    this.player.vx = (dx > 0) ? 6 : -6;
                    this.player.vy = -4;
                }
            }
            else if (obs.type === 'audioZone') {
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.radius) {
                    const vol = obs.volumeMax * (1 - dist/obs.radius);
                    this.playSound('heartbeat', Math.max(0.1, vol));
                    if (this.time % 10 < 1) {
                         this.cameraX += (Math.random() - 0.5) * 4; 
                    }
                }
            }
            else if (obs.type === 'jumpscare') {
                if (!obs.triggered && Math.abs(cx - obs.x) < obs.triggerRadius) {
                    obs.triggered = true;
                    this.triggerJumpScare();
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
                o.y = 100; 
            }
        });
    },

    applyStun: function(duration) {
        this.player.isStunned = true;
        this.player.stunTimer = duration;
    },

    triggerJumpScare: function() {
        this.inputBlocked = true;
        this.flashIntensity = 1.0;
        this.playSound('scream', 1.0);
        this.phantomX = this.targetX + 400; 
        setTimeout(() => {
            this.inputBlocked = false;
        }, 200);
    },

    playSound: function(name, vol) {
        if (this.engine && this.engine.playSound) {
            this.engine.playSound(name, vol);
        }
    },

    // --- VISUAL RENDERING HELPERS ---

    drawPlatform: function(ctx, plat) {
        ctx.save();
        
        // Base Gradient based on type
        let grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
        
        if (plat.type === 'ground') {
            grad.addColorStop(0, "#2c3e50"); // Dark Blue-Grey
            grad.addColorStop(1, "#000000"); // Black base
            ctx.fillStyle = grad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

            // Gritty texture overlay
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            for(let i=0; i<plat.w; i+=20) {
                if(i%40===0) ctx.fillRect(plat.x + i, plat.y + 10, 10, plat.h - 10);
            }

            // Grass/Moss Topper
            ctx.fillStyle = "#2e4a36"; // Dark moss green
            ctx.fillRect(plat.x, plat.y, plat.w, 6);
            
        } else if (plat.type === 'stone' || plat.type === 'floating') {
            grad.addColorStop(0, "#546e7a"); 
            grad.addColorStop(0.5, "#37474f");
            grad.addColorStop(1, "#263238");
            ctx.fillStyle = grad;
            
            // Draw Main Block
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            
            // Stone Bricks pattern
            ctx.strokeStyle = "rgba(0,0,0,0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Horizontal lines
            for(let y=plat.y; y<plat.y+plat.h; y+=40) {
                ctx.moveTo(plat.x, y);
                ctx.lineTo(plat.x + plat.w, y);
            }
            // Vertical offset lines
            for(let y=plat.y; y<plat.y+plat.h; y+=40) {
                let offset = (y/40 % 2 === 0) ? 0 : 20;
                for(let x=plat.x + offset; x<plat.x+plat.w; x+=40) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y+40);
                }
            }
            ctx.stroke();

            // Highlight top edge
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(plat.x, plat.y, plat.w, 2);

        } else if (plat.type === 'pillar') {
            // Cylindrical gradient
            let pGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x + plat.w, plat.y);
            pGrad.addColorStop(0, "#263238");
            pGrad.addColorStop(0.2, "#546e7a"); // Highlight leftish
            pGrad.addColorStop(0.5, "#37474f");
            pGrad.addColorStop(1, "#102027"); // Shadow right
            ctx.fillStyle = pGrad;
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            
            // Pillar decorative lines
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.fillRect(plat.x + 10, plat.y, 5, plat.h);
            ctx.fillRect(plat.x + plat.w - 15, plat.y, 5, plat.h);
            
            // Capital/Base details
            ctx.fillStyle = "#1c262b";
            ctx.fillRect(plat.x - 5, plat.y, plat.w + 10, 20); // Top cap
            ctx.fillRect(plat.x - 5, plat.y + plat.h - 20, plat.w + 10, 20); // Bottom base
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

        // --- 1. ATMOSPHERIC BACKGROUND ---
        if (inDarkZone) {
             ctx.fillStyle = "#050505"; 
             ctx.fillRect(0, 0, w, h);
        } else {
            const grd = ctx.createLinearGradient(0, 0, 0, h);
            grd.addColorStop(0, "#090a14"); 
            grd.addColorStop(0.4, "#211a30"); 
            grd.addColorStop(0.8, "#3e2e42"); 
            grd.addColorStop(1, "#1a101c"); 
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, w, h);
        }

        if (!inDarkZone) {
            // Draw Stars with varying brightness
            this.stars.forEach(s => {
                const twinkle = Math.sin(this.time * 5 + s.twinkleOffset);
                const alpha = s.alpha + (twinkle * 0.2);
                ctx.fillStyle = `rgba(255, 255, 230, ${Math.max(0, Math.min(1, alpha))})`;
                ctx.beginPath();
                ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI*2);
                ctx.fill();
            });

            // Moon with textured glow
            const mx = w * 0.8;
            const my = h * 0.2;
            const mr = 40;
            
            // Outer Glow
            const mGlow = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4);
            mGlow.addColorStop(0, "rgba(200, 200, 255, 0.15)");
            mGlow.addColorStop(1, "rgba(200, 200, 255, 0)");
            ctx.fillStyle = mGlow;
            ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, Math.PI*2); ctx.fill();
            
            // Moon Body
            const mBody = ctx.createRadialGradient(mx - 10, my - 10, 5, mx, my, mr);
            mBody.addColorStop(0, "#ffffff");
            mBody.addColorStop(1, "#dcdcdc");
            ctx.fillStyle = mBody;
            ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI*2); ctx.fill();
            
            // Craters (Texture)
            ctx.fillStyle = "rgba(200,200,210,0.3)";
            ctx.beginPath(); ctx.arc(mx + 10, my + 5, 8, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(mx - 15, my - 10, 5, 0, Math.PI*2); ctx.fill();
        }

        // --- WORLD RENDER START ---
        ctx.save();
        ctx.translate(-this.cameraX, 0);

        // Background Mountains (Parallax Layer)
        if(!inDarkZone) {
            ctx.fillStyle = "#151520";
            ctx.beginPath();
            
            // Fix: Align vertices to world grid to prevent "swimming/buzzing" artifact
            const step = 100;
            // Calculate starting world X aligned to grid (step size)
            // We subtract 'step' to ensure we start drawing slightly off-screen to the left
            const startX = Math.floor(this.cameraX / step) * step - step;
            const endX = this.cameraX + w + step * 2;

            ctx.moveTo(startX, h);

            for(let x = startX; x <= endX; x += step) {
                const peakH = 200 + Math.sin(x * 0.005) * 100 + Math.cos(x * 0.02) * 50;
                ctx.lineTo(x, h - peakH);
            }
            
            ctx.lineTo(endX, h);
            ctx.lineTo(startX, h);
            ctx.fill();
        }

        // CLOUDS (Improved Texture)
        this.clouds.forEach(c => {
            const px = c.x - (this.cameraX * 0.2); 
            if (px + c.w > -100 && px < w + 100) {
                // Gradient Cloud
                let cGrad = ctx.createLinearGradient(0, c.y, 0, c.y + 40);
                cGrad.addColorStop(0, `rgba(60, 60, 80, ${c.opacity})`);
                cGrad.addColorStop(1, `rgba(30, 30, 45, 0)`);
                ctx.fillStyle = cGrad;
                
                ctx.beginPath();
                ctx.moveTo(this.cameraX + px, c.y + 20);
                ctx.quadraticCurveTo(this.cameraX + px + c.w/2, c.y - 20, this.cameraX + px + c.w, c.y + 20);
                ctx.lineTo(this.cameraX + px + c.w, c.y + 40);
                ctx.lineTo(this.cameraX + px, c.y + 40);
                ctx.fill();
            }
        });

        // RENDER PLATFORMS WITH TEXTURES
        for (let plat of this.platforms) {
            if (plat.y > 2000) continue; 
            this.drawPlatform(ctx, plat);
        }

        // CHECKPOINTS RENDER (High Fidelity)
        this.checkpoints.forEach(cp => {
            // Post
            ctx.fillStyle = "#111";
            ctx.fillRect(cp.x - 3, cp.y - 60, 6, 60);
            
            // Lamp Housing
            ctx.fillStyle = "#222";
            ctx.beginPath();
            ctx.moveTo(cp.x - 10, cp.y - 60);
            ctx.lineTo(cp.x + 10, cp.y - 60);
            ctx.lineTo(cp.x + 15, cp.y - 50);
            ctx.lineTo(cp.x - 15, cp.y - 50);
            ctx.fill();

            // Light
            if (cp.active) {
                const glow = ctx.createRadialGradient(cp.x, cp.y - 45, 5, cp.x, cp.y - 45, 60);
                glow.addColorStop(0, "rgba(180, 240, 255, 1)");
                glow.addColorStop(0.4, "rgba(100, 200, 255, 0.4)");
                glow.addColorStop(1, "rgba(100, 200, 255, 0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(cp.x, cp.y - 45, 60, 0, Math.PI*2);
                ctx.fill();
            } else {
                ctx.fillStyle = "rgba(100, 50, 50, 0.5)"; // Dim red unlit
                ctx.beginPath();
                ctx.arc(cp.x, cp.y - 45, 8, 0, Math.PI*2);
                ctx.fill();
            }
        });

        this.renderObstacles(ctx);

        if (this.player) {
            // Draw shadow under player
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath();
            ctx.ellipse(this.player.x + 18, this.player.y + 58, 15, 4, 0, 0, Math.PI*2);
            ctx.fill();

            if (this.player.isStunned && Math.floor(this.time * 10) % 2 === 0) {
                // blink
            } else {
                this.player.render(ctx);
            }
        }

        // Phantom Effect
        if (this.phantomX > -500 && this.flashIntensity > 0) {
            this.phantomX -= 40; 
            ctx.save();
            ctx.shadowColor = "red";
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(0, 0, 0, ${this.flashIntensity})`;
            ctx.beginPath();
            ctx.arc(this.phantomX, 300, 100, 0, Math.PI*2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(this.phantomX - 30, 280, 10, 0, Math.PI*2);
            ctx.arc(this.phantomX + 30, 280, 10, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        // Goal
        const goalGrad = ctx.createLinearGradient(this.targetX, 200, this.targetX + 100, 200);
        goalGrad.addColorStop(0, "#ffd700");
        goalGrad.addColorStop(0.5, "#ffec8b");
        goalGrad.addColorStop(1, "#b8860b");
        ctx.fillStyle = goalGrad;
        ctx.fillRect(this.targetX, 200, 100, 600); 
        // Goal shine
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(this.targetX, 200); ctx.lineTo(this.targetX+100, 800);
        ctx.stroke();

        ctx.restore();
        // --- WORLD RENDER END ---

        // SCREEN EFFECTS
        if (inDarkZone) {
            const screenCx = cx - this.cameraX;
            const screenCy = cy;
            const r = 100; 
            const grad = ctx.createRadialGradient(screenCx, screenCy, r, screenCx, screenCy, w);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(0.3, `rgba(0,0,0,${inDarkZone.currentAlpha})`);
            grad.addColorStop(1, "rgba(0,0,0,0.98)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.flashIntensity > 0.1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        // --- DRAW TUTORIAL CONTROLS (NEW) ---
        this.drawControls(ctx);

        if (this.paused) {
            this.renderPauseMenu(ctx);
            return; 
        }

        ctx.fillStyle = "#aaa";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 1: The Windy Peaks (HD)", 20, 30);
    },

    // --- NEW TUTORIAL RENDERER ---
    drawControls: function(ctx) {
        if (this.tutorialState.alpha <= 0.01) return;

        ctx.save();
        ctx.globalAlpha = this.tutorialState.alpha;
        
        const keySize = 40;
        const gap = 10;
        
        // Layout: [A] gap [D] --gap-- [W] --gap-- [Mouse]
        // 40+10 + 40 + 40 + 40 + 40 + 60 = ~270
        const totalWidth = 300;
        
        const startX = (window.canvas.width - totalWidth) / 2;
        const startY = window.canvas.height - 100;

        const drawKey = (text, x, y, label) => {
            // Shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(x + 2, y + 2, keySize, keySize);

            // Box
            ctx.fillStyle = "rgba(30, 40, 50, 0.85)";
            ctx.strokeStyle = "rgba(150, 220, 255, 0.5)";
            ctx.lineWidth = 2;
            
            // Rounded rect
            ctx.beginPath();
            ctx.roundRect(x, y, keySize, keySize, 5);
            ctx.fill();
            ctx.stroke();

            // Key Letter
            ctx.fillStyle = "#fff";
            ctx.font = "bold 20px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, x + keySize/2, y + keySize/2);

            // Label
            if (label) {
                ctx.fillStyle = "#ccc";
                ctx.font = "10px sans-serif";
                ctx.fillText(label, x + keySize/2, y - 10);
            }
        };

        const drawMouseIcon = (x, y, label) => {
             const mw = 26;
             const mh = 40;
             
             // Shadow
             ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
             ctx.beginPath(); ctx.ellipse(x + mw/2 + 2, y + mh/2 + 2, mw/2, mh/2, 0, 0, Math.PI*2); ctx.fill();

             // Mouse Body
             ctx.fillStyle = "rgba(30, 40, 50, 0.85)";
             ctx.strokeStyle = "rgba(150, 220, 255, 0.5)";
             ctx.lineWidth = 2;
             ctx.beginPath(); ctx.ellipse(x + mw/2, y + mh/2, mw/2, mh/2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

             // Left Button (Active)
             ctx.fillStyle = "#fff";
             ctx.beginPath();
             ctx.moveTo(x + mw/2, y + 5); 
             ctx.lineTo(x + mw/2, y + mh/2 - 5);
             ctx.lineTo(x + 2, y + mh/2 - 5);
             ctx.quadraticCurveTo(x + 2, y + 10, x + mw/2, y + 5);
             ctx.fill();

             // Label
             if (label) {
                ctx.fillStyle = "#ccc";
                ctx.font = "10px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(label, x + mw/2, y - 10);
            }
        };

        // Draw Keys
        // W - Jump
        // Centered horizontally? 
        // Let's do: A (Left), D (Right), W (Jump), Mouse (Attack)
        
        let cx = startX;
        
        drawKey("A", cx, startY, "Left");
        cx += keySize + gap;
        drawKey("D", cx, startY, "Right");
        cx += keySize + gap + 20; // Spacer
        drawKey("W", cx, startY, "Jump");
        cx += keySize + gap + 20; // Spacer

        // Mouse / E
        drawKey("E", cx, startY, "Attack");
        cx += keySize + gap + 10;
        
        // Separator text
        ctx.fillStyle = "#aaa"; ctx.font = "14px sans-serif";
        ctx.fillText("/", cx, startY + keySize/2);
        cx += 15;

        drawMouseIcon(cx, startY, "");

        ctx.restore();
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

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'movingSpike') {
                // Metallic Spike Texture
                let spikeGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.w, obs.y);
                spikeGrad.addColorStop(0, "#444");
                spikeGrad.addColorStop(0.5, "#999"); // Shiny middle
                spikeGrad.addColorStop(1, "#222");
                ctx.fillStyle = spikeGrad;
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y + obs.h);
                ctx.lineTo(obs.x + obs.w/2, obs.y);
                ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
                ctx.fill();
                
                // Blood tip
                ctx.fillStyle = "#800000";
                ctx.beginPath();
                ctx.moveTo(obs.x + obs.w/2, obs.y);
                ctx.lineTo(obs.x + obs.w/2 - 5, obs.y + 15);
                ctx.lineTo(obs.x + obs.w/2 + 5, obs.y + 15);
                ctx.fill();
            }
            else if (obs.type === 'sludge') {
                // Bubbling Goo Gradient
                let gooGrad = ctx.createLinearGradient(0, obs.y, 0, obs.y + obs.h);
                gooGrad.addColorStop(0, "#3e2723");
                gooGrad.addColorStop(0.5, "#1a0f0d");
                gooGrad.addColorStop(1, "#000");
                ctx.fillStyle = gooGrad;
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                
                // Bubbles
                ctx.fillStyle = "rgba(80, 50, 40, 0.7)";
                if (Math.random() > 0.8) {
                    const bx = obs.x + Math.random() * obs.w;
                    const by = obs.y + Math.random() * 5;
                    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2); ctx.fill();
                }
            }
            else if (obs.type === 'ghost') {
                if (obs.opacity > 0) {
                    ctx.save();
                    ctx.shadowColor = "rgba(180, 255, 230, 0.5)";
                    ctx.shadowBlur = 10;
                    
                    // Ethereal Body Gradient
                    let gGrad = ctx.createRadialGradient(obs.x, obs.y, 5, obs.x, obs.y, 25);
                    gGrad.addColorStop(0, `rgba(220, 255, 245, ${obs.opacity})`);
                    gGrad.addColorStop(1, `rgba(100, 200, 190, 0)`);
                    ctx.fillStyle = gGrad;
                    
                    ctx.beginPath();
                    ctx.arc(obs.x, obs.y, 20, Math.PI, 0);
                    // Ragged bottom
                    ctx.lineTo(obs.x + 20, obs.y + 30 + Math.sin(this.time*5)*5);
                    ctx.lineTo(obs.x + 10, obs.y + 35 - Math.sin(this.time*5)*5);
                    ctx.lineTo(obs.x, obs.y + 40);
                    ctx.lineTo(obs.x - 10, obs.y + 35 - Math.sin(this.time*5)*5);
                    ctx.lineTo(obs.x - 20, obs.y + 30 + Math.sin(this.time*5)*5);
                    ctx.fill();
                    
                    // Glowing Eyes
                    ctx.fillStyle = (obs.state === 'patrol') ? "#000" : "#ff0000";
                    ctx.beginPath();
                    ctx.arc(obs.x - 8, obs.y - 5, 3, 0, Math.PI*2);
                    ctx.arc(obs.x + 8, obs.y - 5, 3, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.restore();
                }
            }
            else if (obs.type === 'statue') {
                // Stone Statue Texture
                let sGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.w, obs.y);
                sGrad.addColorStop(0, "#999");
                sGrad.addColorStop(0.5, "#bbb");
                sGrad.addColorStop(1, "#777");
                ctx.fillStyle = sGrad;
                
                // Body
                ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                // Head (simple block)
                ctx.fillRect(obs.x + 5, obs.y - 15, obs.w - 10, 15);
                
                // Projectiles
                ctx.fillStyle = "#fff";
                ctx.shadowColor = "white";
                ctx.shadowBlur = 5;
                for (let p of obs.projectiles) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
            }
            else if (obs.type === 'collapse') {
                if (obs.state !== 'fallen') {
                    // Cracking Stone Texture
                    ctx.fillStyle = "#8d6e63"; // Brownish stone
                    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    
                    ctx.strokeStyle = "#3e2723";
                    ctx.lineWidth = 2;
                    // Draw cracks
                    ctx.beginPath();
                    ctx.moveTo(obs.x + 20, obs.y);
                    ctx.lineTo(obs.x + 40, obs.y + 20);
                    ctx.lineTo(obs.x + 60, obs.y + 5);
                    ctx.stroke();
                    
                    if (obs.state === 'shaking') {
                        ctx.fillStyle = "rgba(255,0,0,0.2)"; // Warning tint
                        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
                    }
                }
            }
            else if (obs.type === 'stalactite') {
                if (obs.state !== 'gone') {
                    // Rocky Texture
                    let stGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.w, obs.y);
                    stGrad.addColorStop(0, "#3e2723");
                    stGrad.addColorStop(0.5, "#5d4037");
                    stGrad.addColorStop(1, "#271c19");
                    ctx.fillStyle = stGrad;
                    
                    ctx.beginPath();
                    ctx.moveTo(obs.x, obs.y);
                    ctx.lineTo(obs.x + obs.w, obs.y);
                    // Irregular point
                    ctx.lineTo(obs.x + obs.w*0.7, obs.y + obs.h*0.6);
                    ctx.lineTo(obs.x + obs.w*0.5, obs.y + obs.h);
                    ctx.lineTo(obs.x + obs.w*0.3, obs.y + obs.h*0.6);
                    ctx.fill();
                }
            }
            else if (obs.type === 'swing') {
                // Chain
                ctx.strokeStyle = "#555";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                // Links (detail)
                ctx.fillStyle = "#333";
                const steps = 10;
                const dx = (obs.bx - obs.cx) / steps;
                const dy = (obs.by - obs.cy) / steps;
                for(let i=0; i<steps; i++) {
                    ctx.beginPath();
                    ctx.arc(obs.cx + dx*i, obs.cy + dy*i, 3, 0, Math.PI*2);
                    ctx.fill();
                }

                // Candelabra Head
                ctx.fillStyle = "#aaa"; 
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by, 15, 0, Math.PI*2);
                ctx.fill();
                
                // Blue Flame with flicker
                const flicker = Math.random() * 5;
                let fGrad = ctx.createRadialGradient(obs.bx, obs.by - 20, 2, obs.bx, obs.by - 20, 15 + flicker);
                fGrad.addColorStop(0, "white");
                fGrad.addColorStop(0.3, "cyan");
                fGrad.addColorStop(1, "rgba(0,0,255,0)");
                
                ctx.fillStyle = fGrad; 
                ctx.beginPath();
                ctx.arc(obs.bx, obs.by - 20, 15 + flicker, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
};