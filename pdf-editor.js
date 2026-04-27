/**
 * #JagaDokumen - Advanced PDF Editor (Nitro v3.0 - STABLE)
 * Single-page focus, high performance, local-only processing.
 */

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;
let canvas, ctx, bgCanvas;
let fabricCanvas = null;
let currentAnnotations = {}; 
let openDocuments = []; 
let activeDocIndex = -1;
let historyStack = [];
let originalPdfBytes = null;

// Tool Settings
let currentTool = 'select';
let activeColor = '#000000';
let activeSize = 16;
let activeFontFamily = 'Helvetica';

function initPdfEditor(container = document) {
    console.log("Reverting to Stable Single-Page PDF Editor...");
    
    const el = (id) => container.querySelector(id.startsWith('#') ? id : `#${id}`);
    const fileInput = el('edit-pdf-input');
    const uploadArea = el('edit-upload-area');
    const uploadView = el('pdf-upload-view');
    const editorView = el('pdf-editor-view');
    
    bgCanvas = el('pdf-bg-canvas');
    if (bgCanvas) ctx = bgCanvas.getContext('2d');

    if (!fileInput || !uploadArea) return;

    // --- UPLOAD LOGIC ---
    uploadArea.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') handleNewFile(file);
    };

    async function handleNewFile(file) {
        uploadArea.innerHTML = `<i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i><p>Membaca PDF...</p>`;
        
        const reader = new FileReader();
        reader.onload = async function(ev) {
            const bytes = new Uint8Array(ev.target.result);
            const newDoc = {
                name: file.name,
                bytes: bytes,
                pageNum: 1,
                scale: 1.0,
                annotations: {},
                history: []
            };
            openDocuments.push(newDoc);
            if (uploadView) uploadView.style.display = 'none';
            if (editorView) editorView.style.display = 'flex';
            await switchDocument(openDocuments.length - 1);
        };
        reader.readAsArrayBuffer(file);
    }

    // --- TOOLBAR LOGIC ---
    container.querySelectorAll('.ribbon-tab').forEach(tab => {
        tab.onclick = () => {
            const target = tab.getAttribute('data-tab');
            container.querySelectorAll('.ribbon-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            container.querySelectorAll('.ribbon-panel').forEach(p => p.classList.remove('active'));
            const panel = el(`panel-${target}`);
            if (panel) panel.classList.add('active');
        };
    });

    // Tool Picker
    container.querySelectorAll('.ribbon-btn[data-tool]').forEach(btn => {
        btn.onclick = (e) => {
            const tool = e.currentTarget.getAttribute('data-tool');
            currentTool = tool;
            container.querySelectorAll('.ribbon-btn[data-tool]').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            if (fabricCanvas) {
                fabricCanvas.isDrawingMode = (tool === 'draw');
                if (tool === 'draw') {
                    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
                    fabricCanvas.freeDrawingBrush.color = activeColor;
                    fabricCanvas.freeDrawingBrush.width = 4;
                }
            }
        };
    });

    // Zoom & Navigation
    el('btn-zoom-in').onclick = () => { scale += 0.1; renderPage(pageNum); };
    el('btn-zoom-out').onclick = () => { scale -= 0.1; renderPage(pageNum); };
    el('btn-prev-page').onclick = () => { if (pageNum <= 1) return; saveCurrentAnnotations(); pageNum--; renderPage(pageNum); };
    el('btn-next-page').onclick = () => { if (pageNum >= pdfDoc.numPages) return; saveCurrentAnnotations(); pageNum++; renderPage(pageNum); };

    async function switchDocument(index) {
        if (activeDocIndex >= 0 && openDocuments[activeDocIndex]) {
            saveCurrentAnnotations();
            openDocuments[activeDocIndex].pageNum = pageNum;
            openDocuments[activeDocIndex].scale = scale;
            openDocuments[activeDocIndex].annotations = { ...currentAnnotations };
        }
        activeDocIndex = index;
        const doc = openDocuments[index];
        originalPdfBytes = doc.bytes;
        pageNum = doc.pageNum;
        
        // Auto-Fit Logic
        const workspace = el('canvas-wrapper');
        if (workspace && !doc.alreadyOpened) {
            const tempPdf = await pdfjsLib.getDocument({ data: doc.bytes.slice() }).promise;
            const firstPage = await tempPdf.getPage(1);
            const vp = firstPage.getViewport({ scale: 1.0 });
            scale = ((workspace.clientWidth || 800) * 0.85) / vp.width;
            scale = Math.min(scale, 1.1);
            doc.alreadyOpened = true;
        } else {
            scale = doc.scale || 1.0;
        }

        currentAnnotations = doc.annotations;
        renderTabs();
        await loadPdf(originalPdfBytes.slice());
    }

    async function loadPdf(data) {
        const loadingTask = pdfjsLib.getDocument({ data });
        pdfDoc = await loadingTask.promise;
        updatePageIndicator();
        renderThumbnails();
        renderPage(pageNum);
    }

    async function renderPage(num) {
        if (!pdfDoc) return;
        pageRendering = true;
        const page = await pdfDoc.getPage(num);
        
        let viewport = page.getViewport({ scale: scale });
        const maxAllowedWidth = 1400;
        if (viewport.width > maxAllowedWidth) {
            const reduction = maxAllowedWidth / viewport.width;
            viewport = page.getViewport({ scale: scale * reduction });
        }

        bgCanvas.height = viewport.height;
        bgCanvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        setupFabricCanvas(viewport.width, viewport.height);
        updatePageIndicator();
        updateThumbnailActive();
        pageRendering = false;
    }

    function setupFabricCanvas(w, h) {
        if (fabricCanvas) {
            fabricCanvas.dispose();
            const parent = el('canvas-wrapper');
            const oldCanvas = el('pdf-interact-canvas');
            if (oldCanvas) oldCanvas.remove();
            const newCanvas = document.createElement('canvas');
            newCanvas.id = 'pdf-interact-canvas';
            parent.appendChild(newCanvas);
        }

        fabricCanvas = new fabric.Canvas('pdf-interact-canvas', { width: w, height: h });
        if (currentAnnotations[pageNum]) {
            fabricCanvas.loadFromJSON(currentAnnotations[pageNum], () => fabricCanvas.renderAll());
        }
        
        fabricCanvas.on('object:added', saveCurrentAnnotations);
        fabricCanvas.on('object:modified', saveCurrentAnnotations);
    }

    function saveCurrentAnnotations() {
        if (fabricCanvas) {
            currentAnnotations[pageNum] = JSON.stringify(fabricCanvas.toJSON());
        }
    }

    function updatePageIndicator() {
        const ind = el('page-indicator');
        if (ind) ind.textContent = `${pageNum} / ${pdfDoc ? pdfDoc.numPages : 1}`;
        const zInd = el('zoom-indicator');
        if (zInd) zInd.textContent = Math.round(scale * 100) + '%';
    }

    async function renderThumbnails() {
        const sidebar = el('pdf-thumbnails');
        if (!sidebar) return;
        sidebar.innerHTML = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            let vp = page.getViewport({ scale: 0.2 });
            if (vp.width > 150) vp = page.getViewport({ scale: 150/page.getViewport({scale:1}).width * 0.2 });

            const item = document.createElement('div');
            item.className = `pdf-thumbnail-item ${i === pageNum ? 'active' : ''}`;
            item.id = `thumb-${i}`;
            item.onclick = () => { saveCurrentAnnotations(); pageNum = i; renderPage(pageNum); };
            
            const canvas = document.createElement('canvas');
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            
            item.appendChild(canvas);
            item.innerHTML += `<div class="thumb-label">${i}</div>`;
            sidebar.appendChild(item);
        }
    }

    function updateThumbnailActive() {
        container.querySelectorAll('.pdf-thumbnail-item').forEach(t => t.classList.remove('active'));
        el(`thumb-${pageNum}`)?.classList.add('active');
    }

    function renderTabs() {
        const container = el('tabs-container');
        if (!container) return;
        container.innerHTML = '';
        openDocuments.forEach((doc, index) => {
            const tab = document.createElement('div');
            tab.className = `doc-tab ${index === activeDocIndex ? 'active' : ''}`;
            tab.innerHTML = `<i class="ph-fill ph-file-pdf"></i><span>${doc.name}</span><div class="doc-tab-close"><i class="ph ph-x"></i></div>`;
            tab.onclick = () => switchDocument(index);
            
            const closeBtn = tab.querySelector('.doc-tab-close');
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                closeDocument(index);
            };
            container.appendChild(tab);
        });
    }

    function closeDocument(index) {
        openDocuments.splice(index, 1);
        if (openDocuments.length === 0) {
            activeDocIndex = -1;
            if (editorView) editorView.style.display = 'none';
            if (uploadView) {
                uploadView.style.display = 'flex';
                const area = el('edit-upload-area');
                if (area) area.innerHTML = `<i class="ph-fill ph-pencil-simple"></i><h3>Pilih file PDF untuk di-edit</h3><p>Tambahkan teks, gambar, atau tanda tangan secara lokal di browser Anda</p><div class="btn btn-primary">Pilih File PDF</div>`;
            }
        } else {
            switchDocument(Math.max(0, index - 1));
        }
    }
}
