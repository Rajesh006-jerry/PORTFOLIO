/* ==========================================================================
   GLOW CURSOR — vanilla JS port (no React / build step needed)
   WebGL2 fluid-sim light trail that follows the pointer across the whole page.
   - Follows the site theme (html[data-theme="dark" | "light"])
   - Desktop / fine-pointer only; skipped on touch devices
   - Respects prefers-reduced-motion
   - Fails silently if WebGL2 / float render targets are unavailable
   Tweak the look from the console or your own code:
     GlowCursor.update({ intensity: 1.6, linger: 2 })
   ========================================================================== */
(function () {
  "use strict";
  if (window.GlowCursor) return;

  /* ---------------------------------------------------------------- config */
  var SETTINGS = {
    intensity: 1.3,
    trailWidth: 3,
    linger: 1.4,
    glow: 1.2,
    hotspot: 0.8,
    followSpeed: 0.6,
    grain: 0,
    clickBurst: true,
    quality: "high", // "low" | "medium" | "high"
    maxDevicePixelRatio: 2,
    enabled: true,
    zIndex: 9998,
  };

  // Colours per site theme (same gold in both themes)
  var THEMES = {
    dark: {
      color: "#e6b93c",
      secondaryColor: "",
      theme: "dark",
      blend: "screen",
    },
    light: {
      color: "#e6b93c",
      secondaryColor: "",
      theme: "light",
      blend: "normal",
    },
  };

  /* --------------------------------------------------------------- shaders */
  var VERTEX = `#version 300 es
in vec2 aPosition;
uniform vec2 uTexel;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0);
  vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y);
  vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

  var HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 outColor;
`;

  var SPLAT = `${HEADER}
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec2 uA;
uniform vec2 uB;
uniform float uRadius;
uniform float uWide;
uniform vec3 uValue;
uniform float uMode;
uniform float uStrength;
float erf(float x) {
  float x2 = x * x;
  float a = 0.147;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + a * x2) / (1.0 + a * x2)));
}
float sweep(float along, float length, float across, float radius) {
  return exp(-across * across / (radius * radius)) * 0.5 * (erf(along / radius) - erf((along - length) / radius));
}
void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uA.x * uAspect, uA.y);
  vec2 ab = vec2(uB.x * uAspect, uB.y) - a;
  float len = length(ab);
  vec2 dir = len > 1e-6 ? ab / len : vec2(1.0, 0.0);
  vec2 ap = p - a;
  vec3 base = texture(uTarget, vUv).xyz;
  if (uMode > 1.5) {
    float along = dot(ap, dir);
    float across = dot(ap, vec2(-dir.y, dir.x));
    if (uMode > 2.5) {
      outColor = vec4(mix(base, uValue, sweep(along, len, across, uRadius) * uStrength), 1.0);
      return;
    }
    vec3 add = vec3(uValue.xy * sweep(along, len, across, uRadius), uValue.z * sweep(along, len, across, uWide));
    outColor = vec4(base + add, 1.0);
    return;
  }
  float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
  vec2 d = ap - ab * h;
  float r2 = dot(d, d);
  float falloff = exp(-r2 / (uRadius * uRadius));
  float wide = exp(-r2 / (uWide * uWide));
  vec3 result = uMode > 0.5 ? mix(base, uValue, falloff * uStrength) : base + vec3(uValue.xy * falloff, uValue.z * wide);
  outColor = vec4(result, 1.0);
}`;

  var ADVECT = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uVelocityTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  outColor = texture(uSource, coord) * uDecay;
}`;

  var MACCORMACK = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform sampler2D uForward;
uniform sampler2D uBack;
uniform vec2 uVelocityTexel;
uniform vec2 uSourceTexel;
uniform float uDt;
uniform vec4 uDecay;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;
  vec4 forward = texture(uForward, vUv);
  vec4 corrected = forward + 0.5 * (texture(uSource, vUv) - texture(uBack, vUv));
  vec2 base = (floor(coord / uSourceTexel - 0.5) + 0.5) * uSourceTexel;
  vec4 a = texture(uSource, base);
  vec4 b = texture(uSource, base + vec2(uSourceTexel.x, 0.0));
  vec4 c = texture(uSource, base + vec2(0.0, uSourceTexel.y));
  vec4 d = texture(uSource, base + uSourceTexel);
  vec4 low = min(min(a, b), min(c, d));
  vec4 high = max(max(a, b), max(c, d));
  outColor = clamp(corrected, low, high) * uDecay;
}`;

  var DIVERGENCE = `${HEADER}
uniform sampler2D uVelocity;
void main() {
  float left = texture(uVelocity, vL).x;
  float right = texture(uVelocity, vR).x;
  float top = texture(uVelocity, vT).y;
  float bottom = texture(uVelocity, vB).y;
  vec2 center = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) left = -center.x;
  if (vR.x > 1.0) right = -center.x;
  if (vT.y > 1.0) top = -center.y;
  if (vB.y < 0.0) bottom = -center.y;
  outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}`;

  var SCALE = `${HEADER}
uniform sampler2D uSource;
uniform float uValue;
void main() {
  outColor = texture(uSource, vUv) * uValue;
}`;

  var PRESSURE = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

  var GRADIENT = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float left = texture(uPressure, vL).x;
  float right = texture(uPressure, vR).x;
  float top = texture(uPressure, vT).x;
  float bottom = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  outColor = vec4(velocity, 0.0, 1.0);
}`;

  var SHADE = `
