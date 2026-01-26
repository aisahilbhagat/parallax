// Check if character.js is the correct version
setTimeout(() => {
    if (!window.state || !window.FRAMES) {
        document.getElementById('error-msg').style.display = 'block';
    }
}, 500);

// --- ASSET LOADING ---
// 1. Fonts
const gameFontName = 'Zenzai Itacha';
const gameFont = new FontFace(gameFontName, 'url("Zenzai Itacha.ttf")');

gameFont.load().then((loadedFace) => {
    document.fonts.add(loadedFace);
    console.log('Zenzai Itacha font loaded successfully.');
}).catch((error) => {
    console.warn('Font loading failed (check file name in folder):', error);
});

// 2. Background Image
const bgImage = new Image();
bgImage.src = 'home bgm.png';

// --- TEXTURE GENERATION (DIRT) ---
let dirtPattern = null;

function initDirtPattern(ctx) {
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 128; 
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext('2d');

    // 1. Base Dirt Color
    pCtx.fillStyle = '#4a3020'; // Warm dark brown
    pCtx.fillRect(0, 0, 128, 128);

    // 2. Add Noise/Texture
    for (let i = 0; i < 400; i++) {
        // Random darker and lighter specks
        pCtx.fillStyle = Math.random() > 0.5 ? 'rgba(30, 15, 5, 0.3)' : 'rgba(120, 90, 60, 0.15)';
        const size = Math.random() * 2 + 1;
        pCtx.fillRect(Math.random() * 128, Math.random() * 128, size, size);
    }

    // 3. Add Pebbles/Stones
    for(let i=0; i<12; i++) {
         pCtx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Shadow
         const x = Math.random() * 128;
         const y = Math.random() * 128;
         const s = Math.random() * 4 + 2;
         pCtx.beginPath();
         pCtx.arc(x, y, s, 0, Math.PI * 2);
         pCtx.fill();
         
         // Highlight on pebble
         pCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
         pCtx.beginPath();
         pCtx.arc(x - 1, y - 1, s/2, 0, Math.PI * 2);
         pCtx.fill();
    }

    dirtPattern = ctx.createPattern(pCanvas, 'repeat');
}

// --- STATE MANAGEMENT ---
// This flag prevents the overlay from popping up on window resize
if (typeof window.hasInteracted === 'undefined') {
    window.hasInteracted = false;
}

// --- LEVEL SETUP ---
let FLOOR_Y = 0;

const buildLevel = () => {
    FLOOR_Y = window.innerHeight - 80;
    return [
        // Changed default color to brown as fallback
        { x: -5000, y: FLOOR_Y, w: 10000, h: 500, type: 'solid', color: '#4a3020' } 
    ];
};

let LEVEL = buildLevel();

// --- PARTICLE SYSTEMS ---
let globalTime = 0;
const windParticles = [];
const debrisParticles = []; 
const stars = []; 

const initWind = () => {
    windParticles.length = 0;
    for(let i=0; i<8; i++) { 
        windParticles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight - 150),
            speed: 6 + Math.random() * 8,
            length: 100 + Math.random() * 150, 
            amplitude: 5 + Math.random() * 15, 
            period: 0.01 + Math.random() * 0.02, 
            offset: Math.random() * Math.PI * 2 
        });
    }

    debrisParticles.length = 0;
    for(let i=0; i<6; i++) { 
        debrisParticles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight - 50),
            speed: 4 + Math.random() * 4,
            size: 1 + Math.random() * 2,
            oscillation: Math.random() * 0.1
        });
    }

    stars.length = 0;
    for(let i=0; i<150; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * (window.innerHeight - 200), 
            size: Math.random() * 1.5 + 0.5,
            baseAlpha: Math.random() * 0.5 + 0.2, 
            twinkleOffset: Math.random() * Math.PI * 2, 
            twinkleSpeed: 0.02 + Math.random() * 0.05 
        });
    }
};

