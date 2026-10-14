// app.js - المنسق الرئيسي للتجربة البصرية والتفاعلية
import { createModel, createSandboxState, updateSandboxPhysics, FORMATION, EXPLODE_TIME, DURATION } from './engine.js';
import { decorateModel } from './motion.js';
import { renderScene } from './renderer.js';
import { sound } from './audio.js';

const $ = id => document.getElementById(id);
const canvas = $('world');
const ctx = canvas.getContext('2d');

let currentMode = 'cycle'; // 'cycle' | 'sandbox'
let model = decorateModel(createModel('imbalance'));
let sandboxState = createSandboxState();

let time = 0;
let playing = true;
let rate = 1;
let last = null;
let raf = 0;
let width = 0;
let height = 0;
let lastUI = -Infinity;
let hasTriggeredMergeSound = false;
let lastExplosionTrigger = false;
let cycleCount = 1; // عداد الدورات الكونية اللانهائية

const mouse = { x: 0, y: 0, active: false };

// اقتباسات كلاسيكية تم التحقق منها في طبعات عامة (ويكي مصدر الصينية)
const QUOTES = {
  gather: { zh: '一陰一陽之謂道', src: 'يي جينغ · 繫辭上' },
  merge: { zh: '萬物負陰而抱陽', src: 'داو دي جينغ ٤٢' },
  balance: { zh: '沖氣以為和', src: 'داو دي جينغ ٤٢' },
  strain: { zh: '動極而靜', src: 'تشو دونيي · 太極圖說' },
  turn: { zh: '反者道之動', src: 'داو دي جينغ ٤٠' },
  return: { zh: '靜極復動', src: 'تشو دونيي · 太極圖說' }
};
const withQuote = (story, q) => `${story} «${q.zh}» — ${q.src}`;
const media = matchMedia('(prefers-reduced-motion: reduce)');

// تحديث الواجهة في نمط الدورة الكونية الأبدية
function updateCycleUI(f) {
  let phase, story, num;
  if (time < FORMATION) {
    if (time < 0.5) {
      phase = cycleCount > 1 ? `إعادة انبثاق البذرتين (دورة #${cycleCount})` : 'البذرتان الأوليتان';
      num = '01';
      story = cycleCount > 1 
        ? `من سكون الوجود المحفوظ، انبعثت البذرتان من جديد لتبدآ دورة تكوّن كوني جديدة (دورة #${cycleCount}).` 
        : 'نقطتان في الفراغ الكوني، وحولهما طاقة أزلية تنتظر التجمّع.';
    } else if (time < 6.0) {
      phase = 'تجمّع الطاقة المعكوسة';
      num = '01';
      story = 'البيضاء تجتذب الطاقة المظلمة؛ والنواة السوداء تجتذب الفوتونات المشعة في لولبيات كونية واردة.';
    } else {
      phase = 'التقارب والاندماج الأبدي';
      num = '02';
      story = 'تتقارب الكتلتان وتلتفّان في دوامة اندماجية، وكل نقطة تستقر في قلب النقيض.';
    }
  } else if (time < EXPLODE_TIME) {
    num = '03';
    if (time < 11.5) {
      phase = 'كمال التوازن والتناغم';
      story = 'اتزان مطلق وتناغم نقي؛ الدائرة تدور في هدوء كوني مهيب.';
    } else {
      phase = 'اختبار حدود التحمّل وتصاعد الإجهاد';
      if (model.kind === 'imbalance') {
        story = 'طاقة الين تنمو بمعدل أسرع؛ يتشوه المنحنى الفاصل وتتباطأ سرعة الدوران مع اقتراب الانفجار.';
      } else if (model.kind === 'overload') {
        story = 'دفعات طاقة فائقة أسرع من قدرة النظام على الاستيعاب؛ التوتر يقترب من الذروة.';
      } else {
        story = 'طاقة اليانج تغادر فجأة نحو الحافة؛ فيضطرب الاتزان ويتجه نحو التمزق.';
      }
    }
  } else {
    num = '04';
    const breakAge = time - EXPLODE_TIME;
    if (breakAge < 2.0) {
      phase = 'الانفجار الكوني الهائل وانفصال الكتلتين';
      story = 'دوي انفجار كوني هائل! تتمزق الدائرة وتنفصل كتلتا الين واليانج وتتباعدان بقوة دفع عاتية.';
    } else if (time < 18.5) {
      phase = 'انتشار الطاقة وتفككها في أرجاء الوجود';
      story = 'تتلاشى الكتلتان وتتفتت حوافهما متحولة إلى أوتار ضوء ومادة مظلمة عائدة إلى فضاء الوجود الأبدي.';
    } else {
      phase = 'الاستدارة والتجاذب وبدء التجمّع الأبدي';
      story = 'تتباطأ جزيئات الطاقة عند أقصى المدى، وتستدير بنعومة لتتجاذب من جديد نحو مدارات البذور المتجددة.';
    }
  }

  const q = time < 6.0 ? QUOTES.gather
    : time < FORMATION ? QUOTES.merge
    : time < 11.5 ? QUOTES.balance
    : time < EXPLODE_TIME ? QUOTES.strain
    : time < 15.5 ? QUOTES.turn
    : QUOTES.return;
  story = withQuote(story, q);

  $('stamp').textContent = '00:' + String(Math.floor(time)).padStart(2, '0') + ' / 00:24';
  $('time-label').textContent = time.toFixed(1) + 's';
  $('timeline').value = time;

  $('phase').textContent = phase;
  $('stage-number').textContent = num;
  if ($('story').textContent !== story) {
    $('story').textContent = story;
  }

  $('play-text').textContent = playing ? 'إيقاف مؤقت' : 'متابعة الدورة الكونية';
  $('play-icon').textContent = playing ? '⏸' : '▶';

  document.querySelectorAll('[data-jump]').forEach(b => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.phase) === Number(num)));
  });

  updateTelemetryNumbers(f);
}

