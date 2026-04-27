/**
 * #JagaDokumen - Delete Pages Tool (ULTIMATE NITRO EDITION v2)
 * Features: Multi-selection, Invert Selection, Ghosting Effects, HD Zoom, Integrated Sticky Button
 */
function initDeletePages(container = document) {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const el = (id) => container.querySelector(id.startsWith('#') ? id : `#${id}`);

    const fileInput = el('delete-file-input');
    const uploadArea = el('delete-upload-area');
    const workspace = el('delete-workspace');
    const grid = el('delete-grid');
    const btnChange = el('btn-delete-change');
    
    if (!fileInput || !uploadArea) return;

    let deleteFile = null;
    let pagesToDelete = new Set();
    let lastSelectedIndex = -1;

    // --- INITIALIZATION ---
    const triggerFileSelect = () => {
        fileInput.value = '';
        fileInput.click();
    };

    uploadArea.onclick = () => triggerFileSelect();

    // Drag & Drop
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ef4444';
        uploadArea.style.background = '#fef2f2';
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
            <i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#ef4444;"></i>
            <p style="font-weight:700;color:#64748b;font-size:0.95rem;">Membaca PDF...</p>
            <p style="font-size:0.8rem;color:#94a3b8;">${file.name}</p>`;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            deleteFile = file;
            
            uploadArea.style.display = 'none';
            if(workspace) workspace.style.display = 'block';
            
            const nameEl = el('delete-filename');
            const metaEl = el('delete-meta');
            if(nameEl) nameEl.textContent = file.name;
            if(metaEl) metaEl.textContent = `${pdf.numPages} Halaman`;

            pagesToDelete.clear();
            lastSelectedIndex = -1;
            
            renderDeleteGrid(pdf, grid);
            setupDeleteToolbar();
        } catch (err) {
            alert('Gagal: ' + err.message);
        }
    }

    if(btnChange) btnChange.onclick = triggerFileSelect;

    // --- NITRO DELETE TOOLBAR ---
    function setupDeleteToolbar() {
        let toolbar = el('delete-nitro-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'delete-nitro-toolbar';
            toolbar.style.cssText = `
                position: sticky; top: 85px; z-index: 900;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(15px);
                padding: 15px 25px;
                border-radius: 20px;
                border: 1px solid #fee2e2;
                box-shadow: 0 10px 30px rgba(239, 68, 68, 0.08);
                margin-bottom: 30px;
                display: flex; align-items: center; justify-content: space-between;
            `;
            workspace.insertBefore(toolbar, grid);
        }

        toolbar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <div style="background: #ef4444; color: white; padding: 8px 16px; border-radius: 12px; font-weight: 800; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2);" id="delete-selected-count">
                    0 Halaman Dibuang
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="delete-nitro-btn" id="btn-delete-inverse" title="Balikkan Seleksi"><i class="ph ph-arrows-left-right"></i> Balikkan</button>
                    <button class="delete-nitro-btn outline" id="btn-delete-all">Pilih Semua</button>
                </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="delete-nitro-btn text-red" id="btn-delete-clear">Batal</button>
                <div style="width: 1px; background: #eee; height: 30px; margin: 0 5px;"></div>
                <button class="delete-nitro-btn primary" id="btn-delete-submit">
                    <i class="ph ph-trash"></i> Hapus & Unduh
                </button>
            </div>
            <style>
                .delete-nitro-btn {
                    padding: 10px 18px; border-radius: 12px; border: 1px solid #e2e8f0;
                    background: white; color: #475569; font-weight: 700; font-size: 0.85rem;
                    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px;
                }
                .delete-nitro-btn:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
                .delete-nitro-btn.primary { background: #ef4444; color: white; border: none; }
                .delete-nitro-btn.primary:hover:not(:disabled) { background: #dc2626; box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3); }
                .delete-nitro-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }
                .delete-nitro-btn.text-red:hover:not(:disabled) { color: #ef4444; border-color: #fecaca; background: #fef2f2; }
            </style>
        `;

        el('btn-delete-inverse').onclick = () => {
            const total = grid.children.length;
            const newSet = new Set();
            for(let i=1; i<=total; i++) if(!pagesToDelete.has(i)) newSet.add(i);
            pagesToDelete = newSet;
            updateDeleteUI();
        };

        el('btn-delete-all').onclick = () => {
            const total = grid.children.length;
            for(let i=1; i<=total; i++) pagesToDelete.add(i);
            updateDeleteUI();
        };

        el('btn-delete-clear').onclick = () => {
            pagesToDelete.clear();
            updateDeleteUI();
        };

        el('btn-delete-submit').onclick = async () => {
            if (!deleteFile || pagesToDelete.size === 0) return;
            const btn = el('btn-delete-submit');
            btn.disabled = true;
            btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';
            try {
                const srcDoc = await PDFLib.PDFDocument.load(await deleteFile.arrayBuffer());
                const total = srcDoc.getPageCount();
                if (pagesToDelete.size >= total) throw new Error("Sisakan minimal 1 halaman.");

                const newDoc = await PDFLib.PDFDocument.create();
                const pagesToKeep = [];
                for(let i=0; i<total; i++) if(!pagesToDelete.has(i+1)) pagesToKeep.push(i);
                
                const copiedPages = await newDoc.copyPages(srcDoc, pagesToKeep);
                copiedPages.forEach(p => newDoc.addPage(p));
                downloadFile(await newDoc.save(), 'JagaDokumen_Clean.pdf', 'application/pdf');
            } catch (e) { alert(e.message); } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="ph ph-trash"></i> Hapus & Unduh';
            }
        };
    }

    function updateDeleteUI() {
        const items = grid.querySelectorAll('.delete-page-item');
        items.forEach((item, i) => {
            const pageNum = i + 1;
            const isMarked = pagesToDelete.has(pageNum);
            
            item.style.borderColor = isMarked ? '#ef4444' : '#e2e8f0';
            item.style.background = isMarked ? '#fef2f2' : 'white';
            item.style.opacity = isMarked ? '0.7' : '1';
            
            const overlay = item.querySelector('.delete-ghost-overlay');
            overlay.style.display = isMarked ? 'flex' : 'none';
        });

        const countLabel = el('delete-selected-count');
        if (countLabel) countLabel.textContent = `${pagesToDelete.size} Halaman Dibuang`;

        const btnSubmit = el('btn-delete-submit');
        if (btnSubmit) {
            btnSubmit.disabled = pagesToDelete.size === 0;
        }
    }

    async function renderDeleteGrid(pdf, grid) {
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
            item.className = 'delete-page-item';
            item.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px; text-align: center; position: relative; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);';
            item.innerHTML = `
                <div class="delete-preview-box" style="height: 140px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 10px; overflow: hidden; pointer-events: none;">
                    <img src="${canvas.toDataURL()}" style="max-width: 100%; max-height: 100%; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                </div>
                <div style="font-size: 0.85rem; font-weight: 800; color: #64748b; margin-top: 12px;">Halaman ${i}</div>
                <div class="delete-ghost-overlay" style="position: absolute; inset: 0; background: rgba(239, 68, 68, 0.1); display: none; align-items: center; justify-content: center; border-radius: 16px; pointer-events: none;">
                    <div style="width: 40px; height: 40px; background: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 5px 15px rgba(239, 68, 68, 0.4);">
                        <i class="ph-bold ph-trash"></i>
                    </div>
                </div>
                <button class="zoom-btn-delete" style="position: absolute; bottom: 45px; right: 20px; width: 32px; height: 32px; border-radius: 50%; background: white; border: 1px solid #e2e8f0; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><i class="ph ph-magnifying-glass-plus"></i></button>
            `;

            // SMART TOGGLE SELECTION
            item.onclick = (e) => {
                if (e.shiftKey && lastSelectedIndex !== -1) {
                    const start = Math.min(lastSelectedIndex, i);
                    const end = Math.max(lastSelectedIndex, i);
                    for (let j = start; j <= end; j++) pagesToDelete.add(j);
                } else {
                    if (pagesToDelete.has(i)) pagesToDelete.delete(i);
                    else pagesToDelete.add(i);
                }
                lastSelectedIndex = i;
                updateDeleteUI();
            };

            item.querySelector('.zoom-btn-delete').onclick = (e) => {
                e.stopPropagation();
                openDeleteHDZoom(i);
            };

            grid.appendChild(item);
        }
    }

    async function openDeleteHDZoom(pageNum) {
        const pdf = await pdfjsLib.getDocument({ data: await deleteFile.arrayBuffer() }).promise;
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
            <div style="background: white; width: 100%; max-width: 1000px; height: 90vh; border-radius: 32px; box-shadow: 0 50px 100px rgba(0,0,0,0.4); overflow: hidden; display: flex; flex-direction: column; animation: zoomIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="padding: 20px 30px; background: white; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800;">${deleteFile.name}</h3>
                        <p style="margin: 0; color: #ef4444; font-size: 0.8rem; font-weight: 700;">Pratinjau Halaman ${pageNum}</p>
                    </div>
                    <button id="hd-delete-close" style="width: 40px; height: 40px; border-radius: 12px; background: #f1f5f9; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
                <div style="flex: 1; background: #f8fafc; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 40px;">
                    <img src="${canvas.toDataURL()}" style="max-height: 75vh; box-shadow: 0 20px 50px rgba(0,0,0,0.1); border-radius: 4px;">
                </div>
            </div>
        `;
        modal.querySelector('#hd-delete-close').onclick = () => modal.remove();
        document.body.appendChild(modal);
    }
}
