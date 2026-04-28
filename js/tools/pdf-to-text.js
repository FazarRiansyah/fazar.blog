/**
 * #JagaDokumen - PDF to Text Tool (PREMIUM v4 - Search & Multi-Export)
 * Features: Text extraction, stats, clean-up, split view, PDF preview, OCR, SEARCH, MULTI-EXPORT.
 */
function initPdfToText(container = document) {
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    }

    const q = (id) => container.querySelector('#' + id);

    const fileInput = q('pdf-to-text-file-input');
    const uploadArea = q('pdf-to-text-upload-area');
    const workspace = q('pdf-to-text-workspace');
    const textArea = q('pdf-to-text-result');
    const previewContainer = q('p2t-preview-container');
    const pageIndicator = q('p2t-page-indicator');
    
    // Search elements
    const searchInput = q('p2t-search-input');
    
    // Action elements
    const btnCopy = q('btn-p2t-copy');
    const btnDownloadMain = q('btn-p2t-download-main');
    const exportMenu = q('p2t-export-menu');
    const btnClean = q('btn-p2t-clean');
    const btnChange = q('btn-p2t-change');
    const btnOcr = q('btn-p2t-ocr');
    
    const statWords = q('p2t-stat-words');
    const statChars = q('p2t-stat-chars');
    const statTime = q('p2t-stat-time');

    if (!fileInput || !uploadArea) return;

    let pdfDoc = null;
    let pageCanvases = [];
    let originalFullText = '';

    // ─── Upload Logic ────────────────────────────────────────────────
    const triggerSelect = () => { fileInput.value = ''; fileInput.click(); };
    uploadArea.onclick = (e) => { if (e.target !== fileInput) triggerSelect(); };
    if (btnChange) btnChange.onclick = triggerSelect;

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') handleFile(file);
    };

    async function handleFile(file) {
        if (workspace) workspace.style.display = 'none';
        uploadArea.style.display = 'flex';
        uploadArea.innerHTML = `
            <i class="ph ph-circle-notch animate-spin" style="font-size:3rem;color:#2563eb;"></i>
            <p style="font-weight:700;color:#64748b;font-size:0.95rem;">Membaca Dokumen...</p>
            <p style="font-size:0.8rem;color:#94a3b8;">${file.name}</p>`;

        try {
            const buf = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
            
            if (previewContainer) previewContainer.innerHTML = '';
            if (pageIndicator) pageIndicator.textContent = `Halaman 1 / ${pdfDoc.numPages}`;
            
            let fullText = '';
            pageCanvases = [];
            
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                
                // 1. Extract Digital Text
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `--- Halaman ${i} ---\n${pageText}\n\n`;
                
                // 2. Render Preview Canvas
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = '100%';
                canvas.style.height = 'auto';
                canvas.style.borderRadius = '8px';
                canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                canvas.style.marginBottom = '20px';
                canvas.style.background = 'white';
                
                previewContainer.appendChild(canvas);
                pageCanvases.push(canvas);
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            }

            originalFullText = fullText.trim();
            if (textArea) textArea.value = originalFullText;
            updateStats(textArea.value);

            uploadArea.style.display = 'none';
            workspace.style.display = 'grid';
            
            const digitalTextLength = originalFullText.replace(/--- Halaman \d+ ---/g, '').trim().length;
            if (digitalTextLength < 10) {
                if (typeof showToast === 'function') showToast('PDF ini sepertinya hasil scan. Coba tombol Scan OCR!', 'info');
                if (btnOcr) btnOcr.classList.add('pulse-animation');
            } else {
                if (btnOcr) btnOcr.classList.remove('pulse-animation');
            }

            if (typeof logActivity === 'function') logActivity('PDF to Text', 'Ekstraksi');

        } catch (err) {
            console.error(err);
            alert('Gagal memproses PDF: ' + err.message);
            resetUploadArea();
        }
    }

    function resetUploadArea() {
        uploadArea.innerHTML = `
            <i class="ph-fill ph-file-text" style="font-size: 80px; color: #2563eb; margin-bottom: 20px;"></i>
            <div class="upload-text">
                <h3>PDF to Text</h3>
                <p>Ekstrak teks murni dari file PDF Anda</p>
            </div>
            <div class="btn btn-primary">Pilih File PDF</div>
        `;
    }

    // ─── Search Logic ───────────────────────────────────────────────
    if (searchInput) {
        searchInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            if (!term) {
                // Clear highlights if we implemented any (currently it's a textarea, so limited)
                return;
            }
            // For now, simple search just scrolls to the first match
            const text = textArea.value;
            const idx = text.toLowerCase().indexOf(term);
            if (idx !== -1) {
                textArea.setSelectionRange(idx, idx + term.length);
                textArea.focus();
            }
        };
    }

    // ─── Export Logic ────────────────────────────────────────────────
    if (btnDownloadMain) {
        btnDownloadMain.onclick = (e) => {
            e.stopPropagation();
            exportMenu.style.display = exportMenu.style.display === 'block' ? 'none' : 'block';
        };
    }

    window.addEventListener('click', () => {
        if (exportMenu) exportMenu.style.display = 'none';
    });

    const exportOpts = container.querySelectorAll('.export-opt');
    exportOpts.forEach(opt => {
        opt.onclick = () => {
            const ext = opt.dataset.ext;
            let content = textArea.value;
            let filename = `JagaDokumen_Export_${Date.now()}.${ext}`;
            let mime = 'text/plain';

            if (ext === 'json') {
                const lines = content.split('\n');
                const data = {
                    title: 'Export from #JagaDokumen',
                    date: new Date().toISOString(),
                    content: content,
                    pages: []
                };
                // Basic page split for JSON
                const pageSplits = content.split(/--- Halaman \d+ ---/);
                pageSplits.forEach((p, i) => {
                    if (p.trim()) data.pages.push({ page: i, text: p.trim() });
                });
                content = JSON.stringify(data, null, 2);
                mime = 'application/json';
            } else if (ext === 'md') {
                content = content.replace(/--- Halaman (\d+) ---/g, '## Halaman $1');
                content = `# Hasil Ekstraksi PDF\n\n${content}`;
            } else if (ext === 'doc') {
                // Word-compatible HTML export
                const htmlContent = `
                    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head><meta charset='utf-8'><title>Export #JagaDokumen</title></head>
                    <body style="font-family: 'Arial', sans-serif;">
                        <h1 style="text-align: center; color: #2563eb;">Hasil Ekstraksi PDF</h1>
                        <p style="text-align: center; color: #64748b; font-size: 0.8rem;">Diekstrak via #JagaDokumen pada ${new Date().toLocaleString()}</p>
                        <hr>
                        <div style="white-space: pre-wrap;">${content.replace(/--- Halaman (\d+) ---/g, '<h3 style="background: #f1f5f9; padding: 5px;">Halaman $1</h3>')}</div>
                    </body>
                    </html>
                `;
                content = htmlContent;
                mime = 'application/msword';
            }

            if (typeof downloadFile === 'function') {
                downloadFile(content, filename, mime);
            }
        };
    });

    // ─── OCR Logic ──────────────────────────────────────────────────
    if (btnOcr) {
        btnOcr.onclick = async () => {
            if (!pageCanvases.length) return;
            btnOcr.disabled = true;
            btnOcr.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Menyiapkan AI...';
            try {
                if (typeof Tesseract === 'undefined') throw new Error('Library OCR tidak termuat');
                const worker = await Tesseract.createWorker({
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            btnOcr.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Scan: ${Math.round(m.progress * 100)}%`;
                        }
                    }
                });
                await worker.loadLanguage('ind+eng');
                await worker.initialize('ind+eng');
                let ocrFullText = '';
                for (let i = 0; i < pageCanvases.length; i++) {
                    btnOcr.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Halaman ${i+1}/${pageCanvases.length}`;
                    const { data: { text } } = await worker.recognize(pageCanvases[i]);
                    ocrFullText += `--- Halaman ${i + 1} (Hasil Scan AI) ---\n${text}\n\n`;
                }
                await worker.terminate();
                if (textArea) {
                    textArea.value = ocrFullText.trim();
                    updateStats(textArea.value);
                }
                if (typeof showToast === 'function') showToast('Scan OCR Selesai!', 'success');
                if (btnOcr) btnOcr.classList.remove('pulse-animation');
            } catch (err) {
                console.error(err);
                alert('OCR Gagal: ' + err.message);
            } finally {
                btnOcr.disabled = false;
                btnOcr.innerHTML = '<i class="ph-fill ph-eye"></i> Scan OCR (AI)';
            }
        };
    }

    // ─── Actions ────────────────────────────────────────────────────
    if (btnCopy) {
        btnCopy.onclick = () => {
            if (!textArea.value) return;
            textArea.select();
            document.execCommand('copy');
            if (typeof showToast === 'function') showToast('Teks disalin ke clipboard!');
        };
    }

    if (btnClean) {
        btnClean.onclick = () => {
            if (!textArea.value) return;
            let text = textArea.value;
            text = text.replace(/[ ]+/g, ' '); 
            text = text.replace(/\n\n+/g, '\n\n');
            textArea.value = text.trim();
            updateStats(textArea.value);
            if (typeof showToast === 'function') showToast('Teks telah dirapikan!');
        };
    }

    if (textArea) {
        textArea.oninput = () => {
            updateStats(textArea.value);
        };
    }

    function updateStats(text) {
        const words = text ? text.trim().split(/\s+/).length : 0;
        const chars = text ? text.length : 0;
        const readingTime = Math.ceil(words / 200);
        if (statWords) statWords.textContent = words.toLocaleString();
        if (statChars) statChars.textContent = chars.toLocaleString();
        if (statTime) statTime.textContent = readingTime + ' Menit';
    }
}
