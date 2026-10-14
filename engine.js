// engine.js - نموذج الفيزياء وحفظ الطاقة والدورة الكونية المتجددة
export const FORMATION = 9.0;
export const EXPLODE_TIME = 13.5;
export const DURATION = 24.0; // زمن الدورة الكونية الكاملة من الولادة إلى الانفجار ثم التجمع
export const DT = 1 / 120;
// الانقلاب: الغلوّ المستمر يتحول ببطء إلى نقيضه بدل أن ينفجر
export const REVERSAL_RATIO = 0.55;     // نسبة |ين - يانغ| / المجموع التي يبدأ عندها التراكم
export const REVERSAL_HOLD_SECONDS = 8; // مدة بقاء الاختلال قبل أن يبدأ الانقلاب
export const REVERSAL_SECONDS = 6;      // زمن تبادل الين واليانغ لمكانيهما

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const smooth = v => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
export const soften = v => {
  const p = clamp(v);
  return p * p * p * (p * (p * 6 - 15) + 10);
};

export function createModel(kind = 'imbalance') {
  let yin = 12, yang = 12, adapted = 24, strain = 0, angle = 0;
  const broken = EXPLODE_TIME; // لحظة الانفجار الكوني المحتوم
  let envYin = 0, envYang = 0;
  const frames = [];
  const emissions = [];

  const totalSteps = Math.floor(15.0 / DT);
  for (let n = 0; n <= totalSteps; n++) {
    const t = n * DT;
    const simTime = FORMATION + t;
    let iy = 0, ia = 0;

    if (simTime < broken) {
      // مرحلة التوازن وتراكم الإجهاد حتى الانفجار
      const p = (simTime - FORMATION) / (broken - FORMATION);
      strain = clamp(p ** 1.8);

      if (kind === 'imbalance') {
        iy = 8.0 * p;
        ia = 1.0;
      } else if (kind === 'overload') {
        const pulse = Math.sin(simTime * 8) > 0.3 ? 35 : 0;
        iy = pulse;
        ia = pulse;
      } else {
        // loss
        if (simTime > 11.5) {
          const l = 45 * DT;
          yang = Math.max(2, yang - l);
          envYang += l;
        }
      }

      yin += iy * DT;
      yang += ia * DT;
    } else {
      // بعد الانفجار: تفكك الكتلتين وعودة الطاقة كاملة إلى الوجود
      strain = 1.0;
      const decay = Math.exp(-1.4 * DT);
      const lossY = yin * (1 - decay);
      const lossA = yang * (1 - decay);
      envYin += lossY;
      envYang += lossA;
      yin *= decay;
      yang *= decay;

      if (yin < 0.05) { envYin += yin; yin = 0; }
      if (yang < 0.05) { envYang += yang; yang = 0; }
    }

    const total = yin + yang;
    const speed = total > 0.1 ? Math.min(1.2, 24 / total) : 0;
    if (n) angle += DT * 7.3 * speed;

    frames.push({
      t,
      simTime,
      yin,
      yang,
      total,
      envYin,
      envYang,
      strain,
      angle,
      speed,
      broken: broken - FORMATION,
      iy,
      ia
    });
  }

  return {
    kind,
    frames,
    emissions,
    broken: broken - FORMATION,
    sample(time) {
      const at = clamp(time, 0, 15.0) / DT;
      const index = Math.floor(at);
      const a = frames[index] || frames[0];
      const b = frames[Math.min(index + 1, frames.length - 1)];
      const mix = at - index;

      const result = { ...a };
      for (const key of ['t', 'yin', 'yang', 'total', 'envYin', 'envYang', 'strain', 'angle', 'speed']) {
        result[key] = a[key] + (b[key] - a[key]) * mix;
      }
      return result;
    }
  };
}

export function formationState(time) {
  const merge = smooth((time - 6) / 3);
  const blend = smooth((time - 8) / 1);
  const gather = smooth((time - 0.5) / 5.5);
  
  let collected = 0;
  for (let k = 0; k < 44; k++) {
    if (time >= 1.5 + k * 0.097) {
      collected += 0.25;
    }
  }
  return {
    merge,
    blend,
    gather,
    collected,
    inside: 1 + collected,
    outside: Math.max(0, 11 - collected)
  };
}

// --- فيزياء المختبر التفاعلي المستقر (Interactive Sandbox Physics) ---
export function createSandboxState() {
  return {
    yin: 12.0,
    yang: 12.0,
    targetYin: 12.0,
    targetYang: 12.0,
    autoHarmonize: false,
    angle: 0,
    ruptured: false,
    ruptureAge: 0,
    justRuptured: false,
    reversing: false,
    reversal: 0,
    revFrom: null,
    reversalHold: 0
  };
}