// تحديث الواجهة في نمط المختبر التفاعلي المستقر (Sandbox UI)
function updateSandboxUI(f) {
  let phase, story;
  const strainPct = Math.min(100, Math.round(f.strain * 100));
  const harmonyPct = Math.max(0, 100 - strainPct);

  // تحديث مؤشر التناغم الكوني الحي
  const gauge = $('harmony-gauge');
  const harmonyLabel = $('harmony-label');
  const harmonyPctEl = $('harmony-pct');
  const harmonyFill = $('harmony-fill');
  const harmonyIcon = $('harmony-icon');

  if (gauge && harmonyLabel && harmonyPctEl && harmonyFill) {
    gauge.classList.remove('harmony-perfect', 'harmony-warning', 'harmony-danger');

    if (f.ruptured) {
      gauge.classList.add('harmony-danger');
      harmonyLabel.textContent = 'تمزق وانهيار كوني حرج (0% تناغم)';
      harmonyPctEl.textContent = '0%';
      harmonyFill.style.width = '0%';
      if (harmonyIcon) harmonyIcon.textContent = '💥';
      harmonyPctEl.style.color = 'var(--crimson)';
    } else if (harmonyPct >= 85) {
      gauge.classList.add('harmony-perfect');
      harmonyLabel.textContent = 'اتزان مقدس وتناغم كوني نقي';
      harmonyPctEl.textContent = harmonyPct + '%';
      harmonyFill.style.width = harmonyPct + '%';
      if (harmonyIcon) harmonyIcon.textContent = '☯';
      harmonyPctEl.style.color = 'var(--cyan)';
    } else if (harmonyPct >= 45) {
      gauge.classList.add('harmony-warning');
      harmonyLabel.textContent = 'تناغم جزئي واختلال في التكافؤ';
      harmonyPctEl.textContent = harmonyPct + '%';
      harmonyFill.style.width = harmonyPct + '%';
      if (harmonyIcon) harmonyIcon.textContent = '⚖️';
      harmonyPctEl.style.color = 'var(--gold)';
    } else {
      gauge.classList.add('harmony-danger');
      harmonyLabel.textContent = 'إجهاد حرج وتهديد بالتمزق الفوري';
      harmonyPctEl.textContent = harmonyPct + '%';
      harmonyFill.style.width = harmonyPct + '%';
      if (harmonyIcon) harmonyIcon.textContent = '⚡';
      harmonyPctEl.style.color = 'var(--crimson)';
    }
  }

  if (f.ruptured) {
    phase = '💥 انهيار وتمزق كوني (Critical Rupture)';
    story = `بلغ إجهاد التماسك 100%! تمزقت الدائرة الكونية وانفصلت كتلتا الين واليانج بفعل اختلال التكافؤ الشديد (${f.yin.toFixed(1)} مقابل ${f.yang.toFixed(1)}). اضغط استعادة الاتزان أو حرّك السلايدر لإعادة التئام الدائرة.`;
    $('rupture-banner').style.display = 'flex';
  } else {
    $('rupture-banner').style.display = 'none';

    if (f.strain < 0.15) {
      phase = '☯ اتزان مقدس وتناغم نقي';
      story = `طاقتا الين واليانج متكافئتان بدقة (${f.yin.toFixed(1)} : ${f.yang.toFixed(1)}). الدائرة تدور بسكينة تامة وبلا إجهاد (${strainPct}%).`;
    } else if (f.strain < 0.45) {
      const isYinHeavy = f.yin > f.yang;
      phase = isYinHeavy ? '🌑 ميل وتوسع لطاقة الين' : '🌕 ميل وتوهج لطاقة اليانج';
      story = isYinHeavy
        ? `الكتلة المظلمة تتوسع وتضغط على النصف المضيء؛ ينحني المنحنى الفاصل برفق ويبدأ الإجهاد بالارتفاع (${strainPct}%).`
        : `النصف المضيء يتوهج بكثافة عالية؛ يزيح مركز الثقل ويتشكل المنحنى تحت تأثير الزيادة (${strainPct}%).`;
    } else if (f.strain < 0.75) {
      phase = '⚠️ توتر هندسي واضطراب في الدوران';
      story = `اختلال ملحوظ في التكافؤ (${f.yin.toFixed(1)} مقابل ${f.yang.toFixed(1)})؛ إجهاد التماسك ارتفع إلى (${strainPct}%). الدوران يتباطأ وتظهر تموجات على الحواف.`;
    } else {
      if (f.total > 30) {
        phase = '⚡ إجهاد حرج وخطر انفجار وشيك!';
        story = `الحمولة بلغت حداً حرجاً (${strainPct}%)! أي زيادة طفيفة ستؤدي إلى الانفجار الفوري.`;
      } else {
        phase = '⚡ غلوّ شديد يوشك أن ينقلب';
        story = `الاختلال بلغ ذروته (${f.yin.toFixed(1)} مقابل ${f.yang.toFixed(1)}). إن بقي كذلك فسيبدأ بالتحوّل إلى نقيضه.`;
      }
    }
  }

  if (!f.ruptured && f.reversal > 0) {
    phase = '☯ انقلاب: الغلوّ يتحوّل إلى نقيضه';
    story = `الطرف الغالب يرقّ ويتحوّل ببطء إلى نقيضه (${f.yin.toFixed(1)} : ${f.yang.toFixed(1)}). لا انفجار هنا، بل عودة.`;
  }
  const sq = f.ruptured ? QUOTES.strain : (f.reversal > 0 ? QUOTES.turn : (f.strain < 0.15 ? QUOTES.balance : null));
  if (sq) story = withQuote(story, sq);

  $('phase').textContent = phase;
  $('stage-number').textContent = '🎛';
  $('stamp').textContent = `YIN ${f.yin.toFixed(1)} · YANG ${f.yang.toFixed(1)}`;
  if ($('story').textContent !== story) {
    $('story').textContent = story;
  }

  // تحديث أرقام قنوات السلايدر
  $('val-yin').textContent = f.yin.toFixed(1);
  $('val-yang').textContent = f.yang.toFixed(1);

  // مزامنة السلايدر إذا كان التناغم التلقائي مفعلاً
  if (sandboxState.autoHarmonize || f.reversal > 0) {
    $('slider-yin').value = f.yin;
    $('slider-yang').value = f.yang;
  }

  updateTelemetryNumbers(f);
}

