document.addEventListener('DOMContentLoaded', () => {
    console.log('%cfazar.site', 'font-size: 24px; font-weight: bold; color: #6366f1;');
    console.log('%cWebsite ini sedang dalam pengembangan aktif.', 'font-size: 14px; color: #a855f7;');

    // Animate Progress Bar
    const progressFill = document.querySelector('.progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    
    if (progressFill && progressPercent) {
        // Start at 0
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        
        const targetPercent = 75;
        let currentPercent = 0;
        
        setTimeout(() => {
            progressFill.style.width = `${targetPercent}%`;
            
            const interval = setInterval(() => {
                if (currentPercent >= targetPercent) {
                    clearInterval(interval);
                } else {
                    currentPercent++;
                    progressPercent.textContent = `${currentPercent}%`;
                }
            }, 20); // Sync number animation with transition
        }, 300);
    }
});
