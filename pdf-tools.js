/**
 * PDF Tools for #JagaDokumen
 * Includes Merge, Image to PDF, and Split/Extract PDF
 */

// ==========================================
// Global Variables for Tools
// ==========================================
let mergeFiles = [];
let splitPdfDoc = null; // Changed from splitFile
let selectedSplitPages = new Set(); // Changed from splitSelectedPages
let currentSplitMode = 'extract';
let splitRotateStates = {}; // Added for rotation tracking
let deletePdfData = null;
let pagesToDelete = new Set();
let extractPdfData = null;
let pagesToKeep = new Set();
let rotatePdfData = null;
let rotateStates = {}; 
let compressImageData = null;
let pdfCache = new Map();
let isRendering = false;
let imageQueue = []; // For Image to PDF state
let finalPageSequence = []; // For Merge PDF state

// Global Helpers
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

// ==========================================
// 1. GABUNGKAN PDF (MERGE) - REBUILT
// ==========================================
function initMergePdf(container = document) {
    const fileInput = container.querySelector('#merge-file-input');
    const uploadArea = container.querySelector('#merge-upload-area');
    const workspace = container.querySelector('#merge-workspace');
    const fileList = container.querySelector('#merge-file-list');
    const btnAddMore = container.querySelector('#btn-add-more-merge');
    const btnProcess = container.querySelector('#btn-merge-process');

    if (!fileInput || !uploadArea) return;

    mergeFiles = []; 

    uploadArea.onclick = () => {
        fileInput.value = '';
        fileInput.click();
    };

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        mergeFiles = mergeFiles.concat(files);
        uploadArea.style.display = 'none';
        workspace.style.display = 'block';
        renderMergeFiles();
    });

    if (btnAddMore) {
        btnAddMore.onclick = () => {
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.multiple = true;
            tempInput.accept = 'application/pdf';
            tempInput.onchange = (e) => {
                const files = Array.from(e.target.files);
                mergeFiles = mergeFiles.concat(files);
                renderMergeFiles();
            };
            tempInput.click();
        };
    }

    function renderMergeFiles() {
        if (!fileList) return;
        fileList.innerHTML = '';
        mergeFiles.forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.style.cssText = "display: flex; align-items: center; background: white; padding: 15px; border-radius: 12px; margin-bottom: 10px; border: 1px solid #eee; box-shadow: 0 2px 5px rgba(0,0,0,0.05);";
            card.innerHTML = `
                <div style="font-size: 1.5rem; color: #ef4444; margin-right: 15px;"><i class="ph-fill ph-file-pdf"></i></div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 700; color: #1e293b; margin-bottom: 2px;">${file.name}</div>
                    <div style="font-size: 0.8rem; color: #64748b;">${(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button style="background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer;" onclick="removeMergeFile(${index})">&times;</button>
            `;
            fileList.appendChild(card);
        });
    }

    if (btnProcess) {
        btnProcess.onclick = async () => {
            if (mergeFiles.length < 2) {
                alert('Pilih minimal 2 file PDF untuk digabungkan.');
                return;
            }

            btnProcess.disabled = true;
            btnProcess.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';

            try {
                const mergedPdf = await PDFLib.PDFDocument.create();
                for (const file of mergeFiles) {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    pages.forEach(page => mergedPdf.addPage(page));
                }
                const pdfBytes = await mergedPdf.save();
                downloadFile(pdfBytes, 'JagaDokumen_Merged.pdf', 'application/pdf');
                showToast('PDF Berhasil digabungkan!', 'success');
            } catch (err) {
                console.error(err);
                alert('Gagal menggabungkan PDF.');
            } finally {
                btnProcess.disabled = false;
                btnProcess.innerHTML = 'Gabungkan Sekarang';
            }
        };
    }

    window.removeMergeFile = (index) => {
        mergeFiles.splice(index, 1);
        if (mergeFiles.length === 0) {
            uploadArea.style.display = 'flex';
            workspace.style.display = 'none';
        } else {
            renderMergeFiles();
        }
    };
}

