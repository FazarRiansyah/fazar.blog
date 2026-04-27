/**
 * #JagaDokumen - Split PDF Tool (BULLETPROOF EDITION)
 */
function initSplitPdf(container = document) {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const el = (id) => container.querySelector(id.startsWith('#') ? id : `#${id}`);

    const fileInput = el('split-file-input');
    const uploadArea = el('split-upload-area');
    const workspace = el('split-workspace');
    const pageGrid = el('split-page-grid');
    const statusText = el('split-status-text');
    const btnRun = el('btn-run-split');
    const btnReset = el('btn-reset-split');
    
    if (!fileInput || !uploadArea) return;
    
    let splitPdfFile = null;
    let selectedSplitPages = new Set();
    let currentSplitMode = 'extract';
    let splitRotateStates = {};

    const triggerFileSelect = () => {
        fileInput.value = '';
        fileInput.click();
    };

    // Upload Actions
    uploadArea.onclick = (e) => {
        if (e.target.tagName !== 'INPUT') triggerFileSelect();
    };

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
            <i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#8b5cf6;"></i>
            <p style="font-weight:700;color:#64748b;font-size:0.95rem;">Membaca PDF...</p>
            <p style="font-size:0.8rem;color:#94a3b8;">${file.name}</p>`;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            splitPdfFile = file;
            
            uploadArea.style.display = 'none';
            if(workspace) workspace.style.display = 'block';
            
            const nameEl = el('split-display-name');
            const metaEl = el('split-display-meta');
            if(nameEl) nameEl.textContent = file.name;
            if(metaEl) metaEl.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB • ${pdf.numPages} Halaman`;

            selectedSplitPages.clear();
            splitRotateStates = {};
            renderSplitPages(pdf, pageGrid, statusText);
            
        } catch (err) {
            alert('Gagal memuat PDF: ' + err.message);
        }
    }

    // Mode Switching
    container.querySelectorAll('.mode-tab-btn').forEach(btn => {
        btn.onclick = () => {
            container.querySelectorAll('.mode-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSplitMode = btn.dataset.mode;
            
            container.querySelectorAll('.split-mode-content').forEach(content => {
                content.style.display = content.id === `mode-${currentSplitMode}-content` ? 'block' : 'none';
            });
            updateSplitStatus(statusText, selectedSplitPages, currentSplitMode);
        };
    });

    if (btnReset) btnReset.onclick = triggerFileSelect;

    if (btnRun) {
        btnRun.onclick = async () => {
            if (!splitPdfFile) return;
            btnRun.disabled = true;
            const originalText = btnRun.innerHTML;
            btnRun.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';

            try {
                const arrayBuffer = await splitPdfFile.arrayBuffer();
                const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                
                if (currentSplitMode === 'extract') {
                    if (selectedSplitPages.size === 0) throw new Error('Pilih minimal 1 halaman');
                    const newDoc = await PDFLib.PDFDocument.create();
                    const pagesToCopy = Array.from(selectedSplitPages).sort((a, b) => a - b);
                    const copiedPages = await newDoc.copyPages(srcDoc, pagesToCopy.map(p => p - 1));
                    copiedPages.forEach((p, idx) => {
                        p.setRotation(PDFLib.degrees(splitRotateStates[pagesToCopy[idx]] || 0));
                        newDoc.addPage(p);
                    });
                    downloadFile(await newDoc.save(), 'JagaDokumen_Terpisah.pdf', 'application/pdf');
                } else if (currentSplitMode === 'burst') {
                    const zip = new JSZip();
                    for (let i = 0; i < srcDoc.getPageCount(); i++) {
                        const newDoc = await PDFLib.PDFDocument.create();
                        const [page] = await newDoc.copyPages(srcDoc, [i]);
                        page.setRotation(PDFLib.degrees(splitRotateStates[i + 1] || 0));
                        newDoc.addPage(page);
                        zip.file(`Halaman_${i + 1}.pdf`, await newDoc.save());
                    }
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    downloadFile(await resultDoc.save(), 'JagaDokumen_Split.pdf', 'application/pdf');
                }
            } catch (err) {
                alert('Error: ' + err.message);
            } finally {
                btnRun.disabled = false;
                btnRun.innerHTML = originalText;
            }
        };
    }

    async function renderSplitPages(pdf, grid, statusText) {
        if(!grid) return;
        grid.innerHTML = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.25 });
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height; canvas.width = viewport.width;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            const item = document.createElement('div');
            item.className = 'split-page-item';
            item.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; text-align: center; cursor: pointer; position: relative;';
            item.innerHTML = `
                <div class="split-page-preview" style="height: 140px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 6px; overflow: hidden; transition: transform 0.3s;">
                    <img src="${canvas.toDataURL()}" style="max-width: 100%; max-height: 100%;">
                </div>
                <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; margin-top: 8px;">Hal ${i}</div>
                <button class="btn-rot" style="position: absolute; bottom: 35px; right: 10px; width: 32px; height: 32px; background: #2563eb; color: white; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center;"><i class="ph ph-arrow-counter-clockwise"></i></button>
                <div class="check" style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; background: #2563eb; color: white; border-radius: 50%; display: none; align-items: center; justify-content: center;"><i class="ph ph-check"></i></div>
            `;

            const preview = item.querySelector('.split-page-preview');
            item.querySelector('.btn-rot').onclick = (e) => {
                e.stopPropagation();
                splitRotateStates[i] = ((splitRotateStates[i] || 0) + 90) % 360;
                preview.style.transform = `rotate(${splitRotateStates[i]}deg)`;
            };

            item.onclick = () => {
                if (currentSplitMode !== 'extract') return;
                if (selectedSplitPages.has(i)) {
                    selectedSplitPages.delete(i);
                    item.style.borderColor = '#e2e8f0';
                    item.querySelector('.check').style.display = 'none';
                } else {
                    selectedSplitPages.add(i);
                    item.style.borderColor = '#2563eb';
                    item.querySelector('.check').style.display = 'flex';
                }
                updateSplitStatus(statusText, selectedSplitPages, currentSplitMode);
            };
            grid.appendChild(item);
        }
    }
}

function updateSplitStatus(statusText, selectedSet, mode) {
    if (!statusText) return;
    if (mode === 'extract') statusText.textContent = `${selectedSet.size} Halaman Terpilih`;
    else statusText.textContent = mode === 'burst' ? 'Semua Halaman Dipisah' : 'Mode Rentang Kustom';
}