// --- AUDIO MANAGER ---
const AudioManager = {
    t1: new Audio('/music-assets/wind.mp3'),
    t2: new Audio('/music-assets/wind.mp3'),
    clickSound: new Audio('/music-assets/mouse-click.wav'), 
    current: null, 
    volume: 0.5, 
    
    init() {
        this.t1.loop = false;
        this.t2.loop = false;
        this.clickSound.loop = false; 
        this.current = this.t1;
        this.setVolume(this.volume);
    },

    play() {
        const sounds = [this.t1, this.t2, this.clickSound];
        
        this.current.play().catch(e => { /* Handled by start click */ });
        const other = this.current === this.t1 ? this.t2 : this.t1;
        if (!other.paused && !other.ended) {
            other.play().catch(e => {});
        }
    },
    
    playClick() {
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(e => {});
    },

    pause() {
        this.t1.pause();
        this.t2.pause();
    },

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        this.t1.volume = this.volume;
        this.t2.volume = this.volume;
        this.clickSound.volume = this.volume; 
    },

    update() {
        if (this.current.duration && this.current.currentTime >= this.current.duration - 1) {
            const next = this.current === this.t1 ? this.t2 : this.t1;
            if (next.paused || next.ended) {
                next.currentTime = 0;
                next.play().catch(e => {});
                this.current = next;
            }
        }
    }
};

AudioManager.init();
window.AudioManager = AudioManager;

// --- CANVAS BUTTONS & MENU SYSTEM ---
let canvasButtons = [];
window.canvasMenuVisible = true; 
let activeModal = null; 
let isDraggingVolume = false; 

window.resetWelcomeScreen = function() {
    window.canvasMenuVisible = true;
    activeModal = null;
}

function startGame() {
    console.log('PLAY triggered');
    window.canvasMenuVisible = false; 
    activeModal = null;

    if (window.GameMenu) {
        window.GameMenu.active = true;
        if(window.GameMenu.init) window.GameMenu.init();
        return;
    }

    const script = document.createElement('script');
    script.src = 'menu.js';
    script.onload = () => { console.log('menu.js loaded successfully.'); };
    script.onerror = () => {
        console.error('Failed to load menu.js');
        window.canvasMenuVisible = true;
    };
    document.body.appendChild(script);
}

function openSettings() {
    activeModal = 'settings';
    AudioManager.pause(); 
}

function openAbout() {
    activeModal = 'about';
    AudioManager.pause(); 
}

function createCanvasButtons() {
    const baseW = 220;
    const baseH = 64;
    const baseGap = 30; 

    const totalBaseWidth = (3 * baseW) + (2 * baseGap);
    let scale = 1;
    const margin = 40;
    if (canvas.width < totalBaseWidth + margin) {
        scale = (canvas.width - margin) / totalBaseWidth;
    }

    const btnW = baseW * scale;
    const btnH = baseH * scale; 
    const gap = baseGap * scale;

    const totalWidth = (3 * btnW) + (2 * gap);
    const startX = (canvas.width - totalWidth) / 2;
    const rowY = (canvas.height / 2) + 60;

    canvasButtons = [
        { id: 'about',    label: 'ABOUT US',  x: startX,                    y: rowY, w: btnW, h: btnH, hot: false, mouseIsOver: false, pressed: false, pressTimer: 0, triggerOnUp: false, action: openAbout },
        { id: 'play',     label: 'PLAY',      x: startX + btnW + gap,       y: rowY, w: btnW, h: btnH, hot: false, mouseIsOver: false, pressed: false, pressTimer: 0, triggerOnUp: false, action: startGame },
        { id: 'settings', label: 'SETTINGS',  x: startX + (btnW + gap) * 2, y: rowY, w: btnW, h: btnH, hot: false, mouseIsOver: false, pressed: false, pressTimer: 0, triggerOnUp: false, action: openSettings }
    ];
}

