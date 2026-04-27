/**
 * #JagaDokumen - Shared Utilities
 * Centralized helpers for all tools
 */

/**
 * Parses page range string (e.g., "1-5, 8, 10-12")
 */
function parseRange(text, max) {
    const pages = new Set();
    if (!text) return [];
    text.split(',').forEach(part => {
        if (part.includes('-')) {
            const [s, e] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(s) && !isNaN(e)) {
                const start = Math.max(1, Math.min(s, e));
                const end = Math.min(max, Math.max(s, e));
                for (let i = start; i <= end; i++) pages.add(i);
            }
        } else {
            const n = parseInt(part.trim());
            if (!isNaN(n) && n >= 1 && n <= max) pages.add(n);
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Handles file downloads
 */
function downloadFile(data, filename, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Displays a beautiful, modern toast notification at the bottom
 */
function showToast(message, type = "success") {
    const existing = document.querySelectorAll('.jaga-toast');
    existing.forEach(t => {
        t.style.opacity = "0";
        t.style.transform = "translateX(-50%) translateY(-20px)";
        setTimeout(() => t.remove(), 300);
    });

    const toast = document.createElement("div");
    toast.className = 'jaga-toast';
    
    let color = "#10b981"; // success
    let icon = "ph-fill ph-check-circle";
    let bg = "#ffffff";

    if (type === "error") {
        color = "#ef4444";
        icon = "ph-fill ph-warning-circle";
    } else if (type === "info") {
        color = "#3b82f6";
        icon = "ph-fill ph-info";
    }

    toast.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(20px);
        background: ${bg}; color: #1e293b; padding: 12px 24px; border-radius: 16px;
        font-weight: 700; z-index: 999999; 
        box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        border: 1px solid rgba(0,0,0,0.05);
        display: flex; align-items: center; gap: 14px; opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: 'Inter', sans-serif; min-width: 300px; pointer-events: none;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: ${color}20; color: ${color}; border-radius: 8px;">
            <i class="${icon}" style="font-size: 1.2rem;"></i>
        </div>
        <span style="font-size: 0.95rem;">${message}</span>
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
    });

    const duration = type === 'info' ? 5000 : 3500;
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(10px)";
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
