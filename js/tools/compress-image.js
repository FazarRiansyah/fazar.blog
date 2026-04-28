/**
 * #JagaDokumen - Image Compression Tool (ULTIMATE NITRO v8.0)
 * Features: Integrated Control Lever (Slider + Mode Cards), Dynamic Colors
 */
function initCompressImg(container = document) {
    const f = (cls) => {
        const local = container.querySelector('.' + cls);
        if (local) return local;
        return document.querySelector('.modal-body .' + cls) || document.querySelector('.' + cls);
    };

    const fileInput     = f('compress-hidden-input');
    const uploadArea    = f('compress-upload-box');
    const workspace     = f('compress-workspace-area');
    const grid          = f('compress-grid-list');
    const btnExecute    = f('compress-execute-btn');
    const qualitySlider = f('compress-slider-input');
    const modeCards     = container.querySelectorAll('.compress-mode-card');

    if (!fileInput || !uploadArea) return;

    let imageFiles = []; 

    const triggerSelect = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        fileInput.click();
    };

    uploadArea.addEventListener('click', triggerSelect);
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) handleFiles(files);
        fileInput.value = ''; 
    });

    async function handleFiles(files) {
        if (imageFiles.length === 0) {
            uploadArea.innerHTML = `<i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i><p style="margin-top:12px;font-weight:700;">Membaca Gambar...</p>`;
        }
        for (const file of files) {
            const src = await fileToDataURL(file);
            imageFiles.push({
                id: Math.random().toString(36).substr(2, 9),
                file, src, originalSize: file.size,
                compressedBlob: null, compressedSize: 0, compressedUrl: ''
            });
        }
        uploadArea.style.display = 'none';
        workspace.style.display  = 'block';
        updateSliderVisuals();
        updateCompression();
    }

    function fileToDataURL(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // ─── Control Lever Logic ─────────────────────────────────────────
    function updateSliderVisuals() {
        const val = parseInt(qualitySlider.value);
        let color = '#2563eb'; // Default Blue
        let activeIndex = 1;

        if (val < 35) {
            color = '#ef4444'; // Red (Hemat)
            activeIndex = 0;
        } else if (val > 65) {
            color = '#22c55e'; // Green (Tajam)
            activeIndex = 2;
        }

        qualitySlider.style.accentColor = color;
        if (btnExecute) btnExecute.style.background = color;

        // Highlight Active Card
        modeCards.forEach((card, idx) => {
            if (idx === activeIndex) {
                card.style.background = idx === 0 ? '#fef2f2' : (idx === 1 ? '#eff6ff' : '#f0fdf4');
                card.style.borderColor = color;
                card.style.boxShadow = `0 8px 20px ${color}22`;
            } else {
                card.style.background = 'white';
                card.style.borderColor = '#e2e8f0';
                card.style.boxShadow = 'none';
            }
        });

        // Instant Preview: update sizes in the grid without waiting for actual compression
        renderGrid(); 
    }

    if (qualitySlider) {
        qualitySlider.oninput = updateSliderVisuals;
        qualitySlider.onchange = updateCompression;
    }

    modeCards.forEach(card => {
        card.onclick = () => {
            qualitySlider.value = card.dataset.val;
            updateSliderVisuals();
            updateCompression();
        };
    });

    async function updateCompression() {
        if (imageFiles.length === 0) return;
        
        const val = parseInt(qualitySlider.value);
        const quality = val / 100; // Makin kiri (kecil) makin kompres
        
        // Smart Resizing based on lever position
        let maxSize = 1920;
        if (val < 35) maxSize = 1000;
        else if (val > 65) maxSize = 4000;
        
        await Promise.all(imageFiles.map(async (item) => {
            const blob = await compressImage(item.src, quality, maxSize, 'image/jpeg');
            
            // Anti-Enlarge Guard
            if (blob.size >= item.originalSize && val > 30) {
                item.compressedBlob = item.file;
                item.compressedSize = item.originalSize;
            } else {
                item.compressedBlob = blob;
                item.compressedSize = blob.size;
            }
            if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
            item.compressedUrl = URL.createObjectURL(item.compressedBlob);
            item.lastVal = val;
        }));
        renderGrid();
    }

    function compressImage(src, quality, maxSize, type) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w > h) { h = (maxSize/w)*h; w = maxSize; }
                    else { w = (maxSize/h)*w; h = maxSize; }
                }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => resolve(blob), type, quality);
            };
            img.src = src;
        });
    }

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
        
        const val = parseInt(qualitySlider.value);
        // Estimate saving percentage based on slider (0-100)
        // 100 (Tajam) -> ~10% saving
        // 50 (Standar) -> ~50% saving
        // 0 (Hemat) -> ~85% saving
        const estimatedSaving = Math.max(5, (100 - val) * 0.85);

        imageFiles.forEach((item) => {
            const displaySize = (item.compressedSize > 0 && val === (item.lastVal || val)) 
                ? item.compressedSize 
                : (item.originalSize * (1 - (estimatedSaving / 100)));
            
            const ratio = (item.compressedSize > 0 && val === (item.lastVal || val))
                ? Math.max(0, (((item.originalSize - item.compressedSize) / item.originalSize) * 100)).toFixed(0)
                : estimatedSaving.toFixed(0);

            const el = document.createElement('div');
            el.style.cssText = `background:white; border:1px solid #e2e8f0; border-radius:18px; padding:12px; text-align:center; position:relative; transition:all 0.2s; min-width:0;`;
            el.innerHTML = `
                <div style="height:110px; display:flex; align-items:center; justify-content:center; background:#f8fafc; border-radius:12px; overflow:hidden; margin-bottom:10px; position:relative; border:1px solid #f1f5f9;">
                    <img src="${item.src}" style="width:100%; height:100%; object-fit:cover;">
                    <div style="position:absolute; top:6px; right:6px; background:#dcfce7; color:#166534; font-size:0.6rem; font-weight:900; padding:2px 6px; border-radius:5px; border:1px solid #bbf7d0;">-${ratio}%</div>
                    <div style="position:absolute; bottom:6px; right:6px; display:flex; gap:4px;">
                        <button class="btn-preview-item" style="width:28px; height:28px; border-radius:50%; border:none; background:white; color:#2563eb; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.15);"><i class="ph-bold ph-eye"></i></button>
                        <button class="btn-remove-item" style="width:28px; height:28px; border-radius:50%; border:none; background:#fee2e2; color:#ef4444; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(0,0,0,0.15);"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
                <div style="font-size:0.7rem; font-weight:800; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:4px;">${item.file.name}</div>
                <div style="font-size:0.65rem; color:#64748b; font-weight:600;">
                    <span style="text-decoration:line-through; opacity:0.6;">${formatSize(item.originalSize)}</span>
                    <i class="ph ph-arrow-right" style="margin:0 2px;"></i>
                    <span style="color:#2563eb; font-weight:800;">${formatSize(displaySize)}</span>
                </div>
            `;
            el.querySelector('.btn-preview-item').onclick = () => showFullPreview(item.compressedUrl, item.file.name);
            el.querySelector('.btn-remove-item').onclick = (e) => {
                e.stopPropagation();
                imageFiles = imageFiles.filter(i => i.id !== item.id);
                if (imageFiles.length === 0) location.reload(); else renderGrid();
            };
            grid.appendChild(el);
        });
        const addCard = document.createElement('div');
        addCard.style.cssText = `border: 2px dashed #e2e8f0; border-radius: 18px; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; background: #f8fafc; color: #94a3b8; transition: all 0.2s; min-height: 165px;`;
        addCard.onclick = triggerSelect;
        addCard.innerHTML = `<i class="ph ph-plus-circle" style="font-size: 2rem; margin-bottom: 6px;"></i><span style="font-weight: 800; font-size: 0.75rem;">Tambah</span>`;
        grid.appendChild(addCard);
    }

    function showFullPreview(url, name) {
        const previewModal = document.createElement('div');
        previewModal.style.cssText = `position:fixed; inset:0; z-index:9999; background:rgba(15,23,42,0.95); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px;`;
        previewModal.innerHTML = `
            <div style="position:absolute; top:20px; right:20px; display:flex; gap:12px;">
                <a href="${url}" download="Compressed_${name.split('.')[0]}.jpg" style="background:#2563eb; color:white; padding:10px 24px; border-radius:12px; font-weight:800; text-decoration:none; display:flex; align-items:center; gap:10px;"><i class="ph ph-download-simple"></i> Unduh</a>
                <button id="close-p2i-preview" style="background:white; border:none; width:44px; height:44px; border-radius:12px; cursor:pointer; font-size:1.5rem; color:#0f172a;"><i class="ph ph-x"></i></button>
            </div>
            <img src="${url}" style="max-width:90%; max-height:80%; border-radius:12px; box-shadow:0 30px 60px rgba(0,0,0,0.5); object-fit:contain; border: 4px solid white;">
        `;
        document.body.appendChild(previewModal);
        previewModal.querySelector('#close-p2i-preview').onclick = () => previewModal.remove();
        previewModal.onclick = (e) => { if (e.target === previewModal) previewModal.remove(); };
    }

    if (btnExecute) {
        btnExecute.onclick = async () => {
            if (imageFiles.length === 0) return;
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';
            try {
                if (imageFiles.length === 1) {
                    downloadFile(imageFiles[0].compressedBlob, `Compressed_${imageFiles[0].file.name.split('.')[0]}.jpg`, 'image/jpeg');
                } else {
                    const zip = new JSZip();
                    imageFiles.forEach(item => zip.file(`Compressed_${item.file.name.split('.')[0]}.jpg`, item.compressedBlob));
                    const content = await zip.generateAsync({ type: 'blob' });
                    downloadFile(content, 'JagaDokumen_Compressed.zip', 'application/zip');
                }
            } catch (err) { 
                alert('Gagal: ' + err.message); 
            } finally {
                btnExecute.disabled = false; 
                renderGrid(); // Ini akan mereset teks tombol secara otomatis
            }
        };
    }
}
