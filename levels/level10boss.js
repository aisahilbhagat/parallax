// ==========================================
// CONSTANTS
// ==========================================
const BOSS_SCALE = 2.5; 

// ==========================================
// HELPER CLASS: FloatingHand
// ==========================================
class FloatingHand {
    constructor(relX, relY) {
        this.relX = relX; 
        this.relY = relY; 
        this.x = 0; 
        this.y = 0; 
        this.angle = 0;
        this.floatPhase = Math.random() * Math.PI * 2; 
        this.spawnScale = 0;
    }
    
    update(bossX, bossY, time, target) {
        if (this.spawnScale < 1) this.spawnScale += 0.05;
        
        let targetX = bossX + this.relX + Math.sin(time * 2 + this.floatPhase) * 5;
        let targetY = bossY + this.relY + Math.cos(time * 1.5 + this.floatPhase) * 5;
        
        const dx = target.x - targetX; 
        const dy = target.y - targetY; 
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (target && dist < 200) { 
            targetX += dx * 0.2; 
            targetY += dy * 0.2; 
        }
        
        this.x += (targetX - this.x) * 0.1; 
        this.y += (targetY - this.y) * 0.1;
        this.angle = Math.atan2(dy, dx);
    }
    
    draw(ctx) {
        const drawX = this.x; 
        const drawY = this.y;
        
        ctx.save(); 
        ctx.translate(drawX, drawY); 
        ctx.scale(this.spawnScale * BOSS_SCALE, this.spawnScale * BOSS_SCALE); 
        ctx.rotate(this.angle);
        
        ctx.fillStyle = '#1f4068'; 
        ctx.fillRect(-6, -6, 10, 12); 
        
        ctx.fillStyle = '#0f0f1b'; 
        ctx.fillRect(-8, -4, 2, 8); 

        ctx.fillStyle = '#8265a7'; 
        ctx.fillRect(4, -7, 8, 3); 
        ctx.fillStyle = '#e94560'; 
        ctx.fillRect(12, -7, 2, 3); 
        
        ctx.fillStyle = '#8265a7'; 
        ctx.fillRect(4, -1, 10, 3); 
        ctx.fillStyle = '#e94560'; 
        ctx.fillRect(14, -1, 2, 3); 
        
        ctx.fillStyle = '#8265a7'; 
        ctx.fillRect(4, 5, 8, 3); 
        ctx.fillStyle = '#e94560'; 
        ctx.fillRect(12, 5, 2, 3); 

        ctx.fillStyle = '#e94560'; 
        ctx.fillRect(0, -2, 4, 4); 
        
        ctx.restore();
    }
}