// تحديث شريط القياسات الموحد (Telemetry HUD)
function updateTelemetryNumbers(f) {
  $('inside-yin').textContent = f.yin.toFixed(1);
  $('inside-yang').textContent = f.yang.toFixed(1);
  $('outside-yin').textContent = f.envYin.toFixed(1);
  $('outside-yang').textContent = f.envYang.toFixed(1);

  const strainPct = Math.min(100, Math.round(f.strain * 100));
  $('strain-value').textContent = strainPct + '%';
  $('strain-fill').style.width = strainPct + '%';
  $('strain-meter').setAttribute('aria-valuenow', String(strainPct));

  if (strainPct > 70) {
    $('strain-value').style.color = 'var(--crimson)';
  } else if (strainPct > 30) {
    $('strain-value').style.color = 'var(--gold)';
  } else {
    $('strain-value').style.color = 'var(--cyan)';
  }

  if (f.speed === null || f.total < 0.2) {
    $('spin-value').textContent = '— (سكون تام)';
  } else {
    const rpm = Math.round(f.speed * 60);
    $('spin-value').textContent = `${Math.round(f.speed * 100)}% (${rpm} د/د)`;
  }
}

function render(force = false) {
  if (currentMode === 'cycle') {
    const f = renderScene(ctx, time, model, {
      width,
      height,
      dpr: Math.min(window.devicePixelRatio || 1, 2.5),
      reduced: media.matches,
      mouse,
      isSandbox: false
    });

    if (playing) {
      if (time >= FORMATION && !hasTriggeredMergeSound && time < FORMATION + 1.0) {
        sound.playCelestialMerge();
        hasTriggeredMergeSound = true;
      }
      if (time >= EXPLODE_TIME && !lastExplosionTrigger && time < EXPLODE_TIME + 1.5) {
        sound.playCosmicExplosion();
        lastExplosionTrigger = true;
      }
      sound.update(time, f, playing);
    }

    if (force || Math.abs(time - lastUI) > 0.08) {
      updateCycleUI(f);
      lastUI = time;
    }
  } else {
    // نمط المختبر التفاعلي المستقر
    const f = renderScene(ctx, time, sandboxState.lastFrame || sandboxState, {
      width,
      height,
      dpr: Math.min(window.devicePixelRatio || 1, 2.5),
      reduced: media.matches,
      mouse,
      isSandbox: true
    });

    if (f.justRuptured) {
      sound.playCosmicExplosion();
    }
    sound.update(time, f, true);

    if (force || Math.abs(time - lastUI) > 0.08) {
      updateSandboxUI(f);
      lastUI = time;
    }
  }
}

