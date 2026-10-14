// renderer.js - محرك الرسوم البصرية الفضائية الفائقة
import { FORMATION, EXPLODE_TIME, DURATION, clamp } from './engine.js';
import {
  TAU,
  JOIN_ANGLE,
  joinAngle,
  radiusOf,
  visualShift,
  lobePoints,
  dissolvingLobePoints,
  seedPosition,
  cyclicCosmicParticle
} from './motion.js';

let stars = null;
function getStars(count = 200) {
  if (stars) return stars;
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 850,
      y: (Math.random() - 0.5) * 850,
      r: Math.random() * 1.6 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 2 + 1,
      color: ['#ece6d8', '#d9cfb8', '#ffd4a3', '#c9b58a'][Math.floor(Math.random() * 4)]
    });
  }
  return stars;
}

function path(ctx, points) {
  if (!points || !points.length) return;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
  }
  ctx.closePath();
}

function glowDisk(ctx, x, y, r, type, alpha = 1, glowIntensity = 1) {
  if (r < 0.05 || alpha < 0.001) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, ctx.globalAlpha * alpha));

  const isYin = type === 'yin';
  const mainColor = isYin ? '#14110f' : '#ffffff';
  const glowColor = isYin ? 'rgba(150, 120, 70, ' : 'rgba(255, 215, 115, ';

  if (glowIntensity > 0) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * (2.8 + glowIntensity * 1.5));
    grad.addColorStop(0, glowColor + (isYin ? '0.6)' : '0.8)'));
    grad.addColorStop(0.4, glowColor + (isYin ? '0.25)' : '0.35)'));
    grad.addColorStop(1, glowColor + '0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * (2.8 + glowIntensity * 1.5), 0, TAU);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = mainColor;
  ctx.fill();

  ctx.strokeStyle = isYin ? 'rgba(184, 151, 90, 0.7)' : 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

function radiantTrail(ctx, position, t, type, life = 0.16, width = 1.2, alpha = 0.35) {
  ctx.save();
  const isYin = type === 'yin';
  const strokeColor = isYin ? '150, 120, 70' : '255, 235, 160';
  ctx.lineWidth = width;
  ctx.lineCap = 'round';

  const steps = 6;
  for (let j = 0; j < steps; j++) {
    const a = position(t - (life * j) / steps);
    const b = position(t - (life * (j + 1)) / steps);
    if (!a || !b) continue;
    const stepAlpha = alpha * (1 - j / steps);
    ctx.strokeStyle = `rgba(${strokeColor}, ${stepAlpha})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCosmicBackdrop(ctx, time, energyInEnv = 0) {
  const cosmicGlowBoost = Math.min(1.0, energyInEnv / 24);

  const starList = getStars();
  for (const s of starList) {
    const twinkle = 0.6 + 0.4 * Math.sin(time * s.twinkleSpeed + s.x);
    ctx.save();
    ctx.globalAlpha = Math.min(1, s.alpha * twinkle * (1 + cosmicGlowBoost * 0.7));
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (1 + cosmicGlowBoost * 0.35), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const nebRadius = 260 + cosmicGlowBoost * 70;
  const nebGrad = ctx.createRadialGradient(0, 0, 40, 0, 0, nebRadius);
  nebGrad.addColorStop(0, `rgba(110, 85, 50, ${0.08 + cosmicGlowBoost * 0.12})`);
  nebGrad.addColorStop(0.5, `rgba(60, 50, 35, ${0.05 + cosmicGlowBoost * 0.08})`);
  nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebGrad;
  ctx.beginPath();
  ctx.arc(0, 0, nebRadius, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = `rgba(184, 151, 90, ${0.12 + cosmicGlowBoost * 0.12})`;
  ctx.lineWidth = 0.6;

  for (const r of [85, 120, 162]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
  }

  const rot = time * 0.04;
  ctx.rotate(rot);
  ctx.strokeStyle = `rgba(184, 151, 90, ${0.22 + cosmicGlowBoost * 0.15})`;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const isMajor = i % 6 === 0;
    const rInner = isMajor ? 156 : 159;
    const rOuter = 162;
    ctx.lineWidth = isMajor ? 0.9 : 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * rInner, Math.sin(a) * rInner);
    ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(236, 230, 216, ${0.35 + cosmicGlowBoost * 0.25})`;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 120, Math.sin(a) * 120, 1.2, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function drawBirth(ctx, t, reduced) {
  const angle = reduced ? 0 : joinAngle(t);
  ctx.save();
  ctx.rotate(angle);

  const shapes = [lobePoints(t, 0), lobePoints(t, 1)];
  for (let side = 0; side < 2; side++) {
    ctx.save();
    ctx.shadowColor = side ? 'rgba(255, 230, 160, 0.4)' : 'rgba(120, 95, 60, 0.5)';
    ctx.shadowBlur = 18;
    path(ctx, shapes[side]);
    ctx.fillStyle = side ? '#ffffff' : '#14110f';
    ctx.fill();
    ctx.restore();

    path(ctx, shapes[side]);
    ctx.strokeStyle = side ? 'rgba(255, 255, 255, 0.8)' : 'rgba(184, 151, 90, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  for (let side = 0; side < 2; side++) {
    const seed = seedPosition(t, side);
    const type = side ? 'yin' : 'yang';
    glowDisk(ctx, seed.x, seed.y, seed.r, type, seed.alpha, 2.2);

    const pulse = (t * 2 + side * Math.PI) % 2;
    ctx.save();
    ctx.strokeStyle = side ? 'rgba(150, 120, 70, ' + (1 - pulse / 2) * 0.4 + ')' : 'rgba(255, 220, 140, ' + (1 - pulse / 2) * 0.5 + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(seed.x, seed.y, seed.r + pulse * 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  if (t >= 8.5 && t < 9.0) {
    const prog = (t - 8.5) / 0.5;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - prog})`;
    ctx.lineWidth = 2 * (1 - prog);
    ctx.beginPath();
    ctx.arc(0, 0, prog * 110, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawBody(ctx, f, t, model, reduced, width, height) {
  const angle = reduced ? 0 : f.angle + JOIN_ANGLE;
  const shift = visualShift(f);
  const strain = f.strain || 0;
  const isExploded = f.ruptured !== undefined ? f.ruptured : (t >= EXPLODE_TIME);
  const breakAge = f.ruptured !== undefined ? (f.ruptureAge || 0) : (isExploded ? Math.max(0, t - EXPLODE_TIME) : 0);

  ctx.save();

  // 1. وميض الانفجار الأبيض في اللحظات الأولى
  if (isExploded && breakAge < 0.25) {
    const flashProg = breakAge / 0.25;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * (1 - flashProg)})`;
    ctx.fillRect(-width, -height, width * 2, height * 2);
    ctx.restore();
  }

  // 2. هزة الكاميرا العنيفة عند الانفجار
  if (isExploded && breakAge < 1.4) {
    const shakeMag = (1 - breakAge / 1.4) * 11.0;
    ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
  } else if (!isExploded && strain > 0.6) {
    const shakeMag = (strain - 0.6) * 4.0;
    ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
  }

  // 3. حالة الانفجار وتفكك الكتلتين
  if (isExploded) {
    // موجة صدمة انفجارية متسعة بسرعة
    if (breakAge < 2.5) {
      const shockR = breakAge * 140;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 230, 200, ${0.9 * (1 - breakAge / 2.5)})`;
      ctx.lineWidth = 3.0 * (1 - breakAge / 2.5);
      ctx.beginPath();
      ctx.arc(0, 0, shockR, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // الكتلتان تنفصلان وتتبخران
    ctx.save();
    ctx.rotate(angle);
    for (let side = 0; side < 2; side++) {
      const lobe = dissolvingLobePoints(side, breakAge);
      if (!lobe || lobe.bodyAlpha < 0.005) continue;

      ctx.save();
      ctx.globalAlpha = lobe.bodyAlpha;
      ctx.shadowColor = side ? 'rgba(255, 230, 160, 0.6)' : 'rgba(150, 120, 70, 0.7)';
      ctx.shadowBlur = 24 * (1 - lobe.unmerge);

      path(ctx, lobe.points);
      ctx.fillStyle = side ? '#ffffff' : '#14110f';
      ctx.fill();

      ctx.strokeStyle = side ? 'rgba(255, 255, 255, 0.8)' : 'rgba(184, 151, 90, 0.7)';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      const sign = side ? -1 : 1;
      const seedR = 4.5 * lobe.shrinkScale;
      glowDisk(ctx, sign * -lobe.sepDist, 0, seedR, side ? 'yin' : 'yang', lobe.bodyAlpha, 2.0);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  // 4. حالة التماسك والدوران قبل الانفجار
  const rBase = radiusOf(f);
  const haloGrad = ctx.createRadialGradient(0, 0, rBase * 0.8, 0, 0, rBase * 1.7);
  haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  haloGrad.addColorStop(0.4, strain > 0.5 ? 'rgba(166, 61, 47, 0.28)' : 'rgba(184, 151, 90, 0.18)');
  haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rBase * 1.7, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.rotate(angle);

  const r = rBase;

  // قص هندسي دائري دقيق ومحكم (يمنع أي بروز أو مثلثات غير طبيعية خارج الدائرة)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();

  // 1. نصف اليانج (الخلفية البيضاء المضيئة)
  const whiteGrad = ctx.createRadialGradient(-shift, r * 0.35, r * 0.1, 0, 0, r * 1.3);
  whiteGrad.addColorStop(0, '#f7f2e6');
  whiteGrad.addColorStop(0.75, '#f1ecdf');
  whiteGrad.addColorStop(1, '#ddd4c0');
  ctx.fillStyle = whiteGrad;
  ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);

  // 2. نصف الين (الكتلة المظلمة مع المنحنى الانسيابي)
  const darkGrad = ctx.createRadialGradient(shift, -r * 0.4, r * 0.1, shift, 0, r * 1.4);
  darkGrad.addColorStop(0, '#0e0c0a');
  darkGrad.addColorStop(0.7, '#14110f');
  darkGrad.addColorStop(1, '#221c16');

  ctx.fillStyle = darkGrad;
  ctx.beginPath();
  ctx.moveTo(shift, -r);
  const waveAmp = strain * 2.2 * Math.sin(t * 9);
  ctx.arc(shift + waveAmp, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2);
  ctx.arc(shift - waveAmp, r / 2, r / 2, -Math.PI / 2, Math.PI / 2, true);
  // إغلاق النصف المظلم بنصف قوس دائري خارجي تام
  ctx.arc(0, 0, r * 1.2, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); // إنهاء الـ clip الدائري

  const eyeR = r * 0.115;
  glowDisk(ctx, shift, -r * 0.5, eyeR, 'yang', 1, 1.8);
  glowDisk(ctx, shift, r * 0.5, eyeR, 'yin', 1, 1.8);

  ctx.restore();

  ctx.strokeStyle = strain > 0.7 ? 'rgba(166, 61, 47, 0.9)' : 'rgba(236, 230, 216, 0.8)';
  ctx.lineWidth = 1.0 + strain * 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();

  ctx.restore();
}

export function drawMouseInteraction(ctx, mouse) {
  if (!mouse || !mouse.active) return;
  ctx.save();
  const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 45);
  grad.addColorStop(0, 'rgba(184, 151, 90, 0.6)');
  grad.addColorStop(0.4, 'rgba(150, 120, 70, 0.2)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 45, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = 'rgba(236, 230, 216, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 8, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function renderScene(ctx, time, modelOrFrame, { width = 900, height = 700, dpr = 1, reduced = false, mouse = null, isSandbox = false } = {}) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b0a09';
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / 440, height / 370);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);

  if (isSandbox) {
    const f = modelOrFrame;
    const strain = f.strain || 0;
    const rBase = radiusOf(f);
    const outsideEnergy = f.ruptured ? 24 : (f.envYin + f.envYang);

    // 1. الخلفية الكونية الفضائية
    drawCosmicBackdrop(ctx, time, outsideEnergy);

    // 5. تأثيرات وضع الانفجار والتمزق الحرج (Rupture Mode Improvements)
    if (f.ruptured) {
      // 5.أ. صبغة الشاشة تتحول إلى الأحمر القاني الداكن (Screen tint shifts to deep red-black)
      const tintIntensity = Math.min(1.0, f.ruptureAge * 2.5);
      const tintPulse = 0.82 + 0.18 * Math.sin(time * 9.0);
      ctx.save();
      ctx.fillStyle = `rgba(38, 4, 12, ${0.46 * tintIntensity * tintPulse})`;
      const maxDim = Math.max(width, height) * 2;
      ctx.fillRect(-maxDim, -maxDim, maxDim * 2, maxDim * 2);
      ctx.restore();

      // 5.ب. موجات صدمة انفجارية متوسعة متعددة ومتلاشية (Expanding shockwave rings)
      for (let w = 0; w < 3; w++) {
        const wAge = f.ruptureAge - w * 0.42;
        if (wAge > 0 && wAge < 2.6) {
          const shockR = wAge * 155;
          const shockFade = 1.0 - wAge / 2.6;
          ctx.save();
          ctx.strokeStyle = w === 0 
            ? `rgba(255, 230, 200, ${0.9 * shockFade})`
            : (w === 1 ? `rgba(255, 130, 60, ${0.75 * shockFade})` : `rgba(150, 120, 70, ${0.65 * shockFade})`);
          ctx.lineWidth = Math.max(0.8, (4.2 - w * 1.1) * shockFade);
          ctx.beginPath();
          ctx.arc(0, 0, shockR, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 5.ج. شحنات برق وتصدعات طاقية متفرعة من المركز (Lightning / crack lines radiating from center)
      for (let b = 0; b < 6; b++) {
        const boltSeed = Math.floor(time * 14) + b * 11;
        const boltAngle = (b / 6) * TAU + Math.sin(b * 2.7 + Math.floor(time * 12)) * 0.35;
        const boltLength = Math.min(250, 40 + ((boltSeed * 37) % 75) + f.ruptureAge * 60);
        const segs = 7;
        let lx = 0, ly = 0;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        for (let s = 1; s <= segs; s++) {
          const frac = s / segs;
          const segDist = frac * boltLength;
          const perp = ((boltSeed * 17 + s * 29) % 23 - 11) * 1.5;
          const perpAngle = boltAngle + Math.PI / 2;
          lx = Math.cos(boltAngle) * segDist + Math.cos(perpAngle) * perp;
          ly = Math.sin(boltAngle) * segDist + Math.sin(perpAngle) * perp;
          ctx.lineTo(lx, ly);
        }
        const boltAlpha = Math.max(0, (0.55 + 0.45 * Math.sin(time * 42 + b * 9)) * Math.max(0, 1 - f.ruptureAge / 3.8));
        if (boltAlpha > 0.02) {
          ctx.strokeStyle = (b % 2 === 0) ? `rgba(236, 230, 216, ${boltAlpha})` : `rgba(255, 195, 120, ${boltAlpha})`;
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5.د. شظايا عنيفة مندفعة نحو الخارج مع ذيول متوهجة (Violent debris particles with trails)
      for (let i = 0; i < 72; i++) {
        const side = i % 2;
        const pType = side ? 'yang' : 'yin';
        const baseA = (i * 2.39996) % TAU;
        const pSpeed = 65 + ((i * 43) % 130);
        const dist = (f.ruptureAge * pSpeed) ** 0.93;
        const spiral = Math.sin(i * 7.1) * 0.45;
        const curA = baseA + spiral * Math.log(1 + f.ruptureAge * 3);
        const px = Math.cos(curA) * dist;
        const py = Math.sin(curA) * dist;
        const pAlpha = Math.max(0, 1.0 - dist / 360);

        if (pAlpha > 0.01) {
          const prevDist = Math.max(0, dist - (12 + (i % 4) * 4));
          const prevX = Math.cos(curA - spiral * 0.06) * prevDist;
          const prevY = Math.sin(curA - spiral * 0.06) * prevDist;
          ctx.save();
          ctx.strokeStyle = side ? `rgba(255, 215, 130, ${pAlpha * 0.75})` : `rgba(150, 120, 70, ${pAlpha * 0.75})`;
          ctx.lineWidth = 1.2 + (i % 3) * 0.5;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(px, py);
          ctx.stroke();
          ctx.restore();

          glowDisk(ctx, px, py, 1.4 + (i % 3) * 0.6, pType, pAlpha, 1.8);
        }
      }
    } else {
      // 4. هالة التنفس الكونية النبضية (Breathing aura effect)
      // تنفس هادئ عند 0.5Hz في التوازن، ويصبح سريعاً ومضطرباً مع تصاعد الإجهاد
      const breathFreq = Math.PI * (1.0 + strain * 4.2);
      const erratic = strain > 0.25 ? (Math.sin(time * 16.5) * 0.38 + Math.sin(time * 26.2) * 0.24) * strain : 0;
      const breathPhase = time * breathFreq + erratic;
      const breathPulse = Math.sin(breathPhase);
      const auraScale = 1.0 + 0.12 * breathPulse + (strain > 0.65 ? (Math.random() - 0.5) * 0.08 : 0);
      const auraR = rBase * 1.68 * auraScale;
      const auraInnerR = rBase * 0.85;

      const auraGrad = ctx.createRadialGradient(0, 0, auraInnerR, 0, 0, Math.max(auraInnerR + 1, auraR));
      if (strain < 0.35) {
        const a = 0.22 + 0.08 * breathPulse;
        auraGrad.addColorStop(0, `rgba(184, 151, 90, ${a})`);
        auraGrad.addColorStop(0.45, `rgba(120, 95, 60, ${a * 0.55})`);
        auraGrad.addColorStop(1, 'rgba(20, 15, 8, 0)');
      } else if (strain < 0.75) {
        const a = 0.32 + 0.14 * breathPulse;
        auraGrad.addColorStop(0, `rgba(255, 185, 65, ${a})`);
        auraGrad.addColorStop(0.5, `rgba(255, 105, 35, ${a * 0.6})`);
        auraGrad.addColorStop(1, 'rgba(60, 15, 0, 0)');
      } else {
        const a = 0.48 + 0.22 * breathPulse;
        auraGrad.addColorStop(0, `rgba(166, 61, 47, ${a})`);
        auraGrad.addColorStop(0.45, `rgba(140, 40, 35, ${a * 0.65})`);
        auraGrad.addColorStop(1, 'rgba(80, 0, 10, 0)');
      }
      ctx.save();
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, auraR), 0, TAU);
      ctx.fill();
      ctx.restore();

      // 1. حلقات مجال الطاقة الكونية النابضة (Pulsing energy field rings)
      // 3 حلقات متحدة المركز تهتز بنعومة، وتتحول من البنفسجي الهادئ إلى الذهبي/الأحمر التحذيري
      let ringR, ringG, ringB;
      if (strain < 0.5) {
        const tC = strain / 0.5;
        ringR = Math.round(184 + (255 - 184) * tC);
        ringG = Math.round(151 + (195 - 151) * tC);
        ringB = Math.round(90 + (60 - 90) * tC);
      } else {
        const tC = (strain - 0.5) / 0.5;
        ringR = 255;
        ringG = Math.round(195 + (45 - 195) * tC);
        ringB = Math.round(60 + (45 - 60) * tC);
      }

      const ringMultipliers = [1.25, 1.55, 1.90];
      for (let k = 0; k < 3; k++) {
        const ringBaseR = rBase * ringMultipliers[k];
        const ringFreq = 1.2 + strain * 2.8 + k * 0.35;
        const ringOsc = Math.sin(time * ringFreq + k * 1.5) * (2.2 + strain * 5.5 + k * 1.4);
        const currR = Math.max(1, ringBaseR + ringOsc);
        const ringAlpha = (0.22 + strain * 0.55) * (1.0 - k * 0.18);

        ctx.save();
        // هالة متوهجة خفيفة للحلقة
        ctx.strokeStyle = `rgba(${ringR}, ${ringG}, ${ringB}, ${ringAlpha * 0.35})`;
        ctx.lineWidth = 2.4 + strain * 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, currR, 0, TAU);
        ctx.stroke();

        // حلقة متقطعة دوارة
        ctx.rotate(time * (0.16 - k * 0.1) * (1.0 + strain * 1.5));
        ctx.setLineDash([10 + k * 6, 8 + k * 4]);
        ctx.strokeStyle = `rgba(${ringR}, ${ringG}, ${ringB}, ${ringAlpha})`;
        ctx.lineWidth = 1.0 + strain * 1.6 + (2 - k) * 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, currR, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      // 2. جزيئات الطاقة المدارية (Orbital energy particles - 64 جزيء)
      // مدارات متعددة، ذيول واضحة، حجم ووميض متناسب مع الطاقة، وسرعات تتأثر بالإجهاد مع تسرب مسبق
      const particleCount = 64;
      const speedFactor = (f.speed !== null ? f.speed : 1.0) * (1.0 + strain * 1.4);

      for (let i = 0; i < particleCount; i++) {
        const tier = i % 3;
        const baseOrbitR = rBase * (tier === 0 ? 1.26 : (tier === 1 ? 1.62 : 2.06)) + ((i * 19) % 17 - 8) * 0.8;
        const tierSpeedRatio = tier === 0 ? 1.35 : (tier === 1 ? 1.0 : 0.72);

        // تسرب مسبق للجزيئات نحو الخارج عند اشتداد الإجهاد
        const isLeaker = (i % 4 === 0);
        const leakDrift = (isLeaker && strain > 0.35) 
          ? (strain ** 1.5) * (28 + (i % 7) * 16) * (0.8 + 0.2 * Math.sin(time * 4.0 + i))
          : 0;
        const currentR = Math.max(2, baseOrbitR + leakDrift);

        const side = i % 2;
        const type = side ? 'yang' : 'yin';
        const energyVal = side ? f.yang : f.yin;
        const avgEnergy = Math.max(0.1, f.total * 0.5);
        const energyScale = Math.sqrt(Math.max(0.25, energyVal / avgEnergy));
        const pSize = (1.2 + (i % 3) * 0.45) * energyScale;
        const baseAlpha = clamp(0.35 + 0.42 * Math.sin(time * 3.2 + i * 1.1) + strain * 0.25, 0.2, 1.0);

        const baseAngle = f.angle * tierSpeedRatio + (i / particleCount) * TAU + Math.sin(time * 1.8 + i) * 0.1;
        const headX = Math.cos(baseAngle) * currentR;
        const headY = Math.sin(baseAngle) * currentR;

        // رسم ذيل الجزيء (3-4 trail segments)
        if (!reduced) {
          const trailSegs = 4;
          const trailColor = (type === 'yin') ? '150, 120, 70' : '255, 226, 132';
          for (let s = 1; s <= trailSegs; s++) {
            const lagAngle = baseAngle - s * 0.055 * (tierSpeedRatio * 0.8 + 0.2);
            const lagR = currentR - s * (isLeaker ? 1.4 : 0.35);
            const segX = Math.cos(lagAngle) * lagR;
            const segY = Math.sin(lagAngle) * lagR;
            const prevLagAngle = baseAngle - (s - 1) * 0.055 * (tierSpeedRatio * 0.8 + 0.2);
            const prevLagR = currentR - (s - 1) * (isLeaker ? 1.4 : 0.35);
            const prevX = Math.cos(prevLagAngle) * prevLagR;
            const prevY = Math.sin(prevLagAngle) * prevLagR;

            const segAlpha = baseAlpha * (1.0 - s / (trailSegs + 1)) * 0.58;
            ctx.save();
            ctx.strokeStyle = `rgba(${trailColor}, ${segAlpha})`;
            ctx.lineWidth = Math.max(0.6, pSize * (1.0 - s * 0.2));
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(segX, segY);
            ctx.stroke();
            ctx.restore();
          }
        }

        glowDisk(ctx, headX, headY, pSize, type, baseAlpha, 1.2 + strain * 0.8);
      }
    }

    // رسم الجسد المركزي
    drawBody(ctx, f, time, null, reduced, width, height);

    // 3. مسارات تدفق الطاقة الانسيابية (Energy flow streamlines - 10 خطوط)
    // قنوات طاقة تربط قطبي الين واليانج، متناغمة بانسيابية عند الاتزان، وتلتوي وتضطرب مع الإجهاد
    if (!f.ruptured) {
      const bodyAngle = reduced ? 0 : f.angle + JOIN_ANGLE;
      const shift = visualShift(f);
      const streamCount = 10;

      ctx.save();
      ctx.rotate(bodyAngle);

      for (let k = 0; k < streamCount; k++) {
        const spread = (k / (streamCount - 1) - 0.5) * 2; // من -1 إلى 1
        const p0 = { x: shift + spread * (rBase * 0.34), y: -rBase * 0.52 };
        const p3 = { x: shift - spread * (rBase * 0.34), y: rBase * 0.52 };

        const sweep = Math.sin(time * 2.4 + k * 0.6) * 3.5;
        const arch = (spread * rBase * 0.42) + (k % 2 === 0 ? rBase * 0.28 : -rBase * 0.28);
        const p1 = { x: shift + arch + sweep, y: -rBase * 0.18 };
        const p2 = { x: shift - arch - sweep, y: rBase * 0.18 };

        // التواء واضطراب الخطوط عند تصاعد الإجهاد
        if (strain > 0.05) {
          const distortAmp = strain * rBase * 0.52;
          const distortFreq = 4.2 + strain * 7.5;
          p1.x += Math.sin(time * distortFreq + k * 1.7) * distortAmp;
          p1.y += Math.cos(time * (distortFreq * 0.9) + k * 1.3) * (distortAmp * 0.42);
          p2.x -= Math.cos(time * distortFreq + k * 1.5) * distortAmp;
          p2.y += Math.sin(time * (distortFreq * 0.9) + k * 1.8) * (distortAmp * 0.42);
        }

        const flowGrad = ctx.createLinearGradient(p0.x, p0.y, p3.x, p3.y);
        flowGrad.addColorStop(0, `rgba(255, 236, 175, ${0.46 + (1 - strain) * 0.34})`);
        if (strain > 0.5) {
          flowGrad.addColorStop(0.5, `rgba(255, 75, 65, ${0.62 + strain * 0.32})`);
        } else {
          flowGrad.addColorStop(0.5, `rgba(236, 230, 216, ${0.42 + (1 - strain) * 0.28})`);
        }
        flowGrad.addColorStop(1, `rgba(150, 120, 70, ${0.46 + (1 - strain) * 0.34})`);

        ctx.strokeStyle = flowGrad;
        ctx.lineWidth = 1.0 + (1 - Math.abs(spread) * 0.5) * 0.7 + strain * 0.7;
        ctx.setLineDash([5, 9]);
        ctx.lineDashOffset = -time * (24 + strain * 32) * (k % 2 === 0 ? 1 : -1);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.stroke();
      }

      ctx.setLineDash([]);
      ctx.restore();

      // 6. بريق التناغم الماسي (Harmony sparkles)
      // تظهر نجوماً ماسية وضاءة تتلألأ بهدوء حول الجسد عند التناغم الفائق (strain < 10%)
      if (strain < 0.10) {
        const harmonyFactor = (1.0 - strain / 0.10);
        for (let j = 0; j < 20; j++) {
          const spDist = rBase * (0.85 + ((j * 29) % 100) / 72);
          const spAngle = (j * 2.39996) + time * 0.08 * (j % 2 === 0 ? 1 : -1);
          const spX = Math.cos(spAngle) * spDist;
          const spY = Math.sin(spAngle) * spDist;

          const twinkle = Math.sin(time * 2.8 + j * 1.73);
          if (twinkle > 0) {
            const spAlpha = twinkle * harmonyFactor * 0.85;
            const spSize = (2.2 + (j % 3) * 1.1) * (0.6 + 0.4 * twinkle);
            const spColor = (j % 3 === 0) ? '#ffffff' : ((j % 3 === 1) ? '#ffe49e' : '#c9b58a');

            ctx.save();
            ctx.fillStyle = spColor;
            ctx.globalAlpha = spAlpha;
            ctx.beginPath();
            ctx.moveTo(spX, spY - spSize);
            ctx.lineTo(spX + spSize * 0.28, spY - spSize * 0.28);
            ctx.lineTo(spX + spSize, spY);
            ctx.lineTo(spX + spSize * 0.28, spY + spSize * 0.28);
            ctx.lineTo(spX, spY + spSize);
            ctx.lineTo(spX - spSize * 0.28, spY + spSize * 0.28);
            ctx.lineTo(spX - spSize, spY);
            ctx.lineTo(spX - spSize * 0.28, spY - spSize * 0.28);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }

    if (mouse && mouse.active) {
      drawMouseInteraction(ctx, { x: (mouse.x - width / 2) / scale, y: (mouse.y - height / 2) / scale, active: true });
    }

    ctx.restore();
    return f;
  }

  // نمط الدورة الكونية الأبدية
  const outsideEnergy = time >= EXPLODE_TIME ? 24 : 0;
  drawCosmicBackdrop(ctx, time, outsideEnergy);

  // 1. رسم جزيئات الدورة الكونية اللانهائية المستمرة (88 جزيء يتدفق بانسيابية تامة)
  for (let i = 0; i < 88; i++) {
    const p = cyclicCosmicParticle(time, i);
    if (!p) continue;
    if (!reduced) {
      radiantTrail(ctx, u => cyclicCosmicParticle(Math.max(0, u), i), time, p.type, 0.2, 1.1, 0.35);
    }
    glowDisk(ctx, p.x, p.y, p.r, p.type, p.alpha, p.glow);
  }

  // 2. رسم مرحلة التكوّن الأولي (0 - 9s)
  if (time < FORMATION) {
    drawBirth(ctx, time, reduced);
  } else {
    // 3. رسم مرحلة الجسد المركزي والدوران ثم الانفصال والتفكك
    const f = modelOrFrame.sample(time - FORMATION);
    drawBody(ctx, f, time, modelOrFrame, reduced, width, height);
  }

  // 4. رسم البذرتين الجديدتين أثناء ظهورهما بسلاسة في مرحلة الاستعداد للتجمع (19.5s - 24.0s)
  if (time >= 19.5) {
    for (let side = 0; side < 2; side++) {
      const seed = seedPosition(time, side);
      glowDisk(ctx, seed.x, seed.y, seed.r, side ? 'yin' : 'yang', seed.alpha, 2.0);
    }
  }

  if (mouse && mouse.active) {
    drawMouseInteraction(ctx, { x: (mouse.x - width / 2) / scale, y: (mouse.y - height / 2) / scale, active: true });
  }

  // شارة السرد اللحظي
  if (time >= 19.5) {
    ctx.save();
    ctx.font = '11px "Segoe UI", Tahoma, sans-serif';
    ctx.fillStyle = 'rgba(184, 151, 90, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('✦ تستدير الطاقة في أرجاء الوجود وتتجاذب لتبدأ التجمع من جديد ✦', 0, 142);
    ctx.restore();
  }

  ctx.restore();

  // إرجاع حالة الطاقة
  if (time < FORMATION) {
    return { yin: 12 * (time / FORMATION), yang: 12 * (time / FORMATION), envYin: 12 - 12 * (time / FORMATION), envYang: 12 - 12 * (time / FORMATION), strain: 0, speed: null, broken: null };
  } else {
    return modelOrFrame.sample(time - FORMATION);
  }
}
