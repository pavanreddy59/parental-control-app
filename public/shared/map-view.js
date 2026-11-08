// Interactive Vector Radar & GPS Map Visualizer (Offline & Online Compatible)
class GuardianMap {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.options = Object.assign({
      centerLat: 37.7749,
      centerLng: -122.4194,
      zoom: 15,
      geofences: [],
      history: [],
      currentPosition: null
    }, options);

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="guardian-map-wrapper" style="position:relative; width:100%; height:100%; min-height:380px; background:#0f172a; border-radius:12px; overflow:hidden; user-select:none;">
        <canvas id="${this.container.id}-canvas" style="width:100%; height:100%; display:block;"></canvas>
        <div class="map-controls" style="position:absolute; bottom:16px; right:16px; display:flex; flex-direction:column; gap:8px; z-index:10;">
          <button id="${this.container.id}-zoom-in" style="width:36px; height:36px; border-radius:8px; border:none; background:#1e293b; color:white; font-size:18px; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.3);">+</button>
          <button id="${this.container.id}-zoom-out" style="width:36px; height:36px; border-radius:8px; border:none; background:#1e293b; color:white; font-size:18px; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.3);">-</button>
          <button id="${this.container.id}-recenter" title="Recenter on Child" style="width:36px; height:36px; border-radius:8px; border:none; background:#4f46e5; color:white; font-size:16px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.3);">🎯</button>
        </div>
        <div class="map-telemetry" style="position:absolute; top:14px; left:14px; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); padding:8px 14px; border-radius:8px; border:1px solid #334155; color:#e2e8f0; font-size:12px; z-index:10;">
          <div style="font-weight:600; color:#38bdf8; display:flex; align-items:center; gap:6px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; animation:blink 1.5s infinite;"></span>
            LIVE GPS SATELLITE TELEMETRY
          </div>
          <div id="${this.container.id}-coords" style="margin-top:4px; font-family:monospace; color:#94a3b8;">37.7749° N, 122.4194° W</div>
        </div>
        <div class="map-legend" style="position:absolute; bottom:14px; left:14px; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); padding:6px 12px; border-radius:8px; border:1px solid #334155; color:#cbd5e1; font-size:11px; display:flex; gap:12px; z-index:10;">
          <span style="display:flex; align-items:center; gap:5px;"><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#10b981; border:2px solid white;"></span> Child Location</span>
          <span style="display:flex; align-items:center; gap:5px;"><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:rgba(14,165,233,0.3); border:1px solid #0ea5e9;"></span> Safe Zone</span>
          <span style="display:flex; align-items:center; gap:5px;"><span style="display:inline-block; width:12px; height:2px; background:#f59e0b;"></span> Trail</span>
        </div>
      </div>
    `;

    this.canvas = document.getElementById(`${this.container.id}-canvas`);
    this.ctx = this.canvas.getContext('2d');
    this.coordsEl = document.getElementById(`${this.container.id}-coords`);

    this.scale = 45000; // pixels per degree
    this.centerLat = this.options.centerLat;
    this.centerLng = this.options.centerLng;
    this.currentPosition = this.options.currentPosition || { lat: this.centerLat, lng: this.centerLng };
    this.geofences = this.options.geofences || [];
    this.history = this.options.history || [];

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Setup interactive zoom and recenter
    document.getElementById(`${this.container.id}-zoom-in`).addEventListener('click', () => {
      this.scale *= 1.3;
      this.render();
    });
    document.getElementById(`${this.container.id}-zoom-out`).addEventListener('click', () => {
      this.scale /= 1.3;
      this.render();
    });
    document.getElementById(`${this.container.id}-recenter`).addEventListener('click', () => {
      if (this.currentPosition) {
        this.centerLat = this.currentPosition.lat;
        this.centerLng = this.currentPosition.lng;
        this.render();
      }
    });

    // Drag to pan
    let isDragging = false;
    let startX = 0, startY = 0;
    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      this.centerLng -= dx / this.scale;
      this.centerLat += dy / (this.scale * Math.cos(this.centerLat * Math.PI / 180));
      this.render();
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.render();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.render();
  }

  updateData({ currentPosition, geofences, history }) {
    if (currentPosition) {
      this.currentPosition = currentPosition;
      this.centerLat = currentPosition.lat;
      this.centerLng = currentPosition.lng;
      if (this.coordsEl) {
        this.coordsEl.innerText = `${currentPosition.lat.toFixed(5)}° N, ${Math.abs(currentPosition.lng).toFixed(5)}° W`;
      }
    }
    if (geofences) this.geofences = geofences;
    if (history) this.history = history;
    this.render();
  }

  latLngToXY(lat, lng) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cosLat = Math.cos(this.centerLat * Math.PI / 180);
    const x = w / 2 + (lng - this.centerLng) * this.scale;
    const y = h / 2 - (lat - this.centerLat) * this.scale * cosLat;
    return { x, y };
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!ctx || w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw modern dark GPS grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw simulated road lines / city map network
    ctx.strokeStyle = '#24324d';
    ctx.lineWidth = 4;
    const basePt = this.latLngToXY(37.7749, -122.4194);
    // Main avenue
    ctx.beginPath();
    ctx.moveTo(basePt.x - 300, basePt.y - 120);
    ctx.lineTo(basePt.x + 350, basePt.y + 160);
    ctx.stroke();
    // Cross street
    ctx.beginPath();
    ctx.moveTo(basePt.x - 200, basePt.y + 250);
    ctx.lineTo(basePt.x + 220, basePt.y - 280);
    ctx.stroke();
    // Secondary arterial
    ctx.strokeStyle = '#1e2d42';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(basePt.x, basePt.y, 140, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw Geofences (Safe Zones)
    for (const gf of this.geofences) {
      const pt = this.latLngToXY(gf.latitude, gf.longitude);
      // approximate radius in pixels (1 deg ≈ 111,000m)
      const radiusPx = (gf.radius_meters / 111000) * this.scale;

      // Fill circle
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(radiusPx, 20), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.fill();

      // Border circle
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Geofence Label
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🛡️ ${gf.name}`, pt.x, pt.y - Math.max(radiusPx, 20) - 8);
    }

    // 3. Draw History Trail
    if (this.history && this.history.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      for (let i = 0; i < this.history.length; i++) {
        const item = this.history[i];
        const pt = this.latLngToXY(item.latitude, item.longitude);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Small dots on historical points
      for (const item of this.history) {
        const pt = this.latLngToXY(item.latitude, item.longitude);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
      }
    }

    // 4. Draw Current Child Location Pin
    if (this.currentPosition) {
      const pt = this.latLngToXY(this.currentPosition.lat, this.currentPosition.lng);

      // Radar pulse ring
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fill();

      // Inner pin
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Callout Bubble
      const calloutText = "Alex's Device";
      ctx.font = 'bold 12px sans-serif';
      const textMetrics = ctx.measureText(calloutText);
      const bubbleW = textMetrics.width + 20;
      const bubbleH = 24;
      const bubbleX = pt.x - bubbleW / 2;
      const bubbleY = pt.y - 42;

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6) : ctx.rect(bubbleX, bubbleY, bubbleW, bubbleH);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(calloutText, pt.x, bubbleY + 16);
    }
  }
}

window.GuardianMap = GuardianMap;

