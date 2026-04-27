/**
 * #JagaDokumen - Main Application Logic
 * Standardized for stability and clean SPA navigation.
 */

// Custom Modal Utility
window.showConfirm = (message, title = 'Konfirmasi') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('app-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        const closeBtn = document.getElementById('modal-close-btn');

        if (!modal) return resolve(false);

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'flex';

        const closeModal = (result) => {
            modal.style.display = 'none';
            // Clean up listeners
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            resolve(result);
        };

        confirmBtn.onclick = () => closeModal(true);
        cancelBtn.onclick = () => closeModal(false);
        closeBtn.onclick = () => closeModal(false);
        
        // Close on overlay click
        modal.onclick = (e) => {
            if (e.target === modal) closeModal(false);
        };
    });
};

// Safe initialization
const initApp = () => {
    try { initSearch(); } catch(e) { console.error("Search init failed", e); }
    try { initThemeToggle(); } catch(e) { console.error("Theme init failed", e); }
    try { initModal(); } catch(e) { console.error("Modal init failed", e); }
    try { initStats(); } catch(e) { console.error("Stats init failed", e); }
    try { initViewSwitching(); } catch(e) { console.error("View switching init failed", e); }

    // How it works listener fallback
    const howBtn = document.getElementById('btn-how-it-works');
    if (howBtn) {
        howBtn.addEventListener('click', () => {
            const modal = document.getElementById('toolModal');
            if (!modal) return;
            
            const modalBox = modal.querySelector('.modal-box');
            const modalTitle = document.getElementById('modalTitle');
            const modalCategory = document.getElementById('modalCategory');
            const modalIcon = document.getElementById('modalIcon');
            const modalBody = document.getElementById('modalBody');

            if (modalBox) modalBox.className = 'modal-box fade-in-up how-it-works-modal';
            if (modalTitle) modalTitle.textContent = 'Cara Kerja #JagaDokumen';
            if (modalCategory) modalCategory.innerHTML = '<span class="modal-subtitle-clean">Transparansi penuh tentang keamanan Anda</span>';
            if (modalIcon) modalIcon.innerHTML = '<div style="width: 100%; height: 100%; background: var(--color-blue-light); color: var(--primary-blue); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;"><i class="ph-fill ph-shield-check"></i></div>';
            
            if (modalBody) {
                modalBody.innerHTML = '';
                const tpl = document.getElementById('tpl-how-it-works');
                if (tpl) modalBody.appendChild(tpl.content.cloneNode(true));
            }

            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    // Start Now listener (Scroll to tools)
    const startBtn = document.getElementById('btn-start-now');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const toolsSection = document.querySelector('.tools-section');
            if (toolsSection) {
                toolsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
};

// Run as soon as DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initStats() {
    const toolCards = document.querySelectorAll('.tool-card');
    const toolCountDisplay = document.querySelector('.tool-count');
    const statsToolCount = document.getElementById('stat-tool-count');
    
    if (toolCountDisplay) toolCountDisplay.textContent = `${toolCards.length} alat tersedia`;
    if (statsToolCount) statsToolCount.textContent = toolCards.length;
}

window.logActivity = function(toolName, action = 'Memproses') {
    try {
        let count = parseInt(localStorage.getItem('processedCount') || 0);
        count++;
        localStorage.setItem('processedCount', count);
        
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        activities.unshift({
            id: Date.now(),
            tool: toolName,
            action: action,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        });
        if (activities.length > 10) activities.pop();
        localStorage.setItem('activities', JSON.stringify(activities));
    } catch(e) {}
};

function initModal() {
    const modal = document.getElementById('toolModal');
    const closeBtn = document.getElementById('closeModal');
    if (!modal || !closeBtn) return;

    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function initViewSwitching() {
    const dashboardView = document.getElementById('dashboard-view');
    const toolView = document.getElementById('tool-view');
    const toolCards = document.querySelectorAll('.tool-card');
    const backBtn = document.getElementById('btn-back-dashboard');

    const toolViewTitle = document.getElementById('toolViewTitle');
    const toolViewCategory = document.getElementById('toolViewCategory');
    const toolViewIcon = document.getElementById('toolViewIcon');
    const toolViewBody = document.getElementById('toolViewBody');

    if (!dashboardView || !toolView) return;

    const switchToTool = (card) => {
        try {
            const h3 = card.querySelector('h3');
            const type = card.querySelector('.tool-type');
            const icon = card.querySelector('.tool-icon');
            
            if (!h3 || !type || !icon) return;

            const title = h3.textContent.trim();
            const category = type.textContent.trim();
            const iconHtml = icon.innerHTML;

            // Transition
            dashboardView.style.display = 'none';
            toolView.style.display = 'block';
            window.scrollTo(0, 0);

            // Hide footer instantly (no animation)
            const siteFooter = document.querySelector('.site-footer');
            if (siteFooter) siteFooter.style.cssText = 'display:none !important';
            
            // UI Adjustments
            if (toolViewTitle) toolViewTitle.textContent = title;
            if (toolViewCategory) toolViewCategory.textContent = category;
            
            if (toolViewIcon) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = iconHtml;
                const actualIcon = tempDiv.querySelector('i') || tempDiv;
                toolViewIcon.innerHTML = actualIcon.outerHTML;
            }
            
            console.log("Switching to tool:", title);
            // alert("Buka Alat: " + title); 

            if (toolViewBody) {
                toolViewBody.innerHTML = '';

                // Tool mapping logic
                let found = false;
                const inject = (tplId, initFn) => {
                    const tpl = document.getElementById(tplId);
                    if (tpl) {
                        toolViewBody.appendChild(tpl.content.cloneNode(true));
                        if (typeof initFn === 'function') setTimeout(() => initFn(toolViewBody), 20);
                        found = true;
                    }
                };

                if (title === 'Edit PDF') inject('tpl-edit-pdf', typeof initPdfEditor !== 'undefined' ? initPdfEditor : null);
                else if (title === 'Gabungkan PDF') inject('tpl-merge-pdf', typeof initMergePdf !== 'undefined' ? initMergePdf : null);
                else if (title === 'Pisahkan PDF') inject('tpl-split-pdf', typeof initSplitPdf !== 'undefined' ? initSplitPdf : null);
                else if (title === 'Hapus Halaman PDF') inject('tpl-delete-pages', typeof initDeletePages !== 'undefined' ? initDeletePages : null);
                else if (title === 'Ganti Halaman PDF') inject('tpl-replace-pages', typeof initReplacePages !== 'undefined' ? initReplacePages : null);
                else if (title === 'Putar Halaman PDF') inject('tpl-rotate-pdf', typeof initRotatePdf !== 'undefined' ? initRotatePdf : null);
                else if (title === 'Gambar ke PDF') inject('tpl-image-to-pdf', typeof initImageToPdf !== 'undefined' ? initImageToPdf : null);
                else if (title === 'PDF ke Gambar') inject('tpl-pdf-to-img', typeof initPdfToImg !== 'undefined' ? initPdfToImg : null);
                else if (title === 'Kompres Gambar') inject('tpl-compress-image', typeof initCompressImg !== 'undefined' ? initCompressImg : null);
                else if (title === 'Kompres PDF') inject('tpl-compress-pdf', typeof initCompressPdf !== 'undefined' ? initCompressPdf : null);

                if (!found) {
                    toolViewBody.innerHTML = `
                        <div class="tool-placeholder" style="text-align: center; padding: 100px 20px;">
                            <div class="placeholder-icon" style="font-size: 80px; color: var(--primary-blue); margin-bottom: 24px; opacity: 0.8;">
                                <i class="ph-fill ph-rocket-launch"></i>
                            </div>
                            <h2 style="font-size: 2rem; color: var(--text-main); margin-bottom: 16px;">Fitur Sedang Disiapkan!</h2>
                            <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto; line-height: 1.6; font-size: 1.1rem;">
                                Kami sedang meracik fitur <strong>${title}</strong> ini agar memberikan pengalaman terbaik untuk Anda.
                            </p>
                        </div>
                    `;
                }
            }
        } catch(e) {
            console.error("Switch to tool failed", e);
        }
    };

    // Card listeners
    toolCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            switchToTool(card);
        });
        
        const btn = card.querySelector('.btn-tool');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchToTool(card);
            });
        }
    });

    // Back to dashboard
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (toolView) toolView.style.display = 'none';
            if (dashboardView) dashboardView.style.display = 'block';
            
            const siteFooter = document.querySelector('.site-footer');
            if (siteFooter) siteFooter.style.cssText = '';

            if (appContainer) {
                appContainer.style.padding = '';
            }
            
            window.scrollTo(0, 0);
        });
    }
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const toolCards = document.querySelectorAll('.tool-card');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        toolCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(term) ? 'flex' : 'none';
        });
    });
}

function initThemeToggle() {
    const toggleBtn = document.querySelector('.theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const body = document.body;
        const icon = toggleBtn.querySelector('i');
        
        if (body.hasAttribute('data-theme')) {
            body.removeAttribute('data-theme');
            if (icon) icon.className = 'ph-fill ph-moon';
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            if (icon) icon.className = 'ph-fill ph-sun';
            localStorage.setItem('theme', 'dark');
        }
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = 'ph-fill ph-sun';
    }
}
