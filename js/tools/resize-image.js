/**
 * #JagaDokumen - Image Resize Tool (PREMIUM v7 - Bulk Ops)
 * Features: Two-Column Dashboard, Live Comparison, BULK Operations.
 */
function initResizeImg(container = document) {
    const q = (id) => container.querySelector('#' + id);

    const fileInput = q('resize-img-file-input');
    const uploadArea = q('resize-img-upload-area');
    const workspace = q('resize-img-workspace');
    const grid = q('resize-img-grid');
    const btnExecute = q('btn-resize-img-save');
    
    // Comparison Elements
    const previewOrig = q('resize-preview-orig');
    const previewNew = q('resize-preview-new');
    const labelOrig = q('resize-label-orig');
    const labelNew = q('resize-label-new');
    const pctBadge = q('resize-pct-badge');

    // Controls
    const inputWidth = q('resize-width');
    const inputHeight = q('resize-height');
    const lockRatio = q('resize-lock-ratio');
    const percentBtns = container.querySelectorAll('.btn-resize-pct');

    // Bulk Controls
    const bulkFormat = q('resize-bulk-format');
    const bulkSuffix = q('resize-bulk-suffix');
    const btnClearAll = q('btn-resize-bulk-clear');

    if (!fileInput || !uploadArea) return;

    let imageFiles = [];
    let activeImageId = null;
    let activeAspectRatio = 1;

    // ─── Upload Logic ────────────────────────────────────────────────
    const triggerSelect = () => { fileInput.value = ''; fileInput.click(); };
    uploadArea.onclick = (e) => { if (e.target !== fileInput) triggerSelect(); };

    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) handleFiles(files);
    };

    async function handleFiles(files) {
        if (imageFiles.length === 0) {
            uploadArea.innerHTML = `<i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i><p style="margin-top:12px;font-weight:700;">Loading Editor...</p>`;
        }
        
        for (const file of files) {
            const dataUrl = await fileToDataURL(file);
            const dims = await getImageDimensions(dataUrl);
            const id = Math.random().toString(36).substr(2, 9);
            imageFiles.push({
                id, file, dataUrl, 
                origW: dims.w, origH: dims.h,
                newW: dims.w, newH: dims.h
            });
            if (!activeImageId) activeImageId = id;
        }

        uploadArea.style.display = 'none';
        workspace.style.display = 'grid';
        
        const active = imageFiles.find(i => i.id === activeImageId);
        inputWidth.value = active.newW;
        inputHeight.value = active.newH;
        activeAspectRatio = active.origW / active.origH;

        renderGrid();
        updateComparison();
    }

    function fileToDataURL(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    function getImageDimensions(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.src = src;
        });
    }

    // ─── Resize Logic ────────────────────────────────────────────────
    inputWidth.oninput = () => {
        if (lockRatio.checked) {
            inputHeight.value = Math.round(inputWidth.value / activeAspectRatio);
        }
        applyDimensionsToActive();
    };

    inputHeight.oninput = () => {
        if (lockRatio.checked) {
            inputWidth.value = Math.round(inputHeight.value * activeAspectRatio);
        }
        applyDimensionsToActive();
    };

    percentBtns.forEach(btn => {
        btn.onclick = () => {
            const pct = parseInt(btn.dataset.pct) / 100;
            const active = imageFiles.find(i => i.id === activeImageId);
            if (active) {
                inputWidth.value = Math.round(active.origW * pct);
                inputHeight.value = Math.round(active.origH * pct);
                applyDimensionsToActive();
            }
        };
    });

    function applyDimensionsToActive() {
        const targetW = parseInt(inputWidth.value) || 1;
        const targetH = parseInt(inputHeight.value) || 1;
        const active = imageFiles.find(i => i.id === activeImageId);
        if (active) {
            active.newW = targetW;
            active.newH = targetH;
            const scale = targetW / active.origW;
            imageFiles.forEach(item => {
                item.newW = Math.round(item.origW * scale);
                item.newH = Math.round(item.origH * scale);
            });
        }
        renderGrid();
        updateComparison();
    }

    function updateComparison() {
        const active = imageFiles.find(i => i.id === activeImageId);
        if (!active) return;
        previewOrig.src = active.dataUrl;
        previewNew.src = active.dataUrl;
        labelOrig.textContent = `${active.origW} x ${active.origH}`;
        labelNew.textContent = `${active.newW} x ${active.newH}`;
        const pct = ((active.newW / active.origW) * 100).toFixed(0);
        pctBadge.textContent = `${pct}%`;
        previewNew.style.width = `${pct}%`;
    }

    function renderGrid() {
        if (!grid) return;
        grid.innerHTML = '';
        imageFiles.forEach((item) => {
            const isActive = item.id === activeImageId;
            const el = document.createElement('div');
            el.style.cssText = `
                display: flex; align-items: center; gap: 12px; padding: 12px; 
                background: ${isActive ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-card)'}; 
                border: 1.5px solid ${isActive ? 'var(--primary-blue)' : 'var(--border-color)'}; 
                border-radius: 16px; cursor: pointer; transition: 0.2s;
                color: var(--text-main);
                box-shadow: ${isActive ? '0 8px 20px rgba(0,0,0,0.3)' : 'none'};
            `;
            el.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 10px; overflow: hidden; flex-shrink: 0; background: var(--bg-main); border: 1px solid var(--border-color);">
                    <img src="${item.dataUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.file.name}</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">${item.newW}x${item.newH}</div>
                </div>
                <button class="btn-remove" style="width: 28px; height: 28px; border-radius: 8px; border: none; background: ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(244, 63, 94, 0.1)'}; color: #f43f5e; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="ph ph-trash"></i></button>
            `;
            el.onclick = (e) => {
                if (e.target.closest('.btn-remove')) return;
                activeImageId = item.id;
                const active = imageFiles.find(i => i.id === activeImageId);
                inputWidth.value = active.newW;
                inputHeight.value = active.newH;
                activeAspectRatio = active.origW / active.origH;
                renderGrid();
                updateComparison();
            };
            el.querySelector('.btn-remove').onclick = () => {
                imageFiles = imageFiles.filter(i => i.id !== item.id);
                if (imageFiles.length === 0) location.reload();
                else {
                    if (activeImageId === item.id) activeImageId = imageFiles[0].id;
                    renderGrid();
                    updateComparison();
                }
            };
            grid.appendChild(el);
        });
        
        const addBtn = document.createElement('div');
        addBtn.style.cssText = `
            margin-top: 10px; padding: 14px; border: 2px dashed var(--border-color); border-radius: 16px; 
            color: var(--text-muted); font-size: 0.75rem; font-weight: 800; text-align: center; cursor: pointer; transition: 0.2s;
            background: rgba(255,255,255,0.02);
        `;
        addBtn.innerHTML = `<i class="ph ph-plus-circle"></i> Add Image`;
        addBtn.onclick = triggerSelect;
        grid.appendChild(addBtn);
    }

    // ─── Bulk Operations ───────────────────────────────────────────
    if (btnClearAll) {
        btnClearAll.onclick = () => {
            if (confirm('Are you sure you want to remove all files?')) {
                location.reload();
            }
        };
    }

    // ─── Execution Logic ───────────────────────────────────────────
    if (btnExecute) {
        btnExecute.onclick = async () => {
            if (imageFiles.length === 0) return;
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Processing...';

            const format = bulkFormat.value;
            const suffix = bulkSuffix.value || '';

            try {
                const results = await Promise.all(imageFiles.map(async (item) => {
                    const outputType = (format === 'original') ? item.file.type : format;
                    const blob = await resizeImage(item.dataUrl, item.newW, item.newH, outputType);
                    
                    // Rename with suffix
                    const lastDot = item.file.name.lastIndexOf('.');
                    const name = item.file.name.substring(0, lastDot);
                    const ext = (format === 'original') ? item.file.name.substring(lastDot) : ('.' + outputType.split('/')[1].replace('jpeg', 'jpg'));
                    
                    return { name: `${name}${suffix}${ext}`, blob };
                }));

                if (results.length === 1) {
                    downloadFile(results[0].blob, results[0].name, results[0].blob.type);
                } else {
                    const zip = new JSZip();
                    results.forEach(res => zip.file(res.name, res.blob));
                    const content = await zip.generateAsync({ type: 'blob' });
                    downloadFile(content, 'JagaDokumen_Resized_Images.zip', 'application/zip');
                }
                showToast('Bulk resizing completed!');
            } catch (err) { alert('Error: ' + err.message); }
            finally {
                btnExecute.disabled = false;
                btnExecute.innerHTML = '<i class="ph-bold ph-download-simple"></i> Download Results';
            }
        };
    }

    function resizeImage(src, w, h, type) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => resolve(blob), type, 0.95);
            };
            img.src = src;
        });
    }
}