function resize() {
  const b = canvas.getBoundingClientRect();
  width = b.width;
  height = b.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  render(true);
}

function stop() {
  playing = false;
  cancelAnimationFrame(raf);
  last = null;
  sound.update(time, { speed: 0, strain: 0 }, false);
  render(true);
}

function tick(now) {
  if (!playing && currentMode === 'cycle') return;
  const dt = last !== null ? Math.min((now - last) / 1000, 0.1) : 0.016;
  last = now;

  time += dt * rate;

  if (currentMode === 'cycle') {
    // دورة 24 ثانية لانهائية مستمرة
    if (time >= DURATION) {
      time = 0;
      cycleCount++;
      hasTriggeredMergeSound = false;
      lastExplosionTrigger = false;

      const badge = $('cycle-badge');
      const numEl = $('cycle-num');
      if (badge && numEl) {
        numEl.textContent = '#' + String(cycleCount).padStart(2, '0');
        badge.classList.add('pulsing');
        setTimeout(() => badge.classList.remove('pulsing'), 1800);
      }
      sound.playCosmicRebirth();
    }
  } else {
    // تحديث فيزياء المختبر التفاعلي
    const f = updateSandboxPhysics(sandboxState, dt * rate);
    sandboxState.lastFrame = f;
  }

  render(false);
  raf = requestAnimationFrame(tick);
}

