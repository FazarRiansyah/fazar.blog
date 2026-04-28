/**
 * #JagaDokumen - Image Conversion Tool (PREMIUM)
 * Features: Batch Format Conversion, Quality Control, Live Preview, Size Estimation.
 */
function initConvertImg(container = document) {
    const q = (id) => container.querySelector('#' + id);

    const fileInput = q('conv-img-file-input');
    const uploadArea = q('conv-img-upload-area');
    const workspace = q('conv-img-workspace');
    const grid = q('conv-img-grid');
    const btnExecute = q('btn-conv-img-save');
    
    // Preview Elements
    const previewImg = q('conv-preview-img');
    const infoOrigType = q('conv-info-orig-type');
    const infoOrigSize = q('conv-info-orig-size');
    const infoNewType = q('conv-info-new-type');
    const infoNewSize = q('conv-info-new-size');

    // Controls
    const qualitySlider = q('conv-quality');
    const qualityVal = q('conv-quality-val');
    const formatBtns = container.querySelectorAll('.btn-conv-format');

    if (!fileInput || !uploadArea) return;

    let imageFiles = [];
    let activeImageId = null;
    let targetFormat = 'image/jpeg';
    let estimationTimeout = null;

    // ─── Upload Logic ────────────────────────────────────────────────
    const triggerSelect = () => { fileInput.value = ''; fileInput.click(); };
    uploadArea.onclick = (e) => { if (e.target !== fileInput) triggerSelect(); };

    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) handleFiles(files);
    };

    async function handleFiles(files) {
        if (imageFiles.length === 0) {
            uploadArea.innerHTML = `<i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i><p style="margin-top:12px;font-weight:700;">Loading Converter...</p>`;
        }
        
        for (const file of files) {
            const dataUrl = await fileToDataURL(file);
            const id = Math.random().toString(36).substr(2, 9);
            imageFiles.push({
                id, file, dataUrl,
                size: (file.size / 1024).toFixed(1) + ' KB',
                rawSize: file.size,
                type: file.type.split('/')[1].toUpperCase()
            });
            if (!activeImageId) activeImageId = id;
        }

        uploadArea.style.display = 'none';
        workspace.style.display = 'grid';
        
        renderGrid();
        updatePreview();
    }

    function fileToDataURL(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // ─── UI Interaction ──────────────────────────────────────────────
    qualitySlider.oninput = () => {
        qualityVal.textContent = qualitySlider.value + '%';
        debounceEstimate();
    };

    formatBtns.forEach(btn => {
        btn.onclick = () => {
            formatBtns.forEach(b => {
                b.classList.remove('active');
                b.style.borderColor = 'var(--border-color)';
                b.style.background = 'var(--bg-card)';
                b.style.color = 'var(--text-muted)';
            });
            btn.classList.add('active');
            btn.style.borderColor = 'var(--primary-blue)';
            btn.style.background = 'rgba(37, 99, 235, 0.1)';
            btn.style.color = 'var(--primary-blue)';
            targetFormat = btn.dataset.format;
            debounceEstimate();
        };
    });

    function debounceEstimate() {
        if (estimationTimeout) clearTimeout(estimationTimeout);
        infoNewSize.textContent = "...";
        estimationTimeout = setTimeout(estimateSize, 300);
    }

    async function estimateSize() {
        const active = imageFiles.find(i => i.id === activeImageId);
        if (!active) return;
        
        const quality = parseInt(qualitySlider.value) / 100;
        const blob = await convertImage(active.dataUrl, targetFormat, quality);
        infoNewSize.textContent = (blob.size / 1024).toFixed(1) + ' KB';
        infoNewType.textContent = targetFormat.split('/')[1].toUpperCase().replace('JPEG', 'JPG');
    }

    function updatePreview() {
        const active = imageFiles.find(i => i.id === activeImageId);
        if (!active) return;
        previewImg.src = active.dataUrl;
        infoOrigType.textContent = active.type;
        infoOrigSize.textContent = active.size;
        estimateSize();
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
                    <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">${item.type} • ${item.size}</div>
                </div>
                <button class="btn-remove" style="width: 28px; height: 28px; border-radius: 8px; border: none; background: ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(244, 63, 94, 0.1)'}; color: #f43f5e; cursor: pointer;"><i class="ph ph-trash"></i></button>
            `;
            el.onclick = (e) => {
                if (e.target.closest('.btn-remove')) return;
                activeImageId = item.id;
                renderGrid();
                updatePreview();
            };
            el.querySelector('.btn-remove').onclick = () => {
                imageFiles = imageFiles.filter(i => i.id !== item.id);
                if (imageFiles.length === 0) location.reload();
                else {
                    if (activeImageId === item.id) activeImageId = imageFiles[0].id;
                    renderGrid();
                    updatePreview();
                }
            };
            grid.appendChild(el);
        });
        
        const addBtn = document.createElement('div');
        addBtn.style.cssText = `
            margin-top: 10px; padding: 14px; border: 2px dashed var(--border-color); border-radius: 16px; 
            color: var(--text-muted); font-size: 0.75rem; font-weight: 800; text-align: center; cursor: pointer;
            background: rgba(255,255,255,0.02);
        `;
        addBtn.innerHTML = `<i class="ph ph-plus-circle"></i> Add More Images`;
        addBtn.onclick = triggerSelect;
        grid.appendChild(addBtn);
    }

    // ─── Execution Logic ───────────────────────────────────────────
    if (btnExecute) {
        btnExecute.onclick = async () => {
            if (imageFiles.length === 0) return;
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Converting...';

            const quality = parseInt(qualitySlider.value) / 100;

            try {
                const results = await Promise.all(imageFiles.map(async (item) => {
                    const blob = await convertImage(item.dataUrl, targetFormat, quality);
                    const name = item.file.name.substring(0, item.file.name.lastIndexOf('.'));
                    const ext = '.' + targetFormat.split('/')[1].replace('jpeg', 'jpg');
                    return { name: name + ext, blob };
                }));

                if (results.length === 1) {
                    downloadFile(results[0].blob, results[0].name, results[0].blob.type);
                } else {
                    const zip = new JSZip();
                    results.forEach(res => zip.file(res.name, res.blob));
                    const content = await zip.generateAsync({ type: 'blob' });
                    downloadFile(content, 'JagaDokumen_Converted_Images.zip', 'application/zip');
                }
                showToast('Images converted successfully!');
            } catch (err) { alert('Error: ' + err.message); }
            finally {
                btnExecute.disabled = false;
                btnExecute.innerHTML = '<i class="ph-bold ph-check-circle"></i> Convert & Download';
            }
        };
    }

    function convertImage(src, format, quality) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => resolve(blob), format, quality);
            };
            img.src = src;
        });
    }
}
