let frameCount = 0;
let x = 0;

// --- NUEVA LÓGICA DE NIVELES ---
// 0: Normal, 1: Taquicardia 75%, 2: Taquicardia 100% (Alarma)
let nivelAlerta = 0;

const config = {
    speed: 1.2,
    scanBar: 25,
    // Frecuencias: Normal (115), 75% (60), 100% (30)
    freqs: [115, 60, 30],
    noise: 1.5
};

// --- CONFIGURACIÓN DE ESCALAS ---
const scales = {
    data: [
        /* HR (2 líneas) */
        { pos: 0.3, label: "130", weight: 1 },
        { pos: 0.55, label: "50", weight: 1 },

        /* SpO2 (4 líneas) */
        { pos: 0.1, label: "", weight: 2 },
        { pos: 0.4, label: "100", weight: 1 },
        { pos: 0.7, label: "80", weight: 1 },
        { pos: 0.9, label: "", weight: 2 },

        /* ABP (3 líneas) */
        { pos: 0.15, label: "200", weight: 2 },
        { pos: 0.5, label: "100", weight: 1 },
        { pos: 0.85, label: "0", weight: 2 },

        /* PAP (2 líneas) */
        { pos: 0.3, label: "30", weight: 1 },
        { pos: 0.7, label: "5", weight: 1 },

        /* etCO2 (3 líneas) */
        { pos: 0.1, label: "50", weight: 2 },
        { pos: 0.45, label: "30", weight: 1 },
        { pos: 0.85, label: "0", weight: 2 }
    ],
    map: [
        [0, 1],          // Canal ECG
        [2, 3, 4, 5],    // Canal SpO2
        [6, 7, 8],       // Canal ABP
        [9, 10],         // Canal PAP
        [11, 12, 13]     // Canal etCO2
    ]
};

const channels = [
    {
        id: 'c0', color: '#22ff22', phase: 0, qrsAlto: 0,
        draw: function (p, h) {
            if (p === 0) this.qrsAlto = 0.8 + Math.random() * 0.4;
            const baseline = h * 0.6;
            if (p > 0.05 && p < 0.12) return baseline - Math.sin((p - 0.05) * Math.PI / 0.07) * 8;
            if (p >= 0.15 && p < 0.17) return baseline + (p - 0.15) * 400;
            if (p >= 0.17 && p < 0.20) return baseline - 15 - (p - 0.17) * (1800 * this.qrsAlto);
            if (p >= 0.20 && p < 0.23) return baseline - (100 * this.qrsAlto) + (p - 0.20) * (1600 * this.qrsAlto);
            if (p > 0.45 && p < 0.65) return baseline - Math.sin((p - 0.45) * Math.PI / 0.2) * 12;
            return baseline;
        }
    },
    {
        id: 'c1', color: '#ffff22', phase: 0, dicroticAzar: 0,
        draw: function (p, h) {
            if (p === 0) this.dicroticAzar = 0.8 + Math.random() * 0.4;
            const base = h * 0.75;
            if (p < 0.2) return base - Math.sin(p * Math.PI / 0.4) * 45;
            if (p >= 0.2 && p < 0.35) return (base - 35) + Math.sin((p - 0.2) * Math.PI / 0.15) * (5 * this.dicroticAzar);
            return base - 30 * Math.exp(-(p - 0.35) * 4);
        }
    },
    {
        id: 'c2', color: '#ff3333', phase: 0, pulsePress: 0,
        draw: function (p, h) {
            if (p === 0) this.pulsePress = 0.9 + Math.random() * 0.2;
            const base = h * 0.8;
            if (p < 0.25) return base - Math.pow(Math.sin(p * Math.PI / 0.3), 1.5) * (50 * this.pulsePress);
            if (p >= 0.25 && p < 0.35) return (base - 40 * this.pulsePress) + (p - 0.25) * 100;
            return (base - 15) * Math.exp(-(p - 0.35) * 1.5);
        }
    },
    {
        id: 'cPAP', color: '#ccaa44', phase: 0, fluctuacion: 0,
        draw: function (p, h) {
            if (p === 0) this.fluctuacion = Math.random() * 5;
            const base = h * 0.75;
            if (p < 0.3) return base - Math.sin(p * Math.PI / 0.3) * (35 + this.fluctuacion);
            return base - (30 * Math.exp(-(p - 0.3) * 3));
        }
    },
    {
        id: 'c3', color: '#ffffff', phase: 0, nextAncho: 0.5, nextAlto: 45, nextSlope: 0.05,
        draw: function (p, h) {
            if (p === 0) {
                this.nextAncho = 0.45 + Math.random() * 0.1;
                this.nextAlto = 40 + Math.random() * 6;
                this.nextSlope = Math.random() * 0.1 - 0.05;
            }
            const baselineY = h * 0.82;
            if (p > 0.15 && p < (0.15 + this.nextAncho)) {
                const pNorm = (p - 0.15) / this.nextAncho;
                const edgeShape = Math.sin(pNorm * Math.PI);
                let waveForm = Math.pow(edgeShape, 0.2);
                const cimaInclinada = (pNorm - 0.5) * this.nextSlope;
                let y = waveForm * this.nextAlto + (cimaInclinada * this.nextAlto);
                return baselineY - y;
            }
            return baselineY;
        }
    }
];

