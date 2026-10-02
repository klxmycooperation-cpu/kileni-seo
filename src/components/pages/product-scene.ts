type Point = [number, number, number];
type Surface = (u: number, v: number) => Point;
type Mesh = { vertices: Float32Array; indices: Uint16Array; material: number };

// Surfaces share one shader and one interleaved buffer per mesh; no model download is needed.
function surfaceMesh(surface: Surface, columns: number, rows: number, material: number): Mesh {
  const vertices: number[] = [];
  const indices: number[] = [];
  const delta = .0001;
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const u = col / columns;
      const v = row / rows;
      const p = surface(u, v);
      const left = surface(u - delta, v);
      const right = surface(u + delta, v);
      const below = surface(u, v - delta);
      const above = surface(u, v + delta);
      const a = above.map((value, i) => value - below[i]);
      const b = right.map((value, i) => value - left[i]);
      const normal = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const length = Math.hypot(...normal) || 1;
      vertices.push(...p, ...normal.map((value) => value / length));
      if (row < rows && col < columns) {
        const index = row * (columns + 1) + col;
        indices.push(index, index + columns + 1, index + 1, index + 1, index + columns + 1, index + columns + 2);
      }
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices), material };
}

function lathe(profile: [number, number][], material: number, oval = 1): Mesh {
  const surface: Surface = (u, v) => {
    const t = Math.min(profile.length - 1.000001, Math.max(.000001, v * (profile.length - 1)));
    const i = Math.floor(t);
    const fraction = t - i;
    const radius = profile[i][1] + (profile[i + 1][1] - profile[i][1]) * fraction;
    const y = profile[i][0] + (profile[i + 1][0] - profile[i][0]) * fraction;
    const angle = u * Math.PI * 2;
    return [radius * Math.cos(angle), y, radius * Math.sin(angle) * oval];
  };
  return surfaceMesh(surface, 112, (profile.length - 1) * 4, material);
}

