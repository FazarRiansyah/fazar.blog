/**
 * #JagaDokumen - Rotate PDF Tool (ULTIMATE NITRO EDITION v2)
 * Fixes: Toggle selection, Robust disabled states, Clean UI
 */
function initRotatePdf(container = document) {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const el = (id) => container.querySelector(id.startsWith('#') ? id : `#${id}`);

    const fileInput = el('rotate-file-input');
    const uploadArea = el('rotate-upload-area');
    const workspace = el('rotate-workspace');
    const grid = el('rotate-grid');
    const btnSubmit = el('btn-rotate-submit');
    const btnChange = el('btn-rotate-change');
    
    if (!fileInput || !uploadArea) return;

    let rotateFile = null;
    let rotationStates = {}; 
    let selectedPages = new Set();
    let lastSelectedIndex = -1;

    // --- ACTIONS ---
    const triggerFileSelect = () => {
        fileInput.value = '';
        fileInput.click();
    };

    uploadArea.onclick = () => triggerFileSelect();

    // Drag & Drop
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2563eb';
        uploadArea.style.background = '#eff6ff';
    };
    uploadArea.ondragleave = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#e2e8f0';
        uploadArea.style.background = 'white';
    };
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#e2e8f0';
        uploadArea.style.background = 'white';
        const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf');
        if (file) handleFile(file);
    };

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    };

    async function handleFile(file) {
        // Show loading spinner
        uploadArea.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:220px;';
        uploadArea.innerHTML = `
            <i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i>
            <p style="font-weight:700;color:#64748b;font-size:0.95rem;">Membaca PDF...</p>
            <p style="font-size:0.8rem;color:#94a3b8;">${file.name}</p>`;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            rotateFile = file;
            
            uploadArea.style.display = 'none';
            if(workspace) workspace.style.display = 'block';
            
            const nameEl = el('rotate-filename');
            const metaEl = el('rotate-meta');
            if(nameEl) nameEl.textContent = file.name;
            if(metaEl) metaEl.textContent = `${pdf.numPages} Halaman`;

            rotationStates = {};
            selectedPages.clear();
            lastSelectedIndex = -1;
            
            renderRotateGrid(pdf, grid);
            setupBulkControls();
        } catch (err) {
            alert('Gagal: ' + err.message);
        }
    }

    if(btnChange) btnChange.onclick = triggerFileSelect;

    // --- NITRO BULK CONTROLS ---
    function setupBulkControls() {
        let toolbar = el('rotate-bulk-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'rotate-bulk-toolbar';
            toolbar.style.cssText = `
                position: sticky; top: 85px; z-index: 900;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(15px);
                padding: 15px 25px;
                border-radius: 20px;
                border: 1px solid rgba(226, 232, 240, 1);
                box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                margin-bottom: 30px;
                display: flex; align-items: center; justify-content: space-between;
            `;
            workspace.insertBefore(toolbar, grid);
        }

        toolbar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="background: #2563eb; color: white; padding: 8px 16px; border-radius: 12px; font-weight: 800; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);" id="rotate-selected-count">
                    0 Terpilih
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="bulk-nitro-btn" id="btn-bulk-rotate-l"><i class="ph-bold ph-arrow-counter-clockwise"></i> Putar Kiri</button>
                    <button class="bulk-nitro-btn primary" id="btn-bulk-rotate-r"><i class="ph-bold ph-arrow-clockwise"></i> Putar Kanan</button>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="bulk-nitro-btn outline" id="btn-rotate-select-all">Pilih Semua</button>
                <button class="bulk-nitro-btn text-red" id="btn-rotate-deselect">Batal</button>
            </div>
            <style>
                .bulk-nitro-btn {
                    padding: 10px 18px; border-radius: 12px; border: 1px solid #e2e8f0;
                    background: white; color: #475569; font-weight: 700; font-size: 0.85rem;
                    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
                }
                .bulk-nitro-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
                .bulk-nitro-btn.primary { background: #2563eb; color: white; border: none; }
                .bulk-nitro-btn.primary:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
                .bulk-nitro-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }
                .bulk-nitro-btn.text-red:hover:not(:disabled) { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
            </style>
        `;

        el('btn-bulk-rotate-l').onclick = () => bulkRotate(-90);
        el('btn-bulk-rotate-r').onclick = () => bulkRotate(90);
        el('btn-rotate-select-all').onclick = () => {
            const total = grid.children.length;
            for(let i=1; i<=total; i++) selectedPages.add(i);
            updateUI();
        };
        el('btn-rotate-deselect').onclick = () => {
            selectedPages.clear();
            updateUI();
        };
    }

    function bulkRotate(angle) {
        if (selectedPages.size === 0) return;
        selectedPages.forEach(pageNum => {
            rotationStates[pageNum] = ((rotationStates[pageNum] || 0) + angle + 360) % 360;
        });
        updateUI();
    }

    function updateUI() {
        const items = grid.querySelectorAll('.rotate-page-item');
        items.forEach((item, i) => {
            const pageNum = i + 1;
            const isSelected = selectedPages.has(pageNum);
            item.classList.toggle('selected', isSelected);
            
            // Visual Update
            item.style.borderColor = isSelected ? '#2563eb' : '#e2e8f0';
            item.style.background = isSelected ? '#eff6ff' : 'white';
            item.style.boxShadow = isSelected ? '0 10px 20px rgba(37, 99, 235, 0.1)' : 'none';
            item.querySelector('.check-overlay').style.display = isSelected ? 'flex' : 'none';

            const preview = item.querySelector('.rotate-preview-box');
            const angle = rotationStates[pageNum] || 0;
            preview.style.transform = `rotate(${angle}deg)`;
            preview.style.scale = (angle === 90 || angle === 270) ? '0.75' : '1';
        });

        const countLabel = el('rotate-selected-count');
        if (countLabel) countLabel.textContent = `${selectedPages.size} Terpilih`;

        // Update Button States
        const hasSelection = selectedPages.size > 0;
        ['btn-bulk-rotate-l', 'btn-bulk-rotate-r', 'btn-rotate-deselect'].forEach(id => {
            const b = el(id);
            if(b) b.disabled = !hasSelection;
        });
    }

    async function renderRotateGrid(pdf, grid) {
        if(!grid) return;
        grid.innerHTML = '';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
        grid.style.gap = '20px';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height; canvas.width = viewport.width;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            const item = document.createElement('div');
            item.className = 'rotate-page-item';
            item.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px; text-align: center; position: relative; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);';
            item.innerHTML = `
                <div class="rotate-preview-box" style="height: 140px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 10px; overflow: hidden; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none;">
                    <img src="${canvas.toDataURL()}" style="max-width: 100%; max-height: 100%; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                </div>
                <div style="font-size: 0.85rem; font-weight: 800; color: #64748b; margin-top: 12px;">Halaman ${i}</div>
                <div class="check-overlay" style="position: absolute; top: 12px; right: 12px; width: 24px; height: 24px; background: #2563eb; color: white; border-radius: 50%; display: none; align-items: center; justify-content: center; font-size: 0.8rem; z-index: 10; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4);">
                    <i class="ph-bold ph-check"></i>
                </div>
                <div class="quick-actions" style="margin-top: 12px; display: flex; justify-content: center; gap: 8px;">
                    <button class="mini-nitro-btn rot-l" title="Putar Kiri"><i class="ph ph-arrow-counter-clockwise"></i></button>
                    <button class="mini-nitro-btn rot-r" title="Putar Kanan"><i class="ph ph-arrow-clockwise"></i></button>
                    <button class="mini-nitro-btn zoom-btn"><i class="ph ph-magnifying-glass-plus"></i></button>
                </div>
                <style>
                    .mini-nitro-btn { 
                        width: 32px; height: 32px; border-radius: 10px; border: none; 
                        background: #f1f5f9; color: #475569; cursor: pointer; 
                        transition: all 0.2s; display: flex; align-items: center; justify-content: center;
                    }
                    .mini-nitro-btn:hover { background: #e2e8f0; transform: scale(1.1); }
                    .mini-nitro-btn.zoom-btn:hover { background: #2563eb; color: white; }
                </style>
            `;

            // SMART TOGGLE SELECTION
            item.onclick = (e) => {
                if (e.shiftKey && lastSelectedIndex !== -1) {
                    const start = Math.min(lastSelectedIndex, i);
                    const end = Math.max(lastSelectedIndex, i);
                    for (let j = start; j <= end; j++) selectedPages.add(j);
                } else if (e.ctrlKey || e.metaKey) {
                    if (selectedPages.has(i)) selectedPages.delete(i);
                    else selectedPages.add(i);
                } else {
                    // TOGGLE if already selected as single
                    if (selectedPages.size === 1 && selectedPages.has(i)) {
                        selectedPages.delete(i);
                    } else {
                        selectedPages.clear();
                        selectedPages.add(i);
                    }
                }
                lastSelectedIndex = i;
                updateUI();
            };

            item.querySelector('.rot-l').onclick = (e) => { e.stopPropagation(); rotationStates[i] = ((rotationStates[i] || 0) - 90 + 360) % 360; updateUI(); };
            item.querySelector('.rot-r').onclick = (e) => { e.stopPropagation(); rotationStates[i] = ((rotationStates[i] || 0) + 90) % 360; updateUI(); };
            item.querySelector('.zoom-btn').onclick = (e) => { e.stopPropagation(); openHDZoom(i); };

            grid.appendChild(item);
        }
    }

    async function openHDZoom(pageNum) {
        const pdf = await pdfjsLib.getDocument({ data: await rotateFile.arrayBuffer() }).promise;
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height; canvas.width = viewport.width;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; inset: 0; background: rgba(15,23,42,0.75);
            backdrop-filter: blur(15px); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
            padding: 20px; animation: fadeIn 0.3s ease;
        `;
        modal.innerHTML = `
            <div style="background: white; width: 100%; max-width: 1100px; height: 90vh; border-radius: 32px; box-shadow: 0 50px 100px rgba(0,0,0,0.4); overflow: hidden; display: flex; flex-direction: column; animation: zoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="padding: 20px 30px; background: white; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800;">Halaman ${pageNum}</h3>
                        <p style="margin: 0; color: #2563eb; font-size: 0.8rem; font-weight: 700;">Pratinjau HD & Rotasi</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="hd-rot-r" style="padding: 8px 20px; border-radius: 12px; background: #eff6ff; color: #2563eb; border: none; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <i class="ph ph-arrow-clockwise"></i> Putar
                        </button>
                        <button id="hd-close" style="width: 40px; height: 40px; border-radius: 12px; background: #f1f5f9; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <i class="ph ph-x"></i>
                        </button>
                    </div>
                </div>
                <div style="flex: 1; background: #f8fafc; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 30px;">
                    <div id="hd-preview-container" style="background: white; padding: 5px; border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                        <img src="${canvas.toDataURL()}" style="max-height: 75vh; max-width: 100%; display: block;">
                    </div>
                </div>
            </div>
        `;

        const applyRot = () => {
            const angle = rotationStates[pageNum] || 0;
            modal.querySelector('#hd-preview-container').style.transform = `rotate(${angle}deg)`;
        };
        applyRot();

        modal.querySelector('#hd-rot-r').onclick = () => { rotationStates[pageNum] = ((rotationStates[pageNum] || 0) + 90) % 360; applyRot(); updateUI(); };
        modal.querySelector('#hd-close').onclick = () => modal.remove();
        document.body.appendChild(modal);
    }

    if (btnSubmit) {
        btnSubmit.onclick = async () => {
            if (!rotateFile) return;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';
            try {
                const srcDoc = await PDFLib.PDFDocument.load(await rotateFile.arrayBuffer());
                srcDoc.getPages().forEach((page, i) => {
                    const angle = rotationStates[i + 1] || 0;
                    if (angle !== 0) page.setRotation(PDFLib.degrees(page.getRotation().angle + angle));
                });
                downloadFile(await srcDoc.save(), 'JagaDokumen_Rotated.pdf', 'application/pdf');
            } catch (e) { alert(e.message); } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="ph ph-download-simple"></i> Terapkan & Unduh PDF';
            }
        };
    }
}
