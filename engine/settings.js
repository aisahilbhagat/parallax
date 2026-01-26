/**
 * SETTINGS SCREEN
 * Features:
 * - Audio Volume Control
 * - Dual Column Input Remapping
 * - Mouse Click Remapping Support
 * - Reset Controls to Default
 */

(function loadKeyMapSystem() {
    if (!window.KeyMap && !document.querySelector('script[src="./keymap.js"]')) {
        const script = document.createElement('script');
        script.src = "./keymap.js";
        document.body.appendChild(script);
    }
})();

window.SettingsScreen = {
    volume: 0.5, 
    isDragging: false,
    remapTarget: null, 
    
    backBtn: { x: 40, y: 40, w: 100, h: 40, label: "BACK", scale: 1, targetScale: 1, isHovered: false, isPressed: false },
    resetBtn: { x: 0, y: 0, w: 180, h: 40, label: "RESET DEFAULTS", scale: 1, targetScale: 1, isHovered: false, isPressed: false },
    slider: { x: 0, y: 0, w: 320, h: 24 },
    bindingButtons: [],
    clickSound: new Audio('/music-assets/mouse-click.wav'),

    init: function() {
        this.backBtn.scale = 1;
        this.resetBtn.scale = 1;
        this.isDragging = false;
        this.remapTarget = null;

        if (window.GameMenu && window.GameMenu.menuMusic) {
            this.volume = window.GameMenu.menuMusic.volume;
        }

        if (!this.inputListenerAttached) {
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
            this.inputListenerAttached = true;
        }
        this.refreshBindingButtons();
    },

    refreshBindingButtons: function() {
        if (!window.KeyMap) return;
        this.bindingButtons = [];
        const actions = ['LEFT', 'RIGHT', 'JUMP', 'ATTACK']; 
        const startY = window.innerHeight / 2 + 30;
        const gap = 50;
        const col1X = -120; 
        const col2X = 120;  

        actions.forEach((action, i) => {
            const y = startY + (i * gap);
            this.bindingButtons.push({ action: action, index: 0, xOffset: col1X, y: y, w: 160, h: 35, isHovered: false });
            this.bindingButtons.push({ action: action, index: 1, xOffset: col2X, y: y, w: 160, h: 35, isHovered: false });
        });
        this.resetBtn.y = startY + (actions.length * gap) + 30;
    },

    // --- KEYBOARD BINDING ---
    handleKeyDown: function(e) {
        if (!window.GameMenu || window.GameMenu.currentScreen !== this) return;
        if (!this.remapTarget) return;

        e.preventDefault(); e.stopPropagation();
        
        window.KeyMap.bind(this.remapTarget.action, this.remapTarget.index, e.code);
        this.finishRemap();
    },

    finishRemap: function() {
        this.playClick();
        this.remapTarget = null;
    },

    getMousePos: function(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    },

    updateVolumeFromMouse: function(mouseX, cx) {
        const startX = cx - this.slider.w / 2;
        let val = (mouseX - startX) / this.slider.w;
        val = Math.max(0, Math.min(1, val));
        this.volume = val;
        if (window.GameMenu) window.GameMenu.setMusicVolume(this.volume);
    },

    handleMouseMove: function(e, canvas) {
        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        let cursor = 'default';

        // UI Interactions
        const updateBtn = (btn, tx, ty) => {
            const bx = tx || btn.x; const by = ty || btn.y;
            if (pos.x >= bx && pos.x <= bx + btn.w && pos.y >= by && pos.y <= by + btn.h) {
                btn.isHovered = true; btn.targetScale = btn.isPressed ? 0.95 : 1.1; cursor = 'pointer';
            } else {
                btn.isHovered = false; btn.targetScale = 1.0;
            }
        };

        updateBtn(this.backBtn);
        updateBtn(this.resetBtn, cx - this.resetBtn.w/2, this.resetBtn.y);

        const sX = cx - this.slider.w / 2; const sY = canvas.height / 2 - 80;
        if ((pos.x >= sX - 10 && pos.x <= sX + this.slider.w + 10 && pos.y >= sY - 15 && pos.y <= sY + this.slider.h + 15) || this.isDragging) {
            cursor = 'pointer';
            if(this.isDragging) this.updateVolumeFromMouse(pos.x, cx);
        }

        if (!this.isDragging && !this.remapTarget) {
            this.bindingButtons.forEach(btn => {
                const btnX = cx + btn.xOffset - btn.w / 2;
                if (pos.x >= btnX && pos.x <= btnX + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                    btn.isHovered = true; cursor = 'pointer';
                } else {
                    btn.isHovered = false;
                }
            });
        }
        document.body.style.cursor = cursor;
    },

    handleMouseDown: function(e, canvas) {
        // --- 1. MOUSE BINDING LOGIC ---
        // If we are waiting for a keybind, CLICKING sets the bind to that mouse button.
        if (this.remapTarget) {
            e.preventDefault(); e.stopPropagation();
            let code = 'MouseLeft';
            if (e.button === 1) code = 'MouseMiddle';
            if (e.button === 2) code = 'MouseRight';
            
            window.KeyMap.bind(this.remapTarget.action, this.remapTarget.index, code);
            this.finishRemap();
            return;
        }

        const pos = this.getMousePos(e, canvas);
        const cx = canvas.width / 2;
        
        // Back Button
        if (pos.x >= this.backBtn.x && pos.x <= this.backBtn.x + this.backBtn.w && pos.y >= this.backBtn.y && pos.y <= this.backBtn.y + this.backBtn.h) {
            this.backBtn.isPressed = true; this.backBtn.targetScale = 0.95; this.playClick(); return;
        }

        // Reset Button
        const rX = cx - this.resetBtn.w / 2;
        if (pos.x >= rX && pos.x <= rX + this.resetBtn.w && pos.y >= this.resetBtn.y && pos.y <= this.resetBtn.y + this.resetBtn.h) {
            this.resetBtn.isPressed = true; this.resetBtn.targetScale = 0.95; this.playClick(); return;
        }

        // Slider
        const sX = cx - this.slider.w / 2; const sY = canvas.height / 2 - 80;
        if (pos.x >= sX - 10 && pos.x <= sX + this.slider.w + 10 && pos.y >= sY - 15 && pos.y <= sY + this.slider.h + 15) {
            this.isDragging = true; this.updateVolumeFromMouse(pos.x, cx); return;
        }

        // Keybind Buttons (Start Remapping)
        this.bindingButtons.forEach(btn => {
            const btnX = cx + btn.xOffset - btn.w / 2;
            if (pos.x >= btnX && pos.x <= btnX + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
                this.remapTarget = { action: btn.action, index: btn.index };
                this.playClick();
            }
        });
    },

    handleMouseUp: function(e) {
        this.isDragging = false;
        
        const b = this.backBtn;
        if (b.isPressed) {
            b.isPressed = false; b.targetScale = 1.0;
            if (b.isHovered && window.GameMenu) window.GameMenu.closeSubScreen();
        }

        const r = this.resetBtn;
        if (r.isPressed) {
            r.isPressed = false; r.targetScale = 1.0;
            if (r.isHovered && window.KeyMap) {
                window.KeyMap.reset();
                this.refreshBindingButtons();
            }
        }
    },

    playClick: function() {
        this.clickSound.currentTime = 0;
        this.clickSound.play().catch(e => {});
    },

    render: function(ctx, canvas) {
        if (this.bindingButtons.length === 0) this.refreshBindingButtons();

        // Background
        ctx.fillStyle = "#1a0a0a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2; const cy = canvas.height / 2;

        // Title
        ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.font = "bold 40px monospace";
        ctx.shadowColor = "#000"; ctx.shadowBlur = 10; ctx.fillText("SYSTEM SETTINGS", cx, 60); ctx.shadowBlur = 0;

        // --- VOLUME ---
        const sY = cy - 80; const sX = cx - this.slider.w / 2;
        ctx.fillStyle = "#ccc"; ctx.font = "bold 20px monospace";
        ctx.fillText(`MUSIC VOLUME: ${Math.round(this.volume * 100)}%`, cx, sY - 25);
        
        ctx.save(); ctx.beginPath(); ctx.roundRect(sX, sY, this.slider.w, this.slider.h, 12);
        ctx.fillStyle = "#0f0505"; ctx.fill(); ctx.strokeStyle = "#444"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

        const pW = this.slider.w * this.volume;
        if (pW > 0) {
            ctx.save(); ctx.beginPath(); ctx.roundRect(sX + 2, sY + 2, pW - 4, this.slider.h - 4, 10);
            const g = ctx.createLinearGradient(sX, sY, sX + pW, sY); g.addColorStop(0, "#2980b9"); g.addColorStop(1, "#3498db");
            ctx.fillStyle = g; ctx.shadowColor = "#3498db"; ctx.shadowBlur = 10; ctx.fill(); ctx.restore();
        }
        ctx.beginPath(); ctx.arc(sX + pW, sY + this.slider.h/2, 14, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();

        // --- CONTROLS ---
        ctx.font = "bold 24px monospace"; ctx.fillStyle = "#ffcc00"; ctx.fillText("- CONTROLS -", cx, cy - 10);
        ctx.font = "14px monospace"; ctx.fillStyle = "#888";
        ctx.fillText("PRIMARY", cx - 120, cy + 15); ctx.fillText("SECONDARY", cx + 120, cy + 15);

        if (window.KeyMap) {
            ctx.font = "18px monospace";
            this.bindingButtons.forEach(btn => {
                const btnX = cx + btn.xOffset - btn.w / 2;
                const isActive = this.remapTarget && this.remapTarget.action === btn.action && this.remapTarget.index === btn.index;
                
                ctx.save(); ctx.beginPath(); ctx.roundRect(btnX, btn.y, btn.w, btn.h, 8);
                if (isActive) { ctx.fillStyle = "#c0392b"; ctx.strokeStyle = "#e74c3c"; ctx.lineWidth = 3; } 
                else { ctx.fillStyle = btn.isHovered ? "#34495e" : "#2c3e50"; ctx.strokeStyle = "#555"; ctx.lineWidth = 1; }
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = "#fff";
                const keys = window.KeyMap.bindings[btn.action] || [];
                const rawKey = keys[btn.index];
                const keyText = rawKey ? rawKey.replace('Key', '').replace('Arrow', '') : '---';
                let label = `${btn.action}: ${keyText}`;
                if (isActive) { label = "PRESS ANY..."; if (Math.floor(Date.now()/200)%2===0) ctx.fillStyle="#ffff00"; }
                
                ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(label, cx + btn.xOffset, btn.y + btn.h/2);
                ctx.restore();
            });
        }

        // --- RESET BTN ---
        const r = this.resetBtn; r.scale += (r.targetScale - r.scale) * 0.2;
        ctx.save(); ctx.translate(cx, r.y + r.h/2); ctx.scale(r.scale, r.scale);
        ctx.beginPath(); ctx.roundRect(-r.w/2, -r.h/2, r.w, r.h, 6);
        ctx.fillStyle = r.isHovered ? "#c0392b" : "#7f8c8d"; ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 16px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(r.label, 0, 0); ctx.restore();

        // --- BACK BTN ---
        const b = this.backBtn; b.scale += (b.targetScale - b.scale) * 0.2;
        ctx.save(); ctx.translate(b.x + b.w/2, b.y + b.h/2); ctx.scale(b.scale, b.scale);
        ctx.fillStyle = "#333"; ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h);
        ctx.strokeStyle = "#777"; ctx.strokeRect(-b.w/2, -b.h/2, b.w, b.h);
        ctx.fillStyle = "#fff"; ctx.font = "bold 16px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(b.label, 0, 0); ctx.restore();
    }
};