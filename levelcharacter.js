/**
 * LEVEL CHARACTER (Final)
 * - Restored Animations (Original Sprites + Timing)
 * - Restored Dev Mode (Alt + D for Invincibility)
 * - Uses KeyMap for movement, EventListener for Cheats.
 */

// --- 0. AUTO-LOADER FOR KEYMAP ---
(function loadKeyMapSystem() {
    // If KeyMap isn't loaded and we haven't tried loading it yet
    if (!window.KeyMap && !document.querySelector('script[src="keymap.js"]')) {
        console.log("LevelCharacter: keymap.js missing, injecting it now...");
        const script = document.createElement('script');
        script.src = "keymap.js";
        script.onload = () => console.log("LevelCharacter: keymap.js loaded successfully.");
        document.body.appendChild(script);
    }
})();

// --- 1. GLOBALS & CHEAT CODES ---
window.isInvincible = false;

// RESTORED: Cheat Code Listener (Alt + D)
// We need a direct listener because KeyMap usually only tracks game keys.
window.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyD') {
        window.isInvincible = !window.isInvincible;
        console.log("%c[DEV MODE] Invincible: " + window.isInvincible, 
            window.isInvincible ? "color: #00ff00; font-weight: bold;" : "color: #ff0000; font-weight: bold;"
        );
    }
});

class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.initialized = false;
    }
    init() {
        if (this.initialized) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return; 
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; 
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
    }
    playTone(freq, type, duration, slideTo = null) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    playNoise(duration) {
        if (!this.initialized) this.init();
        if (!this.ctx) return;
        const bSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    }
    jump()   { this.playTone(150, 'square', 0.1, 600); }
    attack() { this.playTone(400, 'sawtooth', 0.1, 100); }
    damage() { this.playTone(200, 'sawtooth', 0.3, 50); }
    step()   { this.playNoise(0.05); }
}
window.SoundManager = new SoundManager();

// --- 2. MOBILE TOUCH INTEGRATION ---
if (!window.touchInitialized) {
    window.touchInitialized = true;
    const bindTouch = (id, action) => {
        const el = document.getElementById(id);
        if(!el) return;
        const setInput = (val) => {
            if (window.KeyMap) window.KeyMap.setVirtual(action, val);
        };
        el.addEventListener('touchstart', (e) => { e.preventDefault(); setInput(true); }, {passive:false});
        el.addEventListener('touchend', (e) => { e.preventDefault(); setInput(false); }, {passive:false});
        el.addEventListener('mousedown', () => setInput(true));
        el.addEventListener('mouseup', () => setInput(false));
    };

    setTimeout(() => {
        bindTouch('btn-left', 'LEFT');
        bindTouch('btn-right', 'RIGHT');
        bindTouch('btn-jump', 'JUMP');
        const btnAtk = document.getElementById('btn-atk');
        if (btnAtk) {
            btnAtk.addEventListener('touchstart', (e) => { 
                e.preventDefault(); 
                if(window.KeyMap) {
                    window.KeyMap.setVirtual('ATTACK', true); 
                    setTimeout(() => window.KeyMap.setVirtual('ATTACK', false), 100);
                }
            }, {passive: false});
        }
    }, 1000); 
}