// ==========================================
// LEVEL 10 BOSS MODULE (Void Watcher Style)
// ==========================================
window.Level10Boss = {
    engine: null,
    player: null,
    boss: null,
    time: 0,
    cameraX: 0, 
    
    particles: [],
    explosions: [],
    
    // Arena
    arenaWidth: 2400, 
    
    // Game State
    respawnTimer: 0, // Invulnerability after death
    flashIntensity: 0,
    
    // --- BACKGROUND MUSIC ---
    audioElement: null,

    init: function(engine) {
        this.engine = engine;
        console.log("BOSS LEVEL LOADED: Void Watcher Logic");
        this.playBackgroundMusic('/music-assets/level10boss.ogg');
        
        this.particles = [];
        this.explosions = [];
        this.cameraX = 0;
        this.respawnTimer = 0;
        this.flashIntensity = 0;
        
        // Initialize Boss Object
        this.boss = {
            // Stats
            x: 1200, y: 300, // Start in middle of new arena
            w: 64 * BOSS_SCALE, h: 64 * BOSS_SCALE,
            hp: 3000, maxHp: 3000,
            phase: 1,
            invulnTimer: 0, 
            dead: false,
            
            // Floating Logic
            floatOffset: 0,
            targetX: 1200,
            targetY: 300,
            speed: 3,

            // State Machine
            state: 'HOVER', 
            timer: 0,
            angle: 0, 
            targetAngle: 0, 
            lockedAngle: 0, 
            attackCooldown: 120, 
            
            // Hands
            hands: [ 
                new FloatingHand(-35, -35), 
                new FloatingHand(-35, 35), 
                new FloatingHand(35, -35), 
                new FloatingHand(35, 35) 
            ],

            // Attack States
            attackState: 0, 
            skyBeamState: 0, 
            skyBeamTimer: 0,
            skyBeamX: 0
        };
    },

    load: function() {
        if (window.LevelCharacter) {
            this.player = new window.LevelCharacter(100, 500);
            this.player.hp = this.player.maxHp; 
        } else {
            console.error("LevelCharacter not found.");
        }
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

    update: function() {
        this.time += 0.05;
        if (this.respawnTimer > 0) this.respawnTimer--;
        if (this.flashIntensity > 0) this.flashIntensity -= 0.05;
        
        // 1. Update Player & Camera
        if (this.player) {
            this.player.groundY = 600; 
            this.player.update();
            
            // Clamp Player to Arena
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x > this.arenaWidth) this.player.x = this.arenaWidth;
            
            // Camera Logic (Smooth Follow)
            const targetCam = this.player.x - 400; // Centerish
            this.cameraX += (targetCam - this.cameraX) * 0.1;
            
            // Clamp Camera
            if (this.cameraX < 0) this.cameraX = 0;
            if (this.cameraX > this.arenaWidth - 800) this.cameraX = this.arenaWidth - 800;

            // DEATH CHECK
            if (this.player.hp <= 0) {
                this.handlePlayerDeath();
            }
        }

        // 2. Update Boss
        if (this.boss && !this.boss.dead) {
            const b = this.boss;
            const p = this.player;
            
            // Floating animation
            b.floatOffset = Math.sin(this.time * 3) * 20;
            const drawY = b.y + b.floatOffset;

            // Update Hands
            b.hands.forEach(h => {
                h.update(b.x, drawY, this.time, p);
            });

            // --- AIMING LOGIC ---
            const dx = p.x - b.x;
            const dy = (p.y + 30) - drawY;
            const angleToPlayer = Math.atan2(dy, dx);
            
            if (b.state !== 'FIRE_BEAM') {
                b.targetAngle = angleToPlayer;
            }

            // --- PHASE TRANSITION ---
            if (b.hp < b.maxHp * 0.5 && b.phase === 1) {
                b.phase = 2;
                // Add a visual flair for phase change
                this.flashIntensity = 0.5;
                this.spawnParticles(b.x, b.y, '#ffffff');
            }

            // --- FIGHTING STYLE (VOID WATCHER) ---
            
            // Default: Float to random spots
            if (b.state === 'HOVER') {
                if (b.timer <= 0) {
                    // MOVEMENT UPDATE:
                    let moveRangeX = (Math.random() - 0.5) * 800;
                    b.targetX = p.x + moveRangeX;
                    
                    if (b.targetX < 200) b.targetX = 200;
                    if (b.targetX > this.arenaWidth - 200) b.targetX = this.arenaWidth - 200;

                    // 40% chance to swoop low (y=480), 60% high
                    if (Math.random() < 0.4) {
                        b.targetY = 480; 
                    } else {
                        b.targetY = 150 + Math.random() * 200;
                    }

                    b.timer = 100 + Math.random() * 100;
                }

                // Move smoothly to target
                b.x += (b.targetX - b.x) * 0.02;
                b.y += (b.targetY - b.y) * 0.02;

                // --- ATTACK LOGIC ---
                if (b.attackCooldown > 0) {
                    b.attackCooldown--;
                } else {
                    b.attackCooldown = 240 + Math.random() * 120; // 4-6s

                    if (b.phase === 1) {
                        b.state = 'CHARGE_BEAM';
                        b.timer = 0;
                    } else if (b.phase === 2) {
                        b.state = 'CAST_SKY_BEAM';
                        b.timer = 0;
                        b.x = p.x + (Math.random() > 0.5 ? 300 : -300); 
                        if (b.x < 100) b.x = 100;
                        if (b.x > this.arenaWidth - 100) b.x = this.arenaWidth - 100;
                    } else if (b.phase === 3) {
                         b.state = 'FIRE_BEAM';
                         b.lockedAngle = angleToPlayer; 
                         b.timer = 0;
                    }
                }
            }

            // --- PHASE 1: RED BEAM ---
            if (b.state === 'CHARGE_BEAM') {
                b.timer++;
                b.attackState = 1; 
                
                if (b.timer > 60) {
                    b.state = 'FIRE_BEAM';
                    b.timer = 0;
                    b.attackState = 2; 
                    b.lockedAngle = b.targetAngle;
                }
            }

            if (b.state === 'FIRE_BEAM') {
                b.timer++;
                
                // MATH: Line-Point Distance for Beam Collision
                const beamLen = 700;
                
                // Player Center relative to Boss
                const px = p.x + 18 - b.x;
                const py = p.y + 30 - drawY;
                
                // Rotate player point by -lockedAngle to align beam with X-axis
                const cosA = Math.cos(-b.lockedAngle);
                const sinA = Math.sin(-b.lockedAngle);
                
                const rotX = px * cosA - py * sinA;
                const rotY = px * sinA + py * cosA;
                
                // Check bounds in rotated space (Axis Aligned now)
                // 0 < x < beamLen AND -beamWidth/2 < y < beamWidth/2
                if (rotX > 0 && rotX < beamLen && Math.abs(rotY) < 30) {
                    // FIX: Check isStunned and respawnTimer. Removed undefined invulnTimer.
                    if (!p.isStunned && this.respawnTimer <= 0) {
                        // DAMAGE: 30 in Phase 1, 45 in Phase 3
                        const dmg = b.phase === 3 ? 45 : 30;
                        p.takeDamage(dmg, p.x < b.x ? -1 : 1);
                        // takeDamage handles vy, but we can enforce logic here if needed
                        this.spawnParticles(p.x, p.y + 30, '#ff0000');
                    }
                }
                
                if (b.timer > 40) {
                    b.state = 'HOVER';
                    b.timer = 0;
                    b.attackState = 0;
                }
            }

            // --- PHASE 2: SKY BEAM ---
            if (b.state === 'CAST_SKY_BEAM') {
                b.timer++;
                b.skyBeamState = 1; 
                b.skyBeamX = p.x; 

                if (b.timer > 90) {
                    b.skyBeamState = 2; 
                    b.timer = 0;
                }
                
                if (b.skyBeamState === 2) {
                    b.timer++;
                    if (Math.abs(p.x - b.skyBeamX) < 40 && p.y > 300) {
                        // FIX: Correct damage check
                        if (!p.isStunned && this.respawnTimer <= 0) {
                            p.takeDamage(60, p.x < b.x ? -1 : 1);
                            this.spawnParticles(p.x, p.y + 30, '#00ffff');
                        }
                    }
                    if (b.timer > 60) {
                        b.state = 'HOVER';
                        b.skyBeamState = 0;
                    }
                }
            }

            // --- COLLISION (Body Contact) ---
            const bRect = { x: b.x - (30*BOSS_SCALE), y: drawY - (30*BOSS_SCALE), w: 60*BOSS_SCALE, h: 60*BOSS_SCALE };
            
            // Player Collision Rect (Matched to LevelCharacter logic)
            const pRect = {x: p.x + 18, y: p.y + 6, w: 36, h: 60};

            if (this.checkRectOverlap(pRect, bRect)) {
                // FIX: Correct damage check
                if (!p.isStunned && this.respawnTimer <= 0) {
                    p.takeDamage(20, p.x < b.x ? -1 : 1);
                }
            }

            // Take Damage Logic (Player hitting Boss)
            if (p.isAttacking && b.invulnTimer <= 0) {
                 if (this.checkRectOverlap(pRect, bRect)) {
                     b.hp -= 40; 
                     b.invulnTimer = 20;
                     this.spawnParticles(b.x, drawY, 'white');
                     
                     if (b.hp <= 0) {
                         b.dead = true;
                         this.explodeBoss();
                         setTimeout(() => this.handleVictory(), 2000);
                     }
                 }
            }
            if (b.invulnTimer > 0) b.invulnTimer--;
        }
        
        this.updateEffects();
    },

    handlePlayerDeath: function() {
        console.log("PLAYER DIED");
        this.player.hp = this.player.maxHp;
        this.player.isStunned = false;
        this.player.vx = 0; 
        this.player.vy = 0;
        
        // Respawn Logic
        this.player.x = 200; // Reset to safe left side
        this.player.y = 500;
        this.cameraX = 0;
        
        // Give temporary invulnerability
        this.respawnTimer = 180; // 3 seconds at 60fps
        this.flashIntensity = 1.0;
        
        // Optional: Reset Boss position if desired, or keep fight going
        // For difficulty, we keep the boss state (Level 5 style)
    },

    checkRectOverlap: function(r1, r2) {
        return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
                r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
    },

    spawnParticles: function(x, y, color) {
        for(let i=0; i<5; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                life: 1.0, color: color
            });
        }
    },

    explodeBoss: function() {
        for(let i=0; i<50; i++) {
            this.particles.push({
                x: this.boss.x, y: this.boss.y,
                vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
                life: 2.0, color: '#e94560'
            });
        }
    },

    updateEffects: function() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let part = this.particles[i];
            part.x += part.vx;
            part.y += part.vy;
            part.life -= 0.02;
            if (part.life <= 0) this.particles.splice(i, 1);
        }
    },

    handleVictory: function() {
        console.log("BOSS DEFEATED! Returning to Level 10...");
        
        // Stop boss music
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        
        if (window.Level10) {
            window.Level10.bossDefeated = true;
            if (window.Level10.player) {
                window.Level10.player.x = 8600; 
                window.Level10.player.y = 500;
            }
            this.engine.currentModule = window.Level10;
        }
    },

    render: function(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // --- MASSIVE WORLD ATMOSPHERE ---
        const grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#0a0a2a"); 
        grd.addColorStop(0.5, "#2a1b3d"); 
        grd.addColorStop(1, "#1a0505"); 
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(-this.cameraX, 0);

        // Parallax Background
        ctx.save();
        ctx.translate(this.cameraX * 0.5, 0); 
        ctx.fillStyle = "rgba(20, 20, 40, 0.5)";
        for(let i=-2; i<10; i++) {
            ctx.fillRect(i * 400, 50, 100, h);
            ctx.fillStyle = "rgba(100, 80, 150, 0.2)";
            ctx.fillRect(i * 400 + 20, 100 + (Math.sin(this.time + i)*50), 60, 200);
            ctx.fillStyle = "rgba(20, 20, 40, 0.5)"; 
        }
        ctx.restore();

        // Floor
        ctx.fillStyle = "#111"; 
        ctx.fillRect(0, 600, this.arenaWidth, 200);
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 600, this.arenaWidth, 10);
        
        ctx.fillStyle = "#000";
        ctx.fillRect(-100, 0, 100, 800); 
        ctx.fillRect(this.arenaWidth, 0, 100, 800); 

        // Particles
        for (let part of this.particles) {
            ctx.fillStyle = part.color;
            ctx.globalAlpha = part.life;
            ctx.fillRect(part.x, part.y, 5, 5);
        }
        ctx.globalAlpha = 1.0;

        if (this.player) {
            // Respawn visual (flicker)
            if (this.respawnTimer > 0) {
                 if (Math.floor(this.time * 20) % 2 === 0) ctx.globalAlpha = 0.5;
            }
            this.player.render(ctx);
            ctx.globalAlpha = 1.0;
        }

        // --- BOSS RENDERING ---
        if (this.boss && !this.boss.dead) {
            const b = this.boss;
            const drawY = b.y + b.floatOffset;

            // 1. Draw Hands
            b.hands.forEach(h => h.draw(ctx));

            // 2. Draw Body
            ctx.save();
            ctx.translate(b.x, drawY);
            ctx.scale(BOSS_SCALE, BOSS_SCALE);

            // --- PHASE 1 BEAM ---
            if (b.phase === 1 && b.attackState === 2) {
                ctx.save(); 
                ctx.translate(-3, -6); 
                ctx.rotate(b.lockedAngle); 
                
                // Visuals
                const beamWidth = 12 + Math.random() * 8; 
                ctx.shadowBlur = 20; ctx.shadowColor = '#ff2e63';
                ctx.fillStyle = '#e94560'; ctx.fillRect(0, -beamWidth/2, 700, beamWidth); 
                ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6; ctx.fillRect(0, -beamWidth/4, 700, beamWidth/2);
                ctx.restore();
            }

            // Body
            const bodyColor = (b.phase === 2 && Math.random() > 0.8) ? '#fff' : '#0a0a12';
            ctx.fillStyle = bodyColor; ctx.fillRect(-16, -10, 32, 28); 
            
            ctx.fillStyle = '#16213e'; ctx.fillRect(-8, 8, 6, 8); ctx.fillRect(2, 8, 6, 8);  
            ctx.fillStyle = '#1f4068'; ctx.fillRect(-9, 12, 8, 4); ctx.fillRect(1, 12, 8, 4);
            ctx.fillStyle = '#0f0f1b'; ctx.fillRect(-9, 16, 7, 6); ctx.fillRect(2, 16, 7, 6);
            
            ctx.fillStyle = '#111'; ctx.fillRect(-7, 0, 14, 10);
            ctx.fillStyle = '#30475e'; ctx.fillRect(-6, 2, 12, 2); ctx.fillRect(-6, 5, 12, 2);
            ctx.fillStyle = '#1f4068'; ctx.fillRect(-11, -10, 22, 12);
            ctx.fillStyle = '#16213e'; ctx.fillRect(-5, -8, 10, 8);

            // Eyes
            if (b.phase === 1) {
                if (b.attackState === 1) {
                     const flash = Math.sin(Date.now() / 50); ctx.fillStyle = '#fff'; 
                     for(let i=0; i<5; i++) { 
                        const dist = 15 - (b.timer/60)*10; const ang = Math.random() * Math.PI * 2; 
                        ctx.fillRect(-3 + Math.cos(ang)*dist, -6 + Math.sin(ang)*dist, 2, 2); 
                     }
                     ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e94560'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-3, -6, 4 + flash, 0, Math.PI*2); ctx.fill(); ctx.stroke();
                } else { 
                    ctx.fillStyle = '#7a042d'; ctx.fillRect(-3, -6, 6, 6); ctx.fillStyle = '#e94560'; ctx.fillRect(-1, -4, 2, 2); 
                }
            } else if (b.phase > 1) {
                ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-3, -6, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#fff'; 
                if(b.phase === 2) ctx.fillRect(-1, -4, 2, 2);
                if(b.phase === 3) ctx.fillRect(-2, -5, 4, 4); 
            }

            ctx.fillStyle = '#0f0f1b'; ctx.fillRect(-9, 8, 18, 3);
            ctx.fillStyle = '#8265a7'; ctx.fillRect(-2, 8, 4, 3);

            ctx.fillStyle = '#2a1b3d'; ctx.fillRect(-19, -14, 10, 12); ctx.fillRect(9, -14, 10, 12);  
            ctx.fillStyle = '#44318d'; ctx.fillRect(-19, -14, 2, 10); ctx.fillRect(17, -14, 2, 10);
            ctx.fillStyle = '#6a51b5'; ctx.fillRect(-16, -17, 2, 3); ctx.fillRect(14, -17, 2, 3);
            ctx.fillStyle = '#16213e'; ctx.fillRect(-9, -20, 18, 14);
            ctx.fillStyle = '#1f4068'; ctx.fillRect(-10, -22, 3, 6); ctx.fillRect(-11, -25, 2, 4); ctx.fillRect(7, -22, 3, 6); ctx.fillRect(9, -25, 2, 4); 
            ctx.fillStyle = '#0f0f1b'; ctx.fillRect(-7, -18, 14, 10);
            ctx.fillStyle = b.phase > 1 ? '#fff' : '#ff2e63'; ctx.fillRect(-5, -15, 4, 2); ctx.fillRect(1, -15, 4, 2);  
            ctx.fillStyle = '#30475e'; ctx.fillRect(-3, -11, 6, 3);
            ctx.restore();

            // --- SKY BEAM (Phase 2+) ---
            if (b.phase > 1 && b.skyBeamState > 0) {
                const groundY = 600; 
                if (b.skyBeamState >= 1) {
                    ctx.save();
                    ctx.translate(b.skyBeamX, groundY);
                    ctx.scale(1, 0.3); ctx.rotate(Date.now() * 0.005);
                    const rad = 30;
                    ctx.beginPath(); ctx.arc(0, 0, rad + Math.sin(Date.now()*0.01)*5, 0, Math.PI*2); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
                    ctx.beginPath(); ctx.rect(-rad/2, -rad/2, rad, rad); ctx.stroke();
                    ctx.restore();
                }
                if (b.skyBeamState === 2) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(b.skyBeamX - 40, 0, 80, groundY);
                    ctx.fillStyle = '#000'; ctx.fillRect(b.skyBeamX - 20, 0, 40, groundY);
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.skyBeamX, 0); 
                    for(let y=0; y<groundY; y+=10) ctx.lineTo(b.skyBeamX + (Math.random()-0.5)*15, y); ctx.stroke();
                    ctx.restore();
                }
            }
        } // END OF BOSS DRAWING BLOCK

        // CRITICAL FIX: Restore Camera View regardless of boss state
        ctx.restore(); 

        // --- UI & OVERLAYS (Screen Space) ---
        if (this.boss && !this.boss.dead) {
            const b = this.boss;
            // HP Bar
            const barW = 400; 
            const barX = (w - barW) / 2;
            const barY = 40;
            ctx.fillStyle = "black";
            ctx.fillRect(barX - 2, barY - 2, barW + 4, 14);
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(barX, barY, barW * (b.hp / b.maxHp), 10);
            ctx.strokeStyle = "#fff";
            ctx.strokeRect(barX, barY, barW, 10);
            
            // Vignette
            const grad = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, h);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,w,h);
            
        } else if (this.boss && this.boss.dead) {
             // Victory Text now draws in Screen Space (Correctly centered)
             ctx.fillStyle = "white";
             ctx.font = "30px monospace";
             ctx.textAlign = "center";
             ctx.fillText("VICTORY - RETURNING...", w/2, h/2);
             ctx.textAlign = "left";
        }

        // Screen Flash (Draws on top of everything, even if dead)
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
            ctx.fillRect(0, 0, w, h);
        }
    }
};