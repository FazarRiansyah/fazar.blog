/**
 * #JagaDokumen - PDF to Image Tool (ULTIMATE NITRO v5)
 * Added: Rotation support (per-page & Rotate All), Keyboard Shortcuts (R)
 */
function initPdfToImg(container = document) {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const q = (id) => container.querySelector('#' + id);

    const fileInput   = q('pdf-to-img-file-input');
    const uploadArea  = q('pdf-to-img-upload-area');
    const workspace   = q('pdf-to-img-workspace');
    const grid        = q('pdf-to-img-grid');
    const btnExecute  = q('btn-pdf-to-img-execute');
    const btnChange   = q('btn-p2i-change-file');
    const btnToggle   = q('btn-p2i-toggle-all');
    const btnRotateAll = q('btn-p2i-rotate-all');

    if (!fileInput || !uploadArea) return;

    let pdfDoc = null;
    let selectedIndices = new Set();
    let rotationStates = {}; // idx -> degrees
    let lastSelectedIndex = -1;
    let thumbnails = []; 

    // ─── Upload Logic ────────────────────────────────────────────────
    const triggerSelect = () => { fileInput.value = ''; fileInput.click(); };
    uploadArea.onclick = (e) => { if (e.target !== fileInput) triggerSelect(); };
    btnChange.onclick = triggerSelect;

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') handleFile(file);
    };

    async function handleFile(file) {
        if (workspace) workspace.style.display = 'none';
        uploadArea.style.display = 'flex';
        uploadArea.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:220px;';
        uploadArea.innerHTML = `
            <i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i>
            <p style="font-weight:700;color:#64748b;font-size:0.95rem;">Membaca PDF...</p>
            <p style="font-size:0.8rem;color:#94a3b8;">${file.name}</p>`;

        try {
            const buf = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
            selectedIndices.clear();
            rotationStates = {};
            thumbnails = [];
            lastSelectedIndex = -1;

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement('canvas');
                canvas.height = viewport.height; canvas.width = viewport.width;
                await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                thumbnails.push(canvas.toDataURL());
                selectedIndices.add(i - 1);
            }

            uploadArea.style.display = 'none';
            workspace.style.display  = 'block';
            q('pdf-to-img-name').textContent = file.name;

            renderInitialGrid();
        } catch (err) {
            alert('Gagal: ' + err.message);
        }
    }

    // ─── Rotation & Shortcuts ────────────────────────────────────────
    function rotateAll() {
        for (let i = 0; i < pdfDoc.numPages; i++) {
            rotationStates[i] = ((rotationStates[i] || 0) + 90) % 360;
        }
        updateVisualState();
    }
    if (btnRotateAll) btnRotateAll.onclick = rotateAll;

    window.addEventListener('keydown', (e) => {
        if (workspace.style.display === 'none') return;
        if (e.key.toLowerCase() === 'r') {
            e.preventDefault();
            rotateAll();
        }
    });

    // ─── Rendering ───────────────────────────────────────────────────
    function renderInitialGrid() {
        if (!grid) return;
        grid.innerHTML = '';
        
        thumbnails.forEach((thumb, idx) => {
            const el = document.createElement('div');
            el.className = 'p2i-card';
            el.dataset.index = idx;
            el.style.cssText = 'background:white; border:2px solid #e2e8f0; border-radius:18px; padding:12px; text-align:center; position:relative; cursor:pointer; transition:all 0.2s;';

            el.innerHTML = `
                <div style="height:140px; display:flex; align-items:center; justify-content:center; background:#f8fafc; border-radius:12px; overflow:hidden; margin-bottom:10px; position:relative;">
                    <img src="${thumb}" class="p2i-thumb" style="max-width:100%; max-height:100%; object-fit:contain; transition:transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                    <div class="p2i-overlay" style="display:none; position:absolute; inset:0; background:rgba(37,99,235,0.1); align-items:center; justify-content:center;">
                        <i class="ph-fill ph-check-circle" style="color:#2563eb; font-size:2rem;"></i>
                    </div>
                    <button class="p2i-rotate-btn" style="position:absolute; bottom:8px; right:8px; width:28px; height:28px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.1); z-index:10; color:#64748b; border:none; cursor:pointer;">
                        <i class="ph ph-arrows-clockwise"></i>
                    </button>
                </div>
                <div class="p2i-label" style="font-size:0.8rem; font-weight:800; color:#94a3b8;">Halaman ${idx + 1}</div>
            `;

            el.querySelector('.p2i-rotate-btn').onclick = (e) => {
                e.stopPropagation();
                rotationStates[idx] = ((rotationStates[idx] || 0) + 90) % 360;
                updateVisualState();
            };

            el.onclick = (e) => {
                const i = parseInt(el.dataset.index);
                if (e.shiftKey && lastSelectedIndex !== -1) {
                    const start = Math.min(lastSelectedIndex, i);
                    const end = Math.max(lastSelectedIndex, i);
                    for (let j = start; j <= end; j++) selectedIndices.add(j);
                } else {
                    if (selectedIndices.has(i)) selectedIndices.delete(i);
                    else selectedIndices.add(i);
                    lastSelectedIndex = i;
                }
                updateVisualState();
            };

            grid.appendChild(el);
        });
        updateVisualState();
    }

    function updateVisualState() {
        if (!pdfDoc) return;
        const cards = grid.querySelectorAll('.p2i-card');
        cards.forEach((card, idx) => {
            const selected = selectedIndices.has(idx);
            const rot = rotationStates[idx] || 0;
            
            card.style.borderColor = selected ? '#2563eb' : '#e2e8f0';
            card.style.background  = selected ? '#eff6ff' : 'white';
            card.querySelector('.p2i-overlay').style.display = selected ? 'flex' : 'none';
            card.querySelector('.p2i-label').style.color = selected ? '#2563eb' : '#94a3b8';
            card.querySelector('.p2i-thumb').style.transform = `rotate(${rot}deg)`;
            
            if (selected) card.style.boxShadow = '0 8px 24px rgba(37,99,235,0.15)';
            else card.style.boxShadow = 'none';
        });

        const count = selectedIndices.size;
        const toggleText = q('p2i-toggle-text');
        if (count === pdfDoc.numPages) {
            toggleText.textContent = 'Batal Pilih';
            btnToggle.querySelector('i').className = 'ph-bold ph-x-square';
        } else {
            toggleText.textContent = 'Pilih Semua';
            btnToggle.querySelector('i').className = 'ph-bold ph-check-square';
        }

        q('pdf-to-img-status').textContent = count > 0 ? `${count} halaman terpilih` : 'Pilih halaman untuk dikonversi';
        btnExecute.disabled = count === 0;
        btnExecute.style.opacity = count === 0 ? '0.5' : '1';
    }

    if (btnToggle) {
        btnToggle.onclick = () => {
            if (!pdfDoc) return;
            if (selectedIndices.size === pdfDoc.numPages) selectedIndices.clear();
            else for (let i = 0; i < pdfDoc.numPages; i++) selectedIndices.add(i);
            updateVisualState();
        };
    }

    // ─── Final Conversion ─────────────────────────────────────────────
    if (btnExecute) {
        btnExecute.onclick = async () => {
            if (selectedIndices.size === 0) return;
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';

            try {
                const zip = new JSZip();
                const format = q('p2i-format').value;
                const scale = parseInt(q('p2i-quality').value) || 2;
                const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
                const ext = format === 'jpeg' ? 'jpg' : 'png';

                const sortedIndices = Array.from(selectedIndices).sort((a,b) => a - b);
                
                for (const idx of sortedIndices) {
                    const page = await pdfDoc.getPage(idx + 1);
                    const rot  = rotationStates[idx] || 0;
                    
                    // PDF.js internal rotation + our custom rotation
                    const viewport = page.getViewport({ scale: scale, rotation: page.rotate + rot });
                    
                    const canvas = document.createElement('canvas');
                    canvas.height = viewport.height; canvas.width = viewport.width;
                    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
                    
                    const dataUrl = canvas.toDataURL(mime, 0.9);
                    const base64 = dataUrl.split(',')[1];
                    zip.file(`Halaman_${idx + 1}.${ext}`, base64, { base64: true });
                }

                const content = await zip.generateAsync({ type: 'blob' });
                downloadFile(content, `JagaDokumen_Images.zip`, 'application/zip');
            } catch (err) {
                alert('Gagal: ' + err.message);
            } finally {
                btnExecute.disabled = false;
                btnExecute.innerHTML = '<i class="ph-bold ph-download-simple"></i> Konversi & Unduh ZIP';
            }
        };
    }
}