function drawDirtButton(ctx, btn) {
    ctx.save();
    const depth = 8;
    const isPressed = btn.pressed || btn.pressTimer > 0;
    const colorSide = '#4a3121'; 
    const colorTop = btn.hot ? '#b37c45' : '#8b5a2b'; 
    const colorBorder = '#3c2a1e'; 
    const colorHighlight = '#d49b60'; 

    const faceY = isPressed ? btn.y + depth : btn.y;
    const faceH = btn.h - depth;

    if (!isPressed) {
        ctx.fillStyle = colorSide;
        ctx.fillRect(btn.x, btn.y + depth, btn.w, btn.h - depth);
        ctx.strokeStyle = colorBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y + depth, btn.w, btn.h - depth);
    }

    ctx.fillStyle = colorTop;
    ctx.fillRect(btn.x, faceY, btn.w, faceH);
    ctx.strokeStyle = colorBorder;
    ctx.lineWidth = 3;
    ctx.strokeRect(btn.x, faceY, btn.w, faceH);
    ctx.fillStyle = colorHighlight;
    ctx.fillRect(btn.x + 3, faceY + 3, btn.w - 6, 4);

    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for(let i=0; i<4; i++) {
        ctx.fillRect(btn.x + 10 + (i*40), faceY + 15 + (i%2)*10, 6, 6);
        ctx.fillRect(btn.x + 30 + (i*40), faceY + 30 - (i%2)*10, 4, 4);
    }

    ctx.font = 'bold ' + Math.floor(btn.h * 0.35) + 'px monospace'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(btn.label, btn.x + btn.w / 2 + 2, faceY + faceH / 2 + 2);
    ctx.fillStyle = '#ffeedd';
    ctx.fillText(btn.label, btn.x + btn.w / 2, faceY + faceH / 2);

    ctx.restore();
}