export function updateSandboxPhysics(state, dt) {
  state.justRuptured = false;

  // المستخدم غيّر الهدف أثناء الانقلاب: يُلغى الانقلاب ويتبع الهدف الجديد
  if (state.reversing && (state.targetYin !== state.yin || state.targetYang !== state.yang)) {
    state.reversing = false;
    state.reversal = 0;
    state.revFrom = null;
    state.reversalHold = 0;
  }

  if (state.reversing) {
    // الين واليانغ يتبادلان مكانيهما بمنحنى سلس
    state.reversal = Math.min(1, state.reversal + dt / REVERSAL_SECONDS);
    const k = smooth(state.reversal);
    state.yin = state.revFrom.yin + (state.revFrom.yang - state.revFrom.yin) * k;
    state.yang = state.revFrom.yang + (state.revFrom.yin - state.revFrom.yang) * k;
    state.targetYin = state.yin;
    state.targetYang = state.yang;
    if (state.reversal >= 1) {
      state.reversing = false;
      state.reversal = 0;
      state.revFrom = null;
      state.reversalHold = 0;
    }
  } else if (state.autoHarmonize) {
    // قانون التناغم الذاتي (إذا تم تفعيل التوازن التلقائي)
    const avg = (state.yin + state.yang) / 2;
    state.yin += (avg - state.yin) * Math.min(1, dt * 2.2);
    state.yang += (avg - state.yang) * Math.min(1, dt * 2.2);
    state.targetYin = state.yin;
    state.targetYang = state.yang;
  } else {
    // حركة انسيابية ناعمة جداً نحو القيمة المستهدفة
    state.yin += (state.targetYin - state.yin) * Math.min(1, dt * 10.0);
    state.yang += (state.targetYang - state.yang) * Math.min(1, dt * 10.0);
  }

  const total = Math.max(0.1, state.yin + state.yang);
  const diff = Math.abs(state.yin - state.yang);
  const ratio = diff / total; // من 0 (تطابق تام) إلى 1 (انعدام طرف)

  // قوانين الإجهاد الكوني:
  // 1. إجهاد عدم التكافؤ (كلما تباعدت طاقتي الين واليانج)
  const imbalanceStrain = ratio ** 1.35;
  // 2. إجهاد الحمولة الزائدة (إذا تجاوز المجموع السعة الطبيعية 24 وحدة)
  const overloadStrain = total > 24.0 ? Math.min(1.0, ((total - 24.0) / 14.0) ** 1.3) : 0;
  // 3. إجهاد الفراغ والنضوب (إذا قل المجموع عن 6 وحدات)
  const starvationStrain = total < 6.0 ? Math.min(1.0, ((6.0 - total) / 5.5) ** 1.4) : 0;

  const rawStrain = Math.min(1.0, imbalanceStrain * 0.8 + overloadStrain * 0.65 + starvationStrain * 0.4);
  const strain = clamp(rawStrain, 0, 1);

  // سرعة الدوران:
  // في حالة التوازن التام (24 وحدة) تدور بسرعة قياسية ~1.0
  // الإجهاد يولد مقاومة واضطراباً يؤدي لتباطؤ الدوران واهتزازه
  const baseSpeed = total > 0.4 ? Math.min(1.4, 24.0 / total) : 0;
  const speed = baseSpeed * Math.max(0.04, 1.0 - strain * 0.55);
  state.angle += dt * 7.3 * speed;

  // الانفجار للحمولة الزائدة فقط؛ الاختلال وحده ينتهي بالانقلاب لا بالانفجار
  if (overloadStrain >= 0.8) {
    if (!state.ruptured) {
      state.reversing = false;
      state.reversal = 0;
      state.revFrom = null;
      state.reversalHold = 0;
      state.ruptured = true;
      state.ruptureAge = 0;
      state.justRuptured = true;
    } else {
      state.ruptureAge += dt;
    }
  } else {
    // إذا أعاد المستخدم خفض الإجهاد تحت 75%، يبدأ الالتئام التلقائي
    if (state.ruptured) {
      if (overloadStrain < 0.5) {
        state.ruptured = false;
        state.ruptureAge = 0;
      } else {
        state.ruptureAge += dt;
      }
    }
  }

  // الاختلال المستمر يبدأ الانقلاب بعد مدة من البقاء عند الحد
  if (!state.reversing && !state.ruptured) {
    if (ratio >= REVERSAL_RATIO) {
      state.reversalHold += dt;
      if (state.reversalHold >= REVERSAL_HOLD_SECONDS) {
        state.reversing = true;
        state.reversal = 0;
        state.revFrom = { yin: state.yin, yang: state.yang };
        state.targetYin = state.yin;
        state.targetYang = state.yang;
      }
    } else {
      state.reversalHold = Math.max(0, state.reversalHold - dt * 2);
    }
  }

  // قانون حفظ الطاقة في البيئة الكونية:
  // الطاقة الأساسية المحفوظة في فضاء الوجود
  const envYin = Math.max(0, 16.0 - state.yin * 0.5);
  const envYang = Math.max(0, 16.0 - state.yang * 0.5);

  return {
    yin: state.yin,
    yang: state.yang,
    total,
    envYin,
    envYang,
    strain,
    speed,
    angle: state.angle,
    ruptured: state.ruptured,
    ruptureAge: state.ruptureAge,
    justRuptured: state.justRuptured,
    reversal: state.reversing ? smooth(state.reversal) : 0,
    broken: state.ruptured ? state.ruptureAge : null
  };
}