uniform vec3 uColor;
uniform vec3 uSecondary;
uniform float uIntensity;
uniform float uHotspot;
vec3 shade(vec3 dye) {
  float energy = max(dye.x, 0.0);
  float heat = clamp(dye.y, 0.0, energy);
  float gas = max(dye.z, 0.0);
  float fresh = heat / max(energy, 0.0001);
  vec3 tint = mix(uSecondary, uColor, fresh);
  return (tint * energy + uSecondary * gas + vec3(heat * heat * 0.3 * uHotspot)) * uIntensity;
}
`;

  var PREFILTER = `${HEADER}${SHADE}
uniform sampler2D uDye;
uniform vec2 uDyeTexel;
void main() {
  vec2 o = uDyeTexel * 0.5;
  vec3 light = shade(texture(uDye, vUv + vec2(-o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, -o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(-o.x, o.y)).xyz);
  light += shade(texture(uDye, vUv + vec2(o.x, o.y)).xyz);
  outColor = vec4(light * 0.25, 1.0);
}`;

  var DOWN = `${HEADER}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv).rgb * 4.0;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb;
  outColor = vec4(color / 8.0, 1.0);
}`;

  var UP = `${HEADER}
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
void main() {
  vec2 o = uSourceTexel;
  vec3 color = texture(uSource, vUv + vec2(-o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(o.x * 2.0, 0.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, -o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(0.0, o.y * 2.0)).rgb;
  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;
  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;
  outColor = vec4(color / 12.0, 1.0);
}`;

  var DISPLAY = `${HEADER}${SHADE}
uniform sampler2D uDye;
uniform sampler2D uBloom;
uniform float uGlow;
uniform float uGrain;
uniform float uTime;
uniform float uLight;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec3 dye = texture(uDye, vUv).xyz;
  vec3 light = shade(dye);
  vec3 bloom = texture(uBloom, vUv).rgb * uGlow;
  float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  float grain = 1.0 + (hash(gl_FragCoord.xy + fract(uTime * 13.7) * 97.0) - 0.5) * uGrain * 2.0;
  if (uLight > 0.5) {
    float energy = max(dye.x, 0.0);
    float heat = clamp(dye.y, 0.0, energy);
    float gas = max(dye.z, 0.0);
    float fresh = heat / max(energy, 0.0001);
    vec3 tint = mix(uSecondary, uColor, fresh);
    float halo = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
    float density = 1.0 - exp(-((energy * 1.1 + gas * 0.8) * uIntensity + halo * 0.25));
    vec3 ink = tint;
    ink = mix(ink, vec3(1.0), clamp(heat * heat * 0.05 * uHotspot, 0.0, 0.45));
    density = clamp(density * grain, 0.0, 1.0) * edge;
    outColor = vec4(ink * density, density);
  } else {
    vec3 color = 1.0 - exp(-(light + bloom) * grain);
    color *= edge;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;

  var QUALITY = {
    low: { sim: 96, dye: 384 },
    medium: { sim: 128, dye: 576 },
    high: { sim: 160, dye: 768 },
  };
  var PRESSURE_STEPS = 20;
  var FLOW = 0.75;
  var BLOOM_LEVELS = 5;

  /* --------------------------------------------------------------- helpers */
  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  function toHsv(c) {
    var r = c[0],
      g = c[1],
      b = c[2];
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b),
      delta = max - min;
    var hue = 0;
    if (delta > 0) {
      if (max === r) hue = ((g - b) / delta) % 6;
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
    }
    return [(hue * 60 + 360) % 360, max > 0 ? delta / max : 0, max];
  }

  function fromHsv(hue, saturation, value) {
    var h = (((hue % 360) + 360) % 360) / 60;
    var c = value * saturation;
    var x = c * (1 - Math.abs((h % 2) - 1));
    var m = value - c;
    var rgb =
      h < 1
        ? [c, x, 0]
        : h < 2
          ? [x, c, 0]
          : h < 3
            ? [0, c, x]
            : h < 4
              ? [0, x, c]
              : h < 5
                ? [x, 0, c]
                : [c, 0, x];
    return [rgb[0] + m, rgb[1] + m, rgb[2] + m];
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    // Desktop / mouse only — skip touch devices to save battery
    var fine =
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    var container = document.createElement("div");
    container.className = "glow-cursor";
    container.setAttribute("aria-hidden", "true");
    container.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:" +
      SETTINGS.zIndex +
      ";";
    var canvas = document.createElement("canvas");
    canvas.className = "glow-cursor__canvas";
    canvas.style.cssText =
      "position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;user-select:none;";
    container.appendChild(canvas);

    var gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) return;

    var vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
    if (!vertexShader) return;

    function build(source) {
      var fragment = compile(gl, gl.FRAGMENT_SHADER, source);
      var program = gl.createProgram();
      if (!fragment || !program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragment);
      gl.bindAttribLocation(program, 0, "aPosition");
      gl.linkProgram(program);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
      }
      var uniforms = {};
      var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < count; i++) {
        var info = gl.getActiveUniform(program, i);
        if (info)
          uniforms[info.name] = gl.getUniformLocation(program, info.name);
      }
      return { program: program, uniforms: uniforms };
    }

    var passes = {
      splat: build(SPLAT),
      advect: build(ADVECT),
      maccormack: build(MACCORMACK),
      divergence: build(DIVERGENCE),
      scale: build(SCALE),
      pressure: build(PRESSURE),
      gradient: build(GRADIENT),
      prefilter: build(PREFILTER),
      down: build(DOWN),
      up: build(UP),
      display: build(DISPLAY),
    };
    for (var key in passes) if (!passes[key]) return;

    document.body.appendChild(container);

    var vao = gl.createVertexArray();
    var buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    var probeContext = probe.getContext("2d", { willReadFrequently: true });
    var reduce = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    /* ---- live settings (site settings + current theme) ---- */
    var S = {};
    function syncSettings() {
      var themeName =
        document.documentElement.getAttribute("data-theme") === "light"
          ? "light"
          : "dark";
      var t = THEMES[themeName];
      S = {
        color: t.color,
        secondaryColor: t.secondaryColor,
        theme: t.theme,
        intensity: Math.max(0, SETTINGS.intensity),
        trailWidth: clamp(SETTINGS.trailWidth, 0.5, 40),
        linger: clamp(SETTINGS.linger, 0.1, 10),
        glow: Math.max(0, SETTINGS.glow),
        hotspot: Math.max(0, SETTINGS.hotspot),
        followSpeed: clamp(SETTINGS.followSpeed, 0, 1),
        grain: Math.max(0, SETTINGS.grain),
        clickBurst: SETTINGS.clickBurst,
        quality: QUALITY[SETTINGS.quality] ? SETTINGS.quality : "high",
        maxDevicePixelRatio: SETTINGS.maxDevicePixelRatio,
        enabled: SETTINGS.enabled,
      };
      canvas.style.mixBlendMode = t.blend;
    }
    syncSettings();

    var state = {
      width: 1,
      height: 1,
      ratio: 1,
      colorKey: "",
      color: [0.37, 0.55, 1],
      secondary: [0.25, 0.3, 1],
      pointer: { x: 0, y: 0, inside: false },
      emitter: { x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, travelled: 0 },
      ready: false,
      bursts: [],
      active: -Infinity,
      time: 0,
      allocated: "",
      targets: null,
    };
    var raf = 0;
    var last = 0;
    var alive = true;
    var visible = true;

    function toRgb(value, fallback) {
      if (!probeContext || !value) return fallback;
      var css = /^[0-9a-f]{3,8}$/i.test(value) ? "#" + value : value;
      probeContext.clearRect(0, 0, 1, 1);
      probeContext.fillStyle = "#000000";
      probeContext.fillStyle = css;
      probeContext.fillRect(0, 0, 1, 1);
      var d = probeContext.getImageData(0, 0, 1, 1).data;
      return [d[0] / 255, d[1] / 255, d[2] / 255];
    }

    function resolveColors() {
      var k = S.color + "|" + S.secondaryColor;
      if (k === state.colorKey) return;
      state.colorKey = k;
      state.color = toRgb(S.color, [0.37, 0.55, 1]);
      if (S.secondaryColor) {
        state.secondary = toRgb(S.secondaryColor, state.color);
      } else {
        var hsv = toHsv(state.color);
        state.secondary = fromHsv(
          hsv[0] + 8,
          Math.min(1, hsv[1] * 1.1 + 0.05),
          hsv[2],
        );
      }
    }

    function createTarget(width, height, internalFormat, format, filter) {
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        width,
        height,
        0,
        format,
        gl.HALF_FLOAT,
        null,
      );
      var fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0,
      );
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return {
        texture: texture,
        fbo: fbo,
        width: width,
        height: height,
        texel: [1 / width, 1 / height],
      };
    }

    function createPair(width, height, internalFormat, format, filter) {
      var read = createTarget(width, height, internalFormat, format, filter);
      var write = createTarget(width, height, internalFormat, format, filter);
      return {
        get read() {
          return read;
        },
        get write() {
          return write;
        },
        swap: function () {
          var next = read;
          read = write;
          write = next;
        },
        targets: function () {
          return [read, write];
        },
      };
    }

    function destroyTarget(target) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.fbo);
    }

    function release() {
      var t = state.targets;
      if (!t) return;
      []
        .concat(
          t.velocity.targets(),
          t.dye.targets(),
          t.pressure.targets(),
          [t.divergence, t.forward, t.back],
          t.bloom,
        )
        .forEach(destroyTarget);
      state.targets = null;
    }

    function clearTargets() {
      var t = state.targets;
      if (!t) return;
      gl.clearColor(0, 0, 0, 0);
      []
        .concat(t.velocity.targets(), t.dye.targets(), t.pressure.targets())
        .forEach(function (target) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
          gl.clear(gl.COLOR_BUFFER_BIT);
        });
    }

    function allocate() {
      var key = [
        S.quality,
        state.width,
        state.height,
        canvas.width,
        canvas.height,
      ].join("|");
      if (key === state.allocated && state.targets) return;
      release();
      state.allocated = key;
      var preset = QUALITY[S.quality];
      var aspect = state.width / state.height;
      function dims(base) {
        return aspect >= 1
          ? [Math.round(base * aspect), base]
          : [base, Math.round(base / aspect)];
      }
      var sim = dims(preset.sim);
      var dye = dims(preset.dye);
      var dyeW = dye[0],
        dyeH = dye[1];
      var shrink = Math.min(1, canvas.width / dyeW, canvas.height / dyeH);
      dyeW = Math.max(2, Math.round(dyeW * shrink));
      dyeH = Math.max(2, Math.round(dyeH * shrink));
      var bloom = [];
      var bloomW = dyeW >> 1;
      var bloomH = dyeH >> 1;
      for (var i = 0; i < BLOOM_LEVELS; i++) {
        bloom.push(
          createTarget(
            Math.max(1, bloomW),
            Math.max(1, bloomH),
            gl.RGBA16F,
            gl.RGBA,
            gl.LINEAR,
          ),
        );
        bloomW >>= 1;
        bloomH >>= 1;
      }
      state.targets = {
        velocity: createPair(sim[0], sim[1], gl.RG16F, gl.RG, gl.LINEAR),
        dye: createPair(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        forward: createTarget(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        back: createTarget(dyeW, dyeH, gl.RGBA16F, gl.RGBA, gl.LINEAR),
        pressure: createPair(sim[0], sim[1], gl.R16F, gl.RED, gl.NEAREST),
        divergence: createTarget(sim[0], sim[1], gl.R16F, gl.RED, gl.NEAREST),
        bloom: bloom,
      };
    }

    function resize() {
      var width = Math.max(1, container.clientWidth);
      var height = Math.max(1, container.clientHeight);
      var ratio = Math.min(
        window.devicePixelRatio || 1,
        Math.max(0.5, S.maxDevicePixelRatio || 2),
      );
      var pw = Math.max(1, Math.round(width * ratio));
      var ph = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      state.width = width;
      state.height = height;
      state.ratio = ratio;
      allocate();
    }

    function draw(target) {
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        gl.viewport(0, 0, target.width, target.height);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function use(pass, texel) {
      gl.useProgram(pass.program);
      if (pass.uniforms.uTexel)
        gl.uniform2f(pass.uniforms.uTexel, texel[0], texel[1]);
      return pass.uniforms;
    }

    function bind(unit, target) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      return unit;
    }

    function splat(pair, ax, ay, bx, by, radius, value, mode, strength, wide) {
      if (wide === undefined) wide = radius;
      var u = use(passes.splat, pair.read.texel);
      gl.uniform1i(u.uTarget, bind(0, pair.read));
      gl.uniform1f(u.uAspect, state.width / state.height);
      gl.uniform2f(u.uA, ax / state.width, 1 - ay / state.height);
      gl.uniform2f(u.uB, bx / state.width, 1 - by / state.height);
      gl.uniform1f(u.uRadius, radius / state.height);
      gl.uniform1f(u.uWide, wide / state.height);
      gl.uniform3f(u.uValue, value[0], value[1], value[2]);
      gl.uniform1f(u.uMode, mode);
      gl.uniform1f(u.uStrength, strength);
      draw(pair.write);
      pair.swap();
    }

    function toGrid(vx, vy) {
      var velocity = state.targets.velocity;
      return [
        (vx * velocity.read.width) / state.width,
        (-vy * velocity.read.height) / state.height,
      ];
    }

    function lightRadius() {
      return Math.max(
        S.trailWidth * 0.5,
        (state.height / state.targets.dye.read.height) * 0.9,
      );
    }

    function emit(dt, now) {
      var emitter = state.emitter,
        pointer = state.pointer;
      var velocity = state.targets.velocity,
        dye = state.targets.dye;
      emitter.px = emitter.x;
      emitter.py = emitter.y;
      if (reduce || S.followSpeed >= 1) {
        emitter.x = pointer.x;
        emitter.y = pointer.y;
      } else {
        var omega = 10 + S.followSpeed * 50;
        var steps = Math.max(1, Math.ceil(dt / 0.004));
        var h = dt / steps;
        for (var k = 0; k < steps; k++) {
          emitter.vx +=
            (omega * omega * (pointer.x - emitter.x) - 2 * omega * emitter.vx) *
            h;
          emitter.vy +=
            (omega * omega * (pointer.y - emitter.y) - 2 * omega * emitter.vy) *
            h;
          emitter.x += emitter.vx * h;
          emitter.y += emitter.vy * h;
        }
      }
      var dx = emitter.x - emitter.px;
      var dy = emitter.y - emitter.py;
      var length = Math.hypot(dx, dy);
      if (length < 0.05 || !S.enabled) return;
      var radius = lightRadius();
      if (!reduce) {
        var target = toGrid(dx / Math.max(dt, 1e-3), dy / Math.max(dt, 1e-3));
        splat(
          velocity,
          emitter.px,
          emitter.py,
          emitter.x,
          emitter.y,
          radius * 4 + 18,
          [target[0], target[1], 0],
          3,
          FLOW * 0.6,
        );
      }
      splat(
        dye,
        emitter.px,
        emitter.py,
        emitter.x,
        emitter.y,
        radius,
        [5.6, 5.6, 0.7],
        2,
        1,
        radius * 5 + 6,
      );
      state.active = now;
    }

    function burst(x, y, now) {
      var velocity = state.targets.velocity,
        dye = state.targets.dye;
      var radius = lightRadius();
      var jets = 6;
      var base = Math.random() * Math.PI * 2;
      for (var k = 0; k < jets; k++) {
        var angle =
          base + (k / jets) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        var cx = Math.cos(angle);
        var cy = Math.sin(angle);
        var reach = 20 + Math.random() * 14;
        var ax = x + cx * 3;
        var ay = y + cy * 3;
        var bx = x + cx * reach;
        var by = y + cy * reach;
        if (!reduce) {
          var target = toGrid(
            Math.cos(angle + 0.6) * 760,
            Math.sin(angle + 0.6) * 760,
          );
          splat(
            velocity,
            ax,
            ay,
            bx,
            by,
            18,
            [target[0], target[1], 0],
            1,
            0.9,
          );
        }
        splat(
          dye,
          ax,
          ay,
          bx,
          by,
          radius * 1.1,
          [2.4, 2.4, 0.3],
          0,
          1,
          radius * 5 + 6,
        );
      }
      splat(
        dye,
        x,
        y,
        x + 0.01,
        y,
        radius * 2.2,
        [1.8, 1.8, 0.4],
        0,
        1,
        radius * 7 + 10,
      );
      state.active = now;
    }

    function step(dt) {
      var velocity = state.targets.velocity,
        dye = state.targets.dye;
      var pressure = state.targets.pressure,
        divergence = state.targets.divergence;
      var u;
      if (!reduce) {
        u = use(passes.divergence, velocity.read.texel);
        gl.uniform1i(u.uVelocity, bind(0, velocity.read));
        draw(divergence);

        u = use(passes.scale, pressure.read.texel);
        gl.uniform1i(u.uSource, bind(0, pressure.read));
        gl.uniform1f(u.uValue, 0.8);
        draw(pressure.write);
        pressure.swap();

        u = use(passes.pressure, pressure.read.texel);
        gl.uniform1i(u.uDivergence, bind(1, divergence));
        for (var i = 0; i < PRESSURE_STEPS; i++) {
          gl.uniform1i(u.uPressure, bind(0, pressure.read));
          draw(pressure.write);
          pressure.swap();
        }

        u = use(passes.gradient, velocity.read.texel);
        gl.uniform1i(u.uPressure, bind(0, pressure.read));
        gl.uniform1i(u.uVelocity, bind(1, velocity.read));
        draw(velocity.write);
        velocity.swap();

        u = use(passes.advect, velocity.read.texel);
        gl.uniform2f(
          u.uVelocityTexel,
          velocity.read.texel[0],
          velocity.read.texel[1],
        );
        gl.uniform1i(u.uVelocity, bind(0, velocity.read));
        gl.uniform1i(u.uSource, bind(0, velocity.read));
        gl.uniform1f(u.uDt, dt);
        var calm = Math.exp(-dt * 1.2);
        gl.uniform4f(u.uDecay, calm, calm, 1, 1);
        draw(velocity.write);
        velocity.swap();
      }

      var decay = [
        Math.exp((-dt * 4.6) / (S.linger * 0.8)),
        Math.exp((-dt * 4.6) / (S.linger * 0.2)),
        Math.exp((-dt * 4.6) / (S.linger * 1.2)),
        1,
      ];
      var forward = state.targets.forward,
        back = state.targets.back;
      if (reduce) {
        u = use(passes.advect, dye.read.texel);
        gl.uniform2f(
          u.uVelocityTexel,
          velocity.read.texel[0],
          velocity.read.texel[1],
        );
        gl.uniform1i(u.uVelocity, bind(0, velocity.read));
        gl.uniform1i(u.uSource, bind(1, dye.read));
        gl.uniform1f(u.uDt, 0);
        gl.uniform4f(u.uDecay, decay[0], decay[1], decay[2], decay[3]);
        draw(dye.write);
        dye.swap();
        return;
      }
      u = use(passes.advect, dye.read.texel);
      gl.uniform2f(
        u.uVelocityTexel,
        velocity.read.texel[0],
        velocity.read.texel[1],
      );
      gl.uniform1i(u.uVelocity, bind(0, velocity.read));
      gl.uniform1i(u.uSource, bind(1, dye.read));
      gl.uniform1f(u.uDt, dt);
      gl.uniform4f(u.uDecay, 1, 1, 1, 1);
      draw(forward);
      gl.uniform1i(u.uSource, bind(1, forward));
      gl.uniform1f(u.uDt, -dt);
      draw(back);
      u = use(passes.maccormack, dye.read.texel);
      gl.uniform2f(
        u.uVelocityTexel,
        velocity.read.texel[0],
        velocity.read.texel[1],
      );
      gl.uniform2f(u.uSourceTexel, dye.read.texel[0], dye.read.texel[1]);
      gl.uniform1i(u.uVelocity, bind(0, velocity.read));
      gl.uniform1i(u.uSource, bind(1, dye.read));
      gl.uniform1i(u.uForward, bind(2, forward));
      gl.uniform1i(u.uBack, bind(3, back));
      gl.uniform1f(u.uDt, dt);
      gl.uniform4f(u.uDecay, decay[0], decay[1], decay[2], decay[3]);
      draw(dye.write);
      dye.swap();
    }

    function setShade(u) {
      gl.uniform3f(u.uColor, state.color[0], state.color[1], state.color[2]);
      gl.uniform3f(
        u.uSecondary,
        state.secondary[0],
        state.secondary[1],
        state.secondary[2],
      );
      gl.uniform1f(u.uIntensity, S.intensity);
      gl.uniform1f(u.uHotspot, S.hotspot);
    }

    function render() {
      var dye = state.targets.dye,
        bloom = state.targets.bloom;
      var u;
      if (S.glow > 0) {
        u = use(passes.prefilter, bloom[0].texel);
        gl.uniform1i(u.uDye, bind(0, dye.read));
        gl.uniform2f(u.uDyeTexel, dye.read.texel[0], dye.read.texel[1]);
        setShade(u);
        draw(bloom[0]);
        u = use(passes.down, bloom[0].texel);
        for (var i = 1; i < bloom.length; i++) {
          gl.uniform1i(u.uSource, bind(0, bloom[i - 1]));
          gl.uniform2f(
            u.uSourceTexel,
            bloom[i - 1].texel[0],
            bloom[i - 1].texel[1],
          );
          draw(bloom[i]);
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        u = use(passes.up, bloom[0].texel);
        for (var j = bloom.length - 1; j > 0; j--) {
          gl.uniform1i(u.uSource, bind(0, bloom[j]));
          gl.uniform2f(u.uSourceTexel, bloom[j].texel[0], bloom[j].texel[1]);
          draw(bloom[j - 1]);
        }
        gl.disable(gl.BLEND);
      }
      u = use(passes.display, [1 / canvas.width, 1 / canvas.height]);
      gl.uniform1i(u.uDye, bind(0, dye.read));
      gl.uniform1i(u.uBloom, bind(1, bloom[0]));
      setShade(u);
      gl.uniform1f(u.uGlow, S.glow > 0 ? (S.glow * 1.4) / BLOOM_LEVELS : 0);
      gl.uniform1f(u.uGrain, S.grain);
      gl.uniform1f(u.uTime, state.time);
      gl.uniform1f(u.uLight, S.theme === "light" ? 1 : 0);
      draw(null);
    }

    function blank() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function frame(now) {
      raf = 0;
      if (!alive || !visible || document.hidden) return;
      var dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      state.time += dt;
      var wanted = Math.min(
        window.devicePixelRatio || 1,
        Math.max(0.5, S.maxDevicePixelRatio || 2),
      );
      if (Math.abs(wanted - state.ratio) > 0.01) resize();
      allocate();
      resolveColors();
      gl.bindVertexArray(vao);
      gl.disable(gl.BLEND);

      if (state.ready) emit(dt, now);
      while (state.bursts.length) {
        var b = state.bursts.shift();
        burst(b[0], b[1], now);
      }
      step(dt);
      render();

      var quiet = now - state.active > S.linger * 1200 + 900;
      var resting = Math.hypot(state.emitter.vx, state.emitter.vy) < 1;
      if (quiet && resting) {
        clearTargets();
        blank();
        last = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function wake() {
      if (!raf && alive && visible && !document.hidden)
        raf = requestAnimationFrame(frame);
    }

    /* ---- events ---- */
    function onPointerMove(event) {
      var rect = container.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (!inside) {
        if (state.pointer.inside) {
          state.pointer.inside = false;
          state.ready = false;
          wake();
        }
        return;
      }
      if (!state.ready) {
        state.emitter.x = x;
        state.emitter.y = y;
        state.emitter.px = x;
        state.emitter.py = y;
        state.emitter.vx = 0;
        state.emitter.vy = 0;
        state.ready = true;
      }
      state.pointer.x = x;
      state.pointer.y = y;
      state.pointer.inside = true;
      wake();
    }

    function onPointerDown(event) {
      if (!S.clickBurst || !S.enabled) return;
      var rect = container.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      state.bursts.push([x, y]);
      wake();
    }

    function onPointerLeave() {
      state.pointer.inside = false;
      state.ready = false;
      wake();
    }

    function onVisibility() {
      last = 0;
      wake();
    }

    var resizeObserver = new ResizeObserver(function () {
      resize();
      wake();
    });
    resizeObserver.observe(container);

    var intersection = new IntersectionObserver(function (entries) {
      visible = entries.some(function (e) {
        return e.isIntersecting;
      });
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(container);

    // Follow the site's dark/light toggle
    var themeObserver = new MutationObserver(function () {
      syncSettings();
      wake();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    blank();

    /* ---- public API ---- */
    window.GlowCursor = {
      update: function (opts) {
        for (var k in opts) if (k in SETTINGS) SETTINGS[k] = opts[k];
        syncSettings();
        if (opts && opts.zIndex !== undefined)
          container.style.zIndex = SETTINGS.zIndex;
        resize();
        wake();
      },
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersection.disconnect();
        themeObserver.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerdown", onPointerDown);
        document.documentElement.removeEventListener(
          "pointerleave",
          onPointerLeave,
        );
        document.removeEventListener("visibilitychange", onVisibility);
        release();
        for (var k in passes) gl.deleteProgram(passes[k].program);
        gl.deleteShader(vertexShader);
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        container.remove();
        delete window.GlowCursor;
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
