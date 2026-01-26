window.GameEnd = {
    engine: null,
    iframeElement: null,

    init: function(engine) {
        this.engine = engine;
        console.log("End Scene Initialized");
    },

    load: function() {
        console.log("Playing Ending Sequence...");
        
        // 1. Create Iframe Element
        this.iframeElement = document.createElement('iframe');
        this.iframeElement.id = "ending_frame";
        // Rename the generated file from the previous step to 'outro.html'
        this.iframeElement.src = "/video-assets/outro.html"; 
        this.iframeElement.style.position = "fixed";
        this.iframeElement.style.top = "0";
        this.iframeElement.style.left = "0";
        this.iframeElement.style.width = "100%";
        this.iframeElement.style.height = "100%";
        this.iframeElement.style.border = "none";
        this.iframeElement.style.zIndex = "20000"; // Topmost layer
        this.iframeElement.style.backgroundColor = "black";
        
        document.body.appendChild(this.iframeElement);

        // 2. Add Interaction to Exit 
        // (Since iframe won't automatically close unless the HTML inside sends a message)
        this.addSkipButton();

        // 3. Listener for 'credits_end' message from the iframe
        window.addEventListener('message', this.handleMessage);
    },

    // Bound function to handle messages
    handleMessage: function(event) {
        if (event.data === 'credits_end') {
            window.GameEnd.showEndScreen();
        }
    },

    addSkipButton: function() {
        const skipBtn = document.createElement('button');
        skipBtn.id = "skip-credits-btn";
        skipBtn.innerText = "SKIP >>";
        skipBtn.style.position = 'fixed';
        skipBtn.style.bottom = '30px';
        skipBtn.style.right = '30px';
        skipBtn.style.zIndex = '20001';
        skipBtn.style.padding = '10px 20px';
        skipBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        skipBtn.style.color = 'white';
        skipBtn.style.border = '1px solid rgba(255, 255, 255, 0.5)';
        skipBtn.style.cursor = 'pointer';
        skipBtn.style.fontFamily = 'monospace';
        skipBtn.style.fontSize = '14px';
        skipBtn.style.transition = 'background-color 0.2s';
        
        skipBtn.onmouseover = () => skipBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        skipBtn.onmouseout = () => skipBtn.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        
        skipBtn.onclick = () => {
            this.showEndScreen();
        };
        
        document.body.appendChild(skipBtn);
    },

    showEndScreen: function() {
        // Remove iframe and skip button to clear resources
        this.cleanup();

        // Create Final UI
        const container = document.createElement('div');
        container.id = 'end-screen-overlay';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = 'black'; // Fade to black
        container.style.color = 'white';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.zIndex = '20002';
        container.style.fontFamily = 'monospace';
        container.style.opacity = '0';
        container.style.transition = 'opacity 2s ease-in';

        const title = document.createElement('h1');
        title.innerText = "THE END";
        title.style.fontSize = '80px';
        title.style.marginBottom = '20px';
        title.style.color = '#fff';
        title.style.textShadow = '0 0 20px #fff';

        const sub = document.createElement('p');
        sub.innerText = "Thanks for playing.";
        sub.style.fontSize = '24px';
        sub.style.marginBottom = '60px';
        sub.style.color = '#888';

        const btn = document.createElement('button');
        btn.innerText = "EXIT TO MAIN MENU";
        btn.style.padding = '15px 30px';
        btn.style.fontSize = '20px';
        btn.style.fontFamily = 'monospace';
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'white';
        btn.style.border = '2px solid white';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.3s ease';
        
        btn.onmouseover = () => { 
            btn.style.backgroundColor = 'white'; 
            btn.style.color = 'black'; 
            btn.style.boxShadow = '0 0 15px white';
        };
        btn.onmouseout = () => { 
            btn.style.backgroundColor = 'transparent'; 
            btn.style.color = 'white'; 
            btn.style.boxShadow = 'none';
        };
        
        // --- REDIRECT LOGIC ---
        btn.onclick = () => {
            // Reloading the page is the cleanest way to reset the Engine, 
            // clear memory, and load menu.js fresh.
            location.reload(); 
        };

        container.appendChild(title);
        container.appendChild(sub);
        container.appendChild(btn);
        document.body.appendChild(container);

        // Trigger Fade In
        requestAnimationFrame(() => {
            container.style.opacity = '1';
        });
    },

    cleanup: function() {
        // Remove Iframe
        if (this.iframeElement) {
            this.iframeElement.remove();
            this.iframeElement = null;
        }
        
        // Remove Skip Button
        const skipBtn = document.getElementById("skip-credits-btn");
        if (skipBtn) skipBtn.remove();

        // Remove Message Listener
        window.removeEventListener('message', this.handleMessage);
        
        // Remove Play Overlay if exists
        const playOverlay = document.getElementById('play-overlay');
        if (playOverlay) playOverlay.remove();
    },

    update: function() { /* No logic needed */ },
    render: function(ctx) { /* No canvas rendering needed */ }
};