function sceneMeshes(): Mesh[] {
  const body = lathe([
    [-1.38, .001], [-1.38, .34], [-1.37, .44], [-1.34, .49], [-1.29, .515],
    [-1.2, .522], [.72, .522], [.83, .51], [.9, .47], [.94, .37], [.95, .001],
  ], 0, .86);
  const cap = lathe([
    [.93, .001], [.93, .35], [.96, .367], [1.58, .367], [1.62, .35], [1.63, .001],
  ], 1, .86);
  const collar = lathe([[.9, .001], [.9, .38], [.94, .38], [.945, .001]], 1, .86);
  const ribbon = surfaceMesh((u, v) => {
    const angle = -.9 + u * Math.PI * 2.65;
    const radius = 1.04 + .17 * Math.sin(u * Math.PI * 2);
    const width = .37 * Math.pow(Math.max(.02, Math.sin(Math.PI * u)), .35);
    const twist = u * Math.PI * 3 + .5;
    const across = (v - .5) * width;
    const radial = radius + across * Math.cos(twist);
    return [radial * Math.cos(angle), -1.85 + u * 3.9 + across * Math.sin(twist), radial * Math.sin(angle)];
  }, 220, 10, 2);
  const bubbles = [
    [-1.1, .75, .45, .17], [.9, 1.34, -.28, .14], [1.3, -.46, .3, .22],
    [-.83, -.92, -.48, .1], [.72, -1.64, .5, .095], [-1.32, -.12, -.12, .065], [.68, .56, .64, .06],
  ].map(([x, y, z, radius]) => surfaceMesh((u, v) => {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;
    return [x + radius * Math.sin(phi) * Math.cos(theta), y - radius * Math.cos(phi), z + radius * Math.sin(phi) * Math.sin(theta)];
  }, 40, 24, 3));
  return [body, cap, collar, ribbon, ...bubbles];
}

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProjection;
uniform float uAngle;
varying vec3 vPosition;
varying vec3 vNormal;
vec3 rotate(vec3 p) {
  float c = cos(uAngle), s = sin(uAngle);
  p = vec3(c*p.x+s*p.z, p.y, -s*p.x+c*p.z);
  float tilt = .14;
  p = vec3(cos(tilt)*p.x-sin(tilt)*p.y, sin(tilt)*p.x+cos(tilt)*p.y, p.z);
  return vec3(p.x, .992*p.y-.126*p.z, .126*p.y+.992*p.z);
}
void main() {
  vPosition = rotate(aPosition);
  vNormal = rotate(aNormal);
  gl_Position = uProjection * vec4(vPosition + vec3(0., -.12, -6.7), 1.);
}`;

const fragmentSource = `
precision mediump float;
varying vec3 vPosition;
varying vec3 vNormal;
uniform float uMaterial;
vec3 studio(vec3 r) {
  vec3 colour = vec3(.015, .028, .065);
  float left = exp(-pow((r.x+.48)/.13, 2.)) * (.5+.5*smoothstep(-.7,.5,r.y));
  float right = exp(-pow((r.x-.72)/.08, 2.));
  float softbox = pow(max(0.,dot(r,normalize(vec3(-.7,.45,1.)))), 14.);
  colour += vec3(.78,.87,1.)*left + vec3(.24,.5,1.)*right;
  colour += vec3(.9,.94,1.)*softbox;
  colour += vec3(.12,.22,.48)*smoothstep(.3,.85,r.y);
  return colour;
}
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 view = normalize(vec3(0.,0.,6.7)-vPosition);
  vec3 reflection = reflect(-view,n);
  float fresnel = pow(1.-max(0.,dot(n,view)), 3.);
  vec3 light = normalize(vec3(-3.,3.,4.));
  float diffuse = max(0.,dot(n,light));
  float specular = pow(max(0.,dot(n,normalize(light+view))), 85.);
  vec3 env = studio(reflection);
  vec3 colour;
  float alpha = 1.;
  if (uMaterial < .5) {
    float grain = sin(vPosition.x*470.)*sin(vPosition.y*430.)*.012;
    colour = vec3(.018,.065,.3)*(.62+1.2*diffuse) + env*.58;
    colour += vec3(.12,.33,.9)*fresnel + vec3(.5,.7,1.)*specular*.7 + grain;
  } else if (uMaterial < 1.5) {
    colour = env*1.3 + vec3(.12,.17,.25)*diffuse + vec3(.7,.85,1.)*specular;
  } else if (uMaterial < 2.5) {
    float brushed = sin(vPosition.y*350.+vPosition.x*120.)*.017;
    colour = env*.95 + vec3(.19,.3,.5)*(.3+.8*diffuse) + vec3(.6,.78,1.)*specular + brushed;
  } else {
    colour = env*1.3 + vec3(.55,.75,1.)*fresnel + vec3(.8,.9,1.)*specular;
    alpha = .13 + fresnel*.82 + specular*.3;
  }
  colour = pow(max(colour,vec3(0.)),vec3(.78));
  gl_FragColor = vec4(colour,clamp(alpha,0.,1.));
}`;

export type ProductRenderer = { draw: (angle: number) => void; dispose: () => void };

export function createProductRenderer(canvas: HTMLCanvasElement): ProductRenderer | null {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const buffers: WebGLBuffer[] = [];
  const program = gl.createProgram();
  if (!program) return null;
  const dispose = () => {
    buffers.forEach((buffer) => gl.deleteBuffer(buffer));
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
  };
  try {
    for (const [source, kind] of [[vertexSource, gl.VERTEX_SHADER], [fragmentSource, gl.FRAGMENT_SHADER]] as const) {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Shader linking failed");
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "aPosition");
    const normal = gl.getAttribLocation(program, "aNormal");
    const projection = gl.getUniformLocation(program, "uProjection");
    const rotation = gl.getUniformLocation(program, "uAngle");
    const material = gl.getUniformLocation(program, "uMaterial");
    const meshes = sceneMeshes().map((mesh) => {
      const vertices = gl.createBuffer();
      const indices = gl.createBuffer();
      if (!vertices || !indices) {
        if (vertices) gl.deleteBuffer(vertices);
        if (indices) gl.deleteBuffer(indices);
        throw new Error("Buffer unavailable");
      }
      buffers.push(vertices, indices);
      gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
      return { vertices, indices, count: mesh.indices.length, material: mesh.material };
    });
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enableVertexAttribArray(position);
    gl.enableVertexAttribArray(normal);
    gl.clearColor(0, 0, 0, 0);
    return {
      draw(angle) {
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const pixelWidth = Math.round(width * dpr);
        const pixelHeight = Math.round(height * dpr);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const f = 1 / Math.tan(.66 / 2);
        const near = .1;
        const far = 30;
        gl.uniformMatrix4fv(projection, false, new Float32Array([
          f * height / width, 0, 0, 0, 0, f, 0, 0,
          0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0,
        ]));
        gl.uniform1f(rotation, angle);
        for (const mesh of meshes) {
          gl.depthMask(mesh.material !== 3);
          gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertices);
          gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
          gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
          gl.uniform1f(material, mesh.material);
          gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
        }
        gl.depthMask(true);
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
