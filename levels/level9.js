window.Level9 = {
    engine: null,
    targetX: 15500, // EXTENDED: Brutal length
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

    // --- PAUSE MENU STATE ---
    paused: false,
    pauseButtons: [],
    boundInputHandlers: {}, // Store handlers to remove them later

    // --- SPRITE ASSETS (Hardcoded Copy) ---
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
    
    // Palette (Darker, Oppressive)
    spriteColors: {
        1: '#0f1a2a', // Darker Navy
        2: '#cccccc', // Dimmed White
        3: '#000a11', // Deeper Void
        4: '#008899'  // Muted Cyan
    },
    
    // --- BACKGROUND MUSIC ---
    audioElement: null,
    armorImage: null,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 9 Initialized: I Give Up! (Brutal)");
        this.generateAtmosphere();
        this.playBackgroundMusic('/music-assets/level9.ogg');

        // Load armor mob image
        this.armorImage = new Image();
        this.armorImage.src = '/image-assets/ghost.png';

        // Initialize Pause Menu Inputs
        this.setupPauseInput();
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
        this.torches = [];
        this.banners = [];

        // ============================================================
        // ZONE 1: THE FALSE START (Immediate Pressure)
        // ============================================================
        this.platforms.push({ x: 0, y: 700, w: 500, h: 200, type: 'ground' });
        // Banner color dimmed
        this.banners.push({ x: 300, y: 550, color: '#556677' });

        // Immediate Hazard: Spirit flies in early
        this.spawnSpirit(600, 100, 800);

        // ============================================================
        // ZONE 2: THE TIGHT SWITCHBACKS (Vertical Ascent + Harassment)
        // ============================================================
        // Step 1
        this.platforms.push({ x: 600, y: 600, w: 80, h: 20, type: 'stone' }); // Smaller
        
        // Hazard: Guard on a small platform (Faster)
        this.platforms.push({ x: 800, y: 500, w: 150, h: 20, type: 'stone' });
        this.obstacles.push({ 
            type: 'armor', x: 875, y: 450, range: 60, baseSpeed: 2, 
            aggroRadius: 300, aggroSpeed: 4, cooldown: 0, 
            startX: 875, dir: 1, state: 'patrol', hp: 5 
        });

        // Step 2 (Higher - Gap is wider)
        this.platforms.push({ x: 650, y: 400, w: 80, h: 20, type: 'floating' });
        this.platforms.push({ x: 500, y: 300, w: 80, h: 20, type: 'floating' });
        
        // Hazard: TWO Lava Jets blocking the vertical jump (Alternating)
        this.obstacles.push({ type: 'lava_jet', x: 580, y: 450, h: 200, timer: 0, interval: 120, state: 'idle' }); 
        this.obstacles.push({ type: 'lava_jet', x: 620, y: 450, h: 200, timer: 60, interval: 120, state: 'idle' });

        // Step 3 (The Crossing) - Added a Swing Blade to the platform
        this.platforms.push({ x: 800, y: 250, w: 300, h: 20, type: 'bridge' });
        this.obstacles.push({ type: 'swing_blade', cx: 950, cy: 0, length: 200, speed: 0.06, angle: 1.5, range: 0.8 }); // Low sweep

        // Spirit Ambush (More aggressive)
        this.spawnSpirit(1000, 50, 500); 
        this.spawnSpirit(1100, 50, 500);

        // ============================================================
        // ZONE 3: THE WINDY GAPS (Tiny Footholds)
        // ============================================================
        // Platform 1 (Tiny)
        this.platforms.push({ x: 1250, y: 250, w: 60, h: 20, type: 'floating' });
        
        // Platform 2 (Guarded + Smaller)
        this.platforms.push({ x: 1450, y: 250, w: 120, h: 20, type: 'stone' });
        this.obstacles.push({ 
            type: 'armor', x: 1510, y: 200, range: 50, baseSpeed: 3, // Faster
            aggroRadius: 250, aggroSpeed: 6, cooldown: 0, 
            startX: 1510, dir: 1, state: 'patrol', hp: 4 
        });

        // Platform 3 (Swing Blade Danger - Larger Range)
        this.platforms.push({ x: 1700, y: 250, w: 60, h: 20, type: 'floating' });
        this.obstacles.push({ type: 'swing_blade', cx: 1730, cy: 0, length: 280, speed: 0.07, angle: 0, range: 1.2 });

        // ============================================================
        // CHECKPOINT 1 (The Small Ledge)
        // ============================================================
        this.platforms.push({ x: 1900, y: 250, w: 200, h: 400, type: 'stone' });
        this.checkpoints.push({ x: 2000, y: 250, active: false, id: 1 });
        this.torches.push({ x: 2050, y: 200 });

        // ============================================================
        // ZONE 4: THE SPIRE (Dense Blade Gauntlet)
        // ============================================================
        this.platforms.push({ x: 2300, y: 200, w: 60, h: 20, type: 'floating' });
        this.platforms.push({ x: 2400, y: 100, w: 60, h: 20, type: 'floating' });
        
        // The Gauntlet of Blades (Extended)
        this.platforms.push({ x: 2600, y: 50, w: 800, h: 20, type: 'bridge' });
        
        // 4 Blades instead of 3, overlapping timing
        this.obstacles.push({ type: 'swing_blade', cx: 2700, cy: -200, length: 250, speed: 0.05, angle: 0, range: 0.9 });
        this.obstacles.push({ type: 'swing_blade', cx: 2900, cy: -200, length: 250, speed: 0.055, angle: 1.5, range: 0.8 });
        this.obstacles.push({ type: 'swing_blade', cx: 3100, cy: -200, length: 250, speed: 0.06, angle: 3.0, range: 1.0 });
        this.obstacles.push({ type: 'swing_blade', cx: 3300, cy: -200, length: 250, speed: 0.05, angle: 0.5, range: 0.8 });

        // Spirit harassment during blades (Constant firing)
        this.spawnSpirit(3000, -100, 800);
        this.spawnSpirit(3200, -100, 800);

        // ============================================================
        // ZONE 5: THE PEAKS (Tiny Platforms + Upward Jets)
        // ============================================================
        this.platforms.push({ x: 3600, y: 50, w: 50, h: 20, type: 'floating' });
        this.platforms.push({ x: 3750, y: 0, w: 50, h: 20, type: 'floating' });
        this.platforms.push({ x: 3900, y: -50, w: 50, h: 20, type: 'floating' });
        
        // Lava Jets firing UP (Faster interval)
        this.obstacles.push({ type: 'lava_jet', x: 3700, y: 200, h: 300, timer: 0, interval: 100, state: 'idle' });
        this.obstacles.push({ type: 'lava_jet', x: 3850, y: 150, h: 300, timer: 50, interval: 100, state: 'idle' });

        // ============================================================
        // CHECKPOINT 2 (The Summit Camp - Smaller)
        // ============================================================
        this.platforms.push({ x: 4100, y: -100, w: 300, h: 500, type: 'stone' });
        this.checkpoints.push({ x: 4200, y: -100, active: false, id: 2 });
        // No banner, just oppressive emptiness

        // ============================================================
        // ZONE 6: THE DESCENT (No Control)
        // ============================================================
        this.platforms.push({ x: 4600, y: -50, w: 150, h: 20, type: 'stone' });
        this.obstacles.push({ 
            type: 'armor', x: 4675, y: -100, range: 60, baseSpeed: 3, 
            aggroRadius: 350, aggroSpeed: 6, cooldown: 0, 
            startX: 4675, dir: -1, state: 'patrol', hp: 6 
        });

        this.platforms.push({ x: 4850, y: 50, w: 80, h: 20, type: 'floating' });
        this.platforms.push({ x: 5000, y: 150, w: 80, h: 20, type: 'floating' });
        
        // Massive Swarm of Spirits
        this.spawnSpirit(4900, -200, 1000, 25);
        this.spawnSpirit(5050, -200, 1000, 25);
        this.spawnSpirit(4975, -300, 1000, 25);

        // ============================================================
        // ZONE 7: THE FINAL RIDGE (Bridge of Pain)
        // ============================================================
        this.platforms.push({ x: 5200, y: 250, w: 1200, h: 50, type: 'bridge' });
        
        // Lava Jet in the middle of the bridge (Forces movement)
        this.obstacles.push({ type: 'lava_jet', x: 5800, y: 250, h: 200, timer: 0, interval: 180, state: 'idle' });

        // Heavy guards (Overlap patrol)
        this.obstacles.push({ 
            type: 'armor', x: 5400, y: 200, range: 200, baseSpeed: 1.5, 
            aggroRadius: 400, aggroSpeed: 4, cooldown: 0, 
            startX: 5400, dir: 1, state: 'patrol', hp: 7 
        });
        this.obstacles.push({ 
            type: 'armor', x: 5900, y: 200, range: 200, baseSpeed: 1.5, 
            aggroRadius: 400, aggroSpeed: 4, cooldown: 0, 
            startX: 5900, dir: -1, state: 'patrol', hp: 7 
        });

        // Final Swing Blades (Faster)
        this.obstacles.push({ type: 'swing_blade', cx: 5600, cy: 0, length: 250, speed: 0.07, angle: 0, range: 1.0 });
        this.obstacles.push({ type: 'swing_blade', cx: 6100, cy: 0, length: 250, speed: 0.07, angle: 3.14, range: 1.0 });

        // Final Spirit Guardian
        this.spawnSpirit(6300, 50, 1200, 60);

        // ============================================================
        // ZONE 8: THE GUILLOTINE PEAKS (Repeated Brutality)
        // ============================================================
        
        // Connector
        this.platforms.push({ x: 6600, y: 250, w: 400, h: 200, type: 'ground' });
        
        // CHECKPOINT (The Halfway Rest - Less safe feeling)
        this.checkpoints.push({ x: 6800, y: 250, active: false, id: 4 });

        // Long corridor with restricted jump height
        this.platforms.push({ x: 7200, y: 250, w: 1200, h: 20, type: 'stone' });
        // Lower Ceiling
        this.platforms.push({ x: 7400, y: 120, w: 800, h: 50, type: 'stone' });

        // Very Dense Swing Blades
        this.obstacles.push({ type: 'swing_blade', cx: 7400, cy: -150, length: 350, speed: 0.06, angle: 0, range: 0.9 });
        this.obstacles.push({ type: 'swing_blade', cx: 7650, cy: -150, length: 350, speed: 0.07, angle: 1.0, range: 0.9 });
        this.obstacles.push({ type: 'swing_blade', cx: 7900, cy: -150, length: 350, speed: 0.06, angle: 2.0, range: 0.9 });
        this.obstacles.push({ type: 'swing_blade', cx: 8150, cy: -150, length: 350, speed: 0.07, angle: 3.0, range: 0.9 });
        
        // Armor Guard inside the blade zone (High pressure)
        this.obstacles.push({ 
            type: 'armor', x: 7800, y: 200, range: 80, baseSpeed: 2, 
            aggroRadius: 250, aggroSpeed: 5, cooldown: 0, 
            startX: 7800, dir: -1, state: 'patrol', hp: 6 
        });

        // ============================================================
        // CHECKPOINT 3 (The Frozen Outpost)
        // ============================================================
        this.platforms.push({ x: 8600, y: 250, w: 250, h: 400, type: 'stone' });
        this.checkpoints.push({ x: 8700, y: 250, active: false, id: 3 });
        this.torches.push({ x: 8750, y: 200 });

        // ============================================================
        // ZONE 9: THE VERTICAL DRAFT (Precision Climbing)
        // ============================================================
        
        // Step 1
        this.platforms.push({ x: 9000, y: 150, w: 60, h: 20, type: 'floating' });
        // Hazard: Fast Horizontal Jet
        this.obstacles.push({ type: 'lava_jet', x: 9100, y: 250, h: 200, timer: 0, interval: 80, state: 'idle' });

        // Step 2
        this.platforms.push({ x: 9200, y: 50, w: 60, h: 20, type: 'floating' });
        // Backtrack Jump (Harder distance)
        this.platforms.push({ x: 9050, y: -50, w: 60, h: 20, type: 'floating' });
        
        // Step 3 (High Ledge)
        this.platforms.push({ x: 9280, y: -150, w: 150, h: 20, type: 'stone' });
        
        // Spirit Swarm at altitude
        this.spawnSpirit(9200, -300, 800);
        this.spawnSpirit(9350, -300, 800);

        // ============================================================
        // ZONE 10: THE SILENT ARMORY (Arena of Death)
        // ============================================================
        
        this.platforms.push({ x: 9600, y: -150, w: 1200, h: 50, type: 'bridge' });
        
        // Three Elite Guards
        this.obstacles.push({ 
            type: 'armor', x: 9800, y: -200, range: 200, baseSpeed: 2, 
            aggroRadius: 400, aggroSpeed: 5, cooldown: 0, 
            startX: 9800, dir: 1, state: 'patrol', hp: 6 
        });
        this.obstacles.push({ 
            type: 'armor', x: 10200, y: -200, range: 200, baseSpeed: 2, 
            aggroRadius: 400, aggroSpeed: 5, cooldown: 0, 
            startX: 10200, dir: -1, state: 'patrol', hp: 6 
        });
        this.obstacles.push({ 
            type: 'armor', x: 10000, y: -200, range: 100, baseSpeed: 1, 
            aggroRadius: 300, aggroSpeed: 4, cooldown: 0, 
            startX: 10000, dir: 1, state: 'patrol', hp: 5 
        });
        
        // Upper Walkway
        this.platforms.push({ x: 9900, y: -300, w: 300, h: 20, type: 'floating' });
        // Guard on top + Spirit
        this.obstacles.push({ 
            type: 'armor', x: 10050, y: -350, range: 100, baseSpeed: 1, 
            aggroRadius: 300, aggroSpeed: 4, cooldown: 0, 
            startX: 10050, dir: 1, state: 'patrol', hp: 4 
        });
        this.spawnSpirit(10050, -400, 600, 40);

        // ============================================================
        // ZONE 11: THE EXHAUSTION RUN (New Brutal Section)
        // ============================================================
        // No ground, only floating platforms over void.
        
        // Sequence of tiny platforms
        for(let i=0; i<10; i++) {
            this.platforms.push({ 
                x: 11000 + (i*120), 
                y: -100 + Math.sin(i)*100, 
                w: 50, h: 20, type: 'floating' 
            });
            // Add a blade every other platform
            if (i % 2 === 1) {
                 this.obstacles.push({ 
                    type: 'swing_blade', 
                    cx: 11000 + (i*120) + 25, 
                    cy: -200 + Math.sin(i)*100, 
                    length: 200, speed: 0.05, angle: i, range: 0.8 
                });
            }
        }

        // ============================================================
        // FINAL DESCENT TO VICTORY
        // ============================================================
        this.platforms.push({ x: 12300, y: -50, w: 80, h: 20, type: 'floating' });
        this.platforms.push({ x: 12500, y: 50, w: 80, h: 20, type: 'floating' });
        
        // Final Platform
        this.platforms.push({ x: 12700, y: 250, w: 800, h: 200, type: 'ground' });
        this.targetX = 13500; // Adjusted target
        this.banners.push({ x: 13000, y: 100, color: '#00f2ff' });
    },

    spawnSpirit: function(x, y, aggroRange, hp = 30) {
        this.spirits.push({
            x: x, y: y, 
            startY: y,
            state: 'idle', 
            timer: 0, 
            hp: hp,
            aggroRange: aggroRange,
            trail: [],
            frameOffset: Math.random() * 1000
        });
    },

    generateAtmosphere: function() {
        // Oppressive Atmosphere: Darker, faster, more chaotic
        this.particles = [];
        for(let i=0; i<150; i++) { 
            this.particles.push({
                x: Math.random() * 2000, 
                y: Math.random() * 1200 - 400, 
                size: Math.random() * 3,
                speedX: -(Math.random() * 8 + 4), // Very fast wind
                speedY: Math.random() * 2 - 1,
                color: '#556677', // Greyish blue (depressing)
                alpha: Math.random() * 0.5
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
                // Heal less at checkpoint (Increased punishment)
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
                }
            }
        }

        // Death Check (Void)
        if (this.player.y > 900 || this.player.hp <= 0) {
            this.playSound('fall');
            this.player.hp = 0;
            this.resetPlayer();
        }

        // Win Condition
        if (this.player.x >= this.targetX) {
             console.log("Level 9 Complete!");
             if (this.engine && this.engine.handleContentComplete) {
                 this.engine.handleContentComplete();
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

        // Camera Logic
        let targetCam = this.player.x - 300;
        this.cameraX += (targetCam - this.cameraX) * 0.1;
        if (this.cameraX < 0) this.cameraX = 0;
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

                if (Math.hypot(cx - bx, cy - by) < 45) {
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
                // Active phase (Slightly longer active time)
                if (obs.timer > (obs.interval - 50)) {
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h) && pT < obs.y) {
                         if (!this.player.isStunned) {
                             this.player.takeDamage(35, (this.player.facingRight ? -1 : 1));
                             this.player.vy = -12;
                         }
                    }
                }
            }
            else if (obs.type === 'armor') {
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
                        obs.x += (this.player.facingRight ? 15 : -15);
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

            // Trail Logic
            if (s.state === 'chasing' || s.state === 'charging') {
                 s.trail.unshift({ x: s.x, y: s.y, opacity: 0.5 });
                 if (s.trail.length > 5) s.trail.pop();
            }
            s.trail.forEach(t => t.opacity -= 0.05);
            s.trail = s.trail.filter(t => t.opacity > 0);

            // State Machine (Slightly faster/more aggressive)
            if (s.state === 'idle') {
                s.y = s.startY + Math.sin(this.time * 2 + s.frameOffset * 0.01) * 10;
                if (dist < s.aggroRange) s.state = 'chasing';
            } 
            else if (s.state === 'chasing') {
                const targetX = cx + (s.x > cx ? 150 : -150); 
                const targetY = cy - 80;
                s.x += (targetX - s.x) * 0.04; // Faster chase
                s.y += (targetY - s.y) * 0.04;

                s.timer++;
                if (s.timer > 60) { 
                    s.state = 'charging';
                    s.timer = 0;
                }
            }
            else if (s.state === 'charging') {
                s.timer++; 
                if (s.timer > 30) { 
                    s.state = 'firing';
                    s.timer = 0;
                }
            }
            else if (s.state === 'firing') {
                this.projectiles.push({
                    x: s.x, y: s.y,
                    vx: (cx - s.x) * 0.05, // Faster projectile
                    vy: (cy - s.y) * 0.05,
                    life: 180,
                    trail: []
                });
                this.playSound('shoot');
                s.state = 'cooldown';
                s.timer = 0;
            }
            else if (s.state === 'cooldown') {
                s.timer++;
                if (s.timer > 80) { 
                    s.state = 'chasing';
                    s.timer = 0;
                }
            }

            // Damage
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

            p.x += p.vx;
            p.y += p.vy;
            p.life--;

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
            this.player.hp = Math.floor(this.player.maxHp * 0.6); // Start with less health on death
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
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    // --- RENDER FUNCTIONS ---

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // Background: Oppressive Dark Gradient
        const grd = ctx.createLinearGradient(0, -500, 0, h);
        grd.addColorStop(0, "#020205"); 
        grd.addColorStop(0.4, "#050a10"); 
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

        // Camera Vertical Logic
        let camY = 0;
        if (this.player && this.player.y < 300) camY = (300 - this.player.y) * 0.8;
        
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
            // Tattered wind effect
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fillRect(b.x, b.y + 10, 30, 5);
        });

        // Platforms
        for (let plat of this.platforms) {
            if (plat.type === 'bridge') {
                ctx.fillStyle = "#1a1a24"; // Very dark stone
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#22222e";
                ctx.fillRect(plat.x, plat.y, plat.w, 4); 
                ctx.fillStyle = "#111";
                for(let i=0; i<plat.w; i+=20) ctx.fillRect(plat.x + i, plat.y, 2, plat.h);
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#15151e";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowColor = "#005566"; 
                ctx.shadowBlur = 10;
                ctx.strokeStyle = "#005566"; 
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = "#0a0a0e";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        // Torches
        this.torches.forEach(t => {
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 60);
            glow.addColorStop(0, "rgba(0, 100, 110, 0.5)"); // Dim cyan
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 60, t.y - 60, 120, 120);
            ctx.fillStyle = "#aaa";
            ctx.beginPath();
            ctx.arc(t.x, t.y - 5, 3 + Math.random() * 2, 0, Math.PI*2);
            ctx.fill();
        });

        // Checkpoints
        this.checkpoints.forEach(cp => {
            ctx.fillStyle = cp.active ? "#005566" : "#222"; 
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
            ctx.fillStyle = `rgba(0, 100, 110, ${this.flashIntensity})`;
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
            ctx.strokeStyle = "#005566"; 
            ctx.strokeRect(20, 50, 204, 20);

            ctx.fillStyle = pct > 0.5 ? "#005566" : (pct > 0.25 ? "#663344" : "#882233"); 
            ctx.fillRect(22, 52, 200 * pct, 16);

            ctx.fillStyle = "#888";
            ctx.font = "12px monospace";
            ctx.fillText(`SOUL: ${Math.ceil(curHp)}`, 230, 64);
        }

        ctx.fillStyle = "#666";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 9: I Give Up!", 20, 30);
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
        const doorX = this.targetX;
        const doorY = 250; 
        
        ctx.fillStyle = "#000";
        ctx.fillRect(doorX, doorY - 140, 100, 140);
        
        const pulse = Math.sin(this.time * 3) * 0.2 + 0.8;
        const grad = ctx.createLinearGradient(0, doorY, 0, doorY - 120);
        grad.addColorStop(0, `rgba(0, 100, 110, ${pulse})`);
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.fillRect(doorX + 10, doorY - 130, 80, 130);
        
        ctx.save();
        ctx.fillStyle = "#ccc";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = "#005566";
        ctx.shadowBlur = 10;
        ctx.fillText("END >", doorX + 50, doorY - 160);
        ctx.restore();
    },

    renderAtmosphere: function(ctx) {
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < -100) {
                p.x = ctx.canvas.width + 100 + Math.random() * 200;
                p.y = Math.random() * 1000 - 400;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(p.x, p.y, p.size * 6, p.size); 
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                ctx.strokeStyle = "#445";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                ctx.fillStyle = "#778"; 
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(-25, 50); ctx.lineTo(0, 70); ctx.lineTo(25, 50);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (obs.type === 'lava_jet') {
                 if (obs.timer > (obs.interval - 50)) {
                    const h = obs.h * 1.0; 
                    const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y - h);
                    grad.addColorStop(0, "rgba(0, 0, 0, 0.8)");
                    grad.addColorStop(0.5, "rgba(0, 100, 110, 0.6)"); 
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
                const intensity = (s.timer / 30) * 10; 
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
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#005566';
        }

        const colors = this.spriteColors;
        const sprite = this.demonSprite;

        for (let r = 0; r < 12; r++) {
            for (let c = 0; c < 12; c++) {
                const val = sprite[r][c];
                if (val !== 0) {
                    if (ghostMode) {
                        ctx.fillStyle = colors[4]; 
                    } else {
                        ctx.fillStyle = colors[val];
                    }
                    
                    if (val === 2 && isCharging) {
                         ctx.fillStyle = '#ccc';
                         ctx.shadowBlur = 20;
                         ctx.shadowColor = '#005566';
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
                 ctx.fillStyle = `rgba(0, 100, 110, ${0.4 - i * 0.1})`;
                 ctx.fillRect(t.x - 4, t.y - 4, 8, 8);
            });

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.fillStyle = "#ccc";
            ctx.shadowColor = "#005566";
            ctx.shadowBlur = 10;
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        }
    }
};