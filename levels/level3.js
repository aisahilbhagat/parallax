window.Level3 = {
    engine: null,
    targetX: 4200, // End of level trigger
    player: null,
    cameraX: 0,
    time: 0,
    
    // Level Data
    platforms: [], 
    obstacles: [], 
    checkpoints: [], 
    activeCheckpoint: null, 
    gateBarrier: null, // <--- New reference for the barrier
    
    // Boss State
    boss: null,
    bossArenaActive: false,
    
    // Visuals
    particles: [],
    torches: [],
    
    // State for control suppression (Cutscenes/Damage)
    inputBlocked: false,
    flashIntensity: 0,
    shake: 0,

    // --- PAUSE MENU STATE ---
    paused: false,
    pauseButtons: [],
    boundInputHandlers: {}, 
    
    // --- BACKGROUND MUSIC ---
    audioElement: null,
    
    // --- ARMOR MOB IMAGE ---
    armorImage: null,
    bgImage: null,

    init: function(engine) {
        this.engine = engine;
        console.log("Level 3 Initialized: The Magma Keep (Attrition Mode)");
        this.generateEmbers();
        this.playBackgroundMusic('/music-assets/level3.ogg');
        
        this.armorImage = new Image();
        this.armorImage.src = '/image-assets/ghost.png';

        // Load Background Image safely
        this.bgImage = new Image();
        this.bgImage.src = '/image-assets/level3bg.png';

        this.setupPauseInput();
    },

    load: function() {
        this.loadCharacterScript(() => {
            if (window.LevelCharacter) {
                this.player = new window.LevelCharacter(100, 600);
                this.setupLevel();
                this.setupBoss();
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
        this.audioElement.volume = 0.5;
        this.audioElement.play().catch(err => console.log("Audio autoplay prevented or error:", err));
    },

    setupLevel: function() {
        // --- 1. PLATFORMS (Difficulty: 8) ---
        
        this.platforms = [
            // STARTING ZONE (Safe)
            { x: 0, y: 700, w: 400, h: 200, type: 'ground' },

            // SECTION 1: The Hall of Blades
            { x: 450, y: 650, w: 80, h: 300, type: 'stone' },
            { x: 650, y: 600, w: 80, h: 350, type: 'stone' },
            { x: 850, y: 550, w: 80, h: 400, type: 'stone' },
            
            // The "Bridge"
            { x: 1050, y: 550, w: 300, h: 40, type: 'bridge' }, 
            
            // SECTION 2: The Vertical Climb
            { x: 1450, y: 500, w: 100, h: 40, type: 'floating' },
            { x: 1650, y: 400, w: 80, h: 40, type: 'floating' },
            { x: 1850, y: 300, w: 80, h: 40, type: 'floating' },
            
            // Mid-Check Platform
            { x: 2050, y: 300, w: 200, h: 40, type: 'stone' },

            // SECTION 3: The Descent
            { x: 2350, y: 350, w: 60, h: 20, type: 'floating' },
            { x: 2500, y: 400, w: 60, h: 20, type: 'floating' },
            { x: 2650, y: 450, w: 60, h: 20, type: 'floating' },

            // BOSS ARENA
            { x: 2800, y: 550, w: 1000, h: 250, type: 'arena_floor' },
            
            // Arena Platforms
            { x: 2900, y: 400, w: 100, h: 20, type: 'floating' },
            { x: 3200, y: 350, w: 100, h: 20, type: 'floating' }, 
            { x: 3500, y: 400, w: 100, h: 20, type: 'floating' },

            // EXIT GATE AREA
            { x: 3900, y: 550, w: 400, h: 250, type: 'ground' }
        ];

        // --- NEW: BARRIER SETUP ---
        // Invisible wall at x=4060 (matches where visual bars are drawn)
        this.gateBarrier = { x: 4060, y: 0, w: 20, h: 600, type: 'barrier' };
        this.platforms.push(this.gateBarrier);

        // --- CHECKPOINTS ---
        this.checkpoints = [
            { x: 1050, y: 550, active: false, id: 1 }, 
            { x: 2050, y: 300, active: false, id: 2 }, 
            { x: 2850, y: 550, active: false, id: 3 }  
        ];

        // --- 2. OBSTACLES ---
        this.obstacles = [
            { type: 'swing_blade', cx: 550, cy: 100, length: 350, speed: 0.04, angle: 0, range: 0.6 },
            { type: 'swing_blade', cx: 750, cy: 100, length: 350, speed: 0.05, angle: 1, range: 0.6 },
            { type: 'swing_blade', cx: 950, cy: 100, length: 350, speed: 0.04, angle: 0.5, range: 0.6 },
            { type: 'lava_jet', x: 1100, y: 600, h: 150, timer: 0, interval: 120, state: 'idle' },
            { type: 'lava_jet', x: 1250, y: 600, h: 150, timer: 60, interval: 120, state: 'idle' },
            { 
                type: 'armor', x: 1650, y: 350, range: 100, baseSpeed: 2, 
                aggroRadius: 150, aggroSpeed: 4.0, cooldown: 0, 
                startX: 1650, dir: 1, state: 'patrol', hp: 1 
            },
        ];

        this.torches = [
            { x: 200, y: 650 }, { x: 1050, y: 500 }, { x: 2050, y: 250 },
            { x: 2800, y: 500 }, { x: 3800, y: 500 }
        ];
    },

    setupBoss: function() {
        this.boss = {
            active: false,
            dead: false,
            x: 3500,
            y: 450,
            vx: 0, 
            vy: 0,
            hp: 500,
            maxHp: 500,
            invulnTimer: 0, 
            state: 'idle', 
            timer: 0,
            facingRight: false,
            width: 120, 
            height: 120,
            
            pulse: 0,
            walkCycle: 0,
            particles: [],
            
            pixelSize: 10,
            colors: {
                ROCK: "#4a4a4a", ROCK_DARK: "#2a2a2a", ROCK_LIGHT: "#6a6a6a",
                LAVA_CORE: "#ff3300", LAVA_MID: "#ff8800", LAVA_HOT: "#ffffaa",
                EYE_IDLE: "#ffcc00", EYE_ANGRY: "#ff0000"
            },
            
            takeDamage: function(amount) {
                if (this.state === 'dead') return;
                this.hp -= amount;
                this.pulse += 2; 
                if (this.hp <= 0) {
                    this.state = 'dead';
                    this.dead = true; 
                    this.timer = 0;
                }
            }
        };

        this.boss.grid = [
            [0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,1,5,1,1,5,1,0,0,0], 
            [0,0,1,1,1,1,1,1,1,1,0,0],
            [0,1,1,4,3,4,4,3,4,1,1,0], 
            [0,1,4,4,4,4,4,4,4,4,1,0],
            [1,1,1,2,2,2,2,2,2,1,1,1], 
            [1,1,2,2,2,2,2,2,2,2,1,1],
            [1,1,2,2,2,2,2,2,2,2,1,1],
            [0,1,1,2,2,2,2,2,2,1,1,0],
            [0,0,1,1,1,1,1,1,1,1,0,0], 
            [0,0,1,1,0,0,0,0,1,1,0,0], 
            [0,1,1,1,0,0,0,0,1,1,1,0]  
        ];
    },

    generateEmbers: function() {
        this.particles = [];
        for(let i=0; i<30; i++) {
            this.particles.push({
                x: Math.random() * 2000, 
                y: Math.random() * 800, 
                size: Math.random() * 3 + 1,
                speedY: -Math.random() * 1.5 - 0.5,
                life: Math.random() * 100,
                color: Math.random() > 0.5 ? '#ff4500' : '#ff8c00'
            });
        }
    },

    update: function() {
        if (this.paused) return; 

        this.time += 0.05;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;
        if (this.shake > 0) this.shake--;

        if (!this.player) return;

        this.player.update();

        for (let cp of this.checkpoints) {
            if (!cp.active && this.player.x > cp.x) {
                cp.active = true;
                this.activeCheckpoint = cp;
                if (this.player.hp < this.player.maxHp) this.player.hp = this.player.maxHp;
            }
        }

        if (this.player.hp <= 0) {
            this.resetPlayer();
        }

        if (!this.bossArenaActive && this.player.x > 2700 && !this.boss.dead) {
            this.bossArenaActive = true;
            this.boss.active = true;
        }

        this.updateBoss();
        
        // --- NEW: BARRIER REMOVAL LOGIC ---
        // If boss is dead and barrier exists, remove it from platforms
        if (this.boss.dead && this.gateBarrier) {
            this.platforms = this.platforms.filter(p => p !== this.gateBarrier);
            this.gateBarrier = null; // Clear reference
        }

        // --- PHYSICS & COLLISION ---
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

        if (this.bossArenaActive && !this.boss.dead) {
            const targetCam = 2800; 
            this.cameraX += (targetCam - this.cameraX) * 0.05;
        } else {
            const targetCam = Math.max(0, this.player.x - 300);
            this.cameraX += (targetCam - this.cameraX) * 0.1;
        }

        if (this.player.y > 800) {
            this.playSound('burn');
            this.player.hp = 0; 
            this.resetPlayer();
        }

        if (this.player.x >= this.targetX) {
             console.log("Level 3 Complete!");
             if (this.engine && this.engine.handleContentComplete) {
                 this.engine.handleContentComplete();
             }
        }
    },

    updateBoss: function() {
        if (!this.boss || !this.boss.active || this.boss.dead) return;

        const b = this.boss;
        const p = this.player;
        const dt = 16; 

        b.pulse += 0.05;
        b.timer -= dt;

        const bRect = { x: b.x - 60, y: b.y - 60, w: 120, h: 120 };
        const pRect = { x: p.x + 18, y: p.y + 6, w: 36, h: 60 };

        if (p.isAttacking) {
            if (pRect.x < bRect.x + bRect.w && pRect.x + pRect.w > bRect.x &&
                pRect.y < bRect.y + bRect.h && pRect.y + pRect.h > bRect.y) {
                
                if (b.invulnTimer <= 0) {
                    b.takeDamage(25); 
                    b.invulnTimer = 30; 
                    this.playSound('hit');
                    b.x += (p.x < b.x) ? 5 : -5;
                }
            }
        }
        if (b.invulnTimer > 0) b.invulnTimer--;

        const dist = Math.abs(p.x - b.x);
        const dir = (p.x > b.x) ? 1 : -1;
        b.facingRight = (dir > 0);

        const speedMult = (b.hp < 150) ? 1.5 : 1.0;

        switch (b.state) {
            case 'idle':
                if (b.timer <= 0) {
                    const r = Math.random();
                    if (r < 0.6) {
                        b.state = 'chase';
                        b.timer = 2000;
                    } else {
                        b.state = 'tell_smash';
                        b.timer = 1000; 
                    }
                }
                break;

            case 'chase':
                b.x += dir * 2.5 * speedMult;
                b.walkCycle += 0.1;
                
                if (Math.abs(p.x - b.x) < 50 && Math.abs(p.y - b.y) < 80) {
                    if (!p.isStunned) {
                        p.takeDamage(20, dir);
                        this.flashIntensity = 0.5;
                        this.shake = 10;
                    }
                }

                if (b.timer <= 0) {
                    b.state = 'idle';
                    b.timer = 1000;
                }
                break;

            case 'tell_smash':
                if (b.timer <= 0) {
                    b.state = 'smash';
                    b.vy = -12; 
                }
                break;

            case 'smash':
                b.vy += 0.8; 
                b.y += b.vy;
                
                if (b.y >= 450) {
                    b.y = 450;
                    b.vy = 0;
                    b.state = 'idle';
                    b.timer = 1500;
                    
                    this.shake = 20;
                    this.playSound('boom');
                    this.obstacles.push({
                        type: 'shockwave', x: b.x - 40, y: b.y + 50, dir: -1, 
                        speed: 6 * speedMult, life: 100, w: 30, h: 40 
                    });
                    this.obstacles.push({
                        type: 'shockwave', x: b.x + 40, y: b.y + 50, dir: 1, 
                        speed: 6 * speedMult, life: 100, w: 30, h: 40 
                    });
                }
                break;
        }

        if (Math.random() > 0.7) {
            b.particles.push({
                x: b.x + (Math.random() * 80 - 40),
                y: b.y + (Math.random() * 80 - 40),
                vx: (Math.random() - 0.5),
                vy: -Math.random() * 2,
                life: 1.0,
                color: (b.hp < 150) ? '#ff0000' : '#888'
            });
        }
    },

    updateObstacles: function(hitbox, pL, pR, pT, pB) {
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

                if (Math.hypot(cx - bx, cy - by) < 30) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(30, (cx > bx ? 1 : -1));
                        this.playSound('clank');
                     }
                }
            }
            else if (obs.type === 'lava_jet') {
                obs.timer++;
                if (obs.timer > obs.interval) obs.timer = 0;
                
                if (obs.timer > (obs.interval - 40)) {
                    if (pR > obs.x && pL < obs.x + 30 && pB > (obs.y - obs.h)) {
                         if (!this.player.isStunned) {
                             this.player.takeDamage(40, (this.player.facingRight ? -1 : 1));
                             this.player.vy = -10; 
                         }
                    }
                }
            }
            else if (obs.type === 'shockwave') {
                obs.x += obs.dir * obs.speed;
                obs.life--;
                if (obs.life <= 0) obs.dead = true;

                if (Math.abs(cx - obs.x) < 20 && Math.abs(pB - obs.y) < 30) {
                     if (!this.player.isStunned) {
                        this.player.takeDamage(15, obs.dir);
                     }
                }
            }
            else if (obs.type === 'armor') {
                if (obs.hp <= 0) continue;
                const dist = Math.hypot(cx - obs.x, cy - obs.y);
                if (dist < obs.aggroRadius) {
                     const dir = (cx > obs.x) ? 1 : -1;
                     obs.x += dir * obs.aggroSpeed;
                } else {
                     obs.x += obs.dir * obs.baseSpeed;
                     if (Math.abs(obs.x - obs.startX) > obs.range) obs.dir *= -1;
                }

                if (Math.abs(cx - obs.x) < 40 && Math.abs(cy - obs.y) < 54) {
                    if (this.player.isAttacking) {
                        obs.hp = 0; 
                        obs.dead = true;
                        this.playSound('hit');
                    } else if (!this.player.isStunned) {
                        this.player.takeDamage(10, (cx > obs.x ? 1 : -1));
                    }
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
        
        this.player.hp = this.player.maxHp;
        
        this.player.vy = 0;
        this.player.vx = 0;
        this.player.isStunned = false;
        this.flashIntensity = 0.5;
        this.shake = 5;
        
        if (this.bossArenaActive && !this.boss.dead) {
            this.boss.x = 3500;
            this.boss.y = 450;
            this.boss.state = 'idle';
            this.boss.invulnTimer = 0; 
        }
    },

    playSound: function(name) {
        if (this.engine && this.engine.playSound) this.engine.playSound(name);
    },

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 1. BACKGROUND (The Magma Keep)
        // Check if image is loaded and valid to prevent corruption
        if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth !== 0) {
            ctx.drawImage(this.bgImage, 0, 0, w, h);
        } else {
            // Fallback to original gradient if image fails
            const grd = ctx.createLinearGradient(0, 0, 0, h);
            grd.addColorStop(0, "#110505"); 
            grd.addColorStop(0.5, "#220a0a"); 
            grd.addColorStop(1, "#441100"); // Lava glow at bottom
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, w, h);
        }

        // 2. PARALLAX EMBERS
        ctx.save();
        this.updateAndRenderEmbers(ctx);
        ctx.restore();

        ctx.save();
        
        let shakeX = 0, shakeY = 0;
        if (this.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.shake;
            shakeY = (Math.random() - 0.5) * this.shake;
        }
        ctx.translate(-this.cameraX + shakeX, shakeY);

        this.torches.forEach(t => {
            const glow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, 60);
            glow.addColorStop(0, "rgba(255, 150, 0, 0.6)");
            glow.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = glow;
            ctx.fillRect(t.x - 60, t.y - 60, 120, 120);
            ctx.fillStyle = "#444";
            ctx.fillRect(t.x - 2, t.y, 4, 30);
            ctx.fillStyle = (Math.random() > 0.2) ? "#ffaa00" : "#ff4400";
            ctx.beginPath();
            ctx.arc(t.x, t.y - 5, 4 + Math.random()*2, 0, Math.PI*2);
            ctx.fill();
        });

        for (let plat of this.platforms) {
            // Invisible Barrier Logic: Do NOT render barriers
            if (plat.type === 'barrier') continue;

            if (plat.type === 'arena_floor') {
                ctx.fillStyle = "#1a1010";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#331111";
                ctx.fillRect(plat.x + 100, plat.y + 10, plat.w - 200, 5);
            } else if (plat.type === 'bridge') {
                ctx.fillStyle = "#3e2723";
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.fillStyle = "#110000";
                ctx.beginPath();
                ctx.moveTo(plat.x + 50, plat.y);
                ctx.lineTo(plat.x + 60, plat.y + 20);
                ctx.stroke();
            } else {
                ctx.fillStyle = "#262020"; 
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = "#4a3b3b";
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
            }
        }

        this.renderExitGate(ctx);

        this.checkpoints.forEach(cp => {
            if (cp.active) {
                ctx.fillStyle = "#00ff00"; 
                ctx.shadowBlur = 10;
                ctx.shadowColor = "lime";
            } else {
                ctx.fillStyle = "#555"; 
                ctx.shadowBlur = 0;
            }
            ctx.fillRect(cp.x - 5, cp.y - 40, 10, 40); 
            ctx.beginPath();
            ctx.arc(cp.x, cp.y - 45, 6, 0, Math.PI*2); 
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        this.renderObstacles(ctx);

        if (this.boss && this.boss.active && !this.boss.dead) {
            this.renderBoss(ctx);
        }

        if (this.player) this.player.render(ctx);

        ctx.restore();

        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.paused) {
            this.renderPauseMenu(ctx);
            return; 
        }

        if (this.player) {
            const maxHp = this.player.maxHp || 100;
            const curHp = Math.max(0, this.player.hp);
            const pct = curHp / maxHp;

            ctx.fillStyle = "#111";
            ctx.fillRect(20, 50, 204, 20);
            ctx.strokeStyle = "#555";
            ctx.strokeRect(20, 50, 204, 20);

            ctx.fillStyle = "#d32f2f"; 
            ctx.fillRect(22, 52, 200 * pct, 16);

            ctx.fillStyle = "#fff";
            ctx.font = "12px monospace";
            ctx.fillText(`HP: ${Math.ceil(curHp)}`, 230, 64);
        }

        if (this.bossArenaActive && !this.boss.dead) {
            const barW = 400;
            const barX = (w - barW) / 2;
            const barY = h - 50;
            
            ctx.fillStyle = "black";
            ctx.fillRect(barX - 4, barY - 4, barW + 8, 28);
            ctx.fillStyle = "#400";
            ctx.fillRect(barX, barY, barW, 20);
            ctx.fillStyle = "#f00";
            const hpPct = Math.max(0, this.boss.hp / this.boss.maxHp);
            ctx.fillRect(barX, barY, barW * hpPct, 20);
            
            ctx.fillStyle = "white";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText("MAGMA GOLEM", barX + 10, barY + 15);
        }

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("LEVEL 3: The Magma Keep (IRONMAN)", 20, 30);
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

    renderExitGate: function(ctx) {
        const gateX = 4100;
        const gateY = 550; 
        
        ctx.fillStyle = "#222";
        ctx.fillRect(gateX - 60, gateY - 140, 120, 140);
        
        if (this.boss && this.boss.dead) {
            ctx.fillStyle = "#000"; 
            ctx.fillRect(gateX - 40, gateY - 120, 80, 120);
            
            const time = this.time * 5;
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(gateX, gateY - 60);
            for(let i=0; i<10; i++) {
                ctx.lineTo(
                    gateX + Math.sin(time + i)*30, 
                    gateY - 60 + Math.cos(time + i)*30
                );
            }
            ctx.stroke();

            ctx.fillStyle = "white";
            ctx.font = "bold 20px monospace";
            ctx.fillText("VICTORY this way > keep walking", gateX - 40, gateY - 160);
        } else {
            ctx.fillStyle = "#422"; 
            ctx.fillRect(gateX - 40, gateY - 120, 80, 120);
            ctx.strokeStyle = "#111";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(gateX, gateY - 120);
            ctx.lineTo(gateX, gateY);
            ctx.stroke();
            
            ctx.fillStyle = "#aa0000"; 
            ctx.beginPath();
            ctx.arc(gateX, gateY - 60, 10, 0, Math.PI*2);
            ctx.fill();
        }
    },

    updateAndRenderEmbers: function(ctx) {
        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += Math.sin(this.time + p.y * 0.01);
            if (p.y < 0) {
                p.y = ctx.canvas.height;
                p.x = this.cameraX + Math.random() * 800; 
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;
    },

    renderObstacles: function(ctx) {
        for (let obs of this.obstacles) {
            if (obs.type === 'swing_blade') {
                ctx.strokeStyle = "#555";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(obs.cx, obs.cy);
                ctx.lineTo(obs.bx, obs.by);
                ctx.stroke();
                
                ctx.save();
                ctx.translate(obs.bx, obs.by);
                const angle = Math.atan2(obs.bx - obs.cx, obs.by - obs.cy);
                ctx.rotate(-angle);
                
                ctx.fillStyle = "#aaa";
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI, true); 
                ctx.fill();
                ctx.restore();
            }
            else if (obs.type === 'lava_jet') {
                ctx.fillStyle = "#330000"; 
                ctx.fillRect(obs.x, obs.y, 30, 10);
                
                if (obs.timer > (obs.interval - 40)) {
                    const height = obs.h * (Math.random() * 0.2 + 0.8);
                    const grad = ctx.createLinearGradient(0, obs.y, 0, obs.y - height);
                    grad.addColorStop(0, "#ffaa00");
                    grad.addColorStop(1, "#ff0000");
                    ctx.fillStyle = grad;
                    ctx.fillRect(obs.x + 5, obs.y - height, 20, height);
                } else if (obs.timer > (obs.interval - 60)) {
                    ctx.fillStyle = "orange";
                    ctx.beginPath();
                    ctx.arc(obs.x + 15, obs.y - 5, Math.random() * 5, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'shockwave') {
                ctx.fillStyle = "#ffaa00";
                ctx.fillRect(obs.x, obs.y - obs.h, obs.w, obs.h);
                ctx.fillStyle = "#ffff00";
                ctx.fillRect(obs.x + 5, obs.y - obs.h + 5, obs.w - 10, obs.h - 10);
            }
            else if (obs.type === 'armor') {
                if (obs.dead) return;
                if (this.armorImage && this.armorImage.complete) {
                    ctx.drawImage(this.armorImage, obs.x - 40, obs.y - 40, 80, 90);
                } else {
                    ctx.fillStyle = "#555";
                    ctx.fillRect(obs.x - 10, obs.y - 20, 20, 40);
                }
            }
        }
    },

    renderBoss: function(ctx) {
        const b = this.boss;
        const scale = 10; 
        
        ctx.save();
        
        ctx.translate(b.x, b.y - 60); 
        
        if (b.facingRight) {
            ctx.scale(-1, 1); 
        }

        const bob = Math.sin(b.pulse) * 3;
        
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(0, 60, 40, 10, 0, 0, Math.PI*2);
        ctx.fill();

        const w = 12 * scale;
        const h = 12 * scale;
        const startX = -w/2;
        const startY = -h/2;

        for (let r = 0; r < 12; r++) {
            for (let c = 0; c < 12; c++) {
                const type = b.grid[r][c];
                if (type === 0) continue;

                let color = b.colors.ROCK;
                let yOff = (r < 5) ? bob : 0; 

                if (r >= 10 && b.state === 'chase') {
                     const isLeft = c < 6;
                     const lift = Math.sin(b.walkCycle + (isLeft ? 0 : Math.PI)) * 4;
                     yOff = Math.min(0, lift);
                }

                if (type === 2) { 
                    const p = (Math.sin(b.pulse * 2 + (r+c)*0.5) + 1) / 2;
                    color = (p > 0.5) ? b.colors.LAVA_MID : b.colors.LAVA_CORE;
                    if (b.hp < 150) color = b.colors.LAVA_HOT; 
                }
                else if (type === 3) { 
                    color = (b.state === 'chase' || b.hp < 150) ? b.colors.EYE_ANGRY : b.colors.EYE_IDLE;
                }

                ctx.fillStyle = color;
                ctx.fillRect(startX + c*scale, startY + r*scale + yOff, scale, scale);
            }
        }

        b.particles.forEach((p, i) => {
             ctx.fillStyle = p.color;
             ctx.globalAlpha = p.life;
             ctx.fillRect(startX + 60 + p.x, startY + 60 + p.y, 4, 4); 
             p.x += p.vx;
             p.y += p.vy;
             p.life -= 0.05;
             if (p.life <= 0) b.particles.splice(i, 1);
        });
        ctx.globalAlpha = 1.0;

        ctx.restore();
    },

    lerpColor: function(a, b, amount) {
        return amount > 0.5 ? b : a;
    }
};