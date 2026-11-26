
(function () {
  "use strict";

  /* ============================== CONFIG ============================== */

  // Extra places to mount (lazy). Navbar intentionally excluded.
  var TARGETS = [{ name: "card", selector: ".rc-name", text: "RAJESH" }];

  var FONT = {
    family: 'Georgia, "Times New Roman", serif',
    weight: 800,
    style: "italic", // "normal" for upright letters
  };

  // FIX: loader progress (0..1) at which RAJESH S changes to PORTFOLIO
  var SWAP_AT = 0.6;

  // Defaults for every instance
  var OPTIONS = {
    color: "#ffd23f", // gold tint
    dark: 0.38, // darkest stripe level (higher = brighter)
    boost: 1.15, // brightness multiplier
    density: 2.9,
    softness: 0.43,
    dispersion: 0,
    distortion: 0.07,
    edgeBend: 0.6,
    angle: 100,
    speed: 1.25,
    scale: 1,
    rotation: 0,
    mouseTilt: 0.5,
    intro: true,
  };

  // Hero word: bright premium gold, no shadow
  var HERO_OPTS = {
    color: "#ebb832",
    dark: 0.55, // lifted bands -> no dark maroon
    boost: 1.2,
    density: 3.2,
    softness: 0.35,
    distortion: 0.05,
    edgeBend: 0.5,
    angle: 110,
    speed: 0.9,
    mouseTilt: 0.6,
  };

  var CSS =
    ".metallic-paint{position:relative;display:block;max-width:100%;width:100%;height:var(--mp-h,3rem)}" +
    ".metallic-paint-canvas{display:block;width:100%;height:100%}" +
    ".mp-card{--mp-h:7.4cqw}" +
    ".mp-hero{position:absolute;pointer-events:none;will-change:opacity;transition:opacity .6s ease}" +
    ".mp-hero-on .hero-title{visibility:hidden}" +
    "@media(max-width:820px){.mp-card{--mp-h:3.4rem}}";

  /* ===================================================================== */

  var WORKING_SIZE = 384, // depth-solve resolution (fast, still smooth)
    MAX_PIXELS = 2560 * 1600 * 2,
    STRIP_PIXELS = 1 << 18,
    RELAX_BUDGET = 1 << 21;

  var VERTEX = `#version 300 es
layout(location = 0) in vec2 a_position;
uniform vec2 u_resolution;
uniform float u_imageAspect;
uniform float u_scale;
uniform float u_rotation;
out vec2 v_imageUV;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  vec2 uv = a_position * 0.5;
  float r = u_rotation * 3.14159265358979323846 / 180.0;
  mat2 turn = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 imageBox;
  imageBox.x = min(u_resolution.x / u_imageAspect, u_resolution.y) * u_imageAspect;
  imageBox.y = imageBox.x / u_imageAspect;
  v_imageUV = uv * (u_resolution / imageBox) / u_scale;
  v_imageUV.x *= u_imageAspect;
  v_imageUV = turn * v_imageUV;
  v_imageUV.x /= u_imageAspect;
  v_imageUV += 0.5;
  v_imageUV.y = 1.0 - v_imageUV.y;
}`;

  var FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_colorBack;
uniform vec4 u_colorTint;
uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;
uniform vec2 u_tilt;
uniform float u_reveal;
uniform float u_light;
uniform float u_dark;
uniform float u_boost;
in vec2 v_imageUV;
out vec4 fragColor;
#define PI 3.14159265358979323846
vec2 rotate(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float getColorChanges(float c1, float c2, float stripe, vec3 w, float blur, float bump, float tint) {
  float ch = mix(c2, c1, smoothstep(0.0, 2.0 * blur, stripe));
  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe));
  bump = smoothstep(0.2, 0.8, bump);
  border = w[0] + 0.4 * (1.0 - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe));
  border = w[0] + 0.5 * (1.0 - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2.0 * blur, stripe));
  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2.0 * blur, stripe));
  float gradientT = (stripe - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0.0, 1.0, gradientT));
  ch = mix(ch, gradient, smoothstep(border, border + 0.5 * blur, stripe));
  ch = mix(ch, 1.0 - min(1.0, (1.0 - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}
float getImgFrame(vec2 uv, float th) {
  float frame = 1.0;
  frame *= smoothstep(0.0, th, uv.y);
  frame *= 1.0 - smoothstep(1.0 - th, 1.0, uv.y);
  frame *= smoothstep(0.0, th, uv.x);
  frame *= 1.0 - smoothstep(1.0 - th, 1.0, uv.x);
  return frame;
}
float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;
  float sum = 4.0 * centerSample;
  sum += 2.0 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
  sum += 2.0 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
  sum += 2.0 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
  sum += 2.0 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
  sum += textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;
  return sum / 16.0;
}
void main() {
  const float firstFrameOffset = 2.8;
  float t = 0.3 * (u_time + firstFrameOffset);
  vec2 uv = v_imageUV;
  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec4 img = textureGrad(u_image, uv, dudx, dudy);
  float cycleWidth = u_repetition;
  vec2 rotatedUV = uv - vec2(0.5);
  float angle = (-u_angle + 70.0) * PI / 180.0;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(rotatedUV.x * cosA - rotatedUV.y * sinA, rotatedUV.x * sinA + rotatedUV.y * cosA) + vec2(0.5);
  float edge = blurEdge3x3(u_image, uv, dudx, dudy, 6.0, img.r);
  edge = pow(edge, 1.6);
  edge *= smoothstep(0.0, 0.4, u_contour);
  float opacity = img.g * getImgFrame(v_imageUV, 0.0);
  float depth = img.r;
  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;
  vec3 color1 = mix(vec3(0.98, 0.98, 1.0), vec3(0.9, 0.9, 0.93), u_light);
  vec3 color2 = vec3(u_dark, u_dark, u_dark + 0.1 * smoothstep(0.7, 1.3, diagTLtoBR));
  vec2 gradUV = uv - 0.5 - u_tilt * vec2(0.18, -0.12);
  float dist = length(gradUV + vec2(0.0, 0.2 * diagBLtoTR));
  gradUV = rotate(gradUV, (0.25 - 0.2 * diagBLtoTR) * PI);
  float direction = gradUV.x;
  float bump = pow(1.8 * dist, 1.2);
  bump = 1.0 - bump;
  bump *= pow(uv.y, 0.3);
  float thinStrip1 = 0.12 / cycleWidth * (1.0 - 0.4 * bump);
  float thinStrip2 = 0.07 / cycleWidth * (1.0 + 0.4 * bump);
  float wideStrip = 1.0 - thinStrip1 - thinStrip2;
  float noise = snoise(uv - t);
  edge += (1.0 - edge) * u_distortion * noise;
  direction += diagBLtoTR;
  direction -= 2.0 * noise * diagBLtoTR * (smoothstep(0.0, 1.0, edge) * (1.0 - smoothstep(0.0, 1.0, edge)));
  direction *= mix(1.0, 1.0 - edge, smoothstep(0.5, 1.0, u_contour));
  direction -= 1.7 * edge * smoothstep(0.5, 1.0, u_contour);
  direction += 0.2 * pow(u_contour, 4.0) * (1.0 - smoothstep(0.0, 1.0, edge));
  bump *= clamp(pow(uv.y, 0.1), 0.3, 1.0);
  direction *= 0.1 + (1.1 - edge) * bump;
  direction *= 0.4 + 0.6 * (1.0 - smoothstep(0.5, 1.0, edge));
  direction += 0.18 * (smoothstep(0.1, 0.2, uv.y) * (1.0 - smoothstep(0.2, 0.4, uv.y)));
  direction += 0.03 * (smoothstep(0.1, 0.2, 1.0 - uv.y) * (1.0 - smoothstep(0.2, 0.4, 1.0 - uv.y)));
  direction *= 0.5 + 0.5 * pow(uv.y, 2.0);
  direction *= cycleWidth;
  direction -= t + dot(u_tilt, vec2(0.35, 0.2));
  float colorDispersion = clamp(1.0 - bump, 0.0, 1.0);
  float dispersionRed = colorDispersion;
  dispersionRed += 0.03 * bump * noise;
  dispersionRed += 5.0 * (smoothstep(-0.1, 0.2, uv.y) * (1.0 - smoothstep(0.1, 0.5, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 1.0, bump)));
  dispersionRed -= diagBLtoTR;
  float dispersionBlue = colorDispersion * 1.3;
  dispersionBlue += (smoothstep(0.0, 0.4, uv.y) * (1.0 - smoothstep(0.1, 0.8, uv.y))) * (smoothstep(0.4, 0.6, bump) * (1.0 - smoothstep(0.4, 0.8, bump)));
  dispersionBlue -= 0.2 * edge;
  dispersionRed *= u_shiftRed / 20.0;
  dispersionBlue *= u_shiftBlue / 20.0;
  float softness = 0.05 * u_softness;
  float blur = softness + 0.5 * smoothstep(1.0, 10.0, u_repetition) * smoothstep(0.0, 1.0, edge);
  float smallCanvas = 1.0 - smoothstep(100.0, 500.0, min(u_resolution.x, u_resolution.y));
  blur += smallCanvas * smoothstep(0.0, 1.0, edge);
  float rExtraBlur = softness * (0.05 + 0.1 * (u_shiftRed / 20.0) * bump);
  float gExtraBlur = softness * 0.05 / max(0.001, abs(1.0 - diagBLtoTR));
  vec3 w = vec3(thinStrip1 * cycleWidth, thinStrip2 * cycleWidth, wideStrip);
  w[1] -= 0.02 * smoothstep(0.0, 1.0, edge + bump);
  float stripeR = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripeR, w, blur + fwidth(stripeR) + rExtraBlur, bump, u_colorTint.r);
  float stripeG = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripeG, w, blur + fwidth(stripeG) + gExtraBlur, bump, u_colorTint.g);
  float stripeB = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripeB, w, blur + fwidth(stripeB), bump, u_colorTint.b);
  vec3 sheen = mix(vec3(1.0), u_colorTint.rgb, 0.45 * u_colorTint.a);
  r *= sheen.r; g *= sheen.g; b *= sheen.b;
  r = min(r * u_boost, 1.0); g = min(g * u_boost, 1.0); b = min(b * u_boost, 1.0);
  float rim = smoothstep(0.78, 1.0, depth) * u_light;
  r *= 1.0 - rim * 0.62; g *= 1.0 - rim * 0.62; b *= 1.0 - rim * 0.58;
  float pour = u_reveal * 1.25 - 0.1;
  opacity *= smoothstep(1.0 - pour, 1.15 - pour, depth) * smoothstep(0.0, 0.25, u_reveal);
  vec3 color = vec3(r, g, b) * opacity;
  vec3 back = u_colorBack.rgb * u_colorBack.a;
  color += back * (1.0 - opacity);
  opacity += u_colorBack.a * (1.0 - opacity);
  color += 1.0 / 256.0 * (fract(sin(dot(0.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - 0.5);
  fragColor = vec4(color, opacity);
}`;

  /* ============================== HELPERS ============================== */

  var clamp = function (v, a, b) {
    return Math.min(b, Math.max(a, v));
  };

  var colorCtx = null;
  function parseColor(value, fallback) {
    colorCtx =
      colorCtx ||
      document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true });
    if (!colorCtx) return fallback;
    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillStyle = "rgba(0,0,0,0)";
    colorCtx.fillStyle = String(value);
    colorCtx.fillRect(0, 0, 1, 1);
    var d = colorCtx.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
  }

  // yields to the browser between heavy steps so the page never freezes
  function nextTask() {
    return new Promise(function (resolve) {
      var ch = new MessageChannel();
      ch.port1.onmessage = function () {
        ch.port1.close();
        resolve();
      };
      ch.port2.postMessage(0);
    });
  }

  /* ---------------------- text -> alpha canvas ---------------------- */
  async function drawTextSource(text) {
    var size = 320;
    var font =
      FONT.style + " " + FONT.weight + " " + size + "px " + FONT.family;
    try {
      await document.fonts.load(font, text);
    } catch (e) {}
    var probe = document.createElement("canvas").getContext("2d");
    probe.font = font;
    var m = probe.measureText(text);
    var ascent = m.actualBoundingBoxAscent || size * 0.8;
    var descent = m.actualBoundingBoxDescent || size * 0.2;
    var left = m.actualBoundingBoxLeft || 0;
    var right = m.actualBoundingBoxRight || m.width;
    var pad = size * 0.12;
    var c = document.createElement("canvas");
    c.width = Math.ceil(left + right + pad * 2);
    c.height = Math.ceil(ascent + descent + pad * 2);
    var ctx = c.getContext("2d");
    ctx.font = font;
    ctx.fillStyle = "#000";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, pad + left, pad + ascent);
    return c;
  }

  /* ---------------------- depth map (Poisson) ---------------------- */
  function preparePoisson(mask, width, height) {
    var interior = [];
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var i = y * width + x;
        if (!mask[i]) continue;
        var boundary =
          x === 0 ||
          y === 0 ||
          x === width - 1 ||
          y === height - 1 ||
          !mask[i - 1] ||
          !mask[i + 1] ||
          !mask[i - width] ||
          !mask[i + width] ||
          !mask[i - width - 1] ||
          !mask[i - width + 1] ||
          !mask[i + width - 1] ||
          !mask[i + width + 1];
        if (!boundary) interior.push(i);
      }
    }
    var field = new Float32Array(width * height),
      red = [],
      black = [];
    interior.forEach(function (i) {
      (((i % width) + Math.floor(i / width)) % 2 === 0 ? red : black).push(i);
    });
    function relax(list) {
      for (var k = 0; k < list.length; k++) {
        var i = list[k];
        var sum =
          field[i + 1] + field[i - 1] + field[i - width] + field[i + width];
        field[i] = 1.9 * ((0.01 + sum) / 4) - 0.9 * field[i];
      }
    }
    function peak() {
      var top = 0;
      interior.forEach(function (i) {
        if (field[i] > top) top = field[i];
      });
      return top || 1;
    }
    return { field: field, red: red, black: black, relax: relax, peak: peak };
  }

  async function solvePoisson(mask, width, height, live) {
    var P = preparePoisson(mask, width, height);
    await nextTask();
    if (!live()) return null;
    var batch = clamp(
      Math.floor(RELAX_BUDGET / Math.max(1, P.red.length + P.black.length)),
      1,
      8,
    );
    for (var it = 0; it < 40; it++) {
      P.relax(P.red);
      P.relax(P.black);
      if (it % batch === batch - 1 && it < 39) {
        await nextTask();
        if (!live()) return null;
      }
    }
    return { field: P.field, peak: P.peak() };
  }

  function readMask(source, w, h) {
    var small = document.createElement("canvas");
    small.width = w;
    small.height = h;
    var sctx = small.getContext("2d", { willReadFrequently: true });
    sctx.drawImage(source, 0, 0, w, h);
    var d = sctx.getImageData(0, 0, w, h).data;
    var mask = new Uint8Array(w * h);
    for (var i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    return { small: small, smallCtx: sctx, mask: mask };
  }

  async function drawDepth(work, solved, w, h, width, height, live) {
    var mask = work.mask,
      field = solved.field,
      peak = solved.peak;
    var g = work.smallCtx.createImageData(w, h);
    for (var i = 0; i < mask.length; i++) {
      var p = i * 4,
        v = mask[i] ? 255 * (1 - field[i] / peak) : 255;
      g.data[p] = v;
      g.data[p + 1] = v;
      g.data[p + 2] = v;
      g.data[p + 3] = mask[i] ? 255 : 0;
    }
    work.smallCtx.putImageData(g, 0, 0);
    var out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    var octx = out.getContext("2d", { willReadFrequently: true });
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    if (width <= w || height <= h) {
      octx.drawImage(work.small, 0, 0, w, h, 0, 0, width, height);
      return octx.getImageData(0, 0, width, height);
    }
    var image = octx.createImageData(width, height);
    var rows = Math.max(1, Math.floor(STRIP_PIXELS / width));
    for (var y = 0; y < height; y += rows) {
      var strip = Math.min(rows, height - y);
      octx.save();
      octx.beginPath();
      octx.rect(0, y, width, strip);
      octx.clip();
      octx.drawImage(work.small, 0, 0, w, h, 0, 0, width, height);
      octx.restore();
      image.data.set(octx.getImageData(0, y, width, strip).data, y * width * 4);
      if (y + strip < height) {
        await nextTask();
        if (!live()) return null;
      }
    }
    return image;
  }

  async function packChannels(result, source, width, height, live) {
    var original = source
      .getContext("2d", { willReadFrequently: true })
      .getImageData(0, 0, width, height).data;
    var bounds = [width, height, -1, -1];
    var rows = Math.max(1, Math.floor(STRIP_PIXELS / width));
    for (var y = 0, i = 0; y < height; y++) {
      if (y && y % rows === 0) {
        await nextTask();
        if (!live()) return null;
      }
      for (var x = 0; x < width; x++, i += 4) {
        var a = original[i + 3];
        if (a === 0) {
          result.data[i] = 255;
          result.data[i + 1] = 0;
        } else {
          result.data[i] = result.data[i + 3] === 0 ? 0 : result.data[i];
          result.data[i + 1] = a;
          if (x < bounds[0]) bounds[0] = x;
          if (x > bounds[2]) bounds[2] = x;
          if (y < bounds[1]) bounds[1] = y;
          bounds[3] = y;
        }
        result.data[i + 2] = 255;
        result.data[i + 3] = 255;
      }
    }
    return bounds;
  }

  async function processShape(source, live) {
    await nextTask();
    if (!live()) return null;
    var width = source.width,
      height = source.height;
    var fit = WORKING_SIZE / Math.min(width, height);
    var w = Math.max(2, Math.round(width * fit)),
      h = Math.max(2, Math.round(height * fit));
    var work = readMask(source, w, h);
    await nextTask();
    if (!live()) return null;
    var solved = await solvePoisson(work.mask, w, h, live);
    if (!solved) return null;
    await nextTask();
    if (!live()) return null;
    var image = await drawDepth(work, solved, w, h, width, height, live);
    if (!image) return null;
    await nextTask();
    if (!live()) return null;
    var bounds = await packChannels(image, source, width, height, live);
    if (!bounds) return null;
    return { image: image, bounds: bounds };
  }

  /* ============================ WEBGL ENGINE ============================ */
  function createPaint(container, canvas, opt) {
    var gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return null;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, VERTEX),
      fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(
        "MetallicPaint shader failed:",
        gl.getProgramInfoLog(program),
      );
      return null;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    var U = {},
      count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var k = 0; k < count; k++) {
      var info = gl.getActiveUniform(program, k);
      if (info) U[info.name] = gl.getUniformLocation(program, info.name);
    }
    gl.uniform1i(U.u_image, 0);

    var vao = gl.createVertexArray(),
      buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 0, 255, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var S = {
      tint: parseColor(opt.color, [1, 1, 1, 1]),
      back: [0, 0, 0, 0],
      density: clamp(opt.density, 0.5, 12),
      softness: clamp(opt.softness, 0, 1),
      dispersion: clamp(opt.dispersion, -1, 1),
      distortion: clamp(opt.distortion, 0, 1),
      edgeBend: clamp(opt.edgeBend, 0, 1),
      angle: opt.angle,
      speed: opt.speed,
      scale: Math.max(0.05, opt.scale),
      rotation: opt.rotation,
      mouseTilt: clamp(opt.mouseTilt, 0, 1.5),
      light: 0,
      dark: clamp(opt.dark, 0, 0.8),
      boost: clamp(opt.boost, 0.5, 2),
    };

    var st = {
      raf: 0,
      last: 0,
      time: 0,
      inView: true,
      paused: false,
      alive: true,
      hasImage: false,
      pending: true,
      aspect: 1,
      iw: 1,
      ih: 1,
      bounds: null,
      w: 0,
      h: 0,
      revealStart: -1,
      reveal: opt.intro && !reduce ? 0 : 1,
      tx: 0,
      ty: 0,
      vx: 0,
      vy: 0,
      gx: 0,
      gy: 0,
    };

    function canRun() {
      return st.alive && st.inView && !st.paused && !document.hidden;
    }

    function resize() {
      var r = container.getBoundingClientRect();
      var ratio = Math.max(Math.min(window.devicePixelRatio || 1, 2), 2);
      var px = r.width * r.height * ratio * ratio;
      if (px > MAX_PIXELS) ratio *= Math.sqrt(MAX_PIXELS / px);
      var w = Math.max(1, Math.round(r.width * ratio)),
        h = Math.max(1, Math.round(r.height * ratio));
      if (w === st.w && h === st.h) return;
      st.w = w;
      st.h = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    // only shade the pixels the word really covers
    function markBox() {
      var b = st.bounds;
      if (!b || b[2] < b[0]) return null;
      var boxH = Math.min(st.w / st.aspect, st.h) * S.scale;
      var turn = (S.rotation * Math.PI) / 180,
        cos = Math.cos(turn),
        sin = Math.sin(turn);
      var L = Infinity,
        R = -Infinity,
        B = Infinity,
        T = -Infinity;
      for (var c = 0; c < 4; c++) {
        var u = (c & 1 ? b[2] + 1 : b[0]) / st.iw,
          v = (c & 2 ? b[3] + 1 : b[1]) / st.ih;
        var x = (u - 0.5) * st.aspect,
          y = 0.5 - v;
        var px = (cos * x + sin * y) * boxH + st.w / 2,
          py = (cos * y - sin * x) * boxH + st.h / 2;
        L = Math.min(L, px);
        R = Math.max(R, px);
        B = Math.min(B, py);
        T = Math.max(T, py);
      }
      var m = 8 + (2 * boxH) / st.ih;
      var x0 = Math.max(0, Math.floor((L - m) / 2) * 2),
        y0 = Math.max(0, Math.floor((B - m) / 2) * 2);
      var x1 = Math.min(st.w, Math.ceil((R + m) / 2) * 2),
        y1 = Math.min(st.h, Math.ceil((T + m) / 2) * 2);
      return [x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0)];
    }

    function draw() {
      if (!st.alive) return;
      if (st.pending || !st.hasImage) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }
      gl.useProgram(program);
      gl.uniform2f(U.u_resolution, st.w, st.h);
      gl.uniform1f(U.u_time, st.time);
      gl.uniform1f(U.u_imageAspect, st.aspect);
      gl.uniform1f(U.u_scale, S.scale);
      gl.uniform1f(U.u_rotation, S.rotation);
      gl.uniform4f(U.u_colorBack, S.back[0], S.back[1], S.back[2], S.back[3]);
      gl.uniform4f(U.u_colorTint, S.tint[0], S.tint[1], S.tint[2], S.tint[3]);
      gl.uniform1f(U.u_softness, S.softness);
      gl.uniform1f(U.u_repetition, S.density);
      gl.uniform1f(U.u_shiftRed, S.dispersion);
      gl.uniform1f(U.u_shiftBlue, S.dispersion);
      gl.uniform1f(U.u_distortion, S.distortion);
      gl.uniform1f(U.u_contour, S.edgeBend);
      gl.uniform1f(U.u_angle, S.angle);
      gl.uniform2f(U.u_tilt, st.tx, st.ty);
      gl.uniform1f(U.u_reveal, st.reveal);
      gl.uniform1f(U.u_light, S.light);
      gl.uniform1f(U.u_dark, S.dark);
      gl.uniform1f(U.u_boost, S.boost);
      var box = markBox();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (box && (box[2] === 0 || box[3] === 0)) return;
      gl.bindVertexArray(vao);
      if (box) {
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(box[0], box[1], box[2], box[3]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.SCISSOR_TEST);
      } else {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    function frame(now) {
      st.raf = 0;
      if (!canRun()) {
        st.last = 0;
        return;
      }
      var dt = st.last ? Math.min(0.05, (now - st.last) / 1000) : 1 / 60;
      st.last = now;

      var moving = !reduce && S.speed !== 0;
      if (moving) st.time += dt * S.speed;
      var busy = moving;

      if (st.reveal < 1 && !st.pending) {
        if (st.revealStart < 0) st.revealStart = now;
        var p = clamp((now - st.revealStart) / 1600, 0, 1);
        st.reveal = 1 - Math.pow(1 - p, 3);
        if (moving) st.time += dt * 2.4 * Math.pow(1 - p, 2);
        busy = true;
      }

      // spring-follow the pointer tilt
      var steps = Math.max(1, Math.ceil(dt / (1 / 240))),
        h = dt / steps;
      for (var i = 0; i < steps; i++) {
        st.vx += (60 * (st.gx * S.mouseTilt - st.tx) - 14 * st.vx) * h;
        st.vy += (60 * (st.gy * S.mouseTilt - st.ty) - 14 * st.vy) * h;
        st.tx += st.vx * h;
        st.ty += st.vy * h;
      }
      if (
        Math.abs(st.gx * S.mouseTilt - st.tx) > 0.0005 ||
        Math.abs(st.gy * S.mouseTilt - st.ty) > 0.0005 ||
        Math.abs(st.vx) + Math.abs(st.vy) > 0.0005
      )
        busy = true;

      draw();
      if (busy && canRun()) st.raf = requestAnimationFrame(frame);
      else st.last = 0;
    }

    function wake() {
      if (!st.raf && canRun()) st.raf = requestAnimationFrame(frame);
    }

    function onMove(e) {
      var r = container.getBoundingClientRect();
      st.gx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1.2, 1.2);
      st.gy = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1.2, 1.2);
      wake();
    }
    function onLeave() {
      st.gx = 0;
      st.gy = 0;
      wake();
    }
    function onVis() {
      if (!document.hidden) {
        st.last = 0;
        wake();
      }
    }
    function onLost(e) {
      e.preventDefault();
      st.alive = false;
      cancelAnimationFrame(st.raf);
    }

    container.addEventListener("pointermove", onMove, { passive: true });
    container.addEventListener("pointerleave", onLeave, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    canvas.addEventListener("webglcontextlost", onLost);

    var ro = new ResizeObserver(function () {
      resize();
      draw();
      wake();
    });
    ro.observe(container);

    var io = new IntersectionObserver(function (entries) {
      st.inView = entries.some(function (x) {
        return x.isIntersecting;
      });
      if (st.inView) {
        st.last = 0;
        wake();
      }
    });
    io.observe(container);

    resize();
    draw();

    return {
      setShape: function (shape) {
        if (!st.alive) return;
        st.pending = false;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          shape.image,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR,
        );
        st.aspect = shape.image.width / shape.image.height;
        st.iw = shape.image.width;
        st.ih = shape.image.height;
        st.bounds = shape.bounds;
        st.hasImage = true;
        resize();
        draw(); // always paint one frame, even if paused
        wake();
      },
      setLight: function (v) {
        S.light = v ? 1 : 0;
        draw();
        wake();
      },
      setPaused: function (v) {
        st.paused = !!v;
        if (!st.paused) {
          st.last = 0;
          wake();
        }
      },
      destroy: function () {
        st.alive = false;
        cancelAnimationFrame(st.raf);
        ro.disconnect();
        io.disconnect();
        container.removeEventListener("pointermove", onMove);
        container.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVis);
        canvas.removeEventListener("webglcontextlost", onLost);
        gl.deleteTexture(tex);
        gl.deleteBuffer(buf);
        gl.deleteVertexArray(vao);
        gl.deleteProgram(program);
        var lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext(); // free the GPU context right away
      },
    };
  }

  /* ============================== PUBLIC API ============================== */
  function MetallicPaint(container, o) {
    o = o || {};
    var opt = Object.assign({}, OPTIONS, o.options || {});
    container.classList.add("metallic-paint");
    var canvas = document.createElement("canvas");
    canvas.className = "metallic-paint-canvas";
    container.appendChild(canvas);
    var engine = createPaint(container, canvas, opt);
    if (!engine) {
      canvas.remove();
      return null;
    }
    var alive = true;
    drawTextSource(o.text)
      .then(function (c) {
        return processShape(c, function () {
          return alive;
        });
      })
      .then(function (shape) {
        if (!alive || !shape) return;
        engine.setShape(shape);
        if (o.onReady) o.onReady(shape.image.width / shape.image.height);
      })
      .catch(function (e) {
        console.warn("MetallicPaint:", e);
        if (o.onFail) o.onFail(e); // FIX: let callers react to failures
      });
    return {
      engine: engine,
      setPaused: engine.setPaused,
      destroy: function () {
        alive = false;
        engine.destroy();
      },
    };
  }
  window.MetallicPaint = MetallicPaint;

  /* ============================ AUTO-MOUNTING ============================ */
  var styleEl = document.createElement("style");
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  var root = document.documentElement;
  var themeWatchers = [];
  new MutationObserver(function () {
    var light = root.getAttribute("data-theme") === "light";
    themeWatchers.forEach(function (fn) {
      fn(light);
    });
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---- generic target (the gold card name) ---- */
  function mountNow(el, target) {
    var label = el.textContent.trim() || target.text;
    el.setAttribute("aria-label", label);
    el.textContent = "";

    var holder = document.createElement("div");
    holder.className = "mp-" + target.name;
    holder.setAttribute("aria-hidden", "true");
    el.appendChild(holder);

    var inst = MetallicPaint(holder, {
      text: target.text,
      onReady: function (aspect) {
        // box hugs the word so it sits flush-left in the card
        holder.style.width = "calc(var(--mp-h) * " + aspect.toFixed(3) + ")";
      },
    });
    if (!inst) {
      holder.remove();
      el.textContent = label; // no WebGL2 -> plain text
      return;
    }
    var apply = function (light) {
      inst.engine.setLight(light);
    };
    themeWatchers.push(apply);
    apply(root.getAttribute("data-theme") === "light");
  }

  // build only when the element is near the viewport (saves startup work)
  function mountLazy(el, target) {
    if (el.__metal) return;
    el.__metal = true;
    if (!("IntersectionObserver" in window)) {
      mountNow(el, target);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        if (
          !entries.some(function (e) {
            return e.isIntersecting;
          })
        )
          return;
        io.disconnect();
        mountNow(el, target);
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
  }

  /* ---- hero title: metal "RAJESH S" while loading -> "PORTFOLIO" ---- */
  function initHero() {
    var h1 = document.getElementById("heroTitle");
    var center = document.getElementById("heroCenter");
    if (!h1 || !center || h1.__metalHero) return;
    h1.__metalHero = true;

    var FIRST = "RAJESH S",
      FINAL = "PORTFOLIO";

    var a,
      b = null;
    var loaderDone = false,
      bReady = false,
      bFailed = false,
      swapped = false;

    function make(text, intro, visible, onReady, onFail) {
      var holder = document.createElement("div");
      holder.className = "mp-hero";
      holder.setAttribute("aria-hidden", "true");
      holder.style.opacity = visible ? "1" : "0";
      center.insertBefore(holder, center.firstChild);
      var inst = MetallicPaint(holder, {
        text: text,
        options: Object.assign({}, HERO_OPTS, { intro: intro }),
        onReady: onReady,
        onFail: onFail,
      });
      if (inst)
        inst.engine.setLight(false); // hero never dims in light theme
      else holder.remove();
      return { holder: holder, inst: inst };
    }

    function place() {
      [a, b].forEach(function (o) {
        if (!o || !o.inst || !o.holder.isConnected) return;
        var s = o.holder.style;
        s.left = h1.offsetLeft + "px";
        s.top = h1.offsetTop + "px";
        s.width = h1.offsetWidth + "px";
        s.height = h1.offsetHeight + "px";
      });
    }

    // FIX: drop the metal effect and show the plain <h1> "PORTFOLIO"
    function fallbackToPlain() {
      if (swapped) return;
      swapped = true;
      root.classList.remove("mp-hero-on"); // shows the real <h1> again
      h1.textContent = FINAL;
      [a, b].forEach(function (o) {
        if (o && o.inst) {
          o.inst.destroy();
          o.holder.remove();
        }
      });
    }

    function trySwap() {
      if (swapped || !loaderDone) return;
      if (bFailed) {
        fallbackToPlain();
        return;
      }
      if (!bReady) return; // wait until PORTFOLIO is ready
      swapped = true;
      place();
      b.inst.setPaused(false); // start animating the new word
      b.holder.style.opacity = "1";
      a.holder.style.opacity = "0";
      setTimeout(function () {
        a.inst.destroy(); // release the first GPU context
        a.holder.remove();
      }, 800);
    }

    function buildFinal() {
      b = make(
        FINAL,
        false,
        false,
        function () {
          bReady = true;
          trySwap();
        },
        function () {
          bFailed = true;
          trySwap();
        },
      );
      if (!b.inst) {
        b = null;
        bFailed = true;
        trySwap();
        return;
      }
      b.inst.setPaused(true); // invisible: don't spend GPU until shown
      place();
    }

    a = make(FIRST, true, true, function () {
      // FIX: build PORTFOLIO immediately (was whenIdle) so it is ready in time
      setTimeout(buildFinal, 0);
    });
    if (!a.inst) return; // no WebGL2 -> keep the normal scramble title

    // keep the hidden h1 at its final width so layout never jumps
    h1.textContent = FINAL;
    new MutationObserver(function () {
      if (h1.textContent !== FINAL) h1.textContent = FINAL;
    }).observe(h1, { childList: true, characterData: true, subtree: true });
    root.classList.add("mp-hero-on");

    // FIX: the loader calls this every frame with progress 0..1.
    // Instead of a no-op, use it to swap the word at SWAP_AT (60%).
    window.heroScrambleSet = function (p) {
      if (!loaderDone && p >= SWAP_AT) {
        loaderDone = true;
        trySwap();
      }
    };

    place();
    new ResizeObserver(place).observe(h1);

    // FIX: when the loader finishes, force the swap and add a safety net
    (window.siteLoaderReady || Promise.resolve()).then(function () {
      loaderDone = true;
      trySwap();
      setTimeout(function () {
        if (!swapped) fallbackToPlain();
      }, 1500);
    });
  }

  function scan() {
    var pending = 0;
    TARGETS.forEach(function (t) {
      var el = document.querySelector(t.selector);
      if (!el) {
        pending++;
        return;
      }
      mountLazy(el, t);
    });
    return pending === 0;
  }

  function init() {
    initHero();
    if (scan()) return;
    // the gold card is injected later by enhancements.js
    var mo = new MutationObserver(function () {
      if (scan()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () {
      mo.disconnect();
    }, 15000);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