function start() {
  sound.resume();
  playing = true;
  last = null;
  raf = requestAnimationFrame(tick);
  render(true);
}

function seek(value) {
  stop();
  time = Math.max(0, Math.min(DURATION, value));
  if (time < FORMATION) hasTriggeredMergeSound = false;
  if (time < EXPLODE_TIME) lastExplosionTrigger = false;
  render(true);
}

// تبديل الأنماط بين الدورة الأبدية والمختبر التفاعلي
function setMode(mode) {
  currentMode = mode;
  sound.resume();

  if (mode === 'cycle') {
    $('tab-cycle').classList.add('active');
    $('tab-sandbox').classList.remove('active');
    $('cycle-transport').style.display = 'block';
    $('sandbox-transport').style.display = 'none';
    $('scenario-section').style.display = 'block';
    $('sandbox-laws-section').style.display = 'none';
    start();
  } else {
    $('tab-sandbox').classList.add('active');
    $('tab-cycle').classList.remove('active');
    $('cycle-transport').style.display = 'none';
    $('sandbox-transport').style.display = 'flex';
    $('scenario-section').style.display = 'none';
    $('sandbox-laws-section').style.display = 'block';

    // إعادة تهيئة حالة المختبر المستقرة
    const f = updateSandboxPhysics(sandboxState, 0.016);
    sandboxState.lastFrame = f;
    playing = true;
    start();
  }
  render(true);
}

// أحداث تبديل النمط
$('tab-cycle').addEventListener('click', () => setMode('cycle'));
$('tab-sandbox').addEventListener('click', () => setMode('sandbox'));

// أحداث سلايدرات المختبر التفاعلي
$('slider-yin').addEventListener('input', e => {
  sound.resume();
  sandboxState.targetYin = Number(e.target.value);
  $('toggle-harmonize').checked = false;
  sandboxState.autoHarmonize = false;
  render(true);
});

$('slider-yang').addEventListener('input', e => {
  sound.resume();
  sandboxState.targetYang = Number(e.target.value);
  $('toggle-harmonize').checked = false;
  sandboxState.autoHarmonize = false;
  render(true);
});

// أزرار الزيادة والنقصان السريعة (+2 / -2)
$('nudge-yin-down').addEventListener('click', () => {
  sound.resume();
  const val = Math.max(0, sandboxState.targetYin - 2);
  sandboxState.targetYin = val;
  $('slider-yin').value = val;
  $('toggle-harmonize').checked = false;
  sandboxState.autoHarmonize = false;
  render(true);
});

$('nudge-yin-up').addEventListener('click', () => {
  sound.resume();
  const val = Math.min(30, sandboxState.targetYin + 2);
  sandboxState.targetYin = val;
  $('slider-yin').value = val;
  $('toggle-harmonize').checked = false;
  sandboxState.autoHarmonize = false;
  render(true);
});

$('nudge-yang-down').addEventListener('click', () => {
  sound.resume();
  const val = Math.max(0, sandboxState.targetYang - 2);
  sandboxState.targetYang = val;
  $('slider-yang').value = val;
  $('toggle-harmonize').checked = false;
  sandboxState.autoHarmonize = false;
  render(true);
});