// ==========================================
// 2. GAMBAR KE PDF (IMAGE TO PDF) - STANDARDIZED
// ==========================================
function initImageToPdf(container = document) {
    imageQueue = []; 

    const fileInput = container.querySelector('#img2pdf-file-input');
    const uploadArea = container.querySelector('#img2pdf-upload-area');
    const workspace = container.querySelector('#img2pdf-workspace');
    const grid = container.querySelector('#img-preview-grid');
    const btnProcess = container.querySelector('#btn-process-img2pdf');

    if (!fileInput || !uploadArea || !grid) return;

    uploadArea.onclick = () => {
        fileInput.value = '';
        fileInput.click();
    };

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    imageQueue.push({ file, src: ev.target.result });
                    renderImageUI();
                };
                reader.readAsDataURL(file);
            }
        }
        uploadArea.style.display = 'none';
        if(workspace) workspace.style.display = 'block';
    });

    function renderImageUI() {
        grid.innerHTML = '';
        imageQueue.forEach((img, index) => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.style.cssText = "position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #eee;";
            card.innerHTML = `
                <img src="${img.src}" style="width: 100%; height: 150px; object-fit: cover;">
                <button style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer;" onclick="removeImage(${index})">&times;</button>
            `;
            grid.appendChild(card);
        });
    }

    window.removeImage = (index) => {
        imageQueue.splice(index, 1);
        if (imageQueue.length === 0) {
            uploadArea.style.display = 'flex';
            if(workspace) workspace.style.display = 'none';
        } else {
            renderImageUI();
        }
    };

    if (btnProcess) {
        btnProcess.onclick = async () => {
            if (imageQueue.length === 0) return;
            btnProcess.disabled = true;
            btnProcess.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';
            
            try {
                const pdfDoc = await PDFLib.PDFDocument.create();
                for (const img of imageQueue) {
                    const imgBytes = await img.file.arrayBuffer();
                    let pdfImg;
                    if (img.file.type === 'image/jpeg' || img.file.type === 'image/jpg') {
                        pdfImg = await pdfDoc.embedJpg(imgBytes);
                    } else {
                        pdfImg = await pdfDoc.embedPng(imgBytes);
                    }
                    const page = pdfDoc.addPage([pdfImg.width, pdfImg.height]);
                    page.drawImage(pdfImg, { x: 0, y: 0, width: pdfImg.width, height: pdfImg.height });
                }
                const pdfBytes = await pdfDoc.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'JagaDokumen_Images.pdf'; a.click();
            } catch (err) {
                console.error(err);
                alert('Gagal membuat PDF.');
            } finally {
                btnProcess.disabled = false;
                btnProcess.innerHTML = 'Konversi ke PDF';
            }
        };
    }
}

}


// ==========================================
// 3. PISAHKAN PDF (SPLIT)
// ==========================================