// --- 3. CHARACTER CLASS ---
window.LevelCharacter = class LevelCharacter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 36;
        this.height = 60;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        this.groundY = 500;
        this.gravity = 0.6;
        this.jumpForce = -14;
        this.speed = 4;
        
        // State
        this.facingRight = true;
        this.isGrounded = false;
        this.isAttacking = false;
        this.anim = "idle";
        
        // Input Lock
        this.jumpLockState = false; 

        // Gameplay
        this.hp = 100;
        this.maxHp = 100;
        this.isStunned = false;
        this.stunTimer = 0;
        
        // Climbing
        this.isClimbing = false;
        this.climbSpeed = 3;

        // Animation
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.stepTimer = 0; 
        this.pixelSize = 6;
        this.spriteOffsetY = -6;

        this.hitbox = { offsetX: 18, offsetY: 6, width: 36, height: 60 };
        this.setupAssets();
    }

    setupAssets() {
        this.PALETTE = {
            ' ': null, '.': '#000000', 's': '#ffccaa', 'h': '#aaccff',
            'm': '#666666', 'b': '#3366ff', 'd': '#2244aa', 'g': '#dddddd', 'w': '#8B4513'
        };

        const idle = [[
            "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ",
            "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    "
        ]];
        
        const run = [
            [ "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", "  d.bb.d    ", "  d.bb.d    ", "  .bbbb.    ", "    ...m.   ", "       ..   " ],
            [ "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    " ],
            [ "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", "  d.bb.d    ", "  d.bb.d    ", "  .bbbb.    ", "   .m...    ", "   ..       " ],
            [ "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  .bbbb.    ", " .d.bb.d.   ", " .d.bb.d.   ", " ..bbbb..   ", "  .m..m.    " ]
        ];

        // RESTORED: Original attack frames with sword effects
        const attack = [
            [ "   gg       ", "   gg       ", "  mmmmmm    ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......   ", "  wbbbb.    ", " .w.bb.d.   ", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    " ],
            [ "            ", "            ", "  mmmmmm    ", " m.mhhmm.   ", " m.......   ", "  .s.s.s.   ", "  .......gww", "  .bbbb.gggg", " .d.bb.d.gww", " ..bbbb..   ", "  .m..m.    ", "  ..  ..    " ]
        ];

        this.FRAMES = {
            idle: idle,
            run: run,
            jump: [run[2]],
            fall: [run[1]],
            attack: attack,
            climb: [idle[0]] 
        };
    }

    // -- API METHODS --

    enterClimb(centerX) {
        if (!this.isClimbing) {
            this.isClimbing = true;
            this.vx = 0;
            this.vy = 0;
            if (centerX !== undefined) this.x = centerX - (this.width / 2) - 10; 
        }
    }

    exitClimb() {
        if (this.isClimbing) this.isClimbing = false;
    }

    takeDamage(amount, knockbackDir = 0) {
        // CHEAT CODE CHECK
        if (window.isInvincible) return;
        
        if (this.hp <= 0) return; 

        this.hp -= amount;
        if (window.SoundManager) window.SoundManager.damage();
        
        if (this.hp < 0 && window.Level2 && window.Level2.onLowHealth) {
             window.Level2.onLowHealth(this);
        }

        this.isStunned = true;
        this.stunTimer = 15; 
        this.vx = knockbackDir * 8;
        this.vy = -4;
        this.anim = "fall";
    }

    wallSlide() {
        if (this.vy > 2) this.vy = 2;
    }

    update() {
        // --- SAFE INPUT FETCH ---
        const KM = window.KeyMap;
        const isUp     = KM ? KM.isPressed('UP') : false;
        const isDown   = KM ? KM.isPressed('DOWN') : false;
        const isLeft   = KM ? KM.isPressed('LEFT') : false;
        const isRight  = KM ? KM.isPressed('RIGHT') : false;
        const isJump   = KM ? KM.isPressed('JUMP') : false;
        const isAttack = KM ? KM.isPressed('ATTACK') : false;

        // 0. Handle Stun
        if (this.isStunned) {
            this.stunTimer--;
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
                this.vx = 0;
            }
            // Ground collision during stun
            const bottomY = this.y + this.hitbox.offsetY + this.hitbox.height;
            if (bottomY >= this.groundY) {
                this.y = this.groundY - (this.hitbox.offsetY + this.hitbox.height);
                this.vy = 0;
                this.isGrounded = true;
            }
            return;
        }

        // 1. Movement Logic
        if (this.isClimbing) {
            this.isGrounded = false;
            this.anim = "climb";
            
            // Vertical Movement
            if (isUp) this.vy = -this.climbSpeed;
            else if (isDown) this.vy = this.climbSpeed;
            else this.vy = 0;

            // SFX: Climbing steps
            if (this.vy !== 0) {
                this.stepTimer++;
                if (this.stepTimer > 12) { 
                    if (window.SoundManager) window.SoundManager.step();
                    this.stepTimer = 0;
                }
            }

            this.x += this.vx;
            this.y += this.vy;
            
            // Lock horizontal
            this.vx = 0;

        } else {
            // Standard Movement
            if (!this.isAttacking) {
                if (isRight) {
                    this.vx = this.speed;
                    this.facingRight = true;
                    this.anim = "run";
                } else if (isLeft) {
                    this.vx = -this.speed;
                    this.facingRight = false;
                    this.anim = "run";
                } else {
                    this.vx = 0;
                    this.anim = "idle";
                }

                // SFX: Running Steps
                if (this.vx !== 0 && this.isGrounded) {
                    this.stepTimer++;
                    if (this.stepTimer > 15) { 
                        if (window.SoundManager) window.SoundManager.step();
                        this.stepTimer = 0;
                    }
                } else {
                    this.stepTimer = 10;
                }
            } else {
                this.vx = 0;
            }

            // Jump Logic
            if (!isJump) this.jumpLockState = false;

            if (isJump && !this.jumpLockState && this.isGrounded && !this.isAttacking) {
                this.vy = this.jumpForce;
                this.isGrounded = false;
                this.jumpLockState = true; 
                
                // SFX: Jump
                if (window.SoundManager) window.SoundManager.jump();
            }

            // Attack Logic
            if (isAttack && !this.isAttacking) {
                this.isAttacking = true;
                this.anim = "attack";
                this.frameIndex = 0;
                // No timer reset here (restored behavior)
                
                // SFX: Attack
                if (window.SoundManager) window.SoundManager.attack();

                setTimeout(() => { this.isAttacking = false; }, 300);
            }

            // Physics
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;

            // Ground Collision
            const bottomY = this.y + this.hitbox.offsetY + this.hitbox.height;
            if (bottomY >= this.groundY) {
                this.y = this.groundY - (this.hitbox.offsetY + this.hitbox.height);
                this.vy = 0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }

            // Animation State Override
            if (this.isAttacking) this.anim = "attack";
            else if (!this.isGrounded) {
                if (this.vy < 0) this.anim = "jump";
                else this.anim = "fall";
            }
        }

        // Animation Frame Advance
        this.frameTimer++;
        const animSpeed = (this.anim === "attack") ? 8 : 10;
        
        if (this.frameTimer >= animSpeed) {
            this.frameIndex++;
            this.frameTimer = 0;
        }
    }

    render(ctx) {
        if (!ctx) return;
        
        const set = this.FRAMES[this.anim] || this.FRAMES.idle;
        const frameData = set[this.frameIndex % set.length];
        
        this.drawPixelSprite(ctx, frameData, this.x, this.y + this.spriteOffsetY, this.pixelSize, this.facingRight);
        
        // Debug HP bar if damaged
        if (this.hp < this.maxHp) {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x, this.y - 10, 36, 4);
            ctx.fillStyle = "lime";
            ctx.fillRect(this.x, this.y - 10, 36 * (this.hp / this.maxHp), 4);
        }
    }

    drawPixelSprite(ctx, frameData, x, y, scale, flip) {
        if (!frameData) return;
        ctx.save();
        
        const width = frameData[0].length * scale;
        
        if (!flip) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(x, y);
        }

        for (let r = 0; r < frameData.length; r++) {
            const row = frameData[r];
            for (let c = 0; c < row.length; c++) {
                const char = row[c];
                const color = this.PALETTE[char];
                if (color) {
                    ctx.fillStyle = color;
                    ctx.fillRect(c * scale, r * scale, scale, scale);
                }
            }
        }
        ctx.restore();
    }
};