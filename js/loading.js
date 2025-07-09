// loading.js - Loading page logic and progress control

class LoadingManager {
    constructor() {
        this.progress = 0;
        this.loadingSteps = [
            { text: 'Initializing...', duration: 1000 },
            { text: 'Connecting to blockchain...', duration: 1500 },
            { text: 'Loading contract data...', duration: 1200 },
            { text: 'Checking wallet connection...', duration: 1000 },
            { text: 'Verifying network...', duration: 800 },
            { text: 'Almost ready...', duration: 600 }
        ];
        this.currentStep = 0;
        this.isLoading = true;
        
        this.init();
    }
    
    init() {
        this.updateProgress(0);
        this.startLoadingSequence();
        
        // Auto-redirect after minimum loading time
        setTimeout(() => {
            this.completeLoading();
        }, 6000);
    }
    
    startLoadingSequence() {
        this.loadingSteps.forEach((step, index) => {
            setTimeout(() => {
                this.updateLoadingText(step.text);
                this.updateProgress((index + 1) * (100 / this.loadingSteps.length));
            }, this.getStepDelay(index));
        });
    }
    
    getStepDelay(index) {
        let delay = 0;
        for (let i = 0; i < index; i++) {
            delay += this.loadingSteps[i].duration;
        }
        return delay;
    }
    
    updateLoadingText(text) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.style.opacity = '0';
            setTimeout(() => {
                loadingText.textContent = text;
                loadingText.style.opacity = '1';
            }, 200);
        }
    }
    
    updateProgress(percentage) {
        this.progress = Math.min(percentage, 100);
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${this.progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(this.progress)}%`;
        }
    }
    
    async completeLoading() {
        if (!this.isLoading) return;
        
        this.isLoading = false;
        this.updateProgress(100);
        this.updateLoadingText('Ready!');
        
        // Add completion animation
        this.addCompletionEffect();
        
        // Wait for completion animation
        setTimeout(() => {
            this.redirectToApp();
        }, 1500);
    }
    
    addCompletionEffect() {
        const container = document.querySelector('.loading-container');
        if (container) {
            container.style.animation = 'fadeOut 1s ease-out forwards';
        }
        
        // Add success glow effect
        const logo = document.querySelector('.loading-logo');
        if (logo) {
            logo.style.filter = 'drop-shadow(0 0 30px rgba(240, 185, 11, 1))';
        }
        
        // Add completion particles
        this.createCompletionParticles();
    }
    
    createCompletionParticles() {
        const container = document.querySelector('.loading-container');
        if (!container) return;
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'completion-particle';
                particle.style.cssText = `
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: #F0B90B;
                    border-radius: 50%;
                    pointer-events: none;
                    animation: particleExplode 1s ease-out forwards;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                `;
                
                container.appendChild(particle);
                
                // Remove particle after animation
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 1000);
            }, i * 50);
        }
    }
    
    async redirectToApp() {
        try {
            // Check if wallet is connected
            const address = await window.getCurrentAddress();
            
            if (address) {
                // Check if user is registered
                await window.checkMembershipStatus(address, 'index');
            } else {
                // No wallet connected, go to register page
                window.location.href = 'register.html';
            }
        } catch (error) {
            console.error('Error during redirect:', error);
            // Fallback to register page
            window.location.href = 'register.html';
        }
    }
}

// Add completion animation styles
const completionStyles = document.createElement('style');
completionStyles.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: scale(1);
        }
        to {
            opacity: 0;
            transform: scale(0.95);
        }
    }
    
    @keyframes particleExplode {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        50% {
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1) translate(
                ${Math.random() * 200 - 100}px, 
                ${Math.random() * 200 - 100}px
            );
            opacity: 0;
        }
    }
`;
document.head.appendChild(completionStyles);

// Initialize loading manager when page loads
document.addEventListener('DOMContentLoaded', async () => {
	await initializeWeb3AndContract();
    // Check if we're on mobile
    if (window.innerWidth > 768) {
        // Redirect to mobile notice if on desktop
        window.location.href = 'mobile-notice.html';
        return;
    }
    
    // Start loading sequence
    new LoadingManager();
});

// Add window resize handler
window.addEventListener('resize', async () => {
	await initializeWeb3AndContract();
    if (window.innerWidth > 768) {
        window.location.href = 'mobile-notice.html';
    }
});

// Export for potential external use
window.LoadingManager = LoadingManager;