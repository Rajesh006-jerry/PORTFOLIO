!(function () {
  "use strict";
  if (!window.GlowCursor) {
    var e = {
        intensity: 1.3,
        trailWidth: 3,
        linger: 1.4,
        glow: 1.2,
        hotspot: 0.8,
        followSpeed: 0.6,
        grain: 0,
        clickBurst: !0,
        quality: "medium",
        maxDevicePixelRatio: 1,
        enabled: !0,
        zIndex: 9998,
      },
      t = {
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
      },
      r =
        "#version 300 es\nprecision highp float;\nprecision highp sampler2D;\nin vec2 vUv;\nin vec2 vL;\nin vec2 vR;\nin vec2 vT;\nin vec2 vB;\nout vec4 outColor;\n",
      o = `${r}\nuniform sampler2D uTarget;\nuniform float uAspect;\nuniform vec2 uA;\nuniform vec2 uB;\nuniform float uRadius;\nuniform float uWide;\nuniform vec3 uValue;\nuniform float uMode;\nuniform float uStrength;\nfloat erf(float x) {\n  float x2 = x * x;\n  float a = 0.147;\n  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + a * x2) / (1.0 + a * x2)));\n}\nfloat sweep(float along, float length, float across, float radius) {\n  return exp(-across * across / (radius * radius)) * 0.5 * (erf(along / radius) - erf((along - length) / radius));\n}\nvoid main() {\n  vec2 p = vec2(vUv.x * uAspect, vUv.y);\n  vec2 a = vec2(uA.x * uAspect, uA.y);\n  vec2 ab = vec2(uB.x * uAspect, uB.y) - a;\n  float len = length(ab);\n  vec2 dir = len > 1e-6 ? ab / len : vec2(1.0, 0.0);\n  vec2 ap = p - a;\n  vec3 base = texture(uTarget, vUv).xyz;\n  if (uMode > 1.5) {\n    float along = dot(ap, dir);\n    float across = dot(ap, vec2(-dir.y, dir.x));\n    if (uMode > 2.5) {\n      outColor = vec4(mix(base, uValue, sweep(along, len, across, uRadius) * uStrength), 1.0);\n      return;\n    }\n    vec3 add = vec3(uValue.xy * sweep(along, len, across, uRadius), uValue.z * sweep(along, len, across, uWide));\n    outColor = vec4(base + add, 1.0);\n    return;\n  }\n  float h = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);\n  vec2 d = ap - ab * h;\n  float r2 = dot(d, d);\n  float falloff = exp(-r2 / (uRadius * uRadius));\n  float wide = exp(-r2 / (uWide * uWide));\n  vec3 result = uMode > 0.5 ? mix(base, uValue, falloff * uStrength) : base + vec3(uValue.xy * falloff, uValue.z * wide);\n  outColor = vec4(result, 1.0);\n}`,
      n = `${r}\nuniform sampler2D uVelocity;\nuniform sampler2D uSource;\nuniform vec2 uVelocityTexel;\nuniform float uDt;\nuniform vec4 uDecay;\nvoid main() {\n  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;\n  outColor = texture(uSource, coord) * uDecay;\n}`,
      i = `${r}\nuniform sampler2D uVelocity;\nuniform sampler2D uSource;\nuniform sampler2D uForward;\nuniform sampler2D uBack;\nuniform vec2 uVelocityTexel;\nuniform vec2 uSourceTexel;\nuniform float uDt;\nuniform vec4 uDecay;\nvoid main() {\n  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uVelocityTexel;\n  vec4 forward = texture(uForward, vUv);\n  vec4 corrected = forward + 0.5 * (texture(uSource, vUv) - texture(uBack, vUv));\n  vec2 base = (floor(coord / uSourceTexel - 0.5) + 0.5) * uSourceTexel;\n  vec4 a = texture(uSource, base);\n  vec4 b = texture(uSource, base + vec2(uSourceTexel.x, 0.0));\n  vec4 c = texture(uSource, base + vec2(0.0, uSourceTexel.y));\n  vec4 d = texture(uSource, base + uSourceTexel);\n  vec4 low = min(min(a, b), min(c, d));\n  vec4 high = max(max(a, b), max(c, d));\n  outColor = clamp(corrected, low, high) * uDecay;\n}`,
      a = `${r}\nuniform sampler2D uVelocity;\nvoid main() {\n  float left = texture(uVelocity, vL).x;\n  float right = texture(uVelocity, vR).x;\n  float top = texture(uVelocity, vT).y;\n  float bottom = texture(uVelocity, vB).y;\n  vec2 center = texture(uVelocity, vUv).xy;\n  if (vL.x < 0.0) left = -center.x;\n  if (vR.x > 1.0) right = -center.x;\n  if (vT.y > 1.0) top = -center.y;\n  if (vB.y < 0.0) bottom = -center.y;\n  outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);\n}`,
      u = `${r}\nuniform sampler2D uSource;\nuniform float uValue;\nvoid main() {\n  outColor = texture(uSource, vUv) * uValue;\n}`,
      l = `${r}\nuniform sampler2D uPressure;\nuniform sampler2D uDivergence;\nvoid main() {\n  float left = texture(uPressure, vL).x;\n  float right = texture(uPressure, vR).x;\n  float top = texture(uPressure, vT).x;\n  float bottom = texture(uPressure, vB).x;\n  float divergence = texture(uDivergence, vUv).x;\n  outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);\n}`,
      c = `${r}\nuniform sampler2D uPressure;\nuniform sampler2D uVelocity;\nvoid main() {\n  float left = texture(uPressure, vL).x;\n  float right = texture(uPressure, vR).x;\n  float top = texture(uPressure, vT).x;\n  float bottom = texture(uPressure, vB).x;\n  vec2 velocity = texture(uVelocity, vUv).xy - vec2(right - left, top - bottom);\n  outColor = vec4(velocity, 0.0, 1.0);\n}`,
      v =
        "\nuniform vec3 uColor;\nuniform vec3 uSecondary;\nuniform float uIntensity;\nuniform float uHotspot;\nvec3 shade(vec3 dye) {\n  float energy = max(dye.x, 0.0);\n  float heat = clamp(dye.y, 0.0, energy);\n  float gas = max(dye.z, 0.0);\n  float fresh = heat / max(energy, 0.0001);\n  vec3 tint = mix(uSecondary, uColor, fresh);\n  return (tint * energy + uSecondary * gas + vec3(heat * heat * 0.3 * uHotspot)) * uIntensity;\n}\n",
      d = `${r}${v}\nuniform sampler2D uDye;\nuniform vec2 uDyeTexel;\nvoid main() {\n  vec2 o = uDyeTexel * 0.5;\n  vec3 light = shade(texture(uDye, vUv + vec2(-o.x, -o.y)).xyz);\n  light += shade(texture(uDye, vUv + vec2(o.x, -o.y)).xyz);\n  light += shade(texture(uDye, vUv + vec2(-o.x, o.y)).xyz);\n  light += shade(texture(uDye, vUv + vec2(o.x, o.y)).xyz);\n  outColor = vec4(light * 0.25, 1.0);\n}`,
      f = `${r}\nuniform sampler2D uSource;\nuniform vec2 uSourceTexel;\nvoid main() {\n  vec2 o = uSourceTexel;\n  vec3 color = texture(uSource, vUv).rgb * 4.0;\n  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb;\n  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb;\n  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb;\n  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb;\n  outColor = vec4(color / 8.0, 1.0);\n}`,
      m = `${r}\nuniform sampler2D uSource;\nuniform vec2 uSourceTexel;\nvoid main() {\n  vec2 o = uSourceTexel;\n  vec3 color = texture(uSource, vUv + vec2(-o.x * 2.0, 0.0)).rgb;\n  color += texture(uSource, vUv + vec2(o.x * 2.0, 0.0)).rgb;\n  color += texture(uSource, vUv + vec2(0.0, -o.y * 2.0)).rgb;\n  color += texture(uSource, vUv + vec2(0.0, o.y * 2.0)).rgb;\n  color += texture(uSource, vUv + vec2(-o.x, -o.y)).rgb * 2.0;\n  color += texture(uSource, vUv + vec2(o.x, -o.y)).rgb * 2.0;\n  color += texture(uSource, vUv + vec2(-o.x, o.y)).rgb * 2.0;\n  color += texture(uSource, vUv + vec2(o.x, o.y)).rgb * 2.0;\n  outColor = vec4(color / 12.0, 1.0);\n}`,
      s = `${r}${v}\nuniform sampler2D uDye;\nuniform sampler2D uBloom;\nuniform float uGlow;\nuniform float uGrain;\nuniform float uTime;\nuniform float uLight;\nfloat hash(vec2 p) {\n  p = fract(p * vec2(123.34, 456.21));\n  p += dot(p, p + 45.32);\n  return fract(p.x * p.y);\n}\nvoid main() {\n  vec3 dye = texture(uDye, vUv).xyz;\n  vec3 light = shade(dye);\n  vec3 bloom = texture(uBloom, vUv).rgb * uGlow;\n  float edge = smoothstep(0.0, 0.02, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));\n  float grain = 1.0 + (hash(gl_FragCoord.xy + fract(uTime * 13.7) * 97.0) - 0.5) * uGrain * 2.0;\n  if (uLight > 0.5) {\n    float energy = max(dye.x, 0.0);\n    float heat = clamp(dye.y, 0.0, energy);\n    float gas = max(dye.z, 0.0);\n    float fresh = heat / max(energy, 0.0001);\n    vec3 tint = mix(uSecondary, uColor, fresh);\n    float halo = dot(bloom, vec3(0.2126, 0.7152, 0.0722));\n    float density = 1.0 - exp(-((energy * 1.1 + gas * 0.8) * uIntensity + halo * 0.25));\n    vec3 ink = tint;\n    ink = mix(ink, vec3(1.0), clamp(heat * heat * 0.05 * uHotspot, 0.0, 0.45));\n    density = clamp(density * grain, 0.0, 1.0) * edge;\n    outColor = vec4(ink * density, density);\n  } else {\n    vec3 color = 1.0 - exp(-(light + bloom) * grain);\n    color *= edge;\n    outColor = vec4(color, max(color.r, max(color.g, color.b)));\n  }\n}`,
      x = {
        low: { sim: 96, dye: 384 },
        medium: { sim: 128, dye: 576 },
        high: { sim: 160, dye: 768 },
      };
    "loading" === document.readyState
      ? document.addEventListener("DOMContentLoaded", g)
      : g();
  }
  function h(e, t, r) {
    return Math.min(r, Math.max(t, e));
  }
  function y(e, t, r) {
    var o = e.createShader(t);
    return o
      ? (e.shaderSource(o, r),
        e.compileShader(o),
        e.getShaderParameter(o, e.COMPILE_STATUS)
          ? o
          : (e.deleteShader(o), null))
      : null;
  }
  function g() {
    if (
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      var r = document.createElement("div");
      ((r.className = "glow-cursor"),
        r.setAttribute("aria-hidden", "true"),
        (r.style.cssText =
          "position:fixed;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:" +
          e.zIndex +
          ";"));
      var v = document.createElement("canvas");
      ((v.className = "glow-cursor__canvas"),
        (v.style.cssText =
          "position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;user-select:none;"),
        r.appendChild(v));
      var g = v.getContext("webgl2", {
        alpha: !0,
        premultipliedAlpha: !0,
        antialias: !1,
        depth: !1,
        stencil: !1,
      });
      if (g && g.getExtension("EXT_color_buffer_float")) {
        var p = y(
          g,
          g.VERTEX_SHADER,
          "#version 300 es\nin vec2 aPosition;\nuniform vec2 uTexel;\nout vec2 vUv;\nout vec2 vL;\nout vec2 vR;\nout vec2 vT;\nout vec2 vB;\nvoid main() {\n  vUv = aPosition * 0.5 + 0.5;\n  vL = vUv - vec2(uTexel.x, 0.0);\n  vR = vUv + vec2(uTexel.x, 0.0);\n  vT = vUv + vec2(0.0, uTexel.y);\n  vB = vUv - vec2(0.0, uTexel.y);\n  gl_Position = vec4(aPosition, 0.0, 1.0);\n}",
        );
        if (p) {
          var w = {
            splat: _(o),
            advect: _(n),
            maccormack: _(i),
            divergence: _(a),
            scale: _(u),
            pressure: _(l),
            gradient: _(c),
            prefilter: _(d),
            down: _(f),
            up: _(m),
            display: _(s),
          };
          for (var b in w) if (!w[b]) return;
          document.body.appendChild(r);
          var T = g.createVertexArray(),
            R = g.createBuffer();
          (g.bindVertexArray(T),
            g.bindBuffer(g.ARRAY_BUFFER, R),
            g.bufferData(
              g.ARRAY_BUFFER,
              new Float32Array([-1, -1, 3, -1, -1, 3]),
              g.STATIC_DRAW,
            ),
            g.enableVertexAttribArray(0),
            g.vertexAttribPointer(0, 2, g.FLOAT, !1, 0, 0));
          var E = document.createElement("canvas");
          ((E.width = 1), (E.height = 1));
          var S = E.getContext("2d", { willReadFrequently: !0 }),
            D =
              !!window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            M = {};
          I();
          var U = {
              width: 1,
              height: 1,
              ratio: 1,
              colorKey: "",
              color: [0.37, 0.55, 1],
              secondary: [0.25, 0.3, 1],
              pointer: { x: 0, y: 0, inside: !1 },
              emitter: { x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0, travelled: 0 },
              ready: !1,
              bursts: [],
              active: -1 / 0,
              time: 0,
              allocated: "",
              targets: null,
            },
            A = 0,
            F = 0,
            B = !0,
            C = !0,
            P = new ResizeObserver(function () {
              ($(), te());
            });
          P.observe(r);
          var L = new IntersectionObserver(function (e) {
            (C = e.some(function (e) {
              return e.isIntersecting;
            })) && ((F = 0), te());
          });
          L.observe(r);
          var V = new MutationObserver(function () {
            (I(), te());
          });
          (V.observe(document.documentElement, {
            attributes: !0,
            attributeFilter: ["data-theme"],
          }),
            window.addEventListener("pointermove", re, { passive: !0 }),
            window.addEventListener("pointerdown", oe, { passive: !0 }),
            document.documentElement.addEventListener("pointerleave", ne),
            document.addEventListener("visibilitychange", ie),
            $(),
            Z(),
            (window.GlowCursor = {
              update: function (t) {
                for (var o in t) o in e && (e[o] = t[o]);
                (I(),
                  t && void 0 !== t.zIndex && (r.style.zIndex = e.zIndex),
                  $(),
                  te());
              },
              destroy: function () {
                for (var e in ((B = !1),
                cancelAnimationFrame(A),
                P.disconnect(),
                L.disconnect(),
                V.disconnect(),
                window.removeEventListener("pointermove", re),
                window.removeEventListener("pointerdown", oe),
                document.documentElement.removeEventListener(
                  "pointerleave",
                  ne,
                ),
                document.removeEventListener("visibilitychange", ie),
                z(),
                w))
                  g.deleteProgram(w[e].program);
                (g.deleteShader(p),
                  g.deleteBuffer(R),
                  g.deleteVertexArray(T),
                  r.remove(),
                  delete window.GlowCursor);
              },
            }));
        }
      }
    }
    function _(e) {
      var t = y(g, g.FRAGMENT_SHADER, e),
        r = g.createProgram();
      if (!t || !r) return null;
      if (
        (g.attachShader(r, p),
        g.attachShader(r, t),
        g.bindAttribLocation(r, 0, "aPosition"),
        g.linkProgram(r),
        g.deleteShader(t),
        !g.getProgramParameter(r, g.LINK_STATUS))
      )
        return (g.deleteProgram(r), null);
      for (
        var o = {}, n = g.getProgramParameter(r, g.ACTIVE_UNIFORMS), i = 0;
        i < n;
        i++
      ) {
        var a = g.getActiveUniform(r, i);
        a && (o[a.name] = g.getUniformLocation(r, a.name));
      }
      return { program: r, uniforms: o };
    }
    function I() {
      var r =
          "light" === document.documentElement.getAttribute("data-theme")
            ? "light"
            : "dark",
        o = t[r];
      ((M = {
        color: o.color,
        secondaryColor: o.secondaryColor,
        theme: o.theme,
        intensity: Math.max(0, e.intensity),
        trailWidth: h(e.trailWidth, 0.5, 40),
        linger: h(e.linger, 0.1, 10),
        glow: Math.max(0, e.glow),
        hotspot: Math.max(0, e.hotspot),
        followSpeed: h(e.followSpeed, 0, 1),
        grain: Math.max(0, e.grain),
        clickBurst: e.clickBurst,
        quality: x[e.quality] ? e.quality : "high",
        maxDevicePixelRatio: e.maxDevicePixelRatio,
        enabled: e.enabled,
      }),
        (v.style.mixBlendMode = o.blend));
    }
    function G(e, t) {
      if (!S || !e) return t;
      var r = /^[0-9a-f]{3,8}$/i.test(e) ? "#" + e : e;
      (S.clearRect(0, 0, 1, 1),
        (S.fillStyle = "#000000"),
        (S.fillStyle = r),
        S.fillRect(0, 0, 1, 1));
      var o = S.getImageData(0, 0, 1, 1).data;
      return [o[0] / 255, o[1] / 255, o[2] / 255];
    }
    function k(e, t, r, o, n) {
      var i = g.createTexture();
      (g.bindTexture(g.TEXTURE_2D, i),
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, n),
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, n),
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE),
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE),
        g.texImage2D(g.TEXTURE_2D, 0, r, e, t, 0, o, g.HALF_FLOAT, null));
      var a = g.createFramebuffer();
      return (
        g.bindFramebuffer(g.FRAMEBUFFER, a),
        g.framebufferTexture2D(
          g.FRAMEBUFFER,
          g.COLOR_ATTACHMENT0,
          g.TEXTURE_2D,
          i,
          0,
        ),
        g.viewport(0, 0, e, t),
        g.clearColor(0, 0, 0, 0),
        g.clear(g.COLOR_BUFFER_BIT),
        { texture: i, fbo: a, width: e, height: t, texel: [1 / e, 1 / t] }
      );
    }
    function N(e, t, r, o, n) {
      var i = k(e, t, r, o, n),
        a = k(e, t, r, o, n);
      return {
        get read() {
          return i;
        },
        get write() {
          return a;
        },
        swap: function () {
          var e = i;
          ((i = a), (a = e));
        },
        targets: function () {
          return [i, a];
        },
      };
    }
    function O(e) {
      (g.deleteTexture(e.texture), g.deleteFramebuffer(e.fbo));
    }
    function z() {
      var e = U.targets;
      e &&
        ([]
          .concat(
            e.velocity.targets(),
            e.dye.targets(),
            e.pressure.targets(),
            [e.divergence, e.forward, e.back],
            e.bloom,
          )
          .forEach(O),
        (U.targets = null));
    }
    function X() {
      var e = [M.quality, U.width, U.height, v.width, v.height].join("|");
      if (e !== U.allocated || !U.targets) {
        (z(), (U.allocated = e));
        for (
          var t = x[M.quality],
            r = U.width / U.height,
            o = m(t.sim),
            n = m(t.dye),
            i = n[0],
            a = n[1],
            u = Math.min(1, v.width / i, v.height / a),
            l = [],
            c = (i = Math.max(2, Math.round(i * u))) >> 1,
            d = (a = Math.max(2, Math.round(a * u))) >> 1,
            f = 0;
          f < 5;
          f++
        )
          (l.push(
            k(Math.max(1, c), Math.max(1, d), g.RGBA16F, g.RGBA, g.LINEAR),
          ),
            (c >>= 1),
            (d >>= 1));
        U.targets = {
          velocity: N(o[0], o[1], g.RG16F, g.RG, g.LINEAR),
          dye: N(i, a, g.RGBA16F, g.RGBA, g.LINEAR),
          forward: k(i, a, g.RGBA16F, g.RGBA, g.LINEAR),
          back: k(i, a, g.RGBA16F, g.RGBA, g.LINEAR),
          pressure: N(o[0], o[1], g.R16F, g.RED, g.NEAREST),
          divergence: k(o[0], o[1], g.R16F, g.RED, g.NEAREST),
          bloom: l,
        };
      }
      function m(e) {
        return r >= 1 ? [Math.round(e * r), e] : [e, Math.round(e / r)];
      }
    }
    function $() {
      var e = Math.max(1, r.clientWidth),
        t = Math.max(1, r.clientHeight),
        o = Math.min(
          window.devicePixelRatio || 1,
          Math.max(0.5, M.maxDevicePixelRatio || 2),
        ),
        n = Math.max(1, Math.round(e * o)),
        i = Math.max(1, Math.round(t * o));
      ((v.width === n && v.height === i) || ((v.width = n), (v.height = i)),
        (U.width = e),
        (U.height = t),
        (U.ratio = o),
        X());
    }
    function W(e) {
      (e
        ? (g.bindFramebuffer(g.FRAMEBUFFER, e.fbo),
          g.viewport(0, 0, e.width, e.height))
        : (g.bindFramebuffer(g.FRAMEBUFFER, null),
          g.viewport(0, 0, v.width, v.height)),
        g.drawArrays(g.TRIANGLES, 0, 3));
    }
    function q(e, t) {
      return (
        g.useProgram(e.program),
        e.uniforms.uTexel && g.uniform2f(e.uniforms.uTexel, t[0], t[1]),
        e.uniforms
      );
    }
    function H(e, t) {
      return (
        g.activeTexture(g.TEXTURE0 + e),
        g.bindTexture(g.TEXTURE_2D, t.texture),
        e
      );
    }
    function K(e, t, r, o, n, i, a, u, l, c) {
      void 0 === c && (c = i);
      var v = q(w.splat, e.read.texel);
      (g.uniform1i(v.uTarget, H(0, e.read)),
        g.uniform1f(v.uAspect, U.width / U.height),
        g.uniform2f(v.uA, t / U.width, 1 - r / U.height),
        g.uniform2f(v.uB, o / U.width, 1 - n / U.height),
        g.uniform1f(v.uRadius, i / U.height),
        g.uniform1f(v.uWide, c / U.height),
        g.uniform3f(v.uValue, a[0], a[1], a[2]),
        g.uniform1f(v.uMode, u),
        g.uniform1f(v.uStrength, l),
        W(e.write),
        e.swap());
    }
    function Y(e, t) {
      var r = U.targets.velocity;
      return [(e * r.read.width) / U.width, (-t * r.read.height) / U.height];
    }
    function j() {
      return Math.max(
        0.5 * M.trailWidth,
        (U.height / U.targets.dye.read.height) * 0.9,
      );
    }
    function J(e, t, r) {
      for (
        var o = U.targets.velocity,
          n = U.targets.dye,
          i = j(),
          a = Math.random() * Math.PI * 2,
          u = 0;
        u < 6;
        u++
      ) {
        var l = a + (u / 6) * Math.PI * 2 + 0.5 * (Math.random() - 0.5),
          c = Math.cos(l),
          v = Math.sin(l),
          d = 20 + 14 * Math.random(),
          f = e + 3 * c,
          m = t + 3 * v,
          s = e + c * d,
          x = t + v * d;
        if (!D) {
          var h = Y(760 * Math.cos(l + 0.6), 760 * Math.sin(l + 0.6));
          K(o, f, m, s, x, 18, [h[0], h[1], 0], 1, 0.9);
        }
        K(n, f, m, s, x, 1.1 * i, [2.4, 2.4, 0.3], 0, 1, 5 * i + 6);
      }
      (K(n, e, t, e + 0.01, t, 2.2 * i, [1.8, 1.8, 0.4], 0, 1, 7 * i + 10),
        (U.active = r));
    }
    function Q(e) {
      (g.uniform3f(e.uColor, U.color[0], U.color[1], U.color[2]),
        g.uniform3f(
          e.uSecondary,
          U.secondary[0],
          U.secondary[1],
          U.secondary[2],
        ),
        g.uniform1f(e.uIntensity, M.intensity),
        g.uniform1f(e.uHotspot, M.hotspot));
    }
    function Z() {
      (g.bindFramebuffer(g.FRAMEBUFFER, null),
        g.viewport(0, 0, v.width, v.height),
        g.clearColor(0, 0, 0, 0),
        g.clear(g.COLOR_BUFFER_BIT));
    }
    function ee(e) {
      if (((A = 0), B && C && !document.hidden)) {
        var t = F ? Math.min(1 / 30, (e - F) / 1e3) : 1 / 60;
        ((F = e), (U.time += t));
        var r = Math.min(
          window.devicePixelRatio || 1,
          Math.max(0.5, M.maxDevicePixelRatio || 2),
        );
        for (
          Math.abs(r - U.ratio) > 0.01 && $(),
            X(),
            (function () {
              var e,
                t,
                r,
                o,
                n,
                i,
                a,
                u = M.color + "|" + M.secondaryColor;
              if (u !== U.colorKey)
                if (
                  ((U.colorKey = u),
                  (U.color = G(M.color, [0.37, 0.55, 1])),
                  M.secondaryColor)
                )
                  U.secondary = G(M.secondaryColor, U.color);
                else {
                  var l =
                    ((t = (e = U.color)[0]),
                    (r = e[1]),
                    (o = e[2]),
                    (a = 0),
                    (i = (n = Math.max(t, r, o)) - Math.min(t, r, o)) > 0 &&
                      (a =
                        n === t
                          ? ((r - o) / i) % 6
                          : n === r
                            ? (o - t) / i + 2
                            : (t - r) / i + 4),
                    [(60 * a + 360) % 360, n > 0 ? i / n : 0, n]);
                  U.secondary = (function (e, t, r) {
                    var o = (((e % 360) + 360) % 360) / 60,
                      n = r * t,
                      i = n * (1 - Math.abs((o % 2) - 1)),
                      a = r - n,
                      u =
                        o < 1
                          ? [n, i, 0]
                          : o < 2
                            ? [i, n, 0]
                            : o < 3
                              ? [0, n, i]
                              : o < 4
                                ? [0, i, n]
                                : o < 5
                                  ? [i, 0, n]
                                  : [n, 0, i];
                    return [u[0] + a, u[1] + a, u[2] + a];
                  })(l[0] + 8, Math.min(1, 1.1 * l[1] + 0.05), l[2]);
                }
            })(),
            g.bindVertexArray(T),
            g.disable(g.BLEND),
            U.ready &&
              (function (e, t) {
                var r = U.emitter,
                  o = U.pointer,
                  n = U.targets.velocity,
                  i = U.targets.dye;
                if (((r.px = r.x), (r.py = r.y), D || M.followSpeed >= 1))
                  ((r.x = o.x), (r.y = o.y));
                else
                  for (
                    var a = 10 + 50 * M.followSpeed,
                      u = Math.max(1, Math.ceil(e / 0.004)),
                      l = e / u,
                      c = 0;
                    c < u;
                    c++
                  )
                    ((r.vx += (a * a * (o.x - r.x) - 2 * a * r.vx) * l),
                      (r.vy += (a * a * (o.y - r.y) - 2 * a * r.vy) * l),
                      (r.x += r.vx * l),
                      (r.y += r.vy * l));
                var v = r.x - r.px,
                  d = r.y - r.py;
                if (!(Math.hypot(v, d) < 0.05) && M.enabled) {
                  var f = j();
                  if (!D) {
                    var m = Y(v / Math.max(e, 0.001), d / Math.max(e, 0.001));
                    K(
                      n,
                      r.px,
                      r.py,
                      r.x,
                      r.y,
                      4 * f + 18,
                      [m[0], m[1], 0],
                      3,
                      0.75 * 0.6,
                    );
                  }
                  (K(
                    i,
                    r.px,
                    r.py,
                    r.x,
                    r.y,
                    f,
                    [5.6, 5.6, 0.7],
                    2,
                    1,
                    5 * f + 6,
                  ),
                    (U.active = t));
                }
              })(t, e);
          U.bursts.length;
        ) {
          var o = U.bursts.shift();
          J(o[0], o[1], e);
        }
        (!(function (e) {
          var t,
            r = U.targets.velocity,
            o = U.targets.dye,
            n = U.targets.pressure,
            i = U.targets.divergence;
          if (!D) {
            ((t = q(w.divergence, r.read.texel)),
              g.uniform1i(t.uVelocity, H(0, r.read)),
              W(i),
              (t = q(w.scale, n.read.texel)),
              g.uniform1i(t.uSource, H(0, n.read)),
              g.uniform1f(t.uValue, 0.8),
              W(n.write),
              n.swap(),
              (t = q(w.pressure, n.read.texel)),
              g.uniform1i(t.uDivergence, H(1, i)));
            for (var a = 0; a < 20; a++)
              (g.uniform1i(t.uPressure, H(0, n.read)), W(n.write), n.swap());
            ((t = q(w.gradient, r.read.texel)),
              g.uniform1i(t.uPressure, H(0, n.read)),
              g.uniform1i(t.uVelocity, H(1, r.read)),
              W(r.write),
              r.swap(),
              (t = q(w.advect, r.read.texel)),
              g.uniform2f(t.uVelocityTexel, r.read.texel[0], r.read.texel[1]),
              g.uniform1i(t.uVelocity, H(0, r.read)),
              g.uniform1i(t.uSource, H(0, r.read)),
              g.uniform1f(t.uDt, e));
            var u = Math.exp(1.2 * -e);
            (g.uniform4f(t.uDecay, u, u, 1, 1), W(r.write), r.swap());
          }
          var l = [
              Math.exp((4.6 * -e) / (0.8 * M.linger)),
              Math.exp((4.6 * -e) / (0.2 * M.linger)),
              Math.exp((4.6 * -e) / (1.2 * M.linger)),
              1,
            ],
            c = U.targets.forward,
            v = U.targets.back;
          if (D)
            return (
              (t = q(w.advect, o.read.texel)),
              g.uniform2f(t.uVelocityTexel, r.read.texel[0], r.read.texel[1]),
              g.uniform1i(t.uVelocity, H(0, r.read)),
              g.uniform1i(t.uSource, H(1, o.read)),
              g.uniform1f(t.uDt, 0),
              g.uniform4f(t.uDecay, l[0], l[1], l[2], l[3]),
              W(o.write),
              void o.swap()
            );
          ((t = q(w.advect, o.read.texel)),
            g.uniform2f(t.uVelocityTexel, r.read.texel[0], r.read.texel[1]),
            g.uniform1i(t.uVelocity, H(0, r.read)),
            g.uniform1i(t.uSource, H(1, o.read)),
            g.uniform1f(t.uDt, e),
            g.uniform4f(t.uDecay, 1, 1, 1, 1),
            W(c),
            g.uniform1i(t.uSource, H(1, c)),
            g.uniform1f(t.uDt, -e),
            W(v),
            (t = q(w.maccormack, o.read.texel)),
            g.uniform2f(t.uVelocityTexel, r.read.texel[0], r.read.texel[1]),
            g.uniform2f(t.uSourceTexel, o.read.texel[0], o.read.texel[1]),
            g.uniform1i(t.uVelocity, H(0, r.read)),
            g.uniform1i(t.uSource, H(1, o.read)),
            g.uniform1i(t.uForward, H(2, c)),
            g.uniform1i(t.uBack, H(3, v)),
            g.uniform1f(t.uDt, e),
            g.uniform4f(t.uDecay, l[0], l[1], l[2], l[3]),
            W(o.write),
            o.swap());
        })(t),
          (function () {
            var e,
              t = U.targets.dye,
              r = U.targets.bloom;
            if (M.glow > 0) {
              ((e = q(w.prefilter, r[0].texel)),
                g.uniform1i(e.uDye, H(0, t.read)),
                g.uniform2f(e.uDyeTexel, t.read.texel[0], t.read.texel[1]),
                Q(e),
                W(r[0]),
                (e = q(w.down, r[0].texel)));
              for (var o = 1; o < r.length; o++)
                (g.uniform1i(e.uSource, H(0, r[o - 1])),
                  g.uniform2f(
                    e.uSourceTexel,
                    r[o - 1].texel[0],
                    r[o - 1].texel[1],
                  ),
                  W(r[o]));
              (g.enable(g.BLEND),
                g.blendFunc(g.ONE, g.ONE),
                (e = q(w.up, r[0].texel)));
              for (var n = r.length - 1; n > 0; n--)
                (g.uniform1i(e.uSource, H(0, r[n])),
                  g.uniform2f(e.uSourceTexel, r[n].texel[0], r[n].texel[1]),
                  W(r[n - 1]));
              g.disable(g.BLEND);
            }
            ((e = q(w.display, [1 / v.width, 1 / v.height])),
              g.uniform1i(e.uDye, H(0, t.read)),
              g.uniform1i(e.uBloom, H(1, r[0])),
              Q(e),
              g.uniform1f(e.uGlow, M.glow > 0 ? (1.4 * M.glow) / 5 : 0),
              g.uniform1f(e.uGrain, M.grain),
              g.uniform1f(e.uTime, U.time),
              g.uniform1f(e.uLight, "light" === M.theme ? 1 : 0),
              W(null));
          })());
        var n,
          i = e - U.active > 1200 * M.linger + 900,
          a = Math.hypot(U.emitter.vx, U.emitter.vy) < 1;
        if (i && a)
          return (
            (n = U.targets) &&
              (g.clearColor(0, 0, 0, 0),
              []
                .concat(
                  n.velocity.targets(),
                  n.dye.targets(),
                  n.pressure.targets(),
                )
                .forEach(function (e) {
                  (g.bindFramebuffer(g.FRAMEBUFFER, e.fbo),
                    g.clear(g.COLOR_BUFFER_BIT));
                })),
            Z(),
            void (F = 0)
          );
        A = requestAnimationFrame(ee);
      }
    }
    function te() {
      !A && B && C && !document.hidden && (A = requestAnimationFrame(ee));
    }
    function re(e) {
      var t = r.getBoundingClientRect(),
        o = e.clientX - t.left,
        n = e.clientY - t.top;
      o >= 0 && n >= 0 && o <= t.width && n <= t.height
        ? (U.ready ||
            ((U.emitter.x = o),
            (U.emitter.y = n),
            (U.emitter.px = o),
            (U.emitter.py = n),
            (U.emitter.vx = 0),
            (U.emitter.vy = 0),
            (U.ready = !0)),
          (U.pointer.x = o),
          (U.pointer.y = n),
          (U.pointer.inside = !0),
          te())
        : U.pointer.inside && ((U.pointer.inside = !1), (U.ready = !1), te());
    }
    function oe(e) {
      if (M.clickBurst && M.enabled) {
        var t = r.getBoundingClientRect(),
          o = e.clientX - t.left,
          n = e.clientY - t.top;
        o < 0 ||
          n < 0 ||
          o > t.width ||
          n > t.height ||
          (U.bursts.push([o, n]), te());
      }
    }
    function ne() {
      ((U.pointer.inside = !1), (U.ready = !1), te());
    }
    function ie() {
      ((F = 0), te());
    }
  }
})();