function setup() {
    channels.forEach((ch, i) => {
        const cvs = document.getElementById(ch.id);
        cvs.width = cvs.offsetWidth; cvs.height = cvs.offsetHeight;
        ch.ctx = cvs.getContext('2d');
        const lyr = cvs.parentElement.querySelector('.scale-layer');
        if (lyr) {
            lyr.innerHTML = '';
            (scales.map[i] || []).forEach(idx => {
                const item = scales.data[idx];
                if (!item) return;
                const l = document.createElement('div');
                l.className = 'hline';
                l.style.top = (item.pos * 100) + '%';
                l.style.height = (item.weight || 1) + 'px';
                l.style.backgroundColor = ch.color;
                l.style.opacity = "0.65";
                const lb = document.createElement('div');
                lb.className = 'scale-label';
                lb.style.top = (item.pos * 100) + '%';
                lb.innerText = item.label;
                lb.style.color = ch.color;
                lb.style.opacity = "0.6";
                lyr.appendChild(l); lyr.appendChild(lb);
            });
        }
    });
}

function updateData() {
    const f = (n) => String(n).padStart(2, '0');
   
    // Ajuste de valores numéricos según nivel
    let hrBase;
    let abpText, abpMText, papText, papMText;

    if (nivelAlerta === 0) {
        hrBase = 66;
        abpText = "113/84"; abpMText = "(93)";
        papText = "20/10"; papMText = "(13)";
    } else if (nivelAlerta === 1) {
        hrBase = 110;
        abpText = "140/95"; abpMText = "(110)";
        papText = "28/14"; papMText = "(19)";
    } else {
        hrBase = 155;
        abpText = "165/110"; abpMText = "(132)";
        papText = "35/18"; papMText = "(24)";
    }

    document.getElementById('vHR').innerText = Math.floor(hrBase + (Math.random() * 2 - 1));
    document.getElementById('vPulse').innerText = Math.floor(hrBase - 1 + (Math.random() * 2 - 1));
    document.getElementById('vSPO2').innerText = Math.random() > 0.9 ? 97 : 98;
    document.getElementById('vABP').innerText = abpText;
    document.getElementById('vABP_M').innerText = abpMText;
    document.getElementById('vPAP').innerText = papText;
    document.getElementById('vPAP_M').innerText = papMText;
}

function render() {
    const noise = (Math.random() - 0.5) * config.noise;
    // Seleccionamos frecuencia según nivel actual
    const targetFreq = config.freqs[nivelAlerta];

    channels.forEach(ch => {
        const ctx = ch.ctx;
        const h = ctx.canvas.height;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'black';
        ctx.fillRect(x, 0, config.scanBar, h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 1.8;
        
        if (ch.phase === 0) ch.currentFreq = targetFreq;
        
        const y1 = ch.draw(ch.phase / ch.currentFreq, h) + noise;
        ch.phase = (ch.phase + 1) % ch.currentFreq;
        const y2 = ch.draw(ch.phase / ch.currentFreq, h) + noise;
        
        ctx.moveTo(x - config.speed, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
    });
    x += config.speed;
    if (x > channels[0].ctx.canvas.width) x = 0;
    frameCount++;
    if (frameCount % 60 === 0) updateData();
    requestAnimationFrame(render);
}

// --- GESTIÓN DE ALARMA VISUAL ---
function actualizarVisualNivel() {
    const overlay = document.getElementById('alarmOverlay');
    if (!overlay) return;

    if (nivelAlerta === 2) {
        overlay.classList.add('alarma-activa');
    } else {
        overlay.classList.remove('alarma-activa');
    }
}

// --- EVENTOS DE TECLADO ---
window.addEventListener('keydown', (e) => { 
    if (e.key === "ArrowUp") {
        nivelAlerta = (nivelAlerta + 1) % 3;
        actualizarVisualNivel();
        updateData(); // Forzar actualización inmediata de números
    } 
    else if (e.key === "ArrowDown") {
        nivelAlerta = (nivelAlerta - 1 + 3) % 3;
        actualizarVisualNivel();
        updateData();
    }
    // Mantengo el Enter por si quieres usarlo como atajo al nivel 2 directo
    if (e.key === "Enter") {
        nivelAlerta = (nivelAlerta === 2) ? 0 : 2;
        actualizarVisualNivel();
        updateData();
    }
});

window.addEventListener('resize', setup);
setup(); 
render();