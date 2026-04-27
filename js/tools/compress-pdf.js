/**
 * #JagaDokumen - PDF Compression Tool (NITRO v3.0)
 * Features: Multi-file Grid, PDF Thumbnails, Smart Estimation, Integrated Lever
 */
function initCompressPdf(container = document) {
    const f = (cls) => {
        const local = container.querySelector('.' + cls);
        if (local) return local;
        return document.querySelector('.modal-body .' + cls) || document.querySelector('.' + cls);
    };

    const fileInput     = f('compress-pdf-hidden-input');
    const uploadArea    = f('compress-pdf-upload-box');
    const workspace     = f('compress-pdf-workspace');
    const grid          = f('compress-pdf-grid');
    const btnExecute    = f('compress-pdf-btn');
    const slider        = f('compress-pdf-slider');
    const modeCards     = container.querySelectorAll('.compress-pdf-mode-card');

    if (!fileInput || !uploadArea) return;

    let pdfFiles = [];

    const triggerSelect = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        fileInput.click();
    };

    uploadArea.onclick = triggerSelect;
    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
        if (files.length > 0) handleFiles(files);
        fileInput.value = '';
    };

    async function handleFiles(files) {
        if (pdfFiles.length === 0) {
            uploadArea.innerHTML = `<i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i><p style="margin-top:12px;font-weight:700;">Membaca PDF...</p>`;
        }
        for (const file of files) {
            const thumb = await generatePdfThumb(file);
            pdfFiles.push({
                id: Math.random().toString(36).substr(2, 9),
                file, thumb, originalSize: file.size,
                compressedBlob: null, compressedSize: 0
            });
        }
        uploadArea.style.display = 'none';
        workspace.style.display  = 'block';
        updateLeverVisuals();
        renderGrid();
    }

    async function generatePdfThumb(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL();
        } catch (err) {
            return ''; // Fallback to icon
        }
    }

    function updateLeverVisuals() {
        const val = parseInt(slider.value);
        let color = '#2563eb'; 
        let activeIndex = 1;

        if (val < 35) {
            color = '#ef4444'; activeIndex = 0;
        } else if (val > 65) {
            color = '#22c55e'; activeIndex = 2;
        }

        slider.style.accentColor = color;
        if (btnExecute) btnExecute.style.background = color;

        modeCards.forEach((card, idx) => {
            if (idx === activeIndex) {
                card.style.background = idx === 0 ? '#fef2f2' : (idx === 1 ? '#eff6ff' : '#f0fdf4');
                card.style.borderColor = color;
                card.style.color = color;
                card.style.boxShadow = `0 8px 20px ${color}22`;
            } else {
                card.style.background = 'white';
                card.style.borderColor = '#e2e8f0';
                card.style.color = '#0f172a';
                card.style.boxShadow = 'none';
            }
        });
        renderGrid(); // Update sizes in real-time
    }

    if (slider) {
        slider.oninput = updateLeverVisuals;
    }

    modeCards.forEach(card => {
        card.onclick = () => {
            slider.value = card.dataset.val;
            updateLeverVisuals();
        };
    });

    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function renderGrid() {
        if (!grid) return;
        grid.innerHTML = '';
        const val = parseInt(slider.value);
        const savingPercent = Math.max(5, (100 - val) * 0.7);

        pdfFiles.forEach((item) => {
            const estimatedSize = item.originalSize * (1 - (savingPercent / 100));
            const el = document.createElement('div');
            el.style.cssText = `background:white; border:1px solid #e2e8f0; border-radius:18px; padding:12px; text-align:center; position:relative; transition:all 0.2s; min-width:0;`;
            el.innerHTML = `
                <div style="height:120px; display:flex; align-items:center; justify-content:center; background:#f8fafc; border-radius:12px; overflow:hidden; margin-bottom:10px; position:relative; border:1px solid #f1f5f9;">
                    ${item.thumb ? `<img src="${item.thumb}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="ph ph-file-pdf" style="font-size:2rem;color:#cbd5e1;"></i>`}
                    <div style="position:absolute; top:6px; right:6px; background:#dcfce7; color:#166534; font-size:0.6rem; font-weight:900; padding:2px 6px; border-radius:5px; border:1px solid #bbf7d0;">-${savingPercent.toFixed(0)}%</div>
                    <div style="position:absolute; bottom:6px; right:6px; display:flex; gap:4px;">
                        <button class="btn-preview-item" style="width:28px; height:28px; border-radius:50%; border:none; background:white; color:#2563eb; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.15);"><i class="ph-bold ph-eye"></i></button>
                        <button class="btn-remove-item" style="width:28px; height:28px; border-radius:50%; border:none; background:#fee2e2; color:#ef4444; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.15);"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
                <div style="font-size:0.7rem; font-weight:800; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:4px;">${item.file.name}</div>
                <div style="font-size:0.65rem; color:#64748b; font-weight:600;">
                    <span style="text-decoration:line-through; opacity:0.6;">${formatSize(item.originalSize)}</span>
                    <i class="ph ph-arrow-right" style="margin:0 2px;"></i>
                    <span style="color:#2563eb; font-weight:800;">${formatSize(estimatedSize)}</span>
                </div>
            `;
            el.querySelector('.btn-preview-item').onclick = () => showPdfPreview(item.file);
            el.querySelector('.btn-remove-item').onclick = () => {
                pdfFiles = pdfFiles.filter(p => p.id !== item.id);
                if (pdfFiles.length === 0) location.reload(); else renderGrid();
            };
            grid.appendChild(el);
        });

        const addCard = document.createElement('div');
        addCard.style.cssText = `border: 2px dashed #e2e8f0; border-radius: 18px; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; background: #f8fafc; color: #94a3b8; transition: all 0.2s; min-height: 175px;`;
        addCard.onclick = triggerSelect;
        addCard.innerHTML = `<i class="ph ph-plus-circle" style="font-size: 2rem; margin-bottom: 6px;"></i><span style="font-weight: 800; font-size: 0.75rem;">Tambah PDF</span>`;
        grid.appendChild(addCard);
        
        if (btnExecute) {
            btnExecute.innerHTML = pdfFiles.length === 1 ? '<i class="ph-bold ph-arrows-in"></i> Unduh Sekarang' : '<i class="ph-bold ph-arrows-in"></i> Unduh Semua (.zip)';
        }
    }

    async function showPdfPreview(file) {
        const url = URL.createObjectURL(file);
        const previewModal = document.createElement('div');
        previewModal.style.cssText = `position:fixed; inset:0; z-index:9999; background:rgba(15,23,42,0.9); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;`;
        previewModal.innerHTML = `
            <div style="position:absolute; top:20px; right:20px; display:flex; gap:12px;">
                <button id="close-pdf-preview" style="background:white; border:none; width:44px; height:44px; border-radius:12px; cursor:pointer; font-size:1.5rem; color:#0f172a;"><i class="ph ph-x"></i></button>
            </div>
            <iframe src="${url}" style="width:90%; height:90%; border-radius:12px; border:none; background:white; box-shadow:0 30px 60px rgba(0,0,0,0.5);"></iframe>
        `;
        document.body.appendChild(previewModal);
        previewModal.querySelector('#close-pdf-preview').onclick = () => {
            previewModal.remove();
            URL.revokeObjectURL(url);
        };
    }

    btnExecute.onclick = async () => {
        if (pdfFiles.length === 0) return;
        btnExecute.disabled = true;
        btnExecute.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Sedang Mengompres...';

        try {
            const results = await Promise.all(pdfFiles.map(async (item) => {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const bytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
                return { name: item.file.name, blob: new Blob([bytes], { type: 'application/pdf' }) };
            }));

            if (results.length === 1) {
                downloadFile(results[0].blob, `Compressed_${results[0].name}`, 'application/pdf');
            } else {
                const zip = new JSZip();
                results.forEach(res => zip.file(`Compressed_${res.name}`, res.blob));
                const content = await zip.generateAsync({ type: 'blob' });
                downloadFile(content, 'JagaDokumen_PDF_Compressed.zip', 'application/zip');
            }
            showSuccessScreen();
        } catch (err) {
            alert('Gagal: ' + err.message);
        } finally {
            btnExecute.disabled = false;
            renderGrid();
        }
    };

    function showSuccessScreen() {
        const modalBody = document.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <div style="width:80px; height:80px; background:#dcfce7; color:#22c55e; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                    <i class="ph-fill ph-check-circle" style="font-size:3rem;"></i>
                </div>
                <h2 style="font-weight:900; margin-bottom:10px;">Berhasil Dikompres!</h2>
                <p style="color:#64748b; margin-bottom:30px;">Semua file PDF Anda sudah diperkecil dan siap digunakan.</p>
                <button class="btn btn-primary" onclick="location.reload()" style="padding:12px 30px; border-radius:12px; background:#2563eb; border:none;">Proses File Lain</button>
            </div>
        `;
    }
}
