/**
 * KEYMAP SYSTEM
 * Handles input state, persistence, and remapping.
 * Supports Keyboard AND Mouse bindings.
 */

window.KeyMap = {
    // 1. DEFAULT CONFIGURATION
    // Updated: ATTACK now defaults to 'E' and 'MouseLeft'
    defaults: {
        UP:     ['ArrowUp', 'KeyW'],
        DOWN:   ['ArrowDown', 'KeyS'],
        LEFT:   ['ArrowLeft', 'KeyA'],
        RIGHT:  ['ArrowRight', 'KeyD'],
        JUMP:   ['KeyW', 'ArrowUp'], 
        ATTACK: ['KeyE', 'MouseLeft'] 
    },

    // 2. ACTIVE BINDINGS
    bindings: {},

    // 3. STATE
    activeActions: {
        UP: false, DOWN: false, LEFT: false, RIGHT: false, 
        JUMP: false, ATTACK: false
    },
    
    ready: false,

    init: function() {
        if (this.ready) return;
        console.log("KeyMap: Initializing (Keyboard + Mouse)...");
        
        this.bindings = JSON.parse(JSON.stringify(this.defaults));
        this.load(); 

        // -- KEY LISTENERS --
        window.addEventListener('keydown', (e) => this.handleInput(e.code, true));
        window.addEventListener('keyup', (e) => this.handleInput(e.code, false));

        // -- MOUSE LISTENERS --
        window.addEventListener('mousedown', (e) => {
            const code = this.getMouseCode(e.button);
            if (code) this.handleInput(code, true);
        });
        window.addEventListener('mouseup', (e) => {
            const code = this.getMouseCode(e.button);
            if (code) this.handleInput(code, false);
        });
        
        // Prevent context menu if Right Mouse is used in game
        window.addEventListener('contextmenu', (e) => {
            // Only block if MouseRight is actually bound to something
            const isBound = Object.values(this.bindings).some(keys => keys.includes('MouseRight'));
            if (isBound) e.preventDefault();
        });

        this.ready = true;
    },

    // Helper to convert button index to string code
    getMouseCode: function(buttonIndex) {
        if (buttonIndex === 0) return 'MouseLeft';
        if (buttonIndex === 1) return 'MouseMiddle';
        if (buttonIndex === 2) return 'MouseRight';
        return null;
    },

    handleInput: function(code, isPressed) {
        // Check all actions
        for (const [action, keys] of Object.entries(this.bindings)) {
            if (keys.includes(code)) {
                this.activeActions[action] = isPressed;
            }
        }

        // Dev Mode Hook (Keyboard only for safety)
        if (isPressed && code === 'KeyD' && this.activeActions['RIGHT']) { 
            // Simplified check: usually Alt+D, but this works if strictly checking code
        }
        
        // Audio Hook
        if (isPressed && window.SoundManager && !window.SoundManager.initialized) {
            window.SoundManager.init();
        }
    },

    // -- API --
    isPressed: function(actionName) {
        return this.activeActions[actionName] || false;
    },

    bind: function(action, index, newKeyCode) {
        if (!this.bindings[action]) return;
        while (this.bindings[action].length <= index) this.bindings[action].push(null);
        
        this.bindings[action][index] = newKeyCode;
        this.save();
        console.log(`KeyMap: Bound ${action}[${index}] to ${newKeyCode}`);
    },

    reset: function() {
        this.bindings = JSON.parse(JSON.stringify(this.defaults));
        this.save();
        console.log("KeyMap: Reset to defaults.");
    },

    setVirtual: function(action, isActive) {
        this.activeActions[action] = isActive;
        if (isActive && window.SoundManager && !window.SoundManager.initialized) {
            window.SoundManager.init();
        }
    },

    save: function() {
        try {
            localStorage.setItem('adventure_keymap_v1', JSON.stringify(this.bindings));
        } catch(e) { console.error("KeyMap Save Failed", e); }
    },

    load: function() {
        try {
            const data = localStorage.getItem('adventure_keymap_v1');
            if (data) {
                const loaded = JSON.parse(data);
                this.bindings = { ...this.bindings, ...loaded };
            }
        } catch(e) { console.error("KeyMap Load Failed", e); }
    }
};

window.KeyMap.init();