function drawGameTitle(ctx) {
    ctx.save();
    const fontSize = Math.min(120, Math.max(60, canvas.width * 0.15));
    ctx.font = `${fontSize}px "${gameFontName}", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const centerX = canvas.width / 2;
    const positionY = (canvas.height / 2) - 30;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0a1015'; 
    ctx.strokeText("ParallaX", centerX, positionY);

    const gradient = ctx.createLinearGradient(0, positionY - fontSize, 0, positionY);
    gradient.addColorStop(0, '#cfd8dc');   
    gradient.addColorStop(0.5, '#90a4ae'); 
    gradient.addColorStop(1, '#546e7a');   
    
    ctx.fillStyle = gradient;
    ctx.fillText("ParallaX", centerX, positionY);

    ctx.restore();
}

// --- INFO BOX / MODAL SYSTEM ---
function drawModal(ctx) {
    if (!activeModal) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = Math.min(600, canvas.width - 40);
    const h = 520; 
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#3c2a1e';
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = '#a06e3d';
    ctx.lineWidth = 2;
    ctx.strokeRect(x+6, y+6, w-12, h-12);
    ctx.textAlign = 'center';

    if (activeModal === 'about') {
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 36px monospace';
        ctx.fillText("CREDITS", x + w/2, y + 60);

        const startY = y + 120;
        const gap = 80;

        ctx.font = '24px monospace'; ctx.fillStyle = '#fff';
        ctx.fillText("Sahil Bhagat", x + w/2, startY);
        ctx.font = 'italic 18px monospace'; ctx.fillStyle = '#ffd700';
        ctx.fillText("(DEVELOPER)", x + w/2, startY + 25);

        ctx.font = '24px monospace'; ctx.fillStyle = '#fff';
        ctx.fillText("Ayush Tirkey", x + w/2, startY + gap);
        ctx.font = 'italic 18px monospace'; ctx.fillStyle = '#ffd700';
        ctx.fillText("(IDEA & GAME DESIGNER)", x + w/2, startY + gap + 25);

        ctx.font = '24px monospace'; ctx.fillStyle = '#fff';
        ctx.fillText("Aditya Raj", x + w/2, startY + gap * 2);
        ctx.font = 'italic 18px monospace'; ctx.fillStyle = '#ffd700';
        ctx.fillText("(LEVEL DESIGNER)", x + w/2, startY + gap * 2 + 25);

        ctx.font = '24px monospace'; ctx.fillStyle = '#fff';
        ctx.fillText("Mayank", x + w/2, startY + gap * 3);
        ctx.font = 'italic 18px monospace'; ctx.fillStyle = '#ffd700';
        ctx.fillText("(VIDEO ART & CUT SCENE DESIGNER)", x + w/2, startY + gap * 3 + 25);

    } else if (activeModal === 'settings') {
        ctx.fillStyle = '#ffeedd';
        ctx.font = 'bold 36px monospace';
        ctx.fillText("SETTINGS", x + w/2, y + 60);
        
        const volY = y + 150;
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText("Sound Volume", x + w/2, volY);

        const barW = 300;
        const barH = 16;
        const knobSize = 32;
        const barX = x + w/2 - barW/2;
        const barY = volY + 40;

        ctx.fillStyle = '#3c2a1e';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#2a1d15';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        const fillW = barW * AudioManager.volume;
        if(fillW > 0) {
            ctx.fillStyle = '#76ff03';
            ctx.fillRect(barX, barY, fillW, barH);
        }

        const knobX = barX + fillW - (knobSize/2);
        const knobY = barY + barH/2 - (knobSize/2);
        
        ctx.fillStyle = '#b37c45'; 
        ctx.fillRect(knobX, knobY, knobSize, knobSize);
        ctx.strokeStyle = '#fff'; 
        ctx.lineWidth = 2;
        ctx.strokeRect(knobX, knobY, knobSize, knobSize);
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(knobX + 8, knobY + 8, knobSize - 16, knobSize - 16);

        ctx.fillStyle = '#ccc';
        ctx.font = '16px monospace';
        ctx.fillText(Math.round(AudioManager.volume * 100) + "%", x + w/2, volY + 85);
    }

    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText("[ Click Outside to Close ]", x + w/2, y + h - 20);

    ctx.restore();
}

function getModalMetrics() {
    const w = Math.min(600, canvas.width - 40);
    const h = 520; 
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    return { x, y, w, h };
}

function checkSliderHit(mx, my) {
    if (activeModal !== 'settings') return false;
    const m = getModalMetrics();
    const volY = m.y + 150;
    const barW = 300;
    const barH = 16;
    const barX = m.x + m.w/2 - barW/2;
    const barY = volY + 40;
    
    const padding = 20;
    if (mx >= barX - padding && mx <= barX + barW + padding &&
        my >= barY - padding && my <= barY + barH + padding) {
        return true;
    }
    return false;
}

function updateVolumeFromMouse(mx) {
    const m = getModalMetrics();
    const barW = 300;
    const barX = m.x + m.w/2 - barW/2;
    
    let pct = (mx - barX) / barW;
    pct = Math.max(0, Math.min(1, pct));
    AudioManager.setVolume(pct);
}

function pointInButton(px, py, btn) {
    return px >= btn.x && py >= btn.y && px <= btn.x + btn.w && py <= btn.y + btn.h;
}

function playerOverlapsButton(btn) {
    if (!window.state || !window.state.hitbox) return false;
    const hb = window.state.hitbox;
    const px1 = window.state.x + hb.offsetX;
    const py1 = window.state.y + hb.offsetY;
    const px2 = px1 + hb.width;
    const py2 = py1 + hb.height;
    const bx1 = btn.x, by1 = btn.y, bx2 = btn.x + btn.w, by2 = btn.y + btn.h;
    return !(px2 < bx1 || px1 > bx2 || py2 < by1 || py1 > by2);
}

// --- NEW: START OVERLAY (BLUR & FULLSCREEN) ---
function createStartOverlay() {
    // 1. Create Overlay Div
    const overlay = document.createElement('div');
    overlay.id = 'start-game-overlay';
    // Style: Fullscreen, Blurred background
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark Tint
        backdropFilter: 'blur(10px)',          // The Magic Blur
        webkitBackdropFilter: 'blur(10px)',    // Safari support
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000', // Top of everything
        transition: 'opacity 0.6s ease'
    });

    // 2. Create Play Button
    const btn = document.createElement('button');
    btn.innerText = "PLAY";
    Object.assign(btn.style, {
        padding: '20px 60px',
        fontSize: '32px',
        fontFamily: 'monospace',
        fontWeight: 'bold',
        color: '#ffeedd',
        backgroundColor: '#8b5a2b',
        border: '6px solid #3c2a1e',
        boxShadow: '0 8px 0 #2a1d15, 0 20px 20px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        textTransform: 'uppercase',
        outline: 'none',
        letterSpacing: '2px',
        transition: 'all 0.1s'
    });

    // Hover/Active Effects
    btn.onmouseover = () => { btn.style.backgroundColor = '#a06e3d'; };
    btn.onmouseout = () => { btn.style.backgroundColor = '#8b5a2b'; };
    btn.onmousedown = () => { 
        btn.style.transform = 'translateY(6px)'; 
        btn.style.boxShadow = '0 2px 0 #2a1d15, 0 5px 5px rgba(0,0,0,0.5)';
    };

    // 3. Click Action
    btn.onclick = () => {
        // MARK: Interaction happened
        window.hasInteracted = true; 

        // A. Trigger Fullscreen
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(err => console.log(err));
        } else if (docEl.webkitRequestFullscreen) { 
            docEl.webkitRequestFullscreen(); 
        }

        // B. Start Audio
        AudioManager.play();

        // C. Fade out & Remove
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 600);
    };

    overlay.appendChild(btn);
    document.body.appendChild(overlay);
}

// --- OVERRIDE INITIALIZATION ---
const initGame = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    LEVEL = buildLevel();
    initWind();
    
    // Initialize Dirt Texture
    const ctx = canvas.getContext('2d');
    initDirtPattern(ctx);
    
    if (window.state) {
        window.state.groundY = FLOOR_Y;
        window.state.x = (window.innerWidth / 2) - 18;
        window.state.y = FLOOR_Y - 60;
        window.state.vx = 0;
        window.state.vy = 0;
    }
    createCanvasButtons();
    
    // START THE OVERLAY
    // Only show if we haven't interacted yet AND it's not already there.
    if (!window.hasInteracted && !document.getElementById('start-game-overlay')) {
        createStartOverlay();
    }
};

window.addEventListener('resize', initGame);
setTimeout(initGame, 100); 

// --- RENDER FUNCTIONS ---
function renderStars(ctx, time) {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'white';
    for (const star of stars) {
        const alpha = star.baseAlpha + Math.sin(time * 2 + star.twinkleOffset) * 0.2;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function renderKingdom(ctx, time) {
    // REPLACED: Use the user's uploaded image instead of drawing shapes.
    // If the image is loaded, draw it to fill the entire canvas.
    if (bgImage.complete && bgImage.naturalWidth !== 0) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    }
}

function renderWind(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowBlur = 0;
    ctx.lineCap = 'round';
    for(let p of windParticles) {
        const wave1 = Math.sin(time * 5 + p.offset) * p.amplitude;
        const wave2 = Math.cos(time * 4 + p.offset) * p.amplitude; 
        const startX = p.x;
        const startY = p.y + wave1;
        const endX = p.x + p.length;
        const endY = p.y + wave2;
        const grad = ctx.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)'); 
        grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2; 
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + p.length * 0.3, startY - p.amplitude, startX + p.length * 0.7, endY + p.amplitude, endX, endY);
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200, 255, 220, 0.3)';
    for(let d of debrisParticles) {
        const yOffset = Math.sin(time * 2 + d.x * 0.01) * 10;
        ctx.beginPath();
        ctx.arc(d.x, d.y + yOffset, d.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// --- MAIN RENDER LOOP ---
window.render = function() {
    const ctx = window.ctx;
    const state = window.state;
    
    if (!ctx || !state) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderStars(ctx, globalTime);
    renderKingdom(ctx, globalTime); // Now renders the image
    renderWind(ctx, globalTime);

    if (window.canvasMenuVisible) { 
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        drawGameTitle(ctx);

        for (const btn of canvasButtons) {
            drawDirtButton(ctx, btn);
        }
        ctx.restore();
    }

    for (let block of LEVEL) {
        // USE TEXTURE OR FALLBACK COLOR
        ctx.fillStyle = dirtPattern || block.color; 
        ctx.fillRect(block.x, block.y, block.w, block.h);
        
        ctx.fillStyle = '#EC9633'; 
        ctx.fillRect(block.x, block.y, block.w, 15);
        ctx.strokeStyle = '#EC9633'; 
        ctx.lineWidth = 2; // Reverted to thin lines
        ctx.beginPath();
        const startX = Math.max(block.x, 0);
        const endX = Math.min(block.x + block.w, canvas.width);
        // Changed step to 3 for higher density
        for (let i = startX; i < endX; i += 3) {
            // REPLACED: Randomized height using a pseudo-random hash based on 'i'
            // Using Math.sin(i * constant) creates a deterministic random value for each blade
            // so it looks random but doesn't flicker every frame.
            const pseudoRandom = Math.abs(Math.sin(i * 132.19));
            const baseHeight = 20 + pseudoRandom * 30; // Height varies randomly between 20px and 50px

            const windForce = Math.sin(globalTime * 2 + i * 0.005) * 8; 
            const turbulence = Math.sin(globalTime * 8 + i * 0.1) * 2; 
            const lean = 5 + windForce + turbulence;
            ctx.moveTo(i, block.y);
            ctx.quadraticCurveTo(i + lean * 0.5, block.y - baseHeight * 0.5, i + lean, block.y - baseHeight);
        }
        ctx.stroke();
    }

    if (window.drawPixelSprite && window.FRAMES) {
        const currentFrameSet = window.FRAMES[state.anim];
        if (currentFrameSet) {
            const safeIndex = state.frameIndex % currentFrameSet.length;
            const offY = (typeof window.SPRITE_OFFSET_Y !== 'undefined') ? window.SPRITE_OFFSET_Y : -6;
            window.drawPixelSprite(ctx, currentFrameSet[safeIndex], state.x, state.y + offY, 6, state.facingRight);
        }
    }

    drawModal(ctx);
};

// --- UPDATE LOOP ---
const originalUpdate = window.update;
let wasAttackingLastFrame = false; 

window.update = function() {
    if (activeModal) return;

    if (originalUpdate) originalUpdate(); 

    AudioManager.update();
    
    const state = window.state;
    if(!state) return;

    globalTime += 0.02; 

    for(let p of windParticles) {
        p.x += p.speed;
        if(p.x > canvas.width) {
            p.x = -p.length - (Math.random() * 200); 
            p.y = Math.random() * (window.innerHeight - 150);
        }
    }
    for(let d of debrisParticles) {
        d.x += d.speed;
        if(d.x > canvas.width) {
            d.x = -10;
            d.y = Math.random() * (window.innerHeight - 50);
        }
    }

    if (state.y + state.hitbox.offsetY + state.hitbox.height >= FLOOR_Y) {
        state.y = FLOOR_Y - (state.hitbox.offsetY + state.hitbox.height);
        state.vy = 0;
        state.isGrounded = true;
        if(!state.wasGrounded) state.justLanded = true;
    }
    state.wasGrounded = state.isGrounded;

    // --- MENU INTERACTION ---
    if (window.canvasMenuVisible) { 
        // If the start overlay is still present, block menu interactions
        if (document.getElementById('start-game-overlay')) return;

        const isAttackingNow = state.isAttacking;
        for (const btn of canvasButtons) {
            if (btn.pressTimer > 0) {
                btn.pressTimer--;
                if (btn.pressTimer === 0 && btn.triggerOnUp) {
                    btn.action();
                    btn.triggerOnUp = false;
                }
            }

            const playerHit = playerOverlapsButton(btn);

            if (playerHit) {
                if (isAttackingNow && !wasAttackingLastFrame && btn.pressTimer === 0) {
                    btn.pressTimer = 15; 
                    btn.triggerOnUp = true; 
                }
            }

            btn.hot = playerHit || btn.mouseIsOver;
        }
        wasAttackingLastFrame = isAttackingNow;
    }
};

// --- EVENT LISTENERS FOR MENU ---

canvas.addEventListener('mousemove', (e) => {
    // Block interaction if overlay is up
    if (document.getElementById('start-game-overlay')) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (activeModal === 'settings' && isDraggingVolume) {
        updateVolumeFromMouse(mx);
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (activeModal) {
        if (checkSliderHit(mx, my)) {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'default';
        }
        return;
    }

    if (!window.canvasMenuVisible) {
        canvas.style.cursor = 'default';
        return;
    }
    
    let anyHover = false;
    for (const btn of canvasButtons) {
        const isOver = pointInButton(mx, my, btn);
        btn.mouseIsOver = isOver; 
        if (isOver) anyHover = true;
    }
    
    canvas.style.cursor = anyHover ? 'pointer' : 'default';
});

canvas.addEventListener('mousedown', (e) => {
    if (document.getElementById('start-game-overlay')) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (activeModal) {
        if (activeModal === 'settings' && checkSliderHit(mx, my)) {
            isDraggingVolume = true;
            updateVolumeFromMouse(mx); 
            return;
        }

        const m = getModalMetrics();
        if (mx < m.x || mx > m.x + m.w || my < m.y || my > m.y + m.h) {
            activeModal = null;
            AudioManager.play(); 
        }
        return;
    }

    if (!window.canvasMenuVisible) return;
    
    for (const btn of canvasButtons) {
        if (pointInButton(mx, my, btn)) {
            btn.pressed = true; 
            return;
        }
    }
});

window.addEventListener('mouseup', () => {
    if (document.getElementById('start-game-overlay')) return;

    if (isDraggingVolume) {
        isDraggingVolume = false;
    }

    if (activeModal) return; 

    if (!window.canvasMenuVisible) return;
    for (const btn of canvasButtons) {
        if (btn.pressed) {
            btn.pressed = false; 
            AudioManager.playClick(); 
            btn.action(); 
        }
    }
});

canvas.addEventListener('touchstart', (e) => {
    if (document.getElementById('start-game-overlay')) return;

    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const mx = (t.clientX - rect.left) * (canvas.width / rect.width);
    const my = (t.clientY - rect.top) * (canvas.height / rect.height);

    if (activeModal) {
            if (activeModal === 'settings' && checkSliderHit(mx, my)) {
            isDraggingVolume = true;
            updateVolumeFromMouse(mx);
            e.preventDefault();
            return;
        }

        const m = getModalMetrics();
        if (mx < m.x || mx > m.x + m.w || my < m.y || my > m.y + m.h) {
            activeModal = null;
            AudioManager.play();
        }
        
        e.preventDefault();
        return;
    }

    if (!window.canvasMenuVisible) return;
    if (!t) return;
    
    for (const btn of canvasButtons) {
        if (pointInButton(mx, my, btn)) {
            btn.pressed = true;
            e.preventDefault();
            setTimeout(() => { 
                if(btn.pressed) {
                    btn.pressed = false; 
                    AudioManager.playClick(); 
                    btn.action(); 
                }
            }, 150);
            return;
        }
    }
}, {passive:false});

canvas.addEventListener('touchmove', (e) => {
        if (activeModal === 'settings' && isDraggingVolume) {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const mx = (t.clientX - rect.left) * (canvas.width / rect.width);
        updateVolumeFromMouse(mx);
        e.preventDefault();
        }
}, {passive:false});

window.addEventListener('touchend', () => {
    isDraggingVolume = false;
});