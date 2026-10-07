import { useEffect, useRef, useState } from "react";

import { onBackgroundPauseChange } from "@/hooks/use-background-pause";

/** One full loop of the drifting light, in seconds */
const LOOP_SECONDS = 24;
const MAX_FPS = 30;
/** Fraction of the device pixel ratio rendered: the light is soft, so half is plenty */
const RESOLUTION = 0.5;
/** Largest parallax shift toward the cursor, as a fraction of the viewport */
const PARALLAX = 0.025;

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

/*
 * Monochrome studio light: layered 3D simplex noise plus a soft key light, all driven by one
 * angle that turns once per loop, so the motion repeats seamlessly. Greys stay between
 * #0a0a0a and ~#545454, with at most a 5% warm amber tint where the light is brightest.
 */
const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_angle;
uniform vec2 u_mouse;

// 3D simplex noise: Ashima Arts / Stefan Gustavson (MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0) - u_mouse;
  vec2 c = vec2(cos(u_angle), sin(u_angle));
  vec2 c2 = vec2(cos(2.0 * u_angle), sin(2.0 * u_angle));

  // Slow layered folds of light
  float n = 0.55 * snoise(vec3(p * 0.8 + c * 0.35, 1.7))
          + 0.30 * snoise(vec3(p * 1.6 - c2.yx * 0.30, 4.2))
          + 0.15 * snoise(vec3(p * 3.2 + c * 0.60, 9.1));

  // A soft key light drifting on a slow ellipse
  vec2 key = vec2(0.30 * c.x, 0.16 * c2.y + 0.08);
  float light = exp(-dot(p - key, p - key) * 2.4);

  float lum = 0.055 + 0.13 * (n * 0.5 + 0.5) + 0.15 * light;
  lum = clamp(lum, 0.039, 0.33);
  vec3 col = vec3(lum);
  col = mix(col, vec3(0.780, 0.616, 0.518) * lum * 1.35, 0.05 * light);

  // Dither to avoid banding in the dark gradients
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (noise - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

type Renderer = {
  resize: () => void;
  draw: (angle: number, mouse: [number, number]) => void;
  dispose: () => void;
};

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Couldn't create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compile failed");
  }
  return shader;
}

function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;
  try {
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    // One triangle pair covering the screen
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "u_resolution");
    const angle = gl.getUniformLocation(program, "u_angle");
    const mouse = gl.getUniformLocation(program, "u_mouse");

    const resize = () => {
      const scale = (window.devicePixelRatio || 1) * RESOLUTION;
      canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolution, canvas.width, canvas.height);
    };
    resize();

    return {
      resize,
      draw: (a, [mx, my]) => {
        gl.uniform1f(angle, a);
        gl.uniform2f(mouse, mx, my);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      dispose: () => {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      },
    };
  } catch (error) {
    console.warn("Animated background: WebGL unavailable, using CSS fallback", error);
    return null;
  }
}

/**
 * Slow, monochrome "studio light" behind every inner page: a WebGL shader with a soft
 * vignette, or drifting blurred blobs when WebGL isn't available. Static when the user
 * prefers reduced motion; paused while the tab is hidden or heavy work is running.
 */
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createRenderer(canvas);
    if (!renderer) {
      setFallback(true);
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parallax = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const mouse: [number, number] = [0, 0];
    const target: [number, number] = [0, 0];
    // Animation clock that only advances while running, so pauses resume seamlessly
    let elapsed = 0;
    let last = 0;
    let raf = 0;
    let hidden = document.hidden;
    let busy = false;

    const angle = () => ((elapsed / 1000) * 2 * Math.PI) / LOOP_SECONDS;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const delta = now - last;
      if (last && delta < 1000 / MAX_FPS - 1) return;
      // Cap the step so a long gap (e.g. after a pause) doesn't jump the light
      elapsed += last ? Math.min(delta, 100) : 0;
      last = now;
      mouse[0] += (target[0] - mouse[0]) * 0.06;
      mouse[1] += (target[1] - mouse[1]) * 0.06;
      renderer.draw(angle(), mouse);
    };

    const start = () => {
      if (reducedMotion || raf || hidden || busy) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onResize = () => {
      renderer.resize();
      renderer.draw(angle(), mouse);
    };
    const onVisibility = () => {
      hidden = document.hidden;
      if (hidden) stop();
      else start();
    };
    const onPointerMove = (event: PointerEvent) => {
      // Shift the light toward the cursor (y is flipped: WebGL's origin is bottom-left)
      target[0] = (event.clientX / window.innerWidth - 0.5) * 2 * PARALLAX;
      target[1] = -(event.clientY / window.innerHeight - 0.5) * 2 * PARALLAX;
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      setFallback(true);
    };

    renderer.draw(0, mouse); // first (or, with reduced motion, only) frame
    const unsubscribe = onBackgroundPauseChange((paused) => {
      busy = paused;
      if (paused) stop();
      else start();
    });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onContextLost);
    if (parallax && !reducedMotion) window.addEventListener("pointermove", onPointerMove);

    return () => {
      stop();
      unsubscribe();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-animated-background={fallback ? "css" : "webgl"}
      className="pointer-events-none fixed inset-0 overflow-hidden bg-[#0a0a0a]"
      style={{ zIndex: -1 }}
    >
      {fallback ? (
        <div className="animated-bg-blobs absolute inset-0">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <canvas ref={canvasRef} className="block size-full" />
      )}
      {/* Vignette: darker edges keep the eye on the centre content */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(0_0_0/0.5)_100%)]" />
    </div>
  );
}
