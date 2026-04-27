/**
 * #JagaDokumen - Merge PDF Tool (ULTIMATE PRO + KEYBOARD SHORTCUTS)
 */
function initMergePdf(container = document) {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const uploadArea = container.querySelector('#merge-upload-area');
    const fileInput = container.querySelector('#merge-file-input');
    const workspace = container.querySelector('#merge-workspace');
    
    const fileListContainer = container.querySelector('#merge-file-list');
    const btnAddMore = container.querySelector('#btn-add-more-merge');
    const savePanel = container.querySelector('#merge-save-panel');
    const previewArea = container.querySelector('#merge-page-preview');

    if (!uploadArea || !fileInput || !workspace) return;

    let mergeFiles = []; 
    let globalPages = []; 
    let fileCounter = 0;
    let selectedIndices = [];

    // --- KEYBOARD SHORTCUTS ---
    const handleKeyDown = (e) => {
        if (workspace.style.display === 'none') return;
        if (document.activeElement.tagName === 'INPUT') return; // Don't trigger if typing in filename

        if (e.key === 'Delete') {
            e.preventDefault();
            bulkDelete();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            selectedIndices = globalPages.map((_, i) => i);
            renderPagePreviews();
        } else if (e.key === 'ArrowLeft' && selectedIndices.length > 0) {
            e.preventDefault();
            bulkMove('left');
        } else if (e.key === 'ArrowRight' && selectedIndices.length > 0) {
            e.preventDefault();
            bulkMove('right');
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    // --- UPLOAD ---
    uploadArea.onclick = () => { fileInput.value = ''; fileInput.click(); };
    if (btnAddMore) btnAddMore.onclick = () => { fileInput.value = ''; fileInput.click(); };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
        if (files.length > 0) processNewFiles(files);
    };
    workspace.ondragover = (e) => e.preventDefault();
    workspace.ondrop = handleFileDrop;

    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) processNewFiles(files);
    };

    function processNewFiles(files) {
        // Show loading spinner
        uploadArea.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:220px;';
        uploadArea.innerHTML = `
            <i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i>
            <p style="font-weight:700;color:#64748b;font-size:0.95rem;">Membaca PDF...</p>
            <p style="font-size:0.8rem;color:#94a3b8;">${files.length} File dipilih</p>`;

        setTimeout(() => {
            uploadArea.style.display = 'none';
            workspace.style.display = 'block';
            files.forEach(file => {
                const fileId = `f-${fileCounter++}`;
                const entry = { id: fileId, file: file, name: file.name, size: file.size, pageCount: '...', firstPageThumb: null };
                mergeFiles.push(entry);
                processSingleFile(entry);
            });
            renderWorkspace();
        }, 400); // Slightly longer for multiple files
    }

    async function processSingleFile(item) {
        try {
            const arrayBuffer = await item.file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            item.pageCount = pdf.numPages;
            for (let i = 1; i <= pdf.numPages; i++) {
                const pageEntry = { id: `${item.id}-p${i}-${Math.random()}`, fileId: item.id, fileName: item.name, pageIndex: i - 1, thumbnail: null, rotation: 0 };
                globalPages.push(pageEntry);
                renderPageThumbnail(pdf, pageEntry, i, item);
            }
            renderWorkspace();
        } catch (err) {}
    }

    async function renderPageThumbnail(pdf, pageEntry, pageNum, fileItem) {
        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height; canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            pageEntry.thumbnail = canvas.toDataURL('image/jpeg', 0.6);
            if (pageNum === 1 && !fileItem.firstPageThumb) { fileItem.firstPageThumb = pageEntry.thumbnail; renderFileList(); }
            renderPagePreviews();
        } catch (e) {}
    }

    // --- ACTIONS ---
    function bulkMove(direction) {
        if (selectedIndices.length === 0) return;
        selectedIndices.sort((a, b) => a - b);
        if (direction === 'left' && selectedIndices[0] > 0) {
            selectedIndices.forEach(idx => {
                const temp = globalPages[idx];
                globalPages[idx] = globalPages[idx - 1];
                globalPages[idx - 1] = temp;
            });
            selectedIndices = selectedIndices.map(i => i - 1);
        } else if (direction === 'right' && selectedIndices[selectedIndices.length - 1] < globalPages.length - 1) {
            for (let i = selectedIndices.length - 1; i >= 0; i--) {
                const idx = selectedIndices[i];
                const temp = globalPages[idx];
                globalPages[idx] = globalPages[idx + 1];
                globalPages[idx + 1] = temp;
            }
            selectedIndices = selectedIndices.map(i => i + 1);
        }
        renderWorkspace();
    }

    function bulkDelete() {
        if (selectedIndices.length === 0) return;
        globalPages = globalPages.filter((_, idx) => !selectedIndices.includes(idx));
        selectedIndices = [];
        renderWorkspace();
    }

    function bulkDuplicate() {
        if (selectedIndices.length === 0) return;
        selectedIndices.sort((a, b) => a - b);
        let offset = 0;
        selectedIndices.forEach(idx => {
            const original = globalPages[idx + offset];
            const copy = { ...original, id: original.id + '-copy-' + Math.random() };
            globalPages.splice(idx + offset + 1, 0, copy);
            offset++;
        });
        selectedIndices = [];
        renderWorkspace();
    }

    function bulkRotate() {
        if (selectedIndices.length === 0) return;
        selectedIndices.forEach(idx => {
            globalPages[idx].rotation = (globalPages[idx].rotation + 90) % 360;
        });
        renderPagePreviews();
    }

    async function openHDPreview(item) {
        const modal = document.createElement('div');
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.3s;";
        modal.innerHTML = `
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            </style>
            <div style="position: relative; width: 100%; max-width: 850px; height: 90vh; background: #fff; border-radius: 35px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.5);">
                <div style="padding: 20px 35px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; background: #fff;">
                    <div style="flex-grow: 1; min-width: 0; margin-right: 20px;">
                        <div style="font-weight: 900; color: #0f172a; font-size: 1.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.fileName}</div>
                        <div style="font-size: 0.8rem; color: #2563eb; font-weight: 700;">Pratinjau HD & Rotasi</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="rotate-zoom-btn" style="padding: 10px 20px; border-radius: 14px; border: none; background: #eff6ff; color: #2563eb; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 0.9rem; transition: all 0.2s;"><i class="ph ph-arrow-clockwise"></i> Putar</button>
                        <button id="close-zoom-modal" style="width: 44px; height: 44px; border-radius: 14px; border: none; background: #f1f5f9; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">&times;</button>
                    </div>
                </div>
                <div id="hd-preview-body" style="flex-grow: 1; overflow: auto; background: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 30px; position: relative;">
                    <div id="hd-loader" style="color: #2563eb;"><i class="ph ph-circle-notch" style="font-size: 3rem; animation: spin 1s linear infinite;"></i></div>
                    <img id="hd-img" style="display: none; max-width: 100%; box-shadow: 0 30px 60px -10px rgba(0,0,0,0.15); transform: rotate(${item.rotation}deg); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); border-radius: 4px;">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const hdImg = modal.querySelector('#hd-img');
        modal.querySelector('#rotate-zoom-btn').onclick = () => { item.rotation = (item.rotation + 90) % 360; hdImg.style.transform = `rotate(${item.rotation}deg)`; renderPagePreviews(); };
        const closeModal = () => { modal.style.opacity = '0'; setTimeout(() => modal.remove(), 300); };
        modal.querySelector('#close-zoom-modal').onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        try {
            const fileObj = mergeFiles.find(f => f.id === item.fileId);
            const pdf = await pdfjsLib.getDocument({ data: await fileObj.file.arrayBuffer() }).promise;
            const page = await pdf.getPage(item.pageIndex + 1);
            const viewport = page.getViewport({ scale: 2.0 }); 
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height; canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            modal.querySelector('#hd-img').src = canvas.toDataURL('image/jpeg', 0.9);
            modal.querySelector('#hd-img').style.display = 'block';
            modal.querySelector('#hd-loader').style.display = 'none';
        } catch (err) { modal.querySelector('#hd-preview-body').innerHTML = '<div style="color:#ef4444; font-weight:800;">Gagal memuat pratinjau HD</div>'; }
    }

    // --- RENDERING ---
    function renderWorkspace() { renderFileList(); renderSavePanel(); renderPagePreviews(); }

    function renderFileList() {
        if (!fileListContainer) return;
        fileListContainer.innerHTML = '';
        mergeFiles.forEach((item) => {
            const card = document.createElement('div');
            card.style.cssText = "display: flex; align-items: center; background: white; padding: 12px 24px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-bottom: 12px;";
            const thumb = item.firstPageThumb ? `<img src="${item.firstPageThumb}" style="width: 44px; height: 58px; object-fit: cover; border-radius: 8px;">` : `<div style="width: 44px; height: 58px; background: #eff6ff; color: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="ph-fill ph-file-pdf"></i></div>`;
            card.innerHTML = `<div style="margin-right: 20px;">${thumb}</div><div style="flex-grow: 1; min-width: 0;"><div style="font-weight: 800; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1rem;">${item.name}</div><div style="font-size: 0.85rem; color: #64748b; font-weight: 600;">${item.pageCount} Halaman • ${(item.size / (1024*1024)).toFixed(2)} MB</div></div><button class="remove-btn" style="width: 40px; height: 40px; border-radius: 12px; border: none; background: #fff1f2; cursor: pointer; color: #f43f5e; display: flex; align-items: center; justify-content: center;"><i class="ph-bold ph-trash"></i></button>`;
            card.querySelector('.remove-btn').onclick = () => { mergeFiles = mergeFiles.filter(f => f.id !== item.id); globalPages = globalPages.filter(p => p.fileId !== item.id); selectedIndices = []; renderWorkspace(); if (mergeFiles.length === 0) { uploadArea.style.display = 'block'; workspace.style.display = 'none'; } };
            fileListContainer.appendChild(card);
        });
    }

    function renderSavePanel() {
        if (!savePanel) return;
        const totalSizeMb = (globalPages.reduce((acc, p) => acc + (mergeFiles.find(f => f.id === p.fileId)?.size || 0) / (mergeFiles.find(f => f.id === p.fileId)?.pageCount || 1), 0) / (1024*1024)).toFixed(2);
        savePanel.style.cssText = "background: #f8fafc; padding: 40px; border-radius: 32px; border: 1px solid #e2e8f0; margin-bottom: 40px; display: flex; flex-direction: column; align-items: center; gap: 25px;";
        savePanel.innerHTML = `<div style="width: 100%; max-width: 550px;"><label style="display: block; font-size: 0.85rem; font-weight: 900; color: #64748b; margin-bottom: 12px; text-transform: uppercase;">Nama File Hasil:</label><div style="display: flex; align-items: center; background: white; border: 2px solid #e2e8f0; border-radius: 18px; overflow: hidden;"><input type="text" id="merge-filename-input" value="JagaDokumen_Gabungan" style="flex-grow: 1; padding: 18px 24px; border: none; outline: none; font-weight: 800; color: #0f172a; font-size: 1.1rem; background: transparent;"><span style="padding-right: 24px; color: #94a3b8; font-weight: 800; font-size: 1.1rem;">.pdf</span></div></div><div style="text-align: center;"><button id="btn-merge-execute" class="btn btn-primary" style="padding: 22px 60px; font-size: 1.2rem; font-weight: 900; border-radius: 22px; box-shadow: 0 15px 35px rgba(37, 99, 235, 0.3); margin-bottom: 12px;"><i class="ph-fill ph-lightning"></i> GABUNGKAN & UNDUH PDF</button><div style="font-size: 0.9rem; font-weight: 700; color: #64748b;">Estimasi Ukuran Total: <span style="color: #0f172a;">${totalSizeMb} MB</span></div></div>`;
        savePanel.querySelector('#btn-merge-execute').onclick = () => executeMerge();
    }

    function renderPagePreviews() {
        if (!previewArea || globalPages.length === 0) return;
        previewArea.innerHTML = `
            <div style="position: sticky; top: 85px; z-index: 900; display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 20px 25px; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); flex-wrap: wrap; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; background: #eff6ff; color: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;"><i class="ph-fill ph-eye"></i></div>
                    <div><h5 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #0f172a;">Pratinjau Urutan</h5><p style="margin: 2px 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600;">Shortcuts: Del, Ctrl+A, Panah</p></div>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="btn-bulk-left" class="action-pill"><i class="ph ph-arrow-left"></i> Kiri</button>
                    <button id="btn-bulk-right" class="action-pill">Kanan <i class="ph ph-arrow-right"></i></button>
                    <button id="btn-bulk-rot" class="action-pill" style="color: #4f46e5; background: #eef2ff;"><i class="ph ph-arrow-clockwise"></i> Putar</button>
                    <button id="btn-bulk-dup" class="action-pill" style="color: #0891b2; background: #ecfeff;"><i class="ph ph-copy"></i> Gandakan</button>
                    <button id="btn-bulk-del" class="action-pill" style="color: #e11d48; background: #fff1f2;"><i class="ph ph-trash"></i> Hapus</button>
                </div>
            </div>
            <style>
                .action-pill { padding: 10px 18px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; color: #2563eb; cursor: pointer; font-size: 0.85rem; font-weight: 800; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
                .action-pill:hover { background: #eff6ff; border-color: #2563eb; transform: translateY(-2px); }
                .action-pill:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
            </style>
            <div id="merge-page-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;"></div>
        `;
        const btns = ['left', 'right', 'rot', 'dup', 'del'].map(id => previewArea.querySelector(`#btn-bulk-${id}`));
        if (selectedIndices.length === 0) btns.forEach(b => b.disabled = true);
        previewArea.querySelector('#btn-bulk-left').onclick = () => bulkMove('left');
        previewArea.querySelector('#btn-bulk-right').onclick = () => bulkMove('right');
        previewArea.querySelector('#btn-bulk-rot').onclick = () => bulkRotate();
        previewArea.querySelector('#btn-bulk-del').onclick = () => bulkDelete();
        previewArea.querySelector('#btn-bulk-dup').onclick = () => bulkDuplicate();
        const grid = previewArea.querySelector('#merge-page-grid');
        globalPages.forEach((item, idx) => {
            const isSelected = selectedIndices.includes(idx);
            const card = document.createElement('div');
            card.style.cssText = `background: white; border: 2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}; border-radius: 18px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; ${isSelected ? 'transform: scale(1.03); z-index: 10; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.15);' : ''}`;
            const thumb = item.thumbnail ? `<img src="${item.thumbnail}" style="max-width: 100%; max-height: 100%; transform: rotate(${item.rotation}deg) scale(${item.rotation % 180 !== 0 ? '0.75' : '1'}); transition: transform 0.3s;">` : `<div style="color: #cbd5e1;"><i class="ph ph-circle-notch animate-spin"></i></div>`;
            card.innerHTML = `<div style="width: 100%; height: 160px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 12px; overflow: hidden; margin-bottom: 10px; border: 1px solid #f1f5f9;">${thumb}</div><div style="font-size: 0.8rem; font-weight: 800; color: ${isSelected ? '#2563eb' : '#64748b'};">Hal ${idx + 1}</div><button class="zoom-btn" style="position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(255,255,255,0.9); color: #2563eb; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"><i class="ph-bold ph-magnifying-glass-plus"></i></button>`;
            card.onclick = (e) => { if (e.target.closest('.zoom-btn')) return; if (e.shiftKey && selectedIndices.length > 0) { const start = Math.min(selectedIndices[0], idx); const end = Math.max(selectedIndices[0], idx); selectedIndices = Array.from({length: end - start + 1}, (_, i) => start + i); } else if (e.ctrlKey || e.metaKey) { if (isSelected) selectedIndices = selectedIndices.filter(i => i !== idx); else selectedIndices.push(idx); } else { selectedIndices = [idx]; } renderPagePreviews(); };
            card.querySelector('.zoom-btn').onclick = (e) => { e.stopPropagation(); openHDPreview(item); };
            grid.appendChild(card);
        });
    }

    async function executeMerge() {
        const btn = container.querySelector('#btn-merge-execute');
        btn.disabled = true; const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Menghasilkan...';
        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            for (const item of globalPages) {
                const fileObj = mergeFiles.find(f => f.id === item.fileId);
                const srcDoc = await PDFLib.PDFDocument.load(await fileObj.file.arrayBuffer());
                const [copiedPage] = await mergedPdf.copyPages(srcDoc, [item.pageIndex]);
                if (item.rotation !== 0) copiedPage.setRotation(PDFLib.degrees(copiedPage.getRotation().angle + item.rotation));
                mergedPdf.addPage(copiedPage);
            }
            downloadFile(await mergedPdf.save(), `${container.querySelector('#merge-filename-input').value}.pdf`, 'application/pdf');
        } catch (err) { alert('Gagal: ' + err.message); } finally { btn.disabled = false; btn.innerHTML = originalText; }
    }
}
