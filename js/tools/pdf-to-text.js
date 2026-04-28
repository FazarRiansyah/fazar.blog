/**
 * #JagaDokumen - PDF to Text Tool (PREMIUM v2 - Split View)
 * Features: Text extraction, stats, clean-up, copy & download, PDF PREVIEW.
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
    
    const btnCopy = q('btn-p2t-copy');
    const btnDownload = q('btn-p2t-download');
    const btnClean = q('btn-p2t-clean');
    const btnChange = q('btn-p2t-change');
    
    const statWords = q('p2t-stat-words');
    const statChars = q('p2t-stat-chars');
    const statTime = q('p2t-stat-time');

    if (!fileInput || !uploadArea) return;

    let pdfDoc = null;

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
            
            // Loop through pages for both extraction and preview
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                
                // 1. Extract Text
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `--- Halaman ${i} ---\n${pageText}\n\n`;
                
                // 2. Render Preview Canvas
                const viewport = page.getViewport({ scale: 1.0 });
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
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            }

            if (textArea) textArea.value = fullText.trim();
            updateStats(textArea.value);

            uploadArea.style.display = 'none';
            workspace.style.display = 'grid'; // Use grid for split view
            
            if (typeof logActivity === 'function') logActivity('PDF to Text', 'Ekstraksi');
            if (typeof showToast === 'function') showToast('Dokumen berhasil dimuat!');

        } catch (err) {
            console.error(err);
            alert('Gagal memproses PDF: ' + err.message);
            uploadArea.innerHTML = `
                <i class="ph-fill ph-file-text" style="font-size: 80px; color: #2563eb; margin-bottom: 20px;"></i>
                <div class="upload-text">
                    <h3>PDF to Text</h3>
                    <p>Ekstrak teks murni dari file PDF Anda</p>
                </div>
                <div class="btn btn-primary">Pilih File PDF</div>
            `;
        }
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

    if (btnDownload) {
        btnDownload.onclick = () => {
            if (!textArea.value) return;
            const filename = `JagaDokumen_Extracted_${Date.now()}.txt`;
            if (typeof downloadFile === 'function') {
                downloadFile(textArea.value, filename, 'text/plain');
            }
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