$('nudge-yang-up').addEventListener('click', () => {
  sound.resume();
  const val = Math.min(30, sandboxState.targetYang + 2);
  sandboxState.targetYang = val;
  $('slider-yang').value = val;
  $('toggle-harmonize').checked = false;
  sandboxState.autoHarmonize = false;
  render(true);
});

// الأوضاع المسبقة الجاهزة
document.querySelectorAll('.preset-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    sound.resume();
    const y = Number(btn.dataset.yin);
    const a = Number(btn.dataset.yang);
    sandboxState.targetYin = y;
    sandboxState.targetYang = a;
    $('slider-yin').value = y;
    $('slider-yang').value = a;
    $('toggle-harmonize').checked = false;
    sandboxState.autoHarmonize = false;
    sound.playElectricZap();
    render(true);
  });
});

// استعادة الاتزان المقدس (12:12)
function restoreSacredBalance() {
  sound.resume();
  sandboxState.targetYin = 12.0;
  sandboxState.targetYang = 12.0;
  sandboxState.yin = 12.0;
  sandboxState.yang = 12.0;
  sandboxState.ruptured = false;
  sandboxState.ruptureAge = 0;
  $('slider-yin').value = 12.0;
  $('slider-yang').value = 12.0;
  $('toggle-harmonize').checked = false;
  sandboxState.autoHarmonize = false;
  sound.playCelestialMerge();
  render(true);
}

$('btn-reset-balance').addEventListener('click', restoreSacredBalance);
$('btn-restore-rupture').addEventListener('click', restoreSacredBalance);

// التناغم الذاتي التلقائي
$('toggle-harmonize').addEventListener('change', e => {
  sound.resume();
  sandboxState.autoHarmonize = e.target.checked;
  if (e.target.checked) {
    sound.playElectricZap();
  }
});

// Mouse / Touch Gravity Well
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.active = true;
  if (!playing) render(true);
});

canvas.addEventListener('mouseleave', () => {
  mouse.active = false;
  if (!playing) render(true);
});

canvas.addEventListener('click', () => {
  sound.resume();
  sound.playElectricZap();
});

canvas.addEventListener('touchmove', e => {
  if (e.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
    mouse.active = true;
    if (!playing) render(true);
  }
}, { passive: true });

canvas.addEventListener('touchend', () => {
  mouse.active = false;
});

$('play').addEventListener('click', () => {
  sound.resume();
  playing ? stop() : start();
});

$('replay').addEventListener('click', () => {
  sound.resume();
  stop();
  time = 0;
  cycleCount = 1;
  const numEl = $('cycle-num');
  if (numEl) numEl.textContent = '#01';
  hasTriggeredMergeSound = false;
  lastExplosionTrigger = false;
  start();
});

$('timeline').addEventListener('input', e => {
  seek(Number(e.target.value));
});

$('rate').addEventListener('change', e => {
  rate = Number(e.target.value);
});

$('sound-toggle').addEventListener('click', () => {
  sound.resume();
  const isMuted = sound.toggleMute();
  const btn = $('sound-toggle');
  if (isMuted) {
    btn.classList.add('muted');
    $('sound-text').textContent = 'كتم الصوت';
  } else {
    btn.classList.remove('muted');
    $('sound-text').textContent = 'الصوت مفعل';
  }
});

document.querySelectorAll('input[name=scenario]').forEach(input => {
  input.addEventListener('change', () => {
    stop();
    model = decorateModel(createModel(input.value));
    time = 0;
    hasTriggeredMergeSound = false;
    lastExplosionTrigger = false;
    render(true);
  });
});

document.querySelectorAll('[data-jump]').forEach(button => {
  button.addEventListener('click', () => {
    sound.resume();
    const jumpVal = button.dataset.jump;
    if (jumpVal === 'shed') {
      seek(EXPLODE_TIME + 0.1);
    } else {
      seek(Number(jumpVal));
    }
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stop();
  }
});

media.addEventListener?.('change', () => render(true));
window.addEventListener('resize', resize);

new ResizeObserver(resize).observe(canvas);
resize();
start();