async function initSplitPdf(container = document) {
    const fileInput = container.querySelector('#split-file-input');
    const uploadArea = container.querySelector('#split-upload-area');
    const workspace = container.querySelector('#split-workspace');
    const pageGrid = container.querySelector('#split-page-grid');
    const statusText = container.querySelector('#split-status-text');
    const btnRun = container.querySelector('#btn-run-split');
    const btnReset = container.querySelector('#btn-reset-split');
    const modeBtns = container.querySelectorAll('.mode-tab-btn');
    const modeContents = container.querySelectorAll('.split-mode-content');
    
    if (!fileInput || !uploadArea) return;
    
    const selectBtn = container.querySelector('#split-select-btn');

    const triggerFileSelect = () => {
        fileInput.value = '';
        fileInput.click();
    };

    // Robust Click Handling
    uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            triggerFileSelect();
        }
    });

    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerFileSelect();
        });
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            splitPdfDoc = file;
            
            uploadArea.style.display = 'none';
            workspace.style.display = 'block';
            container.querySelector('#split-display-name').textContent = file.name;
            container.querySelector('#split-display-meta').textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB • ${pdf.numPages} Halaman`;

            selectedSplitPages.clear();
            splitRotateStates = {};
            renderSplitPages(pdf, pageGrid, statusText);
            
        } catch (err) {
            alert('Gagal memuat PDF: ' + err.message);
        } finally {
            fileInput.value = '';
        }
    });

    // Mode Switching
    modeBtns.forEach(btn => {
        btn.onclick = () => {
            modeBtns.forEach(b => {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = 'var(--text-muted)';
                b.style.boxShadow = 'none';
            });
            btn.classList.add('active');
            btn.style.background = 'white';
            btn.style.color = 'var(--primary-blue)';
            btn.style.boxShadow = 'var(--shadow-sm)';

            currentSplitMode = btn.dataset.mode;
            
            // Show content
            const targetId = `mode-${currentSplitMode}-content`;
            modeContents.forEach(content => {
                content.style.display = content.id === targetId ? 'block' : 'none';
            });

            // Update status text based on mode
            updateSplitStatus(statusText);
        };
    });

    // Reset logic (Now directly opens file picker)
    btnReset.onclick = () => {
        fileInput.value = '';
        fileInput.click();
    };

    // Run Split
    btnRun.onclick = async () => {
        if (!splitPdfDoc) return;
        
        btnRun.disabled = true;
        btnRun.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';

        try {
            const arrayBuffer = await splitPdfDoc.arrayBuffer();
            const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            if (currentSplitMode === 'extract') {
                if (selectedSplitPages.size === 0) throw new Error('Pilih minimal 1 halaman untuk diekstrak');
                
                const newDoc = await PDFLib.PDFDocument.create();
                const pagesToCopy = Array.from(selectedSplitPages).sort((a, b) => a - b);
                const copiedPages = await newDoc.copyPages(srcDoc, pagesToCopy.map(p => p - 1));
                
                copiedPages.forEach((p, idx) => {
                    const originalPageIndex = pagesToCopy[idx];
                    const rotation = splitRotateStates[originalPageIndex] || 0;
                    p.setRotation(PDFLib.degrees(rotation));
                    newDoc.addPage(p);
                });
                
                const pdfBytes = await newDoc.save();
                downloadFile(pdfBytes, 'JagaDokumen_Extracted.pdf', 'application/pdf');
                
            } else if (currentSplitMode === 'range') {
                const rangeInputs = container.querySelectorAll('.split-range-input');
                const zip = new JSZip();
                let count = 0;

                for (let input of rangeInputs) {
                    const rangeStr = input.value.trim();
                    if (!rangeStr) continue;
                    
                    const pNums = parseRange(rangeStr, srcDoc.getPageCount());
                    if (pNums.length === 0) continue;

                    const newDoc = await PDFLib.PDFDocument.create();
                    const copiedPages = await newDoc.copyPages(srcDoc, pNums.map(p => p - 1));
                    
                    copiedPages.forEach((p, idx) => {
                        const originalPageIndex = pNums[idx];
                        const rotation = splitRotateStates[originalPageIndex] || 0;
                        p.setRotation(PDFLib.degrees(rotation));
                        newDoc.addPage(p);
                    });
                    
                    const pdfBytes = await newDoc.save();
                    zip.file(`Bagian_${++count}.pdf`, pdfBytes);
                }

                if (count === 0) throw new Error('Masukkan rentang halaman yang valid');
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadFile(zipBlob, 'JagaDokumen_Split_Ranges.zip', 'application/zip');

            } else if (currentSplitMode === 'burst') {
                const zip = new JSZip();
                for (let i = 0; i < srcDoc.getPageCount(); i++) {
                    const newDoc = await PDFLib.PDFDocument.create();
                    const [page] = await newDoc.copyPages(srcDoc, [i]);
                    const rotation = splitRotateStates[i + 1] || 0;
                    page.setRotation(PDFLib.degrees(rotation));
                    newDoc.addPage(page);
                    const pdfBytes = await newDoc.save();
                    zip.file(`Halaman_${i + 1}.pdf`, pdfBytes);
                }
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadFile(zipBlob, 'JagaDokumen_Burst_All.zip', 'application/zip');
            }

            showToast('Pemisahan PDF Berhasil!', 'success');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btnRun.disabled = false;
            btnRun.innerHTML = '<i class="ph-fill ph-scissors"></i> Pisahkan PDF Sekarang';
        }
    };

    // Range Logic: Add more rows
    const btnAddRow = container.querySelector('#btn-add-split-range');
    const rangeList = container.querySelector('#split-range-list');
    if (btnAddRow) {
        btnAddRow.onclick = () => {
            const rowCount = rangeList.children.length + 1;
            const row = document.createElement('div');
            row.className = 'split-range-row';
            row.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 12px;';
            row.innerHTML = `
                <span style="font-weight: 700; color: var(--text-muted); width: 60px;">File ${rowCount}:</span>
                <input type="text" class="split-range-input" placeholder="Misal: 1-5" style="flex-grow: 1; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; outline: none;">
                <button class="btn-remove-range" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 5px;"><i class="ph ph-trash"></i></button>
            `;
            row.querySelector('.btn-remove-range').onclick = () => row.remove();
            rangeList.appendChild(row);
        };
    }
}

async function renderSplitPages(pdf, grid, statusText) {
    grid.innerHTML = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const item = document.createElement('div');
        item.className = 'split-page-item';
        item.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative;';
        
        item.innerHTML = `
            <div class="split-page-preview-container" style="width: 100%; height: 140px; display: flex; justify-content: center; align-items: center; margin-bottom: 8px; background: #f8fafc; border-radius: 6px; overflow: hidden; pointer-events: none; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                <img src="${canvas.toDataURL()}" style="max-width: 100%; max-height: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            </div>
            <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; pointer-events: none;">Hal ${i}</div>
            <button class="btn-rotate-split" style="position: absolute; bottom: 35px; right: 10px; width: 32px; height: 32px; background: var(--primary-blue); color: white; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); transition: all 0.2s; z-index: 10;">
                <i class="ph-bold ph-arrow-counter-clockwise"></i>
            </button>
            <div class="check-mark" style="position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; background: var(--primary-blue); color: white; border-radius: 50%; display: none; align-items: center; justify-content: center; font-size: 0.7rem; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 5;">
                <i class="ph-bold ph-check"></i>
            </div>
        `;

        const rotateBtn = item.querySelector('.btn-rotate-split');
        const previewImg = item.querySelector('.split-page-preview-container');

        rotateBtn.onclick = (e) => {
            e.stopPropagation();
            const currentRotation = splitRotateStates[i] || 0;
            const newRotation = (currentRotation + 90) % 360;
            splitRotateStates[i] = newRotation;
            previewImg.style.transform = `rotate(${newRotation}deg)`;
            
            // Adjust scale if rotated 90 or 270 to fit container
            if (newRotation === 90 || newRotation === 270) {
                previewImg.style.scale = '0.7';
            } else {
                previewImg.style.scale = '1';
            }
        };

        item.onclick = () => {
            if (currentSplitMode !== 'extract') return;
            
            if (selectedSplitPages.has(i)) {
                selectedSplitPages.delete(i);
                item.style.borderColor = '#e2e8f0';
                item.style.background = 'white';
                item.querySelector('.check-mark').style.display = 'none';
            } else {
                selectedSplitPages.add(i);
                item.style.borderColor = 'var(--primary-blue)';
                item.style.background = '#f0f7ff';
                item.querySelector('.check-mark').style.display = 'flex';
            }
            updateSplitStatus(statusText);
        };

        grid.appendChild(item);
    }
}

function updateSplitStatus(statusText) {
    if (!statusText) return;
    
    if (currentSplitMode === 'extract') {
        statusText.textContent = `${selectedSplitPages.size} Halaman Terpilih`;
    } else if (currentSplitMode === 'range') {
        statusText.textContent = 'Mode Rentang Kustom';
    } else {
        statusText.textContent = 'Semua Halaman Dipisah';
    }
}

// Helper Functions
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

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.style.cssText = "position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); padding: 12px 25px; border-radius: 50px; background: #1e293b; color: white; font-weight: 600; z-index: 99999; box-shadow: 0 10px 25px rgba(0,0,0,0.2); transition: all 0.3s ease-out;";
    toast.innerHTML = (type === "success" ? "✅ " : "❌ ") + message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(-50%) translateY(20px)";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ==========================================
// 4. HAPUS HALAMAN PDF
// ==========================================
async function initDeletePages(container = document) {
    const fileInput = container.querySelector('#delete-file-input');
    const uploadArea = container.querySelector('#delete-upload-area');
    const workspace = container.querySelector('#delete-workspace');
    const grid = container.querySelector('#delete-grid');
    const statusText = container.querySelector('#delete-status-text');
    const btnSubmit = container.querySelector('#btn-delete-submit');
    const btnChange = container.querySelector('#btn-delete-change');
    const filenameLabel = container.querySelector('#delete-filename');
    const metaLabel = container.querySelector('#delete-meta');

    if (!fileInput || !uploadArea) return;

    const selectBtn = container.querySelector('#delete-select-btn');
    let deleteDoc = null;
    let selectedToDelete = new Set();

    const triggerFileSelect = () => {
        fileInput.value = '';
        fileInput.click();
    };

    // Robust Click Handling
    uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            triggerFileSelect();
        }
    });

    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerFileSelect();
        });
    }
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            deleteDoc = file;
            
            uploadArea.style.display = 'none';
            workspace.style.display = 'block';
            filenameLabel.textContent = file.name;
            metaLabel.textContent = `${pdf.numPages} Halaman`;

            selectedToDelete.clear();
            renderDeleteGrid(pdf, grid, selectedToDelete, statusText);
        } catch (err) {
            alert('Gagal memuat PDF: ' + err.message);
        } finally {
            fileInput.value = '';
        }
    });

    btnChange.onclick = () => { fileInput.click(); };

    btnSubmit.onclick = async () => {
        if (!deleteDoc) return;
        if (selectedToDelete.size === 0) {
            alert("Pilih minimal 1 halaman untuk dihapus.");
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';

        try {
            const arrayBuffer = await deleteDoc.arrayBuffer();
            const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = srcDoc.getPageCount();
            
            if (selectedToDelete.size >= totalPages) {
                throw new Error("Anda tidak bisa menghapus semua halaman. Sisakan minimal 1 halaman.");
            }

            const newDoc = await PDFLib.PDFDocument.create();
            const pagesToKeep = [];
            for (let i = 0; i < totalPages; i++) {
                if (!selectedToDelete.has(i + 1)) pagesToKeep.push(i);
            }

            const copiedPages = await newDoc.copyPages(srcDoc, pagesToKeep);
            copiedPages.forEach(p => newDoc.addPage(p));
            
            const pdfBytes = await newDoc.save();
            downloadFile(pdfBytes, 'JagaDokumen_Halaman_Dihapus.pdf', 'application/pdf');
            showToast('Halaman berhasil dihapus!', 'success');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="ph ph-trash"></i> Hapus & Unduh PDF';
        }
    };
}

async function renderDeleteGrid(pdf, grid, selectedSet, statusText) {
    grid.innerHTML = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const item = document.createElement('div');
        item.className = 'delete-page-item';
        item.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;';
        
        item.innerHTML = `
            <div class="delete-preview-box" style="width: 100%; height: 160px; display: flex; justify-content: center; align-items: center; margin-bottom: 10px; background: #f8fafc; border-radius: 8px; overflow: hidden; transition: all 0.3s;">
                <img src="${canvas.toDataURL()}" style="max-width: 100%; max-height: 100%; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            </div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #64748b;">Halaman ${i}</div>
            <div class="delete-overlay" style="position: absolute; inset: 0; background: rgba(239, 68, 68, 0.1); display: none; align-items: center; justify-content: center; flex-direction: column; gap: 8px;">
                <div style="width: 40px; height: 40px; background: #ef4444; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4);">
                    <i class="ph-bold ph-trash"></i>
                </div>
                <span style="color: #ef4444; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; background: white; padding: 2px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Hapus</span>
            </div>
        `;

        item.onclick = () => {
            const overlay = item.querySelector('.delete-overlay');
            const preview = item.querySelector('.delete-preview-box');
            
            if (selectedSet.has(i)) {
                selectedSet.delete(i);
                overlay.style.display = 'none';
                preview.style.opacity = '1';
                preview.style.filter = 'none';
                item.style.borderColor = '#e2e8f0';
                item.style.background = 'white';
            } else {
                selectedSet.add(i);
                overlay.style.display = 'flex';
                preview.style.opacity = '0.4';
                preview.style.filter = 'grayscale(100%)';
                item.style.borderColor = '#ef4444';
                item.style.background = '#fef2f2';
            }
            statusText.textContent = `${selectedSet.size} Halaman akan dihapus`;
        };

        grid.appendChild(item);
    }
}

// ==========================================
// 5. GANTI HALAMAN PDF (REPLACE)
// ==========================================
let replaceMainDoc = null;
let replaceSubDoc = null;

async function initReplacePages(container = document) {
    const fileInput = container.querySelector('#replace-file-input');
    const uploadArea = container.querySelector('#replace-upload-area');
    const workspace = container.querySelector('#replace-workspace');
    const grid = container.querySelector('#replace-preview-grid');
    const modal = container.querySelector('#modal-replace-pages');
    
    // UI Elements
    const filenameLabel = container.querySelector('#replace-main-filename');
    const metaLabel = container.querySelector('#replace-main-meta');
    const totalLabel = container.querySelector('#replace-total-label');
    const subFilenameLabel = container.querySelector('#replace-sub-filename');
    const subTotalLabel = container.querySelector('#replace-sub-total-label');
    const subRangeBox = container.querySelector('#replace-sub-range-box');

    // Inputs
    const startInput = container.querySelector('#replace-start');
    const endInput = container.querySelector('#replace-end');
    const subStartInput = container.querySelector('#replace-sub-start');
    const subEndLabel = container.querySelector('#replace-sub-end-label');
    const subFileInput = container.querySelector('#replace-sub-input');

    // Buttons
    const btnShowModal = container.querySelector('#btn-show-replace-modal');
    const btnBrowseSub = container.querySelector('#btn-browse-sub');
    const btnRun = container.querySelector('#btn-run-replace');
    const btnCloseModal = container.querySelector('#btn-close-replace-modal');
    const btnChangeMain = container.querySelector('#btn-replace-change-main');

    if (!fileInput || !uploadArea) return;

    const selectBtn = container.querySelector('#replace-select-btn');

    // Reset States
    replaceMainDoc = null;
    replaceSubDoc = null;

    const triggerFileSelect = () => {
        fileInput.value = '';
        fileInput.click();
    };

    // Robust Click Handling
    uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            triggerFileSelect();
        }
    });

    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerFileSelect();
        });
    }
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            replaceMainDoc = file;
            
            uploadArea.style.display = 'none';
            workspace.style.display = 'block';
            filenameLabel.textContent = file.name;
            metaLabel.textContent = `${pdf.numPages} Halaman`;
            totalLabel.textContent = pdf.numPages;
            
            // Set defaults
            startInput.max = pdf.numPages;
            endInput.max = pdf.numPages;
            startInput.value = 1;
            endInput.value = 1;

            renderReplacePreview(pdf, grid);
        } catch (err) {
            alert('Gagal memuat PDF Utama: ' + err.message);
        } finally {
            fileInput.value = '';
        }
    });

    btnShowModal.onclick = () => { modal.style.display = 'flex'; };
    btnCloseModal.onclick = () => { modal.style.display = 'none'; };
    btnChangeMain.onclick = () => { fileInput.click(); };

    // Nitro-style Sync Logic
    const syncRanges = () => {
        const s1 = parseInt(startInput.value) || 1;
        const e1 = parseInt(endInput.value) || 1;
        const count = Math.max(1, Math.abs(e1 - s1) + 1);

        const s2 = parseInt(subStartInput.value) || 1;
        const targetEnd2 = s2 + count - 1;
        subEndLabel.textContent = targetEnd2;
        
        // Validation check against sub-file total
        const subMax = parseInt(subTotalLabel.textContent) || 0;
        if (subMax > 0 && targetEnd2 > subMax) {
            subEndLabel.style.color = '#ef4444';
            btnRun.disabled = true;
            btnRun.style.opacity = '0.5';
            btnRun.title = 'Jumlah halaman pengganti tidak mencukupi';
        } else {
            subEndLabel.style.color = '#1e293b';
            btnRun.disabled = false;
            btnRun.style.opacity = '1';
            btnRun.title = '';
        }
    };

    startInput.addEventListener('input', syncRanges);
    endInput.addEventListener('input', syncRanges);
    subStartInput.addEventListener('input', syncRanges);

    // Secondary File Logic
    const subPreviewGrid = container.querySelector('#replace-sub-preview-grid');
    const subBadge = container.querySelector('#replace-sub-badge');

    btnBrowseSub.onclick = () => { subFileInput.value = ''; subFileInput.click(); };
    subFileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            subBadge.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i>';
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            replaceSubDoc = file;
            
            subFilenameLabel.textContent = file.name;
            subTotalLabel.textContent = pdf.numPages;
            subBadge.textContent = `${pdf.numPages} Halaman`;
            subBadge.style.background = '#dcfce7';
            subBadge.style.color = '#166534';

            subRangeBox.style.opacity = '1';
            
            subStartInput.disabled = false;
            subStartInput.max = pdf.numPages;
            subStartInput.value = 1;
            syncRanges();

            // Render Sub Preview
            renderReplacePreview(pdf, subPreviewGrid, 3); // 3 columns for modal

        } catch (err) {
            alert('Gagal memuat File Pengganti: ' + err.message);
            subBadge.textContent = 'Error';
        }
    };

    // Execution
    btnRun.onclick = async () => {
        if (!replaceMainDoc || !replaceSubDoc) {
            alert("Silakan pilih file utama dan file pengganti terlebih dahulu.");
            return;
        }

        const s1 = parseInt(startInput.value);
        const e1 = parseInt(endInput.value);
        const s2 = parseInt(subStartInput.value);
        const e2 = parseInt(subEndLabel.textContent); // Fix: use textContent

        if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) {
            alert("Masukkan rentang halaman yang valid.");
            return;
        }

        btnRun.disabled = true;
        btnRun.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';

        try {
            const mainBuffer = await replaceMainDoc.arrayBuffer();
            const subBuffer = await replaceSubDoc.arrayBuffer();
            
            const mainDoc = await PDFLib.PDFDocument.load(mainBuffer);
            const subDoc = await PDFLib.PDFDocument.load(subBuffer);
            
            const newDoc = await PDFLib.PDFDocument.create();
            
            // 1. Copy pages BEFORE the replacement range
            if (s1 > 1) {
                const preIndices = Array.from({length: s1 - 1}, (_, i) => i);
                const prePages = await newDoc.copyPages(mainDoc, preIndices);
                prePages.forEach(p => newDoc.addPage(p));
            }

            // 2. Copy pages FROM the replacement file
            const subIndices = [];
            const start = Math.min(s2, e2);
            const end = Math.max(s2, e2);
            for (let i = start; i <= end; i++) {
                if (i <= subDoc.getPageCount()) subIndices.push(i - 1);
            }
            const replacementPages = await newDoc.copyPages(subDoc, subIndices);
            replacementPages.forEach(p => newDoc.addPage(p));

            // 3. Copy pages AFTER the replacement range
            const totalMain = mainDoc.getPageCount();
            if (e1 < totalMain) {
                const postIndices = [];
                for (let i = e1; i < totalMain; i++) postIndices.push(i);
                const postPages = await newDoc.copyPages(mainDoc, postIndices);
                postPages.forEach(p => newDoc.addPage(p));
            }

            const pdfBytes = await newDoc.save();
            
            // Show Final Modal
            const finalModal = document.getElementById('replace-final-modal');
            const finalGrid = document.getElementById('final-review-grid');
            const btnFinalDownload = document.getElementById('btn-final-download');
            const btnFinalBack = document.getElementById('btn-final-back');

            if (finalModal && finalGrid) {
                finalModal.style.display = 'flex';
                finalGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#64748b;"><i class="ph ph-circle-notch animate-spin" style="font-size:3rem; margin-bottom:15px;"></i><p style="font-weight:700;">Menyiapkan pratinjau hasil akhir...</p></div>';
                
                // Load result for preview
                const resultPdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
                await renderReplacePreview(resultPdf, finalGrid, 4); // 4 columns for review

                // Download logic
                btnFinalDownload.onclick = () => {
                    downloadFile(pdfBytes, `JagaDokumen_Replace_${new Date().getTime()}.pdf`, 'application/pdf');
                    showToast('Dokumen berhasil diunduh!', 'success');
                    finalModal.style.display = 'none';
                };

                btnFinalBack.onclick = () => { finalModal.style.display = 'none'; };
            }

            modal.style.display = 'none';
        } catch (err) {
            alert('Gagal memproses PDF: ' + err.message);
        } finally {
            btnRun.disabled = false;
            btnRun.innerHTML = '<i class="ph-fill ph-check-circle" style="font-size: 1.5rem;"></i> MULAI GANTI HALAMAN';
        }
    };
}

async function openLightbox(pdf, pageNum) {
    const lightbox = document.getElementById('replace-lightbox');
    const content = document.getElementById('lightbox-content');
    const label = document.getElementById('lightbox-label');
    const btnClose = document.getElementById('btn-close-lightbox');

    if (!lightbox || !content) return;

    // Show modal
    lightbox.style.display = 'flex';
    label.textContent = `Halaman ${pageNum}`;
    
    // Reset content with loading spinner
    content.innerHTML = `
        <div style="padding: 100px; color: #64748b; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <i class="ph ph-circle-notch animate-spin" style="font-size: 4rem; color: #3b82f6; margin-bottom: 25px;"></i>
            <p style="font-weight: 700; font-size: 1.1rem; color: #1e293b;">Sedang Memperbesar...</p>
        </div>
    `;

    try {
        const page = await pdf.getPage(pageNum);
        const scale = 2.5; // High resolution for reading
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        content.innerHTML = '';
        content.appendChild(canvas);

        // Close Handlers
        const close = () => { lightbox.style.display = 'none'; };
        btnClose.onclick = (e) => { e.stopPropagation(); close(); };
        lightbox.onclick = (e) => { if (e.target === lightbox) close(); };
        
    } catch (err) {
        console.error("Lightbox Error:", err);
        content.innerHTML = `<p style="color: #ef4444; padding: 40px; font-weight: 700;">Gagal memperbesar halaman: ${err.message}</p>`;
    }
}

async function renderReplacePreview(pdf, grid, columns = 5) {
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    grid.style.gridAutoRows = 'min-content'; // Prevents vertical stretching
    grid.style.alignItems = 'start'; // Aligns items to the top
    const limit = Math.min(pdf.numPages, 30); // Show more pages now that we have lightbox
    
    for (let i = 1; i <= limit; i++) {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative;';
        item.innerHTML = `
            <div class="preview-overlay" style="position: absolute; inset: 0; background: rgba(37, 99, 235, 0.05); opacity: 0; transition: opacity 0.2s; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary-blue); font-size: 1.5rem;">
                <i class="ph-bold ph-magnifying-glass-plus"></i>
            </div>
            <canvas style="width: 100%; border-radius: 4px; border: 1px solid #f1f5f9;"></canvas>
            <div style="margin-top: 10px; font-size: 0.8rem; font-weight: 700; color: #64748b;">Halaman ${i}</div>
        `;

        item.onmouseenter = () => { 
            const overlay = item.querySelector('.preview-overlay');
            if (overlay) overlay.style.opacity = '1'; 
            item.style.transform = 'translateY(-3px)'; 
            item.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; 
        };
        item.onmouseleave = () => { 
            const overlay = item.querySelector('.preview-overlay');
            if (overlay) overlay.style.opacity = '0'; 
            item.style.transform = 'none'; 
            item.style.boxShadow = 'none'; 
        };
        
        // Open lightbox on click
        item.onclick = () => openLightbox(pdf, i);

        grid.appendChild(item);

        // Render low-res thumbnail
        (async () => {
            try {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = item.querySelector('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport: viewport }).promise;
            } catch (e) {
                console.error("Error rendering thumbnail", e);
            }
        })();
    }

    if (pdf.numPages > limit) {
        const more = document.createElement('div');
        more.style.cssText = 'display: flex; align-items: center; justify-content: center; background: #f1f5f9; border-radius: 10px; color: #94a3b8; font-size: 0.8rem; font-weight: 600;';
        more.textContent = `+ ${pdf.numPages - limit} halaman lainnya`;
        grid.appendChild(more);
    }
}





async function initPdfToImg(container = document) {
    const fileInput = container.querySelector("#p2i-file-input");
    const uploadArea = container.querySelector("#p2i-upload-area");
    const grid = container.querySelector("#p2i-preview-grid");
    const optionsBar = container.querySelector(".p2i-options-bar");
    const btnZip = container.querySelector("#btn-download-all-p2i");
    const loader = container.querySelector("#p2i-loader");
    const loaderText = container.querySelector("#p2i-loader-text");
    const formatSelect = container.querySelector("#p2i-format");
    const scaleSelect = container.querySelector("#p2i-scale");

    let currentPdf = null;
    let generatedImages = [];

    if (!fileInput || !uploadArea) return;

    const selectBtn = container.querySelector('#p2i-select-btn');

    const triggerFileSelect = () => {
        fileInput.value = "";
        fileInput.click();
    };

    // Robust Click Handling
    uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            triggerFileSelect();
        }
    });

    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerFileSelect();
        });
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            uploadArea.style.display = "none";
            loader.style.display = "block";
            grid.innerHTML = "";
            if (optionsBar) optionsBar.style.display = "none";
            generatedImages = [];

            const arrayBuffer = await file.arrayBuffer();
            currentPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            if (optionsBar) optionsBar.style.display = "block";
            await processPdfPages();
            
        } catch (err) {
            console.error(err);
            alert("Gagal memuat PDF: " + err.message);
            uploadArea.style.display = "flex";
            loader.style.display = "none";
        } finally {
            fileInput.value = '';
        }
    });

    async function processPdfPages() {
        if (!currentPdf) return;
        
        const numPages = currentPdf.numPages;
        const format = formatSelect ? formatSelect.value : "image/png";
        const scale = scaleSelect ? parseFloat(scaleSelect.value) : 2.0;
        const extension = format === "image/jpeg" ? "jpg" : "png";

        grid.innerHTML = "";
        generatedImages = [];
        loader.style.display = "block";
        if (btnZip) btnZip.style.display = "none";

        for (let i = 1; i <= numPages; i++) {
            if (loaderText) loaderText.textContent = `Memproses Halaman ${i} dari ${numPages}...`;
            
            try {
                const page = await currentPdf.getPage(i);
                const viewport = page.getViewport({ scale });
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: ctx, viewport }).promise;
                
                const dataUrl = canvas.toDataURL(format, 0.92);
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const name = `Halaman_${i}.${extension}`;

                generatedImages.push({ blob, name, dataUrl });

                const item = document.createElement("div");
                item.style.cssText = "background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s;";
                item.innerHTML = `
                    <div style="width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 8px; overflow: hidden; margin-bottom: 12px; border: 1px solid #f1f5f9;">
                        <img src="${dataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    </div>
                    <div style="font-size: 0.8rem; font-weight: 800; color: #1e293b; margin-bottom: 12px;">Halaman ${i}</div>
                    <button class="btn btn-outline small download-single-btn" style="width: 100%; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="ph ph-download"></i> Unduh ${extension.toUpperCase()}
                    </button>
                `;
                item.querySelector(".download-single-btn").onclick = () => downloadFile(blob, name, format);
                grid.appendChild(item);

            } catch (err) {
                console.error(`Error processing page ${i}:`, err);
            }
        }

        loader.style.display = "none";
        if (btnZip) btnZip.style.display = "block";
    }

    if (formatSelect) formatSelect.onchange = () => processPdfPages();
    if (scaleSelect) scaleSelect.onchange = () => processPdfPages();

    if (btnZip) {
        btnZip.onclick = async () => {
            if (generatedImages.length === 0) return;
            
            btnZip.disabled = true;
            const originalZipText = btnZip.innerHTML;
            btnZip.innerHTML = "<i class=\"ph ph-circle-notch animate-spin\"></i> Membuat ZIP...";
            
            try {
                const zip = new JSZip();
                generatedImages.forEach(img => {
                    zip.file(img.name, img.blob);
                });
                
                const zipBlob = await zip.generateAsync({ type: "blob" });
                downloadFile(zipBlob, `JagaDokumen_PDF_ke_Gambar_${new Date().getTime()}.zip`, "application/zip");
                showToast("ZIP Berhasil diunduh!", "success");
            } catch (err) {
                alert("Gagal membuat ZIP: " + err.message);
            } finally {
                btnZip.disabled = false;
                btnZip.innerHTML = originalZipText;
            }
        };
    }
}

// ==========================================
// 6. PUTAR HALAMAN PDF (ROTATE)
// ==========================================
let rotateFileDoc = null;
let rotateStates = {}; // Page index -> degrees (0, 90, 180, 270)

async function initRotatePdf(container = document) {
    const fileInput = container.querySelector('#rotate-file-input');
    const uploadArea = container.querySelector('#rotate-upload-area');
    const workspace = container.querySelector('#rotate-workspace');
    const grid = container.querySelector('#rotate-grid');
    const btnSubmit = container.querySelector('#btn-rotate-submit');
    const btnChange = container.querySelector('#btn-rotate-change');
    const btnAllL = container.querySelector('#btn-rotate-all-l');
    const btnAllR = container.querySelector('#btn-rotate-all-r');
    const btnClear = container.querySelector('#btn-rotate-clear');
    const filenameLabel = container.querySelector('#rotate-filename');
    const metaLabel = container.querySelector('#rotate-meta');

    if (!fileInput || !uploadArea) return;

    const selectBtn = container.querySelector('#rotate-select-btn');

    const triggerFileSelect = () => {
        fileInput.value = '';
        fileInput.click();
    };

    // Robust Click Handling
    uploadArea.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') {
            triggerFileSelect();
        }
    });

    if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerFileSelect();
        });
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            rotateFileDoc = file;
            rotateStates = {};
            
            uploadArea.style.display = 'none';
            workspace.style.display = 'block';
            filenameLabel.textContent = file.name;
            metaLabel.textContent = `${pdf.numPages} Halaman`;

            renderRotateGrid(pdf, grid);
        } catch (err) {
            alert('Gagal memuat PDF: ' + err.message);
        } finally {
            fileInput.value = '';
        }
    });

    btnChange.onclick = () => triggerFileSelect();

    btnAllL.onclick = () => applyGlobalRotation(-90);
    btnAllR.onclick = () => applyGlobalRotation(90);
    btnClear.onclick = () => applyGlobalRotation(0, true);

    function applyGlobalRotation(deg, isReset = false) {
        const items = grid.querySelectorAll('.rotate-page-item');
        items.forEach((item, idx) => {
            const pageIdx = idx + 1;
            let current = rotateStates[pageIdx] || 0;
            let target = isReset ? 0 : (current + deg) % 360;
            if (target < 0) target += 360;
            
            rotateStates[pageIdx] = target;
            const preview = item.querySelector('.rotate-preview-box');
            if (preview) {
                preview.style.transform = `rotate(${target}deg)`;
                preview.style.scale = (target === 90 || target === 270) ? '0.7' : '1';
            }
        });
    }

    btnSubmit.onclick = async () => {
        if (!rotateFileDoc) return;

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Memproses...';

        try {
            const arrayBuffer = await rotateFileDoc.arrayBuffer();
            const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = srcDoc.getPageCount();

            for (let i = 0; i < totalPages; i++) {
                const rotation = rotateStates[i + 1] || 0;
                if (rotation !== 0) {
                    const page = srcDoc.getPage(i);
                    const currentRotation = page.getRotation().angle;
                    page.setRotation(PDFLib.degrees(currentRotation + rotation));
                }
            }

            const pdfBytes = await srcDoc.save();
            downloadFile(pdfBytes, 'JagaDokumen_Rotated.pdf', 'application/pdf');
            showToast('Halaman berhasil diputar!', 'success');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="ph ph-download-simple"></i> Terapkan & Unduh PDF';
        }
    };
}

async function renderRotateGrid(pdf, grid) {
    grid.innerHTML = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const item = document.createElement('div');
        item.className = 'rotate-page-item';
        item.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;';
        
        item.innerHTML = `
            <div class="rotate-preview-box" style="width: 100%; height: 160px; display: flex; justify-content: center; align-items: center; margin-bottom: 10px; background: #f8fafc; border-radius: 8px; overflow: hidden; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                <img src="${canvas.toDataURL()}" style="max-width: 100%; max-height: 100%; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            </div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #64748b;">Halaman ${i}</div>
            <div style="display: flex; gap: 5px; justify-content: center; margin-top: 8px;">
                <button class="btn-rotate-l" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; cursor: pointer;"><i class="ph ph-arrow-counter-clockwise"></i></button>
                <button class="btn-rotate-r" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; cursor: pointer;"><i class="ph ph-arrow-clockwise"></i></button>
            </div>
        `;

        const rotateL = item.querySelector('.btn-rotate-l');
        const rotateR = item.querySelector('.btn-rotate-r');
        const preview = item.querySelector('.rotate-preview-box');

        const updateRotation = (deg) => {
            let current = rotateStates[i] || 0;
            let target = (current + deg) % 360;
            if (target < 0) target += 360;
            rotateStates[i] = target;
            preview.style.transform = `rotate(${target}deg)`;
            preview.style.scale = (target === 90 || target === 270) ? '0.7' : '1';
        };

        rotateL.onclick = (e) => { e.stopPropagation(); updateRotation(-90); };
        rotateR.onclick = (e) => { e.stopPropagation(); updateRotation(90); };
        item.onclick = () => updateRotation(90);

        grid.appendChild(item);
    }
}


