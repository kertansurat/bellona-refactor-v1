// BELLONA Refactor v1.1 modular split
// Module: 08-tabs-maps-tactical.js
// Scope: Tab switching, maps, guild logo, drawing canvas, tactical markers
// Source: js/bellona-app.js lines 3034-3319

function switchTab(t) {
    ['dashboard','members','party','tactical','auction','queuecheck','rewards','stats'].forEach(tab => safeEl(`tab-content-${tab}`)?.classList.add('hidden'));
    safeEl(`tab-content-${t}`)?.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    safeEl(`tab-btn-${t}`)?.classList.add('active');
    const sidebar = safeEl('player-sidebar');
    if (sidebar) sidebar.classList.toggle('sidebar-hidden', !(t === 'party' || t === 'members'));
    if (t === 'tactical') setTimeout(resizeCanvas, 50);
    renderAll();
}

function addMapViaUrlManual() {}
function updateMapDropdownOptions() {
    const selector = safeEl('map-selector');
    if (!selector) return;
    selector.innerHTML = '<option value="default">🖥️ พื้นหลังบอร์ดมาตรฐานกิลด์ BELLONA</option>' + globalMaps.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');
    selector.value = selectedMap || 'default';
    renderGlobalMapsList();
}
function renderGlobalMapsList() {
    const list = safeEl('saved-maps-list');
    if (!list) return;
    list.innerHTML = '';
    globalMaps.forEach(m => {
        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-2 rounded text-xs border ${selectedGlobalMapId === m.id ? 'bg-amber-950/20 border-[#d4af37]' : 'bg-[#181f2d] border-[#222b3c]'}`;
        item.innerHTML = `<span class="cursor-pointer font-bold" onclick="displayGlobalMap('${escapeHtml(m.id)}')">🗺️ ${escapeHtml(m.name)}</span><div class="flex items-center gap-2"><button onclick="editMapName('${escapeHtml(m.id)}')" class="text-gray-400 hover:text-[#d4af37] admin-only"><i class="fa-solid fa-pencil text-[10px]"></i></button><button onclick="deleteGlobalMap('${escapeHtml(m.id)}')" class="text-red-400 admin-only">✕</button></div>`;
        list.appendChild(item);
    });
    applyRolePermissions();
}
function editMapName(id) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const map = globalMaps.find(m => m.id === id);
    if (!map) return;
    const newName = prompt('ระบุชื่อแผนที่ใหม่:', map.name);
    if (newName && newName.trim()) { map.name = newName.trim().substring(0, 20); saveToLocalStorage(); updateMapDropdownOptions(); }
}
function displayGlobalMap(id) {
    const map = globalMaps.find(m => m.id === id) || globalMaps[0];
    if (!map) return changeBattleMap('default');
    const bgImg = safeEl('battle-map-bg');
    const placeholder = safeEl('battle-map-placeholder');
    if (bgImg) {
        bgImg.crossOrigin = 'anonymous';
        bgImg.onerror = function() {
            console.warn('BELLONA Map Engine: map image failed:', map.image);
            // fallback กรณีกรอก image เป็น assets/maps/name.png แต่ path แปลกจาก browser cache
            if (map.file && bgImg.src.indexOf('/assets/maps/' + map.file) === -1) {
                bgImg.src = './assets/maps/' + map.file;
                return;
            }
            bgImg.classList.add('hidden');
            if (placeholder) placeholder.classList.remove('hidden');
        };
        bgImg.onload = function() {
            bgImg.classList.remove('hidden');
            if (placeholder) placeholder.classList.add('hidden');
            setTimeout(resizeCanvas, 50);
        };
        bgImg.src = map.image;
        bgImg.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    selectedGlobalMapId = map.id; selectedMap = map.id;
    if (safeEl('map-selector')) safeEl('map-selector').value = map.id;
    saveToLocalStorage(); renderGlobalMapsList(); setTimeout(resizeCanvas, 50);
}
function deleteGlobalMap(id) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    globalMaps = globalMaps.filter(m => m.id !== id);
    ensureDefaultMapsAvailable();
    changeBattleMap(globalMaps[0].id);
}
function changeBattleMap(val) {
    selectedMap = val;
    const bgImg = safeEl('battle-map-bg');
    const placeholder = safeEl('battle-map-placeholder');
    if (val && val !== 'default') return displayGlobalMap(val);
    selectedGlobalMapId = null;
    if (bgImg) bgImg.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (safeEl('map-selector')) safeEl('map-selector').value = 'default';
    saveToLocalStorage(); renderGlobalMapsList();
}
function updateGuildLogoViaUrl() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const url = (safeEl('guild-logo-url-input')?.value || '').trim();
    if (!url) return;
    localStorage.setItem('bellona_custom_logo_data', url);
    displayGuildLogo(url);
}
function displayGuildLogo(url) {
    ['login-logo','header-logo','fallback-watermark-logo'].forEach(id => { const img = safeEl(id); if (img) img.src = url; });
}

function initDrawingCanvas() {
    canvas = safeEl('drawing-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.addEventListener('mousedown', e => {
        if (!['draw','line','rect','circle'].includes(drawMode) || !checkAdminAccess()) return;
        isDrawing = true;
        [lastX,lastY] = getCanvasMousePos(e);
        [shapeStartX, shapeStartY] = [lastX, lastY];
        previewSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    });
    canvas.addEventListener('mousemove', e => {
        if (!isDrawing) return;
        const [x,y] = getCanvasMousePos(e);
        if (drawMode === 'draw') {
            ctx.strokeStyle = drawColor; ctx.lineWidth = brushSize; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke();
            drawingPaths.push({ type:'free', x1:lastX, y1:lastY, x2:x, y2:y, color:drawColor, size:brushSize });
            [lastX,lastY] = [x,y];
        } else {
            if (previewSnapshot) ctx.putImageData(previewSnapshot, 0, 0);
            drawShapeOnContext(ctx, { type: drawMode, x1: shapeStartX, y1: shapeStartY, x2: x, y2: y, color: drawColor, size: brushSize });
        }
    });
    const finish = e => {
        if (!isDrawing) return;
        const [x,y] = getCanvasMousePos(e);
        if (drawMode !== 'draw') {
            if (previewSnapshot) ctx.putImageData(previewSnapshot, 0, 0);
            const shape = { type: drawMode, x1: shapeStartX, y1: shapeStartY, x2: x, y2: y, color: drawColor, size: brushSize };
            drawingPaths.push(shape);
            drawShapeOnContext(ctx, shape);
        }
        isDrawing = false;
        previewSnapshot = null;
        saveToLocalStorage();
    };
    canvas.addEventListener('mouseup', finish);
    canvas.addEventListener('mouseleave', () => { if (isDrawing) { isDrawing = false; previewSnapshot = null; redrawCanvasPaths(); saveToLocalStorage(); } });
    setTimeout(resizeCanvas, 100);
}
function getCanvasMousePos(e) { const rect = canvas.getBoundingClientRect(); return [((e.clientX - rect.left) / rect.width) * canvas.width, ((e.clientY - rect.top) / rect.height) * canvas.height]; }
function resizeCanvas() { if (!canvas) return; canvas.width = 1500; canvas.height = 1500; redrawCanvasPaths(); }
function setDrawMode(mode) {
    drawMode = mode;
    document.querySelectorAll('.draw-tool').forEach(b => {
        b.classList.remove('bg-[#d4af37]','text-black');
        b.classList.add('bg-[#1c2331]','text-gray-300');
    });
    const btn = safeEl(`tool-${mode}`);
    if (btn) {
        btn.classList.remove('bg-[#1c2331]','text-gray-300');
        btn.classList.add('bg-[#d4af37]','text-black');
    }
}
function setDrawColor(color) { drawColor = color; }
function updateBrushSize(value) { brushSize = Number(value) || 4; }
function clearDrawing() { if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น'); drawingPaths = []; redrawCanvasPaths(); saveToLocalStorage(); }
function undoDrawing() { if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น'); drawingPaths.splice(-1); redrawCanvasPaths(); saveToLocalStorage(); }
function drawShapeOnContext(targetCtx, p) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.strokeStyle = p.color || drawColor;
    targetCtx.lineWidth = p.size || brushSize;
    targetCtx.lineCap = 'round';
    targetCtx.lineJoin = 'round';
    if ((p.type || 'free') === 'rect') {
        targetCtx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1);
    } else if (p.type === 'circle') {
        const cx = (p.x1 + p.x2) / 2;
        const cy = (p.y1 + p.y2) / 2;
        const rx = Math.abs(p.x2 - p.x1) / 2;
        const ry = Math.abs(p.y2 - p.y1) / 2;
        targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        targetCtx.stroke();
    } else {
        targetCtx.moveTo(p.x1, p.y1);
        targetCtx.lineTo(p.x2, p.y2);
        targetCtx.stroke();
    }
    targetCtx.restore();
}
function redrawCanvasPaths() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawingPaths.forEach(p => drawShapeOnContext(ctx, p));
}
function exportTacticalMap() {
    exportTacticalMapManualFallback();
}
function exportTacticalMapManualFallback() {
    if (!canvas) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1500;
    exportCanvas.height = 1500;
    const exCtx = exportCanvas.getContext('2d');
    const bgImg = safeEl('battle-map-bg');
    try {
        if (bgImg && bgImg.src && !bgImg.classList.contains('hidden') && bgImg.complete) exCtx.drawImage(bgImg,0,0,exportCanvas.width,exportCanvas.height);
        else { exCtx.fillStyle = '#0c0e14'; exCtx.fillRect(0,0,exportCanvas.width,exportCanvas.height); }
        exCtx.drawImage(canvas,0,0);
        markers.forEach(m => drawMarkerOnContext(exCtx, m, exportCanvas.width, exportCanvas.height));
        const link = document.createElement('a');
        link.download = `bellona-tactical-map-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.warn('manual tactical export error:', err);
        alert('เซฟรูปภาพไม่สำเร็จ อาจเกิดจากรูปแผนที่ภายนอกไม่อนุญาตให้บันทึก');
    }
}
function drawMarkerOnContext(targetCtx, m, width, height) {
    const posX = (m.posX/100) * width;
    const posY = (m.posY/100) * height;
    const color = m.color || '#dc2626';
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(posX,posY,26,0,2*Math.PI);
    targetCtx.fillStyle = color;
    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = 4;
    targetCtx.fill();
    targetCtx.stroke();
    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = '900 15px Inter, sans-serif';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(String(m.name || '').substring(0,3), posX, posY);
    targetCtx.restore();
}

function addNewMarker() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    const inputName = (safeEl('new-marker-name')?.value || '').trim();
    const promptName = inputName || prompt('ระบุชื่อสัญลักษณ์หมุดปักใหม่:', 'หมากรบ');
    if (!promptName || !promptName.trim()) return;
    markers.push({ id:'m_'+Date.now(), name:promptName.trim(), posX:15, posY:15, color:(safeEl('new-marker-color')?.value || '#dc2626') });
    if (safeEl('new-marker-name')) safeEl('new-marker-name').value = '';
    saveToLocalStorage(); renderMarkers(); renderMarkersSettingList();
}
function renderMarkers() {
    const overlay = safeEl('markers-overlay');
    if (!overlay) return;
    overlay.innerHTML = '';
    markers.forEach(m => {
        const el = document.createElement('div');
        el.className = 'absolute z-30 pointer-events-auto cursor-move select-none';
        el.style.left = `${m.posX}%`; el.style.top = `${m.posY}%`; el.style.transform = 'translate(-50%, -50%)';
        el.innerHTML = `<div class="marker-token" style="background:${escapeHtml(m.color || '#dc2626')}">${escapeHtml(String(m.name || '').substring(0,3))}</div>`;
        el.onmousedown = event => startMarkerDrag(event, m.id);
        overlay.appendChild(el);
    });
}
function startMarkerDrag(event, markerId) {
    if (!checkAdminAccess() || drawMode !== 'move') return;
    event.preventDefault(); event.stopPropagation();
    const wrapper = safeEl('tactical-board-wrapper');
    const move = e => {
        const rect = wrapper.getBoundingClientRect();
        const marker = markers.find(m => m.id === markerId);
        if (!marker) return;
        marker.posX = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        marker.posY = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
        renderMarkers();
    };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); saveToLocalStorage(); renderMarkersSettingList(); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
}
function renderMarkersSettingList() {
    const list = safeEl('markers-setting-list');
    if (!list) return;
    list.innerHTML = '';
    markers.forEach(m => {
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between gap-2 bg-[#181f2d] border border-[#222b3c] rounded p-2 text-xs';
        row.innerHTML = `<div class="flex items-center gap-2 min-w-0"><span class="w-4 h-4 rounded-full border border-white/60 shrink-0" style="background:${escapeHtml(m.color || '#dc2626')}"></span><span class="font-bold text-gray-200 truncate">${escapeHtml(m.name)}</span></div><button onclick="deleteMarker('${escapeHtml(m.id)}')" class="admin-only text-red-400">ลบ</button>`;
        list.appendChild(row);
    });
    applyRolePermissions();
}
function deleteMarker(id) {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    markers = markers.filter(m => m.id !== id);
    saveToLocalStorage(); renderMarkers(); renderMarkersSettingList();
}
function resetMarkersToDefault() {
    if (!checkAdminAccess()) return alert('เฉพาะ Admin เท่านั้น');
    markers = [];
    saveToLocalStorage(); renderMarkers(); renderMarkersSettingList();
}
