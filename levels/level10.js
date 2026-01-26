window.Level10 = {
    engine: null,
    targetX: 9000,
    player: null,
    cameraX: 0,
    time: 0,
    
    // Level Data
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null,
    
    // Enemy System
    spirits: [],
    projectiles: [],
    
    // Visuals
    particles: [],
    torches: [],
    banners: [],
    
    // State
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0, 
    bridgeSpawned: false,
    transitioningToBoss: false,
    
    // --- NEW FLAG ---
    bossDefeated: false, // Tracks if we killed the boss in the other file

    // --- PAUSE MENU STATE ---
    paused: false,
    pauseButtons: [],
    boundInputHandlers: {}, // Store handlers to remove them later
    
    // --- BACKGROUND MUSIC ---
    audioElement: null,
    armorImage: null,

    // --- SPRITE ASSETS (From Level 7) ---
    demonSprite: [
        [0,0,0,3,0,0,0,0,3,0,0,0],
        [0,0,3,1,3,0,0,3,1,3,0,0],
        [0,3,1,1,1,3,3,1,1,1,3,0],
        [0,3,1,1,1,1,1,1,1,1,3,0],
        [0,1,1,2,1,1,1,1,2,1,1,0], 
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [3,1,1,4,4,4,4,4,4,1,1,3],
        [3,1,1,1,1,1,1,1,1,1,1,3],
        [0,3,1,1,1,1,1,1,1,1,3,0],
        [0,0,3,1,1,1,1,1,1,3,0,0],
        [0,0,0,3,1,3,3,1,3,0,0,0],
        [0,0,0,0,3,0,0,3,0,0,0,0]
    ],
    
    spriteColors: {
        1: '#331111', 
        2: '#ffffff', 
        3: '#110000', 
        4: '#ff4400'  
    },

    init: function(engine) {
        this.engine = engine;
        console.log("Level 10 Initialized: The Final Trial");
        this.bridgeSpawned = false;
        this.transitioningToBoss = false;
        this.bossDefeated = false;
        this.generateAtmosphere();
        this.playBackgroundMusic('/music-assets/level10.ogg');

        // Load armor mob image
        this.armorImage = new Image();
        this.armorImage.src = '/image-assets/ghost.png';

        // Initialize Pause Menu Inputs
        this.setupPauseInput();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                // If we are returning from boss, don't reset position if already set
                if (!this.player) {
                    this.player = new window.LevelCharacter(100, 600);
                }
                this.setupLevel();
            } else {
                console.error("Critical: LevelCharacter failed to load.");
            }
        });
    },

    // --- PAUSE MENU LOGIC ---
    setupPauseInput: function() {
        // Define Buttons
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const btnW = 200;
        const btnH = 50;
        const startY = cy - 50;

        this.pauseButtons = [
            { id: 'resume', label: 'RESUME', x: cx - btnW/2, y: startY, w: btnW, h: btnH, hover: false },
            { id: 'home',   label: 'HOME',   x: cx - btnW/2, y: startY + 70, w: btnW, h: btnH, hover: false },
        ];

        // Bind and store handlers so we can remove them in cleanup()
        this.boundInputHandlers.keydown = (e) => {
            if (e.key === 'Tab') {
                // MODIFIED: Only allow PAUSING via Tab. Resuming is blocked here.
                if (!this.paused) {
                    this.paused = true;
                    // Reset hover states when opening
                    this.pauseButtons.forEach(b => b.hover = false);
                }
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

        // Attach Listeners
        window.addEventListener('keydown', this.boundInputHandlers.keydown);
        window.addEventListener('mousemove', this.boundInputHandlers.mousemove);
        window.addEventListener('mousedown', this.boundInputHandlers.mousedown);
    },

    cleanup: function() {
        // CRITICAL: Remove listeners when level is unloaded to prevent memory leaks/double inputs
        if (this.boundInputHandlers.keydown) window.removeEventListener('keydown', this.boundInputHandlers.keydown);
        if (this.boundInputHandlers.mousemove) window.removeEventListener('mousemove', this.boundInputHandlers.mousemove);
        if (this.boundInputHandlers.mousedown) window.removeEventListener('mousedown', this.boundInputHandlers.mousedown);
        document.body.style.cursor = 'default';
        
        // Stop background music
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
            // Reloading is the cleanest way to reset the Engine and GameMenu state
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
        // Stop any existing audio
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        
        // Create and play new audio
        this.audioElement = new Audio(filename);
        this.audioElement.loop = true;
        this.audioElement.volume = 1.0;
        this.audioElement.play().catch(err => console.log("Audio autoplay prevented or error:", err));
    },

    setupLevel: function() {
        this.platforms = [];
        this.obstacles = [];
        this.spirits = [];
        this.projectiles = [];
        this.checkpoints = [];
        
        // Only reset if not returning from victory
        if (!this.bossDefeated) {
            this.bridgeSpawned = false;
        } else {
            // Keep bridge if boss is dead
            this.bridgeSpawned = true;
        }

        // --- SECTION 1: The Iron Foothills ---
        this.platforms.push({ x: 0, y: 700, w: 600, h: 200, type: 'ground' });
        this.obstacles.push({ type: 'lava_jet', x: 200, y: 900, h: 300, timer: 50, interval: 120, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 300, y: 900, h: 300, timer: 50, interval: 120, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 400, y: 900, h: 300, timer: 0, interval: 120, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 500, y: 900, h: 300, timer: 0, interval: 120, state: 'idle' });

        this.platforms.push({ x: 700, y: 650, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 900, y: 550, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 1100, y: 450, w: 100, h: 20, type: 'floating' });
        this.obstacles.push({ type: 'swing_blade', cx: 900, cy: 100, length: 400, speed: 0.05, angle: 0, range: 0.8 });

        // --- SECTION 2: The Spirit Bridge ---
        this.platforms.push({ x: 1300, y: 450, w: 200, h: 400, type: 'stone' });
        this.checkpoints.push({ x: 1400, y: 450, active: false, id: 1 });
        this.platforms.push({ x: 1600, y: 500, w: 80, h: 20, type: 'bridge' });
        this.platforms.push({ x: 1800, y: 500, w: 80, h: 20, type: 'bridge' });
        this.platforms.push({ x: 2000, y: 500, w: 80, h: 20, type: 'bridge' });
        this.spawnSpirit(1900, 200, 600);
        this.spawnSpirit(2100, 200, 600);

        // --- SECTION 3: The Gauntlet ---
        this.platforms.push({ x: 2200, y: 500, w: 1500, h: 20, type: 'bridge' });
        this.obstacles.push({ type: 'swing_blade', cx: 2400, cy: 220, length: 250, speed: 0.04, angle: 0, range: 0.85 });
        this.obstacles.push({ type: 'swing_blade', cx: 2700, cy: 220, length: 250, speed: 0.05, angle: 1.0, range: 0.9 });
        this.obstacles.push({ type: 'swing_blade', cx: 3000, cy: 220, length: 250, speed: 0.04, angle: 2.0, range: 1.0 });
        this.obstacles.push({ type: 'swing_blade', cx: 3300, cy: 220, length: 250, speed: 0.04, angle: 2.0, range: 1.0 });
        
        this.spawnSpirit(2600, 100, 600); this.spawnSpirit(2630, 100, 600);
        this.spawnSpirit(2700, 100, 600); this.spawnSpirit(2750, 100, 600);
        this.spawnSpirit(2775, 100, 600); this.spawnSpirit(2800, 100, 600);
        this.spawnSpirit(2850, 100, 600); this.spawnSpirit(2900, 100, 600);
        this.spawnSpirit(2950, 100, 600); this.spawnSpirit(2975, 100, 600);

        // --- CHECKPOINT 2 ---
        this.platforms.push({ x: 3800, y: 500, w: 300, h: 400, type: 'stone' });
        this.checkpoints.push({ x: 3900, y: 500, active: false, id: 2 });

        // --- SECTION 4: The Vertical Descent ---
        this.platforms.push({ x: 4400, y: 500, w: 100, h: 20, type: 'floating' });
        this.platforms.push({ x: 4200, y: 600, w: 100, h: 20, type: 'floating' });
        this.obstacles.push({ 
            type: 'armor', x: 4400, y: 450, range: 50, baseSpeed: 1.5, 
            aggroRadius: 250, aggroSpeed: 3, cooldown: 0, 
            startX: 4400, dir: 1, state: 'patrol', hp: 3 
        });

        // --- SECTION 5: The Soul Corridor ---
        for(let i=0; i<11; i++) {
            this.platforms.push({ 
                x: 4600 + (i * 200), 
                y: 500 + (Math.sin(i)*100), 
                w: 60, h: 20, 
                type: 'bridge' 
            });
        }
        this.spawnSpirit(5000, 100, 800);
        this.spawnSpirit(5600, 100, 800);

        // --- FINAL SECTION: ARENA (No Boss yet, just spirits) ---
        this.platforms.push({ x: 6800, y: 600, w: 1800, h: 400, type: 'ground' });
        
        // Spirits spawned on top of the arena
        // (Removed if boss defeated to make it safe)
        if (!this.bossDefeated) {
            this.spawnSpirit(7200, 100, 600); this.spawnSpirit(7230, 100, 600);
            this.spawnSpirit(7300, 100, 600); this.spawnSpirit(7350, 100, 600);
            this.spawnSpirit(7375, 100, 600); this.spawnSpirit(7400, 100, 600);
            this.spawnSpirit(7450, 100, 600); this.spawnSpirit(7500, 100, 600);
            this.spawnSpirit(7550, 100, 600); this.spawnSpirit(7575, 100, 600);
        }

        this.obstacles.push({ type: 'lava_jet', x: 7200, y: 900, h: 500, timer: 0, interval: 200, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 7600, y: 900, h: 500, timer: 100, interval: 200, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 8000, y: 900, h: 500, timer: 50, interval: 200, state: 'idle' });

        // Decor
        this.torches.push({ x: 1500, y: 400 });
        this.torches.push({ x: 2400, y: 400 });
        this.torches.push({ x: 3900, y: 450 });
        this.torches.push({ x: 7500, y: 550 });

        // Force Bridge if boss is already defeated (safe check)
        if (this.bossDefeated) {
            this.platforms.push({ x: 8600, y: 600, w: 400, h: 20, type: 'bridge' });
            this.bridgeSpawned = true;
        }
    },

    spawnSpirit: function(x, y, aggroRange, hp = 30) {
        this.spirits.push({
            x: x, y: y, startY: y, state: 'idle', timer: 0, hp: hp,
            aggroRange: aggroRange, trail: [], frameOffset: Math.random() * 1000
        });
    },

    generateAtmosphere: function() {
        this.particles = [];
        for(let i=0; i<80; i++) {
            this.particles.push({
                x: Math.random() * 2000, y: Math.random() * 800, size: Math.random() * 2,
                speedX: -(Math.random() * 1 + 0.5), speedY: Math.random() * 0.5 - 0.25,
                color: '#aa4433', alpha: Math.random() * 0.5
            });
        }
    },

    update: function() {
        // --- PAUSE LOGIC ---
        if (this.paused) {
            // When paused, we do NOT update game entities.
            // We only need to ensure the menu renders.
            return; 
        }

        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;
        if (this.shake > 0) this.shake--;

        if (!this.player) return;

        this.player.update();

        // Checkpoints
        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
                this.playSound('checkpoint');
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
                }
            }
        }

        // Death Check
        if (this.player.y > 1000 || this.player.hp <= 0) {
            this.playSound('fall');
            this.player.hp = 0;
            this.resetPlayer();
        }

        // --- BRIDGE SPAWNING LOGIC ---
        // Spawn bridge if spirits are dead OR if we already beat the boss
        if ((this.spirits.length === 0 || this.bossDefeated) && !this.bridgeSpawned) {
             this.platforms.push({ x: 8600, y: 600, w: 400, h: 20, type: 'bridge' });
             this.bridgeSpawned = true;
             console.log("Bridge Spawned.");
             this.playSound('checkpoint'); 
             this.shake = 10;
        }

        // --- DOOR LOGIC (TargetX = 9000) ---
        if (this.player.x >= this.targetX) {
             if (!this.bossDefeated) {
                 // CASE A: Boss not dead yet -> Go to Boss Level
                 if (!this.transitioningToBoss) {
                     this.transitioningToBoss = true;
                     console.log("Entering Boss Arena...");
                     this.loadBossLevel();
                 }
             } else {
                 // CASE B: Boss is dead -> Game End
                 console.log("Final Freedom Reached!");
                 if (this.engine && this.engine.handleContentComplete) {
                     this.engine.handleContentComplete();
                 }
             }
        }

        // Physics & Collision
        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pL = this.player.x + hitbox.offsetX;
        let pR = pL + hitbox.width;
        let pT = this.player.y + hitbox.offsetY;
        let pB = pT + hitbox.height;

        let groundLevel = 2000;
        
        for (let plat of this.platforms) {
            if (pR > plat.x && pL < plat.x + plat.w &&
                pB > plat.y && pT < plat.y + plat.h) {
                const floorThreshold = plat.y + Math.max(15, this.player.vy + 5);
                if (pB > floorThreshold) {
                    const overlapL = pR - plat.x;
                    const overlapR = (plat.x + plat.w) - pL;
                    if (overlapL < overlapR) this.player.x -= overlapL;
                    else this.player.x += overlapR;
                    this.player.vx = 0;
                    pL = this.player.x + hitbox.offsetX;
                    pR = pL + hitbox.width;
                }
            }
            if (pR > plat.x && pL < plat.x + plat.w) {
                 if (pB <= plat.y + 35 && this.player.vy >= 0) {
                     if (plat.y < groundLevel) groundLevel = plat.y;
                 }
            }
        }
        this.player.groundY = groundLevel;

        this.updateObstacles(pL, pR, pT, pB);
        this.updateSpirits(pL, pR, pT, pB);
        this.updateProjectiles(pL, pR, pT, pB);

        // Camera
        let targetCam = this.player.x - 300;
        let camY = 0;
        if (this.player.y < 300) camY = (this.player.y - 300) * 0.8;
        this.cameraX += (targetCam - this.cameraX) * 0.1;
        if (this.cameraX < 0) this.cameraX = 0;
    },

    loadBossLevel: function() {
        // Create and append the new script dynamically
        const script = document.createElement('script');
        script.src = 'levels/level10boss.js';
        
        script.onload = () => {
            if (window.Level10Boss) {
                console.log("Boss Script Loaded. Teleporting...");
                
                // Directly hijack the Engine's current module
                if (this.engine) {
                    this.engine.currentModule = window.Level10Boss;
                    
                    // Initialize the new boss level
                    if (window.Level10Boss.init) window.Level10Boss.init(this.engine);
                    if (window.Level10Boss.load) window.Level10Boss.load();
                }
            } else {
                console.error("level10boss.js loaded, but window.Level10Boss object is missing!");
            }
        };

        script.onerror = () => {
            console.error("Error loading level10boss.js. Make sure the file exists!");
            this.transitioningToBoss = false; // Allow retry if it failed
        };
        
        document.body.appendChild(script);
    },

    updateObstacles: function(pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2; 
        this.obstacles = this.obstacles.filter(o => !o.dead);

        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                const time = this.time * 20; 
                const currentAngle = Math.sin(time * obs.speed + obs.angle) * obs.range;
                const bx = obs.cx + Math.sin(currentAngle) * obs.length;
                const by = obs.cy + Math.cos(currentAngle) * obs.length;
                obs.bx = bx; obs.by = by;
                const bladeCenterX = obs.cx + Math.sin(currentAngle) * (obs.length + 30);
                const bladeCenterY = obs.cy + Math.cos(currentAngle) * (obs.length + 30);
                if (Math.hypot(cx - bladeCenterX, cy - bladeCenterY) < 45) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(25, (cx > bx ? 1 : -1));
                        this.playSound('clank');
                        this.shake = 5;
                     }
                }
            }
            else if (obs.type === 'lava_jet') {
                obs.timer++;
                if (obs.timer > obs.interval) obs.timer = 0;
                if (obs.timer > (obs.interval - 40)) {
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h)) {
                         if (!this.player.isStunned) {
                             this.player.takeDamage(35, (this.player.facingRight ? -1 : 1));
                             this.player.vy = -12;
                         }
                    }
                }
            }
            else if (obs.type === 'armor') {
                if (obs.hp <= 0) continue;
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.aggroRadius) {
                     const dir = (cx > obs.x) ? 1 : -1;
                     obs.x += dir * obs.aggroSpeed;
                     obs.dir = dir;
                } else {
                     obs.x += obs.dir * obs.baseSpeed;
                     if (Math.abs(obs.x - obs.startX) > obs.range) obs.dir *= -1;
                }
                // Collision (Hitbox matches image dimensions: 80x108, so half-width=40, half-height=54)
                if (Math.abs(cx - obs.x) < 40 && Math.abs(cy - obs.y) < 54) {
                    if (this.player.isAttacking) {
                        obs.hp--;
                        this.playSound('hit');
                        obs.x += (this.player.facingRight ? 10 : -10);
                        if (obs.hp <= 0) obs.dead = true;
                    } else if (!this.player.isStunned) {
                        this.player.takeDamage(20, (cx > obs.x ? 1 : -1));
                    }
                }
            }
        }
    },

    updateSpirits: function(pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2;
        this.spirits = this.spirits.filter(s => s.hp > 0);

        for (let s of this.spirits) {
            const dist = Math.hypot(cx - s.x, cy - s.y);
            if (s.state === 'chasing' || s.state === 'charging') {
                 s.trail.unshift({ x: s.x, y: s.y, opacity: 0.5 });
                 if (s.trail.length > 5) s.trail.pop();
            }
            s.trail.forEach(t => t.opacity -= 0.05);
            s.trail = s.trail.filter(t => t.opacity > 0);

            if (s.state === 'idle') {
                s.y = s.startY + Math.sin(this.time * 2 + s.frameOffset * 0.01) * 10;
                if (dist < s.aggroRange) s.state = 'chasing';
            } 
            else if (s.state === 'chasing') {
                const targetX = cx + (s.x > cx ? 200 : -200);
                const targetY = cy - 100;
                s.x += (targetX - s.x) * 0.03;
                s.y += (targetY - s.y) * 0.03;
                s.timer++;
                if (s.timer > 80) { s.state = 'charging'; s.timer = 0; }
            }
            else if (s.state === 'charging') {
                s.timer++; 
                if (s.timer > 40) { s.state = 'firing'; s.timer = 0; }
            }
            else if (s.state === 'firing') {
                this.projectiles.push({
                    x: s.x, y: s.y,
                    vx: (cx - s.x) * 0.04, vy: (cy - s.y) * 0.04,
                    life: 150, trail: [] 
                });
                this.playSound('shoot');
                s.state = 'cooldown';
                s.timer = 0;
            }
            else if (s.state === 'cooldown') {
                s.timer++;
                if (s.timer > 100) { s.state = 'chasing'; s.timer = 0; }
            }

            if (this.player.isAttacking) {
                if (Math.hypot(cx - s.x, cy - s.y) < 50) {
                    s.hp -= 10;
                    this.playSound('hit');
                    s.x += (this.player.facingRight ? 20 : -20);
                }
            }
        }
    },

    updateProjectiles: function(pL, pR, pT, pB) {
        const cx = pL + (pR - pL)/2; 
        const cy = pT + (pB - pT)/2;
        this.projectiles = this.projectiles.filter(p => p.life > 0);
        for (let p of this.projectiles) {
            p.trail.unshift({x: p.x, y: p.y});
            if (p.trail.length > 5) p.trail.pop();
            p.x += p.vx; p.y += p.vy; p.life--;
            if (Math.hypot(cx - p.x, cy - p.y) < 25) {
                if (!this.player.isStunned) {
                    this.player.takeDamage(15, (cx > p.x ? 1 : -1));
                    p.life = 0;
                }
            }
        }
    },

    resetPlayer: function() {
        if (this.activeCheckpoint) {
            this.player.x = this.activeCheckpoint.x;
            this.player.y = this.activeCheckpoint.y - 60;
            this.player.hp = Math.floor(this.player.maxHp * 0.75);
        } else {
            this.player.x = 100;
            this.player.y = 600;
            this.player.hp = this.player.maxHp;
        }
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.player.isStunned = false;
        this.flashIntensity = 0.5;
        this.shake = 5;
        this.projectiles = [];
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    // --- RENDER FUNCTIONS ---

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // Background
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#000510"); 
        grd.addColorStop(0.5, "#0a0a20"); 
        grd.addColorStop(1, "#000000"); 
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        this.renderAtmosphere(ctx);
        ctx.restore();

        ctx.save();
        
        // Shake
        let shakeX = 0, shakeY = 0;
        if (this.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.shake;
            shakeY = (Math.random() - 0.5) * this.shake;
        }

        let camY = 0;
        if (this.player && this.player.y < 300) camY = (300 - this.player.y) * 0.5;
        ctx.translate(-this.cameraX + shakeX, camY + shakeY);

        // Banners
        this.banners.forEach(b => {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.x + 30, b.y);
            ctx.lineTo(b.x + 30, b.y + 80);
            ctx.lineTo(b.x + 15, b.y + 60);
            ctx.lineTo(b.x, b.y + 80);
            ctx.fill();
        });

        // Platforms
        for (let plat of this.platforms) {
            if (plat.type === 'bridge') {
                ctx.fillStyle = "#3e2723"; 
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(plat.x, plat.y, plat.w, 4); 
                ctx.fillStyle = "#281a16";
                for(let i=0; i<plat.w; i+=15) ctx.fillRect(plat.x + i, plat.y, 2, plat.h);
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#37474f";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowColor = "#00e5ff";
                ctx.shadowBlur = 10;
                ctx.strokeStyle = "#00e5ff"; 
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = "#212121";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        // Torches
        this.torches.forEach(t => {
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 60);
            glow.addColorStop(0, "rgba(0, 229, 255, 0.5)"); 
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 60, t.y - 60, 120, 120);
            ctx.fillStyle = "#00e5ff";
            ctx.beginPath();
            ctx.arc(t.x, t.y - 5, 3 + Math.random() * 3, 0, Math.PI*2);
            ctx.fill();
        });

        // Checkpoints
        this.checkpoints.forEach(cp => {
            ctx.fillStyle = cp.active ? "#00ffaa" : "#444"; 
            ctx.fillRect(cp.x - 2, cp.y - 50, 4, 50); 
            ctx.beginPath();
            ctx.moveTo(cp.x, cp.y - 50);
            ctx.lineTo(cp.x + 30, cp.y - 45);
            ctx.lineTo(cp.x, cp.y - 40);
            ctx.fill();
        });
        
        // --- EXIT GATE RENDER ---
        this.renderExitGate(ctx);

        this.renderObstacles(ctx);
        this.renderSpirits(ctx);
        this.renderProjectiles(ctx);

        if (this.player) this.player.render(ctx);

        ctx.restore();

        // UI
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(0, 200, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        // --- RENDER PAUSE MENU ---
        if (this.paused) {
            this.renderPauseMenu(ctx);
            return; // Skip normal UI rendering
        }

        if (this.player) {
            const maxHp = this.player.maxHp || 100;
            const curHp = Math.max(0, this.player.hp);
            const pct = curHp / maxHp;

            ctx.fillStyle = "#000";
            ctx.fillRect(20, 50, 204, 20);
            ctx.strokeStyle = "#00e5ff"; 
            ctx.strokeRect(20, 50, 204, 20);

            ctx.fillStyle = pct > 0.5 ? "#00e5ff" : (pct > 0.25 ? "#aa00ff" : "#ff0055"); 
            ctx.fillRect(22, 52, 200 * pct, 16);

            ctx.fillStyle = "#fff";
            ctx.font = "12px monospace";
            ctx.fillText(`SOUL: ${Math.ceil(curHp)}`, 230, 64);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 10: The Final Trial", 20, 30);
    },

    renderPauseMenu: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 1. Dark Overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, w, h);

        // 2. Title
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 36px monospace';
        ctx.fillText("GAME PAUSED", w/2, h/2 - 120);

        // 3. Buttons
        ctx.font = 'bold 24px monospace';
        for(let btn of this.pauseButtons) {
            ctx.save();
            
            // Draw Button Body
            ctx.fillStyle = btn.hover ? '#6d4c41' : '#4e342e'; 
            ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            
            // Border
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#3e2723';
            ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

            // Text
            ctx.fillStyle = btn.hover ? '#ffffff' : '#d7ccc8';
            ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h/2 + 8);

            ctx.restore();
        }
        
        // Reset Alignment for next frame
        ctx.textAlign = 'left'; 
    },
    
    renderExitGate: function(ctx) {
        const doorX = 9000;
        const doorY = 600;
        
        ctx.fillStyle = "#111";
        ctx.fillRect(doorX, doorY - 140, 100, 140);
        
        const pulse = Math.sin(this.time * 2) * 0.2 + 0.8;
        const grad = ctx.createLinearGradient(0, doorY, 0, doorY - 120);
        
        // Change color based on completion
        if (this.bossDefeated) {
            grad.addColorStop(0, `rgba(0, 255, 100, ${pulse})`); // Green for freedom
        } else {
            grad.addColorStop(0, `rgba(255, 68, 0, ${pulse})`); // Red for danger/boss
        }
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(doorX + 10, doorY - 130, 80, 130);
        
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = this.bossDefeated ? "#00ff00" : "#ff4400";
        ctx.shadowBlur = 10;
        
        if (this.bossDefeated) {
            ctx.fillText("FREEDOM", doorX + 50, doorY - 160);
            ctx.fillText("Escape >", doorX + 50, doorY - 140);
        } else {
            ctx.fillText("FREEDOM", doorX + 50, doorY - 160);
            ctx.fillText("Enter >", doorX + 50, doorY - 140);
        }
        ctx.restore();
    },

    renderAtmosphere: function(ctx) {
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0) {
                p.x = ctx.canvas.width + Math.random() * 200;
                p.y = Math.random() * ctx.canvas.height;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, p.size * 4, p.size);
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                ctx.strokeStyle = "#888";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                ctx.fillStyle = "#eee"; 
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(-25, 50); ctx.lineTo(0, 70); ctx.lineTo(25, 50);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (obs.type === 'lava_jet') {
                 if (obs.timer > (obs.interval - 40)) {
                    const h = obs.h * 1.0; 
                    const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y - h);
                    grad.addColorStop(0, "rgba(0, 0, 0, 0.8)");
                    grad.addColorStop(0.5, "rgba(100, 0, 255, 0.6)");
                    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
                    ctx.fillStyle = grad;
                    ctx.fillRect(obs.x, obs.y - h, 30, h);
                 }
            } else if (obs.type === 'armor') {
                if (obs.dead) return;
                // Draw ghost.png image with size (80x108) but keep hitbox same
                if (this.armorImage && this.armorImage.complete) {
                    ctx.drawImage(this.armorImage, obs.x - 40, obs.y - 40, 80, 90);
                } else {
                    // Fallback if image not loaded
                    ctx.fillStyle = "#555";
                    ctx.fillRect(obs.x - 10, obs.y - 20, 20, 40);
                }
            }
        }
    },

    renderSpirits: function(ctx) {
        const SCALE = 3; 
        
        for (let s of this.spirits) {
            let sx = 0, sy = 0;
            if (s.state === 'charging') {
                const intensity = (s.timer / 40) * 6; 
                sx = (Math.random() - 0.5) * intensity;
                sy = (Math.random() - 0.5) * intensity;
            }

            s.trail.forEach(t => {
                this.drawPixelSprite(ctx, t.x + sx, t.y + sy, SCALE, t.opacity * 0.4, true); 
            });

            this.drawPixelSprite(ctx, s.x + sx, s.y + sy, SCALE, 1.0, false, s.state === 'charging');
        }
    },

    drawPixelSprite: function(ctx, x, y, scale, opacity, ghostMode, isCharging) {
        ctx.save();
        ctx.translate(x - (12 * scale)/2, y - (12 * scale)/2); 
        ctx.globalAlpha = opacity;

        if (isCharging) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff4400';
        }

        const colors = this.spriteColors;
        const sprite = this.demonSprite;

        for (let r = 0; r < 12; r++) {
            for (let c = 0; c < 12; c++) {
                const val = sprite[r][c];
                if (val !== 0) {
                    ctx.fillStyle = ghostMode ? colors[4] : colors[val];
                    
                    if (val === 2 && isCharging) {
                         ctx.fillStyle = '#fff';
                         ctx.shadowBlur = 15;
                         ctx.shadowColor = '#ff4400';
                    }

                    ctx.fillRect(c * scale, r * scale, scale, scale);
                    ctx.shadowBlur = 0; 
                }
            }
        }
        ctx.restore();
    },

    renderProjectiles: function(ctx) {
        for (let p of this.projectiles) {
            p.trail.forEach((t, i) => {
                 ctx.fillStyle = `rgba(255, 68, 0, ${0.4 - i * 0.1})`; 
                 ctx.fillRect(t.x - 4, t.y - 4, 8, 8);
            });

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = "#fff";
            ctx.shadowColor = "#ff4400";
            ctx.shadowBlur = 10;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        }
    }
};
