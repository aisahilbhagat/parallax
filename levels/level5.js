window.Level5 = {
    id: "Level5",
    engine: null,
    player: null,
    cameraX: -600, 
    time: 0,
    deathCount: 0, 
    
    // Level Data
    platforms: [], 
    projectiles: [],
    explosions: [],
    particles: [],
    
    // Boss State
    boss: null,
    bossArenaActive: false, 
    
    // State
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0,
    levelComplete: false,
    respawnInvulnTimer: 0,

    // --- PAUSE MENU STATE ---
    paused: false,
    pauseButtons: [],
    boundInputHandlers: {}, // Store handlers to remove them later
    
    // --- BACKGROUND MUSIC ---
    audioElement: null,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 5 Initialized: The Solar Throne (Endurance Mode)");
        this.projectiles = [];
        this.explosions = [];
        this.particles = [];
        this.bossArenaActive = false; 
        this.respawnInvulnTimer = 0;
        this.playBackgroundMusic('/music-assets/level5.ogg');

        // Initialize Pause Menu Inputs
        this.setupPauseInput();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(-600, 500);
                this.setupLevel();
                this.setupBoss();
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
        this.platforms = [
            { x: -1000, y: 600, w: 2600, h: 400, type: 'ground' },
            { x: -1000, y: 0, w: 100, h: 800, type: 'wall' },
            { x: 1200, y: 0, w: 100, h: 800, type: 'wall' },
            { x: 200, y: 400, w: 120, h: 20, type: 'floating' },
            { x: 680, y: 400, w: 120, h: 20, type: 'floating' },
            { x: 440, y: 250, w: 120, h: 20, type: 'floating' } 
        ];
    },

    setupBoss: function() {
        // GENERATE GOLEM MATRIX (32x32)
        const m = Array(32).fill(0).map(() => Array(32).fill(0));
        const center = 16;
        
        // Build Head
        for(let y=1; y<7; y++) {
            for(let x=center-4; x<center+4; x++) {
                m[y][x] = (x === center-2 || x === center+1) && y===4 ? 3 : 1;
                if (y === 1 || y === 6 || x === center-4 || x === center+3) m[y][x] = 4;
            }
        }
        
        // Build Massive Shoulders & Torso
        for(let y=7; y<18; y++) {
            for(let x=center-8; x<center+8; x++) {
                const dist = Math.sqrt((x-center)**2 + (y-12)**2);
                if (dist < 6) m[y][x] = 6; // Core
                else m[y][x] = (x+y)%5 === 0 ? 7 : 1;
                if (x === center-8 || x === center+7) m[y][x] = 4;
            }
            // Arms
            for(let x=center-15; x<center-8; x++) { if (y > 8) m[y][x] = (x+y)%3 === 0 ? 4 : 1; }
            for(let x=center+8; x<center+15; x++) { if (y > 8) m[y][x] = (x+y)%3 === 0 ? 4 : 1; }
        }

        // UNIFIED HIPS & LOWER BODY
        for(let y=18; y<25; y++) {
            for(let x=center-10; x<center+10; x++) {
                m[y][x] = (x+y)%4 === 0 ? 7 : 1;
                if (x === center-10 || x === center+9) m[y][x] = 4;
                if (Math.abs(x-center) < 4 && y < 22) m[y][x] = 6;
            }
            for(let x=center-16; x<center-10; x++) { if (y < 23) m[y][x] = 4; }
            for(let x=center+10; x<center+16; x++) { if (y < 23) m[y][x] = 4; }
        }

        // Heavy Sturdy Legs
        for(let y=25; y<32; y++) {
            for(let x=center-9; x<center-1; x++) m[y][x] = y > 29 ? 4 : 1;
            for(let x=center+1; x<center+9; x++) m[y][x] = y > 29 ? 4 : 1;
        }

        this.boss = {
            active: true,
            dead: false,
            x: 800,
            y: 400,
            vx: 0, 
            vy: 0,
            hp: 3000, 
            maxHp: 3000,
            phase: 1,
            
            invulnTimer: 0, 
            state: 'dormant',
            timer: 0,
            facingRight: false,
            
            width: 160, // Adjusted for new scale (32 * 5)
            height: 160,
            
            // Visuals
            pulse: 0,
            walkCycle: 0,
            targetX: 800,
            targetY: 400,

            matrix: m,
            
            colors: {
                ARMOR: "#000000",
                ROCK: "#2a2a2a",
                ROCK_DARK: "#1a1a1a",
                ROCK_LIGHT: "#555555",
                CORE: "#ff3300",
                MAGMA: "#ff6600",
                PLASMA: "#fff700",
                EYE: "#00ffff",
                PHASE2: "#00ffff",
                PHASE2_DARK: "#003355",
                CAVE_DARK: "#080402",
                LAVA_STREAM: "#551100",
                GEM: "#660000",
                GEM_LIT: "#ff4444",
                STATUE_BASE: "#444444",
                STATUE_DARK: "#222222",
                STATUE_HIGHLIGHT: "#666666"
            }
        };
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
        if (this.respawnInvulnTimer > 0) this.respawnInvulnTimer -= 16;

        if (!this.player) return;

        this.player.update();

        if (!this.bossArenaActive && this.player.x > 100) {
            this.startFight();
        }

        this.updateBoss();
        this.updateProjectiles();
        this.updateEffects();

        const hitbox = this.player.hitbox || { offsetX: 0, offsetY: 0, width: 36, height: 60 };
        let pLeft = this.player.x + hitbox.offsetX;
        let pRight = pLeft + hitbox.width;
        let pTop = this.player.y + hitbox.offsetY;
        let pBottom = pTop + hitbox.height;
        
        // Floor
        let groundLevel = 1000; 
        for (let plat of this.platforms) {
            if (plat.type === 'wall') continue; 
            if (pRight > plat.x && pLeft < plat.x + plat.w) {
                if (pBottom <= plat.y + 35) {
                    if (plat.y < groundLevel) groundLevel = plat.y;
                }
            }
        }
        this.player.groundY = groundLevel;

        // Wall
        for (let plat of this.platforms) {
            if (plat.type === 'wall') {
                 if (pRight > plat.x && pLeft < plat.x + plat.w &&
                     pBottom > plat.y && pTop < plat.y + plat.h) {
                     const mid = plat.x + plat.w/2;
                     if (this.player.x < mid) {
                         this.player.x = plat.x - (hitbox.offsetX + hitbox.width) - 1;
                     } else {
                         this.player.x = plat.x + plat.w - hitbox.offsetX + 1;
                     }
                     this.player.vx = 0;
                 }
            }
        }

        if (this.bossArenaActive) {
            const target = 200; 
            this.cameraX += (target - this.cameraX) * 0.05;
        } else {
            const target = this.player.x - 300;
            this.cameraX += (target - this.cameraX) * 0.1;
        }

        if (this.player.hp <= 0 && !this.levelComplete) {
            this.handlePlayerDeath();
        }
        if (this.boss.dead && !this.levelComplete) {
             this.levelComplete = true;
             setTimeout(() => {
                 if (this.engine && this.engine.handleContentComplete) {
                     this.engine.handleContentComplete();
                 }
             }, 4000);
        }
    },

    startFight: function() {
        console.log("ARENA LOCKED. FIGHT BEGINS.");
        this.bossArenaActive = true;
        this.boss.state = 'chase'; 
        this.boss.timer = 1000;
        this.shake = 10;
        this.playSound('slam');
        this.platforms.push({ x: -100, y: 0, w: 100, h: 800, type: 'wall' });
    },

    updateBoss: function() {
        if (!this.boss || this.boss.dead) return;
        const b = this.boss;
        const p = this.player;
        
        b.pulse += 0.05;
        b.timer -= 16; 
        if (Math.abs(b.vx) > 0.1 || Math.abs(b.vy) > 0.1) b.walkCycle += 0.14;

        if (b.state === 'dormant') {
            b.y = 400 + Math.sin(this.time) * 10;
            return;
        }

        // PHASE 2 TRANSITION: Turn Blue
        if (b.hp < b.maxHp * 0.5 && b.phase === 1) {
            b.phase = 2; // BLUE PHASE START
            this.shake = 30;
            this.flashIntensity = 0.8;
            this.playSound('roar');
            // Knockback
            p.vx = (p.x < b.x) ? -15 : 15;
            p.vy = -10;
            b.timer = 0;
            b.state = 'hover_smash'; 
        }

        const dx = p.x - b.x;
        b.facingRight = dx > 0;
        
        // AGGRESSION SCALING: Phase 2 is much faster
        const moveSpeed = b.phase === 2 ? 9.0 : 3.5;

        switch(b.state) {
            case 'chase':
                const targetY = p.y - 100; 
                b.x += (dx > 0 ? 1 : -1) * moveSpeed;
                b.y += (targetY - b.y) * 0.05; 

                if (b.timer <= 0) {
                    const r = Math.random();
                    if (r < 0.4) {
                        b.state = 'hover_smash';
                        b.timer = b.phase === 2 ? 400 : 800; // Less warning in blue
                    } else if (r < 0.7) {
                        b.state = 'casting';
                        this.triggerBossAttack('salvo');
                    } else {
                        b.state = 'casting';
                        this.triggerBossAttack('meteor');
                    }
                }
                break;

            case 'hover_smash':
                const targetX = p.x;
                b.x += (targetX - b.x) * (b.phase === 2 ? 0.2 : 0.1); // Tracks faster in blue
                b.y += (150 - b.y) * 0.1; 
                
                if (b.timer <= 0) {
                    b.state = 'slam_down';
                    b.vy = b.phase === 2 ? 35 : 25; // Falls faster in blue
                    this.playSound('fall');
                }
                break;

            case 'slam_down':
                b.y += b.vy;
                if (b.y >= 530) {
                    b.y = 530;
                    b.vy = 0;
                    b.state = 'impact_recovery';
                    b.timer = b.phase === 2 ? 400 : 1000; // Less recovery time in blue
                    
                    this.shake = 20;
                    this.playSound('boom');
                    this.createExplosion(b.x, b.y + 60, 60);
                    
                    // SHOCKWAVES: Blue Phase = High Damage & Speed
                    const swSpeed = b.phase === 2 ? 12 : 8;
                    const swDmg = b.phase === 2 ? 50 : 20; // 50 DMG!
                    const swColor = b.phase === 2 ? '#00ffff' : '#ffaa00';
                    
                    this.projectiles.push({
                        type: 'shockwave', x: b.x - 40, y: 580, vx: -swSpeed, vy: 0, w: 30, h: 40, life: 100, color: swColor, damage: swDmg
                    });
                    this.projectiles.push({
                        type: 'shockwave', x: b.x + 40, y: 580, vx: swSpeed, vy: 0, w: 30, h: 40, life: 100, color: swColor, damage: swDmg
                    });
                }
                break;

            case 'impact_recovery':
                if (b.timer <= 0) {
                    b.state = 'chase';
                    // Almost NO downtime in Phase 2
                    b.timer = b.phase === 2 ? 300 : 2000; 
                    b.vy = -5;
                }
                break;

            case 'casting':
                if (b.timer <= 0) {
                    b.state = 'chase';
                    b.timer = b.phase === 2 ? 300 : 1500;
                }
                break;
        }

        // HITBOX
        const bRect = { x: b.x - 70, y: b.y - 70, w: 140, h: 140 };
        const pRect = { x: p.x + 18, y: p.y + 6, w: 36, h: 60 };

        if (p.isAttacking && b.invulnTimer <= 0) {
             if (this.checkRectOverlap(pRect, bRect)) {
                 b.hp -= 40; 
                 b.invulnTimer = 20;
                 this.playSound('hit');
                 for(let k=0; k<5; k++) {
                     this.particles.push({
                         x: bRect.x + Math.random()*bRect.w, y: bRect.y + Math.random()*bRect.h,
                         vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                         life: 1.0, color: '#fff'
                     });
                 }
                 if (b.hp <= 0) {
                     b.dead = true;
                     this.explodeBoss();
                 }
             }
        }
        if (b.invulnTimer > 0) b.invulnTimer--;

        // CONTACT DAMAGE: Blue Phase = 30 Damage
        if (this.checkRectOverlap(pRect, bRect)) {
            if (!p.isStunned && p.invulnTimer <= 0 && this.respawnInvulnTimer <= 0) {
                const contactDmg = b.phase === 2 ? 30 : 10;
                p.takeDamage(contactDmg, (p.x < b.x ? -1 : 1));
                p.vy = -5;
            }
        }
    },

    triggerBossAttack: function(type) {
        const b = this.boss;
        // RELENTLESS: 300ms delay in Phase 2
        b.timer = (b.phase === 2) ? 300 : 1000; 
        
        this.particles.push({
            x: b.x, y: b.y, vx: 0, vy: -1, life: 1, color: '#fff', scale: 50
        });

        if (type === 'meteor') {
            const count = (b.phase === 2) ? 25 : 8; // 25 Meteors!
            const metDmg = (b.phase === 2) ? 45 : 20;
            const metColor = (b.phase === 2) ? '#00ffff' : '#ffaa00';
            
            for(let i=0; i<count; i++) {
                setTimeout(() => {
                    const tx = (Math.random() * 1200); 
                    this.projectiles.push({
                        type: 'meteor',
                        x: tx, y: -100,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (b.phase === 2) ? 16 : 12, 
                        w: 24, h: 48,
                        color: metColor,
                        damage: metDmg
                    });
                }, i * (b.phase === 2 ? 60 : 150));
            }
        } else if (type === 'salvo') {
            const spreadCount = (b.phase === 2) ? 6 : 2; // HUGE Spread
            const orbDmg = (b.phase === 2) ? 40 : 20;
            const orbSpeed = (b.phase === 2) ? 13 : 9;
            const orbColor = (b.phase === 2) ? '#00ffff' : b.colors.CORE;

            for (let i = -spreadCount; i <= spreadCount; i++) {
                const angle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
                const spread = i * 0.15;
                this.projectiles.push({
                    type: 'orb',
                    x: b.x, y: b.y,
                    vx: Math.cos(angle + spread) * orbSpeed,
                    vy: Math.sin(angle + spread) * orbSpeed,
                    w: 20, h: 20, 
                    color: orbColor,
                    damage: orbDmg
                });
            }
        }
    },

    updateProjectiles: function() {
        const pRect = { x: this.player.x + 18, y: this.player.y + 6, w: 36, h: 60 };

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.life !== undefined) {
                p.life--;
                if (p.life <= 0) { this.projectiles.splice(i, 1); continue; }
            }
            if (p.y > 800 || p.x < -200 || p.x > 1400) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Shockwave Logic
            if (p.type === 'shockwave') {
                 this.particles.push({
                     x: p.x, y: p.y + Math.random()*20, vx: 0, vy: -Math.random(), life: 0.5, color: p.color
                 });
                 if (this.checkRectOverlap(pRect, {x:p.x, y:p.y-40, w:p.w, h:p.h})) { 
                     if (!this.player.isStunned && this.respawnInvulnTimer <= 0) {
                        const dmg = p.damage || 20;
                        this.player.takeDamage(dmg, (p.vx > 0 ? 1 : -1));
                        this.player.vy = -8; 
                     }
                 }
                 continue; 
            }

            // Impact
            if (p.y > 580) { 
                this.createExplosion(p.x, p.y, 40);
                this.projectiles.splice(i, 1);
                continue;
            }

            // Player Hit
            if (this.checkRectOverlap(pRect, {x: p.x-p.w/2, y: p.y-p.h/2, w: p.w, h: p.h})) {
                if (!this.player.isStunned && this.respawnInvulnTimer <= 0) {
                    const dmg = p.damage || 20;
                    this.player.takeDamage(dmg, (p.vx > 0 ? 1 : -1));
                    this.createExplosion(p.x, p.y, 20);
                    this.projectiles.splice(i, 1);
                }
            }
        }
    },

    updateEffects: function() {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            let e = this.explosions[i];
            e.life -= 0.05;
            e.r += 1;
            if (e.life <= 0) this.explosions.splice(i, 1);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let part = this.particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.life -= 0.02;
            if (part.life <= 0) this.particles.splice(i, 1);
        }
    },

    createExplosion: function(x, y, radius) {
        this.explosions.push({x: x, y: y, r: 10, maxR: radius, life: 1.0});
        this.shake = 5;
    },

    explodeBoss: function() {
        this.shake = 100;
        this.flashIntensity = 1.0;
        for(let i=0; i<50; i++) {
            this.particles.push({
                x: this.boss.x, y: this.boss.y,
                vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
                life: 2.0, color: '#ffaa00'
            });
        }
    },

    handlePlayerDeath: function() {
        this.deathCount++;
        console.log(`Player Died. Death Count: ${this.deathCount}`);
        
        this.player.hp = this.player.maxHp;
        this.player.isStunned = false;
        this.player.vx = 0; 
        this.player.vy = 0;
        
        this.respawnInvulnTimer = 3000;

        if (this.bossArenaActive) {
            this.player.x = 600; 
            this.player.y = 500;
        } else {
            this.player.x = -600;
            this.player.y = 500;
        }

        if (this.deathCount < 3) {
            this.boss.hp = this.boss.maxHp;
            this.boss.phase = 1;
            this.boss.x = 800; 
            this.boss.y = 400;
            this.boss.state = this.bossArenaActive ? 'chase' : 'dormant';
            this.flashIntensity = 0.5; 
        } else {
            this.boss.x = 800;
            this.boss.y = 400;
            this.boss.state = this.bossArenaActive ? 'chase' : 'dormant';
            this.boss.timer = 1000;
            this.flashIntensity = 0.5; 
        }
        
        this.projectiles = [];
    },

    checkRectOverlap: function(r1, r2) {
        return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    lerp: function(a, b, m) {
        const ah=parseInt(a.slice(1),16), bh=parseInt(b.slice(1),16);
        const ar=ah>>16, ag=ah>>8&255, ab=ah&255, br=bh>>16, bg=bh>>8&255, bb=bh&255;
        const rr=ar+m*(br-ar), rg=ag+m*(bg-ag), rb=ab+m*(bb-ab);
        return '#' + ((1<<24)+(Math.round(rr)<<16)+(Math.round(rg)<<8)+Math.round(rb)).toString(16).slice(1);
    },

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#050505"); 
        grd.addColorStop(1, "#1a0505"); 
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(-this.cameraX, 0);
        
        ctx.fillStyle = "#111";
        for(let i=-6; i<12; i++) {
            ctx.fillRect(i * 200, 100, 40, 500); 
        }

        for (let plat of this.platforms) {
            if (plat.type === 'ground') {
                ctx.fillStyle = "#1a1010"; 
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#500";
                ctx.fillRect(plat.x, plat.y, plat.w, 4); 
            } else if (plat.type === 'floating') {
                ctx.fillStyle = "#333";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = "#555";
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            } else if (plat.type === 'wall') {
                ctx.fillStyle = "#080808";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        if (this.boss && !this.boss.dead) {
            this.renderBoss(ctx);
        }

        for (let p of this.projectiles) {
            if (p.type === 'shockwave') {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y - p.h, p.w, p.h);
                ctx.fillStyle = "#ffff00";
                ctx.fillRect(p.x + 5, p.y - p.h + 5, p.w - 10, p.h - 10);
            } else {
                ctx.fillStyle = p.color || '#fff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.fillRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h);
                ctx.shadowBlur = 0;
            }
        }

        for (let e of this.explosions) {
            ctx.fillStyle = `rgba(255, 100, 0, ${e.life})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
            ctx.fill();
        }
        for (let part of this.particles) {
            ctx.fillStyle = part.color;
            ctx.globalAlpha = part.life;
            const s = part.scale || 4;
            ctx.fillRect(part.x, part.y, s, s);
        }
        ctx.globalAlpha = 1.0;

        if (this.player) {
            if (this.respawnInvulnTimer > 0) {
                if (Math.floor(this.time * 20) % 2 === 0) {
                    ctx.globalAlpha = 0.5;
                }
            }
            this.player.render(ctx);
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();

        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        // --- RENDER PAUSE MENU ---
        if (this.paused) {
            this.renderPauseMenu(ctx);
            return; // Skip normal UI rendering
        }

        if (this.boss && !this.boss.dead && this.player && this.player.x > -200) {
            const barW = 600;
            const barX = (w - barW) / 2;
            const barY = 40;
            
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(barX - 4, barY - 4, barW + 8, 20);
            
            const pct = Math.max(0, this.boss.hp / this.boss.maxHp);
            let hpColor = "#ff0000"; 
            if (this.deathCount >= 3) hpColor = "#ffaa00"; 

            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, barW * pct, 12);
            
            ctx.font = "bold 16px sans-serif";
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.fillText("SOLARIS GOLEM", w/2, barY - 10); // Updated Name
            ctx.textAlign = "left";
        }
        
        if (this.player) {
            ctx.fillStyle = "red";
            ctx.fillRect(20, 20, 200 * (this.player.hp / this.player.maxHp), 10);
            ctx.strokeStyle = "#fff";
            ctx.strokeRect(20, 20, 200, 10);
        }

        if (this.levelComplete) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 50px sans-serif";
            ctx.textAlign = "center";
            ctx.shadowBlur = 20;
            ctx.shadowColor = "gold";
            ctx.fillText("LEGEND CONQUERED", w/2, h/2);
            ctx.shadowBlur = 0;
            ctx.textAlign = "left";
        }
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

    renderBoss: function(ctx) {
        const b = this.boss;
        const PIXEL_COUNT = 32;
        const PIXEL_SIZE = 5; // Scaled to ~160px width
        
        ctx.save();
        ctx.translate(b.x - (PIXEL_COUNT * PIXEL_SIZE / 2), b.y - (PIXEL_COUNT * PIXEL_SIZE / 2));
        
        // Shake/Vibration for casting or heavy actions
        const vib = (b.state === 'casting' || b.state === 'slam_down') ? (Math.random()-0.5)*10 : 0;
        const bob = Math.sin(b.pulse) * 4;

        if (b.facingRight) {
            // Flip around center
            ctx.translate(PIXEL_COUNT * PIXEL_SIZE, 0);
            ctx.scale(-1, 1);
        }

        const grid = b.matrix;

        for (let r = 0; r < PIXEL_COUNT; r++) {
            for (let c = 0; c < PIXEL_COUNT; c++) {
                const t = grid[r][c]; 
                if (t === 0) continue;
                
                let color;
                let yOff = (r < 25) ? bob : 0;

                // Color Logic from HTML design
                color = b.colors.ROCK;
                
                if (r >= 25 && (Math.abs(b.vx) > 0.1 || Math.abs(b.vy) > 0.1)) {
                    // Walk Cycle Logic for legs
                    const lift = Math.sin(b.walkCycle + (c < 16 ? 0 : Math.PI)) * 10;
                    yOff = Math.min(0, lift);
                }

                if (t === 4) color = b.colors.ARMOR;
                if (t === 3) color = b.phase === 2 ? "#fff" : b.colors.EYE;
                
                if (t === 6) {
                    // Core Logic
                    if (b.phase === 1) {
                        const distFromCoreCenter = Math.sqrt((c - 16) ** 2 + (r - 12) ** 2);
                        if (distFromCoreCenter < 2.5) {
                            color = b.colors.GEM;
                            if (distFromCoreCenter < 1.0) color = b.colors.GEM_LIT; 
                        } else {
                            color = b.colors.ROCK_DARK;
                            if ((r+c)%3 === 0) color = "#222"; 
                        }
                    } else {
                        // Phase 2 Pulse
                        const p = (Math.sin(b.pulse * 18) + 1) / 2;
                        color = this.lerp(b.colors.PHASE2_DARK, "#fff", p);
                    }
                }

                // Shadow/Depth
                ctx.fillStyle = "rgba(0,0,0,0.6)"; 
                ctx.fillRect(c*PIXEL_SIZE+2+vib, r*PIXEL_SIZE+yOff+2, PIXEL_SIZE, PIXEL_SIZE);
                
                // Main Pixel
                ctx.fillStyle = color; 
                ctx.fillRect(c*PIXEL_SIZE+vib, r*PIXEL_SIZE+yOff, PIXEL_SIZE, PIXEL_SIZE);
            }
        }
        ctx.restore();
    }
};