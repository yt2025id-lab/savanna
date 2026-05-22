"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      val += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return val;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float t = u_time * 0.15;

    // Base gradient: #0D1A0F → #1A2E1C
    vec3 col = mix(
      vec3(0.051, 0.102, 0.059),  // #0D1A0F
      vec3(0.102, 0.18, 0.11),    // #1A2E1C
      uv.y
    );

    // FBM noise layers for organic movement
    float n1 = fbm(uv * 3.0 + vec2(t * 0.3, t * 0.1));
    float n2 = fbm(uv * 5.0 - vec2(t * 0.2, t * 0.15));
    float n3 = fbm(uv * 8.0 + vec2(t * 0.1, -t * 0.2));

    // Golden layer
    vec3 gold = vec3(0.784, 0.659, 0.294); // #C8A84B
    col += gold * n1 * 0.06;

    // Green layer
    vec3 green = vec3(0.290, 0.486, 0.351); // #4A7C59
    col += green * n2 * 0.08;

    // Subtle cream layer
    vec3 cream = vec3(0.91, 0.835, 0.639); // #E8D5A3
    col += cream * n3 * 0.02;

    // Mouse interactive glow
    vec2 mouseUV = u_mouse / u_resolution;
    float mouseDist = length(uv - mouseUV);
    col += gold * 0.04 / (mouseDist + 0.5);

    // Glowing orbs — savanna golden lights
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      vec2 pos = vec2(
        hash(vec2(fi, 0.0)) + sin(t * (0.2 + fi * 0.05)) * 0.15,
        hash(vec2(0.0, fi)) + cos(t * (0.15 + fi * 0.04)) * 0.1
      );
      float dist = length(uv - pos);
      float glow = 0.002 / (dist * dist + 0.015);
      glow *= 0.25;
      col += gold * glow * 0.5;
    }

    // Extra large soft glow
    float orb1 = smoothstep(0.35, 0.0,
      length(uv - vec2(0.3 + sin(t * 0.5) * 0.1, 0.4 + cos(t * 0.3) * 0.05)));
    float orb2 = smoothstep(0.25, 0.0,
      length(uv - vec2(0.7 + cos(t * 0.4) * 0.08, 0.6 + sin(t * 0.35) * 0.06)));
    col += gold * orb1 * 0.12;
    col += green * orb2 * 0.08;

    // Subtle noise grain texture
    float grain = hash(uv * 50.0 + t * 0.05);
    col += grain * 0.015;

    // Vignette
    float vig = 1.0 - length(uv - 0.5) * 0.7;
    col *= vig;

    // Grass at bottom
    float grass = noise(vec2(uv.x * 30.0, uv.y * 3.0 + t * 0.5));
    float grassMask = smoothstep(0.15, 0.0, uv.y) * grass;
    col += green * grassMask * 0.2;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    function compileShader(type: number, source: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    window.addEventListener("resize", resize);

    function onMouse(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = canvas!.height - (e.clientY - rect.top);
    }
    window.addEventListener("mousemove", onMouse);

    let raf: number;
    const start = performance.now();
    function draw() {
      const elapsed = (performance.now() - start) / 1000;
      gl!.uniform1f(uTime, elapsed);
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
    />
  );
}
