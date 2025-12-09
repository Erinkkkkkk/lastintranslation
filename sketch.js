// Manually line–broken for rag control.
let paragraph = [
    "I am trying to express something that shifts",
    "as soon as I approach it.",
    "A thought forms, but when I bring it into language,",
    "it brushes the surface only lightly,",
    "like a tangent that touches a circle",
    "for a moment before veering away.",
    "What I say is never the whole of what I mean.",
    "Every attempt to translate myself",
    "becomes a transformation,",
    "and something essential slips through the gap.",
    "The words arrive altered,",
    "carrying only a trace of the original thought."
  ];
  
  // “Ideal” text size before scaling
  let baseTypeSize = 60;
  let baseLineHeight = 80;
  
  // Values that may be scaled to fit canvas
  let typeSize = baseTypeSize;
  let lineHeight = baseLineHeight;
  
  // Layout
  let baseY;
  
  // Erosion state
  let chaosLevel = 0;  // current (0 → 1)
  let maxChaos = 0;    // max ever reached (for irreversible deletion)
  
  // Per–character erosion thresholds: paragraph[line][char] → 0..1
  let erosionThresholds = [];
  
  // Baseline visual feel (no input yet)
  const BASE = {
    distortion: 0.7,
    glitchProb: 0.04,
    ghostProb: 0.40,
    minAlpha: 185,
    maxAlpha: 235
  };
  
  // Max erosion visual feel (after a lot of typing)
  const MAX = {
    distortion: 1.2,
    glitchProb: 0.16,
    ghostProb: 0.9,
    minAlpha: 130,
    maxAlpha: 210
  };
  
  function setup() {
    const container = document.getElementById("canvas-container");
    const w = container.clientWidth;
    const h = container.clientHeight;
  
    const cnv = createCanvas(w, h);
    cnv.parent(container);
  
    textFont("Georgia");
  
    computeLayout();
    initErosionThresholds();
  
    noLoop();
    redraw();
  
    // Hook into the translation textarea
    const textarea = document.getElementById("translation-box");
    if (textarea) {
      textarea.addEventListener("input", () => {
        const len = textarea.value.length;
        const maxLen = 400; // ⬅️ smaller → reaches 1.0 faster
  
        if (len <= 0) {
          chaosLevel = 0;
        } else {
          chaosLevel = constrain(len / maxLen, 0, 1);
        }
  
        // Irreversible erosion
        maxChaos = max(maxChaos, chaosLevel);
  
        redraw();
      });
    }
  }
  
  function windowResized() {
    const container = document.getElementById("canvas-container");
    const w = container.clientWidth;
    const h = container.clientHeight;
  
    resizeCanvas(w, h);
    computeLayout();
    redraw();
  }
  
  function computeLayout() {
    typeSize = baseTypeSize;
    lineHeight = baseLineHeight;
    textSize(typeSize);
  
    let totalHeight = paragraph.length * lineHeight;
    let maxAllowedHeight = height * 0.8;
  
    if (totalHeight > maxAllowedHeight) {
      let scale = maxAllowedHeight / totalHeight;
      typeSize = baseTypeSize * scale;
      lineHeight = baseLineHeight * scale;
      textSize(typeSize);
      totalHeight = paragraph.length * lineHeight;
    }
  
    baseY = (height - totalHeight) / 2 + lineHeight;
  }
  
  // Give each non-space character a random erosion threshold (0..~0.8)
  // so they disappear *earlier* as maxChaos grows.
  function initErosionThresholds() {
    erosionThresholds = [];
    for (let i = 0; i < paragraph.length; i++) {
      let line = paragraph[i];
      let row = [];
      for (let j = 0; j < line.length; j++) {
        let c = line[j];
        if (c === " ") {
          row.push(1.1); // spaces don't delete, just keep spacing
        } else {
          // ⬅️ cap at 0.8 so by ~80% chaos, basically everything is gone
          row.push(random(0, 0.8));
        }
      }
      erosionThresholds.push(row);
    }
  }
  
  function draw() {
    background(255);
    fill(0);
  
    // Use max chaos (irreversible) and ease it for the visual feel
    let effectiveChaos = maxChaos;
    let easedChaos = pow(effectiveChaos, 1.4);
  
    let distortion   = lerp(BASE.distortion,   MAX.distortion,   easedChaos);
    let glitchProb   = lerp(BASE.glitchProb,   MAX.glitchProb,   easedChaos);
    let ghostProb    = lerp(BASE.ghostProb,    MAX.ghostProb,    easedChaos);
    let minAlpha     = lerp(BASE.minAlpha,     MAX.minAlpha,     easedChaos);
    let maxAlpha     = lerp(BASE.maxAlpha,     MAX.maxAlpha,     easedChaos);
  
    // Tracking
    let letterSpacing = 1.12; // ⬅️ a bit wider
    let wordSpacing   = 2.0;  // ⬅️ noticeably bigger spaces between words
  
    for (let i = 0; i < paragraph.length; i++) {
      let line = paragraph[i];
  
      // measure line width using separate letter + word spacing
      let lineW = 0;
      for (let k = 0; k < line.length; k++) {
        let ch = line[k];
        if (ch === " ") {
          lineW += textWidth(" ") * wordSpacing;
        } else {
          lineW += textWidth(ch) * letterSpacing;
        }
      }
  
      let x = width / 2 - lineW / 2;
      let y = baseY + i * lineHeight;
  
      for (let j = 0; j < line.length; j++) {
        let c = line[j];
        let w = textWidth(c);
  
        // How much to step for this character
        let step = (c === " ")
          ? textWidth(" ") * wordSpacing
          : w * letterSpacing;
  
        // PERMANENT EROSION: delete if chaos passed its threshold
        let threshold = erosionThresholds[i][j];
        if (effectiveChaos >= threshold) {
          x += step;
          continue;
        }
  
        // Jitter
        let jitterX = random(-1.2, 1.2) * distortion;
        let jitterY = random(-1.2, 1.2) * distortion;
  
        // Occasional glitch subs
        let drawChar = c;
        if (c !== " " && random() < glitchProb) {
          let glitchSet = ["/", "|", "·", "—"];
          drawChar = random(glitchSet);
        }
  
        // Main glyph
        push();
        translate(x + jitterX, y + jitterY);
        fill(0, random(minAlpha, maxAlpha));
        text(drawChar, 0, 0);
        pop();
  
        // Ghost layer
        if (random() < ghostProb) {
          push();
          translate(
            x + jitterX + random(-2, 2),
            y + jitterY + random(-2, 2)
          );
          fill(0, random(60, 150));
          text(drawChar, 0, 0);
          pop();
        }
  
        x += step;
      }
    }
  }
  