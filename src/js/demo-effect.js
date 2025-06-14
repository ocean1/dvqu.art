// Demoscene WebGL effect for whoami page
(function() {
  let canvas = null;
  let gl = null;
  let program = null;
  let isRunning = false;
  let startTime = 0;
  let animationFrame = null;
  
  // Vertex positions for particles (pre-computed for performance)
  const NUM_PARTICLES = 8000;
  const particlePositions = new Float32Array(NUM_PARTICLES * 2);
  const particleIndices = new Float32Array(NUM_PARTICLES);
  
  // Initialize particle data
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particleIndices[i] = i;
  }
  
  // Shader sources
  const vertexShaderSource = `
    attribute float a_index;
    uniform float u_time;
    uniform vec2 u_resolution;
    varying float v_brightness;
    
    #define PI 3.14159265359
    
    // Fast hash function
    float hash(float n) {
      return fract(sin(n) * 43758.5453123);
    }
    
    void main() {
      float index = a_index;
      float phase = mod(u_time * 0.3, 20.0);
      
      vec2 pos;
      v_brightness = 1.0;
      
      // Phase 0-5: Tunnel effect
      if (phase < 5.0) {
        float ring = mod(index, 80.0);
        float segment = floor(index / 80.0);
        float depth = mod(segment * 0.3 - phase * 3.0, 15.0);
        
        // Tunnel equation
        float radius = 0.4 / (depth * 0.1 + 0.5);
        float angle = (ring / 80.0) * PI * 2.0 + depth * 0.2 + u_time * 0.5;
        
        pos = vec2(cos(angle), sin(angle)) * radius;
        
        // Depth fog
        v_brightness = 1.0 - smoothstep(0.0, 12.0, depth);
        
        // Hide far dots
        if (depth > 12.0) {
          pos = vec2(10.0, 10.0);
          v_brightness = 0.0;
        }
      }
      // Phase 5-7: Disappearing
      else if (phase < 7.0) {
        float fadePhase = (phase - 5.0) / 2.0;
        float ring = mod(index, 80.0);
        float segment = floor(index / 80.0);
        float depth = mod(segment * 0.3 - phase * 3.0, 15.0);
        
        float radius = 0.4 / (depth * 0.1 + 0.5);
        float angle = (ring / 80.0) * PI * 2.0 + depth * 0.2 + u_time * 0.5;
        
        pos = vec2(cos(angle), sin(angle)) * radius;
        
        // Random fade out
        if (hash(index) < fadePhase) {
          pos = vec2(10.0, 10.0);
          v_brightness = 0.0;
        } else {
          v_brightness = (1.0 - smoothstep(0.0, 12.0, depth)) * (1.0 - fadePhase);
        }
      }
      // Phase 7-10: Explosion to spheres
      else if (phase < 10.0) {
        float explodePhase = (phase - 7.0) / 3.0;
        
        // Explosion from center
        float explodeAngle = hash(index) * PI * 2.0;
        float explodeSpeed = hash(index + 1000.0) * 0.5 + 0.5;
        vec2 explodePos = vec2(cos(explodeAngle), sin(explodeAngle)) * explodeSpeed * explodePhase * 1.5;
        
        // Target sphere formation
        float sphereId = mod(index, 5.0);
        float pointId = floor(index / 5.0);
        
        // Sphere center orbit
        float sphereAngle = (sphereId / 5.0) * PI * 2.0 + u_time * 0.3;
        vec2 sphereCenter = vec2(cos(sphereAngle), sin(sphereAngle)) * 0.5;
        
        // Sphere surface point (3D to 2D projection)
        float theta = hash(pointId) * PI * 2.0 + u_time;
        float phi = acos(hash(pointId + 1000.0) * 2.0 - 1.0);
        
        vec3 sphere3D = vec3(
          sin(phi) * cos(theta),
          sin(phi) * sin(theta),
          cos(phi)
        ) * 0.15;
        
        // Simple 3D rotation
        float rotY = u_time + sphereId;
        sphere3D.xz = vec2(
          sphere3D.x * cos(rotY) - sphere3D.z * sin(rotY),
          sphere3D.x * sin(rotY) + sphere3D.z * cos(rotY)
        );
        
        vec2 spherePos = sphereCenter + sphere3D.xy;
        v_brightness = 0.5 + sphere3D.z * 3.0; // 3D lighting
        
        pos = mix(explodePos, spherePos, smoothstep(0.2, 0.9, explodePhase));
      }
      // Phase 10-15: Spheres to cubes
      else if (phase < 15.0) {
        float morphPhase = (phase - 10.0) / 5.0;
        
        float objectId = mod(index, 5.0);
        float pointId = floor(index / 5.0);
        
        // Object center
        float objAngle = (objectId / 5.0) * PI * 2.0 + u_time * 0.3;
        vec2 objCenter = vec2(cos(objAngle), sin(objAngle)) * 0.5;
        
        // Sphere point
        float theta = hash(pointId) * PI * 2.0 + u_time;
        float phi = acos(hash(pointId + 1000.0) * 2.0 - 1.0);
        vec3 sphere3D = vec3(
          sin(phi) * cos(theta),
          sin(phi) * sin(theta),
          cos(phi)
        ) * 0.15;
        
        // Cube point
        float edge = mod(pointId, 12.0);
        float t = fract(pointId / 12.0);
        vec3 cube3D;
        
        // Generate cube edges
        if (edge < 4.0) {
          float e = mod(edge, 4.0);
          float y = -0.15;
          if (e < 1.0) cube3D = vec3(mix(-0.15, 0.15, t), y, -0.15);
          else if (e < 2.0) cube3D = vec3(0.15, y, mix(-0.15, 0.15, t));
          else if (e < 3.0) cube3D = vec3(mix(0.15, -0.15, t), y, 0.15);
          else cube3D = vec3(-0.15, y, mix(0.15, -0.15, t));
        } else if (edge < 8.0) {
          float e = mod(edge - 4.0, 4.0);
          float y = 0.15;
          if (e < 1.0) cube3D = vec3(mix(-0.15, 0.15, t), y, -0.15);
          else if (e < 2.0) cube3D = vec3(0.15, y, mix(-0.15, 0.15, t));
          else if (e < 3.0) cube3D = vec3(mix(0.15, -0.15, t), y, 0.15);
          else cube3D = vec3(-0.15, y, mix(0.15, -0.15, t));
        } else {
          float e = edge - 8.0;
          if (e < 1.0) cube3D = vec3(-0.15, mix(-0.15, 0.15, t), -0.15);
          else if (e < 2.0) cube3D = vec3(0.15, mix(-0.15, 0.15, t), -0.15);
          else if (e < 3.0) cube3D = vec3(-0.15, mix(-0.15, 0.15, t), 0.15);
          else cube3D = vec3(0.15, mix(-0.15, 0.15, t), 0.15);
        }
        
        // Rotate both sphere and cube
        float rotX = u_time * 0.7 + objectId;
        float rotY = u_time + objectId * 0.3;
        
        // Rotate X
        sphere3D.yz = vec2(
          sphere3D.y * cos(rotX) - sphere3D.z * sin(rotX),
          sphere3D.y * sin(rotX) + sphere3D.z * cos(rotX)
        );
        cube3D.yz = vec2(
          cube3D.y * cos(rotX) - cube3D.z * sin(rotX),
          cube3D.y * sin(rotX) + cube3D.z * cos(rotX)
        );
        
        // Rotate Y
        sphere3D.xz = vec2(
          sphere3D.x * cos(rotY) - sphere3D.z * sin(rotY),
          sphere3D.x * sin(rotY) + sphere3D.z * cos(rotY)
        );
        cube3D.xz = vec2(
          cube3D.x * cos(rotY) - cube3D.z * sin(rotY),
          cube3D.x * sin(rotY) + cube3D.z * cos(rotY)
        );
        
        vec3 morphed3D = mix(sphere3D, cube3D, morphPhase);
        pos = objCenter + morphed3D.xy;
        v_brightness = 0.5 + morphed3D.z * 3.0;
      }
      // Phase 15-20: Cubes to polygons to tunnel
      else {
        float morphPhase = (phase - 15.0) / 5.0;
        
        float objectId = mod(index, 5.0);
        float pointId = floor(index / 5.0);
        
        // Object center (moving to center)
        float objAngle = (objectId / 5.0) * PI * 2.0 + u_time * 0.3;
        vec2 objCenter = vec2(cos(objAngle), sin(objAngle)) * 0.5 * (1.0 - morphPhase * 0.8);
        
        // Polygon edges
        float sides = 3.0 + objectId;
        float vertexId = mod(pointId, sides);
        float edgeT = fract(pointId / sides);
        
        float angle1 = (vertexId / sides) * PI * 2.0;
        float angle2 = ((vertexId + 1.0) / sides) * PI * 2.0;
        
        vec3 p1 = vec3(cos(angle1), sin(angle1), 0.0) * 0.15;
        vec3 p2 = vec3(cos(angle2), sin(angle2), 0.0) * 0.15;
        vec3 poly3D = mix(p1, p2, edgeT);
        
        // Rotate polygon
        float rotZ = u_time * (1.0 + objectId * 0.2);
        poly3D.xy = vec2(
          poly3D.x * cos(rotZ) - poly3D.y * sin(rotZ),
          poly3D.x * sin(rotZ) + poly3D.y * cos(rotZ)
        );
        
        vec2 polyPos = objCenter + poly3D.xy;
        
        // Target tunnel position
        float ring = mod(index, 80.0);
        float segment = floor(index / 80.0);
        float depth = segment * 0.3;
        float radius = 0.4 / (depth * 0.1 + 0.5);
        float tunnelAngle = (ring / 80.0) * PI * 2.0 + depth * 0.2;
        vec2 tunnelPos = vec2(cos(tunnelAngle), sin(tunnelAngle)) * radius;
        
        pos = mix(polyPos, tunnelPos, smoothstep(0.3, 1.0, morphPhase));
        v_brightness = mix(1.0, 1.0 - smoothstep(0.0, 12.0, depth), smoothstep(0.3, 1.0, morphPhase));
      }
      
      gl_Position = vec4(pos, 0.0, 1.0);
      gl_PointSize = 2.0; // Smaller pixels
    }
  `;
  
  const fragmentShaderSource = `
    precision mediump float;
    uniform float u_fade;
    varying float v_brightness;
    
    void main() {
      // Distance from center of point
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      // Square pixels
      if (max(abs(coord.x), abs(coord.y)) > 0.5) {
        discard;
      }
      
      float alpha = v_brightness * u_fade * 0.6;
      gl_FragColor = vec4(vec3(v_brightness), alpha);
    }
  `;
  
  // Logo wobble effect - CSS based
  function applyLogoWobble() {
    const logo = document.querySelector('.logo');
    if (!logo || logo.dataset.wobbleApplied) return;
    
    // Store original content
    if (!logo.dataset.originalContent) {
      logo.dataset.originalContent = logo.innerHTML;
    }
    
    // Create style element for animations
    const style = document.createElement('style');
    style.id = 'logo-wobble-style';
    
    // Parse lines
    const lines = logo.dataset.originalContent.split(/\r?\n/);
    
    // Generate CSS animations on the fly
    let css = '';
    
    // Create keyframes for each line
    lines.forEach((line, index) => {
      const animName = 'wobble-line-' + index;
      css += '@keyframes ' + animName + ' {\n';
      
      // Generate smooth sine wave keyframes
      for (let i = 0; i <= 100; i += 5) {
        const time = (i / 100) * Math.PI * 2;
        const offset = Math.sin(time + index * 0.3) * 10;
        css += '  ' + i + '% { transform: translateX(' + offset + 'px); }\n';
      }
      
      css += '}\n';
    });
    
    // Add line styles
    css += '.wobble-line { display: block; white-space: pre; line-height: 1; margin: 0; padding: 0; animation: 2.5s ease-in-out infinite; }\n';
    
    // Add specific animations with delays
    lines.forEach((line, index) => {
      const delay = index * 0.05;
      css += '.wobble-line-' + index + ' { animation-name: wobble-line-' + index + '; animation-delay: ' + delay + 's; }\n';
    });
    
    style.textContent = css;
    document.head.appendChild(style);
    
    // Apply to logo
    const wobbledHTML = lines.map((line, index) => {
      const preservedLine = line.replace(/ /g, '&nbsp;');
      return '<span class="wobble-line wobble-line-' + index + '">' + (preservedLine || '&nbsp;') + '</span>';
    }).join('');
    
    logo.innerHTML = wobbledHTML;
    logo.dataset.wobbleApplied = 'true';
  }
  
  // Remove logo wobble
  function removeLogoWobble() {
    const logo = document.querySelector('.logo');
    const style = document.getElementById('logo-wobble-style');
    
    if (logo && logo.dataset.originalContent) {
      logo.innerHTML = logo.dataset.originalContent;
      delete logo.dataset.wobbleApplied;
    }
    
    if (style) {
      style.remove();
    }
  }
  
  // Initialize WebGL
  function initWebGL() {
    // Create canvas
    canvas = document.createElement('canvas');
    canvas.id = 'demo-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;
    
    // Get WebGL context with optimal settings
    gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    
    if (!gl) {
      console.error('WebGL not supported');
      return false;
    }
    
    // Create shaders
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) {
      return false;
    }
    
    // Create program
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link failed:', gl.getProgramInfoLog(program));
      return false;
    }
    
    // Create buffer for particle indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, particleIndices, gl.STATIC_DRAW);
    
    // Set up attribute
    const indexLocation = gl.getAttribLocation(program, 'a_index');
    gl.enableVertexAttribArray(indexLocation);
    gl.vertexAttribPointer(indexLocation, 1, gl.FLOAT, false, 0, 0);
    
    // Use program
    gl.useProgram(program);
    
    // Set up viewport
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return true;
  }
  
  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  function resizeCanvas() {
    if (!canvas) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      
      if (gl) {
        gl.viewport(0, 0, width, height);
      }
    }
  }
  
  // Animation loop
  function animate() {
    if (!isRunning || !gl || !program) return;
    
    const currentTime = (Date.now() - startTime) / 1000;
    
    // Set uniforms
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), currentTime);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
    
    // Fade handling
    const currentFade = parseFloat(canvas.dataset.fade || '0');
    const targetFade = canvas.dataset.targetFade === '0' ? 0 : 1;
    const newFade = currentFade + (targetFade - currentFade) * 0.1;
    canvas.dataset.fade = newFade;
    gl.uniform1f(gl.getUniformLocation(program, 'u_fade'), newFade);
    
    // Clear and draw
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Draw points
    gl.drawArrays(gl.POINTS, 0, NUM_PARTICLES);
    
    animationFrame = requestAnimationFrame(animate);
  }
  
  // Start demo effect
  function startDemo() {
    if (isRunning) return;
    
    // Only run on whoami page
    if (!window.location.hash.includes('whoami')) return;
    
    // Initialize WebGL if needed
    if (!gl && !initWebGL()) {
      console.error('Failed to initialize WebGL');
      return;
    }
    
    // Add canvas to page
    if (canvas && !canvas.parentNode) {
      document.body.appendChild(canvas);
    }
    
    isRunning = true;
    startTime = Date.now();
    canvas.dataset.targetFade = '1';
    
    // Apply logo wobble
    applyLogoWobble();
    
    // Start animation
    animate();
  }
  
  // Stop demo effect
  function stopDemo() {
    isRunning = false;
    
    if (canvas) {
      canvas.dataset.targetFade = '0';
    }
    
    // Let fade finish before stopping
    setTimeout(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      
      // Remove logo wobble
      removeLogoWobble();
    }, 1000);
  }
  
  // Listen for music events
  window.addEventListener('xm-play', startDemo);
  window.addEventListener('xm-pause', stopDemo);
  
  // Check initial state
  window.addEventListener('load', function() {
    if (window.xmPlayer && window.xmPlayer.isPlaying && window.xmPlayer.isPlaying()) {
      startDemo();
    }
  });
  
  // Export for external control
  window.demoEffect = {
    start: startDemo,
    stop: stopDemo,
    isRunning: () => isRunning
  };
})();