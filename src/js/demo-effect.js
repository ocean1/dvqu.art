// Demoscene WebGL effect for whoami page
(function () {
  let canvas = null;
  let gl = null;
  let program = null;
  let isRunning = false;
  let startTime = 0;
  let animationFrame = null;

  // Vertex positions for particles (pre-computed for performance)
  const NUM_PARTICLES = 15000;
  const particlePositions = new Float32Array(NUM_PARTICLES * 2);
  const particleIndices = new Float32Array(NUM_PARTICLES);

  // Initialize particle data
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particleIndices[i] = i;
  }

  // Shader sources
  const vertexShaderSource = `
    precision mediump float;
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
      float phase = mod(u_time * 0.25, 16.0);
      float aspect = u_resolution.x / max(u_resolution.y, 1.0);
      
      vec2 pos = vec2(0.0);
      v_brightness = 1.0;
      
      // Phase 0-4: Tunnel effect
      if (phase < 4.0) {
        float ring = mod(index, 150.0);
        float segment = floor(index / 150.0);
        float depth = segment * 0.15 + phase * 5.0;
        
        // Continuous depth without modulo to avoid discontinuities
        if (depth > 40.0) {
          // Wrap around smoothly
          depth = mod(depth, 40.0);
        }
        
        // Tunnel curve
        float curve = sin(depth * 0.15 + u_time * 0.5) * 0.08;
        float curveY = cos(depth * 0.1 + u_time * 0.3) * 0.04;
        
        // Tunnel equation - continuous perspective
        float z = depth * 0.12 + 0.01; // Very close start, smooth progression
        float radius = 0.9 / (z * z); // Quadratic perspective for smooth depth
        float angle = (ring / 150.0) * PI * 2.0 + depth * 0.02;
        
        pos.x = (cos(angle) * radius + curve) / aspect;
        pos.y = sin(angle) * radius + curveY;
        
        // Depth fog and brightness - much brighter
        v_brightness = 1.3 - depth * 0.02;
        v_brightness *= 0.9 + sin(angle * 5.0 - depth * 0.3) * 0.2;
        
        // Fade very close dots to avoid clipping
        if (depth < 1.0) {
          v_brightness *= smoothstep(0.0, 1.0, depth);
        }
        
        // Hide very far dots
        if (depth > 38.0 || radius > 3.0) {
          pos = vec2(10.0, 10.0);
          v_brightness = 0.0;
        }
      }
      // Phase 4-5: Disappearing (shorter)
      else if (phase < 5.0) {
        float fadePhase = phase - 4.0;
        float ring = mod(index, 150.0);
        float segment = floor(index / 150.0);
        float depth = segment * 0.15 + phase * 5.0;
        
        if (depth > 40.0) depth = mod(depth, 40.0);
        
        float curve = sin(depth * 0.15 + u_time * 0.5) * 0.08;
        float curveY = cos(depth * 0.1 + u_time * 0.3) * 0.04;
        
        float z = depth * 0.12 + 0.01;
        float radius = 0.9 / (z * z);
        float angle = (ring / 150.0) * PI * 2.0 + depth * 0.02;
        
        pos.x = (cos(angle) * radius + curve) / aspect;
        pos.y = sin(angle) * radius + curveY;
        
        // Random fade out
        if (hash(index * 7.0) < fadePhase) {
          pos = vec2(10.0, 10.0);
          v_brightness = 0.0;
        } else {
          v_brightness = (1.4 - depth * 0.02) * (1.0 - fadePhase * 0.3);
          if (depth < 1.0) {
            v_brightness *= smoothstep(0.0, 1.0, depth);
          }
        }
      }
      // Phase 5-7: Explosion to spheres
      else if (phase < 7.0) {
        float explodePhase = (phase - 5.0) / 2.0;
        
        // Explosion effect - particles fly outward from center
        float particleRandom = hash(index);
        float particleRandom2 = hash(index + 777.0);
        float particleRandom3 = hash(index + 333.0);
        
        // Explosion direction and speed
        float explodeAngle = particleRandom * PI * 2.0;
        float explodeElevation = (particleRandom2 - 0.5) * PI * 0.7; // Some vertical spread
        float explodeSpeed = particleRandom3 * 0.7 + 0.3; // Variable speeds
        
        // 3D explosion vector
        vec3 explodeDir = vec3(
          cos(explodeAngle) * cos(explodeElevation),
          sin(explodeElevation) * 0.5,
          sin(explodeAngle) * cos(explodeElevation)
        );
        
        // Explosion dynamics - fast at start, slows down
        float explodeT = 1.0 - pow(1.0 - explodePhase, 2.0);
        float explodeRadius = explodeT * explodeSpeed * 2.0;
        
        vec2 explodePos = vec2(explodeDir.x / aspect, explodeDir.y) * explodeRadius;
        
        // Fade during explosion
        float explodeBrightness = (1.0 - explodeT * 0.5) * 1.2;
        
        // Target sphere formation
        float sphereId = mod(index, 5.0);
        float pointId = floor(index / 5.0);
        
        // Sphere center orbit
        float sphereAngle = (sphereId / 5.0) * PI * 2.0 + u_time * 0.3;
        vec2 sphereCenter = vec2(cos(sphereAngle) * 0.5 / aspect, sin(sphereAngle) * 0.5);
        
        // Sphere surface point (3D to 2D projection)
        float theta = hash(pointId) * PI * 2.0 + u_time;
        float phi = acos(hash(pointId + 1000.0) * 2.0 - 1.0);
        
        vec3 sphere3D = vec3(
          sin(phi) * cos(theta),
          sin(phi) * sin(theta),
          cos(phi)
        ) * 0.2;
        
        // 3D rotation
        float rotY = u_time + sphereId;
        float cosRot = cos(rotY);
        float sinRot = sin(rotY);
        float newX = sphere3D.x * cosRot - sphere3D.z * sinRot;
        sphere3D.z = sphere3D.x * sinRot + sphere3D.z * cosRot;
        sphere3D.x = newX;
        
        vec2 spherePos = sphereCenter + vec2(sphere3D.x / aspect, sphere3D.y);
        float sphereBrightness = 0.7 + sphere3D.z * 2.0;
        
        // Smooth transition from explosion to spheres
        pos = mix(explodePos, spherePos, smoothstep(0.3, 0.95, explodePhase));
        v_brightness = mix(explodeBrightness, sphereBrightness, smoothstep(0.3, 0.95, explodePhase));
      }
      // Phase 7-10: Spheres to cubes
      else if (phase < 10.0) {
        float morphPhase = (phase - 7.0) / 3.0;
        
        float objectId = mod(index, 5.0);
        float pointId = floor(index / 5.0);
        
        // Object center
        float objAngle = (objectId / 5.0) * PI * 2.0 + u_time * 0.3;
        vec2 objCenter = vec2(cos(objAngle) * 0.5 / aspect, sin(objAngle) * 0.5);
        
        // Sphere point
        float theta = hash(pointId) * PI * 2.0 + u_time;
        float phi = acos(hash(pointId + 1000.0) * 2.0 - 1.0);
        vec3 sphere3D = vec3(
          sin(phi) * cos(theta),
          sin(phi) * sin(theta),
          cos(phi)
        ) * 0.2;
        
        // Cube edges
        float edge = mod(pointId * 7.0, 12.0);
        float t = fract(pointId * 0.618);
        vec3 cube3D;
        
        float s = 0.2;
        if (edge < 4.0) {
          if (edge < 1.0) cube3D = vec3(mix(-s, s, t), s, -s);
          else if (edge < 2.0) cube3D = vec3(s, s, mix(-s, s, t));
          else if (edge < 3.0) cube3D = vec3(mix(s, -s, t), s, s);
          else cube3D = vec3(-s, s, mix(s, -s, t));
        } else if (edge < 8.0) {
          edge -= 4.0;
          if (edge < 1.0) cube3D = vec3(mix(-s, s, t), -s, -s);
          else if (edge < 2.0) cube3D = vec3(s, -s, mix(-s, s, t));
          else if (edge < 3.0) cube3D = vec3(mix(s, -s, t), -s, s);
          else cube3D = vec3(-s, -s, mix(s, -s, t));
        } else {
          edge -= 8.0;
          if (edge < 1.0) cube3D = vec3(-s, mix(-s, s, t), -s);
          else if (edge < 2.0) cube3D = vec3(s, mix(-s, s, t), -s);
          else if (edge < 3.0) cube3D = vec3(-s, mix(-s, s, t), s);
          else cube3D = vec3(s, mix(-s, s, t), s);
        }
        
        // Rotate both
        float rotX = u_time * 0.7 + objectId;
        float rotY = u_time + objectId * 0.3;
        
        // Apply rotations
        vec3 temp;
        // Rotate X
        temp = sphere3D;
        sphere3D.y = temp.y * cos(rotX) - temp.z * sin(rotX);
        sphere3D.z = temp.y * sin(rotX) + temp.z * cos(rotX);
        
        temp = cube3D;
        cube3D.y = temp.y * cos(rotX) - temp.z * sin(rotX);
        cube3D.z = temp.y * sin(rotX) + temp.z * cos(rotX);
        
        // Rotate Y
        temp = sphere3D;
        sphere3D.x = temp.x * cos(rotY) - temp.z * sin(rotY);
        sphere3D.z = temp.x * sin(rotY) + temp.z * cos(rotY);
        
        temp = cube3D;
        cube3D.x = temp.x * cos(rotY) - temp.z * sin(rotY);
        cube3D.z = temp.x * sin(rotY) + temp.z * cos(rotY);
        
        vec3 morphed = mix(sphere3D, cube3D, smoothstep(0.0, 1.0, morphPhase));
        pos = objCenter + vec2(morphed.x / aspect, morphed.y);
        v_brightness = 0.7 + morphed.z * 2.0;
      }
      // Phase 10-13: Cubes to 3D polygons (pyramid, prism, etc)
      else if (phase < 13.0) {
        float morphPhase = (phase - 10.0) / 3.0;
        
        float objectId = mod(index, 6.0);
        float pointId = floor(index / 6.0);
        
        // Object center - keep consistent from previous phase
        float objAngle = (objectId / 6.0) * PI * 2.0 + u_time * 0.3;
        vec2 objCenter = vec2(cos(objAngle) * 0.5 / aspect, sin(objAngle) * 0.5);
        
        // Cube from previous phase (keeping same structure)
        float edge = mod(pointId * 7.0, 12.0);
        float t = fract(pointId * 0.618);
        vec3 cube3D;
        
        float s = 0.2;
        if (edge < 4.0) {
          if (edge < 1.0) cube3D = vec3(mix(-s, s, t), s, -s);
          else if (edge < 2.0) cube3D = vec3(s, s, mix(-s, s, t));
          else if (edge < 3.0) cube3D = vec3(mix(s, -s, t), s, s);
          else cube3D = vec3(-s, s, mix(s, -s, t));
        } else if (edge < 8.0) {
          edge -= 4.0;
          if (edge < 1.0) cube3D = vec3(mix(-s, s, t), -s, -s);
          else if (edge < 2.0) cube3D = vec3(s, -s, mix(-s, s, t));
          else if (edge < 3.0) cube3D = vec3(mix(s, -s, t), -s, s);
          else cube3D = vec3(-s, -s, mix(s, -s, t));
        } else {
          edge -= 8.0;
          if (edge < 1.0) cube3D = vec3(-s, mix(-s, s, t), -s);
          else if (edge < 2.0) cube3D = vec3(s, mix(-s, s, t), -s);
          else if (edge < 3.0) cube3D = vec3(-s, mix(-s, s, t), s);
          else cube3D = vec3(s, mix(-s, s, t), s);
        }
        
        // 3D Polygons based on objectId
        vec3 poly3D;
        float polyPointId = mod(pointId, 60.0); // More points per shape
        
        if (objectId < 1.0) {
          // Tetrahedron (4 faces)
          float face = floor(polyPointId / 15.0);
          float edgeT = mod(polyPointId, 15.0) / 14.0;
          
          vec3 v0, v1, v2;
          if (face < 1.0) {
            v0 = vec3(0, s, 0); v1 = vec3(s*0.866, -s*0.5, 0); v2 = vec3(-s*0.866, -s*0.5, 0);
          } else if (face < 2.0) {
            v0 = vec3(0, s, 0); v1 = vec3(0, 0, s); v2 = vec3(s*0.866, -s*0.5, 0);
          } else if (face < 3.0) {
            v0 = vec3(0, s, 0); v1 = vec3(-s*0.866, -s*0.5, 0); v2 = vec3(0, 0, s);
          } else {
            v0 = vec3(s*0.866, -s*0.5, 0); v1 = vec3(0, 0, s); v2 = vec3(-s*0.866, -s*0.5, 0);
          }
          
          // Interpolate along edges
          float edgeId = mod(polyPointId * 3.0, 3.0);
          if (edgeId < 1.0) poly3D = mix(v0, v1, edgeT);
          else if (edgeId < 2.0) poly3D = mix(v1, v2, edgeT);
          else poly3D = mix(v2, v0, edgeT);
          
        } else if (objectId < 2.0) {
          // Octahedron (8 faces)
          float faceGroup = floor(polyPointId / 7.5);
          float edgeT = mod(polyPointId * 2.0, 15.0) / 14.0;
          
          vec3 top = vec3(0, s, 0);
          vec3 bottom = vec3(0, -s, 0);
          vec3 v1 = vec3(s, 0, 0);
          vec3 v2 = vec3(0, 0, s);
          vec3 v3 = vec3(-s, 0, 0);
          vec3 v4 = vec3(0, 0, -s);
          
          if (faceGroup < 2.0) {
            poly3D = mix(top, mix(v1, v2, edgeT), mod(polyPointId * 0.7, 1.0));
          } else if (faceGroup < 4.0) {
            poly3D = mix(top, mix(v3, v4, edgeT), mod(polyPointId * 0.7, 1.0));
          } else if (faceGroup < 6.0) {
            poly3D = mix(bottom, mix(v1, v2, edgeT), mod(polyPointId * 0.7, 1.0));
          } else {
            poly3D = mix(bottom, mix(v3, v4, edgeT), mod(polyPointId * 0.7, 1.0));
          }
          
        } else if (objectId < 3.0) {
          // Triangular prism
          float section = floor(polyPointId / 20.0);
          float sectionT = mod(polyPointId, 20.0) / 19.0;
          
          if (section < 1.0) {
            // Top triangle
            vec3 v0 = vec3(0, s*0.5, s);
            vec3 v1 = vec3(s*0.866, s*0.5, -s*0.5);
            vec3 v2 = vec3(-s*0.866, s*0.5, -s*0.5);
            float edge = mod(polyPointId * 3.0, 3.0);
            if (edge < 1.0) poly3D = mix(v0, v1, sectionT);
            else if (edge < 2.0) poly3D = mix(v1, v2, sectionT);
            else poly3D = mix(v2, v0, sectionT);
          } else if (section < 2.0) {
            // Bottom triangle
            vec3 v0 = vec3(0, -s*0.5, s);
            vec3 v1 = vec3(s*0.866, -s*0.5, -s*0.5);
            vec3 v2 = vec3(-s*0.866, -s*0.5, -s*0.5);
            float edge = mod(polyPointId * 3.0, 3.0);
            if (edge < 1.0) poly3D = mix(v0, v1, sectionT);
            else if (edge < 2.0) poly3D = mix(v1, v2, sectionT);
            else poly3D = mix(v2, v0, sectionT);
          } else {
            // Vertical edges
            float edgeId = mod(polyPointId * 4.0, 3.0);
            vec3 top, bot;
            if (edgeId < 1.0) {
              top = vec3(0, s*0.5, s); bot = vec3(0, -s*0.5, s);
            } else if (edgeId < 2.0) {
              top = vec3(s*0.866, s*0.5, -s*0.5); bot = vec3(s*0.866, -s*0.5, -s*0.5);
            } else {
              top = vec3(-s*0.866, s*0.5, -s*0.5); bot = vec3(-s*0.866, -s*0.5, -s*0.5);
            }
            poly3D = mix(top, bot, sectionT);
          }
          
        } else if (objectId < 4.0) {
          // Pyramid (square base)
          float face = floor(polyPointId / 15.0);
          float edgeT = mod(polyPointId, 15.0) / 14.0;
          
          vec3 apex = vec3(0, s, 0);
          vec3 base1 = vec3(s, -s*0.5, s);
          vec3 base2 = vec3(s, -s*0.5, -s);
          vec3 base3 = vec3(-s, -s*0.5, -s);
          vec3 base4 = vec3(-s, -s*0.5, s);
          
          if (face < 1.0) {
            float e = mod(polyPointId * 3.0, 3.0);
            if (e < 1.0) poly3D = mix(apex, base1, edgeT);
            else if (e < 2.0) poly3D = mix(base1, base2, edgeT);
            else poly3D = mix(base2, apex, edgeT);
          } else if (face < 2.0) {
            float e = mod(polyPointId * 3.0, 3.0);
            if (e < 1.0) poly3D = mix(apex, base3, edgeT);
            else if (e < 2.0) poly3D = mix(base3, base4, edgeT);
            else poly3D = mix(base4, apex, edgeT);
          } else {
            // Base square
            float e = mod(polyPointId * 4.0, 4.0);
            if (e < 1.0) poly3D = mix(base1, base2, edgeT);
            else if (e < 2.0) poly3D = mix(base2, base3, edgeT);
            else if (e < 3.0) poly3D = mix(base3, base4, edgeT);
            else poly3D = mix(base4, base1, edgeT);
          }
          
        } else {
          // Dodecahedron approximation (12 pentagonal faces - simplified)
          float phi = (1.0 + sqrt(5.0)) / 2.0;
          float invPhi = 1.0 / phi;
          
          // Sample vertices
          float vId = mod(polyPointId * 0.3, 20.0);
          if (vId < 4.0) {
            poly3D = vec3(s, s, s) * (mod(vId, 2.0) * 2.0 - 1.0);
          } else if (vId < 8.0) {
            poly3D = vec3(0, s*invPhi, s*phi) * (mod(vId, 2.0) * 2.0 - 1.0);
          } else if (vId < 12.0) {
            poly3D = vec3(s*invPhi, s*phi, 0) * (mod(vId, 2.0) * 2.0 - 1.0);
          } else {
            poly3D = vec3(s*phi, 0, s*invPhi) * (mod(vId, 2.0) * 2.0 - 1.0);
          }
          poly3D *= 0.5;
        }
        
        // Apply same rotation to both shapes
        float rotX = u_time * 0.7 + objectId;
        float rotY = u_time + objectId * 0.3;
        
        vec3 temp;
        // Rotate cube
        temp = cube3D;
        cube3D.y = temp.y * cos(rotX) - temp.z * sin(rotX);
        cube3D.z = temp.y * sin(rotX) + temp.z * cos(rotX);
        temp = cube3D;
        cube3D.x = temp.x * cos(rotY) - temp.z * sin(rotY);
        cube3D.z = temp.x * sin(rotY) + temp.z * cos(rotY);
        
        // Rotate polygon
        temp = poly3D;
        poly3D.y = temp.y * cos(rotX) - temp.z * sin(rotX);
        poly3D.z = temp.y * sin(rotX) + temp.z * cos(rotX);
        temp = poly3D;
        poly3D.x = temp.x * cos(rotY) - temp.z * sin(rotY);
        poly3D.z = temp.x * sin(rotY) + temp.z * cos(rotY);
        
        vec3 shape3D = mix(cube3D, poly3D, smoothstep(0.0, 1.0, morphPhase));
        pos = objCenter + vec2(shape3D.x / aspect, shape3D.y);
        v_brightness = 0.7 + shape3D.z * 2.0;
      }
      // Phase 13-16: 3D Polygons back to tunnel
      else {
        float morphPhase = (phase - 13.0) / 3.0;
        
        float objectId = mod(index, 6.0);
        float pointId = floor(index / 6.0);
        
        // Keep polygon from previous phase - must match exactly
        vec3 poly3D;
        float polyPointId = mod(pointId, 60.0);
        
        float objAngle = (objectId / 6.0) * PI * 2.0 + u_time * 0.3;
        vec2 objCenter = vec2(cos(objAngle) * 0.5 / aspect, sin(objAngle) * 0.5);
        
        // Same polygon generation as phase 10-13
        float s = 0.2;
        if (objectId < 1.0) {
          // Tetrahedron
          float face = floor(polyPointId / 15.0);
          float edgeT = mod(polyPointId, 15.0) / 14.0;
          vec3 v0, v1, v2;
          if (face < 1.0) {
            v0 = vec3(0, s, 0); v1 = vec3(s*0.866, -s*0.5, 0); v2 = vec3(-s*0.866, -s*0.5, 0);
          } else if (face < 2.0) {
            v0 = vec3(0, s, 0); v1 = vec3(0, 0, s); v2 = vec3(s*0.866, -s*0.5, 0);
          } else if (face < 3.0) {
            v0 = vec3(0, s, 0); v1 = vec3(-s*0.866, -s*0.5, 0); v2 = vec3(0, 0, s);
          } else {
            v0 = vec3(s*0.866, -s*0.5, 0); v1 = vec3(0, 0, s); v2 = vec3(-s*0.866, -s*0.5, 0);
          }
          float edgeId = mod(polyPointId * 3.0, 3.0);
          if (edgeId < 1.0) poly3D = mix(v0, v1, edgeT);
          else if (edgeId < 2.0) poly3D = mix(v1, v2, edgeT);
          else poly3D = mix(v2, v0, edgeT);
        } else if (objectId < 2.0) {
          // Octahedron
          float faceGroup = floor(polyPointId / 7.5);
          float edgeT = mod(polyPointId * 2.0, 15.0) / 14.0;
          vec3 top = vec3(0, s, 0);
          vec3 bottom = vec3(0, -s, 0);
          vec3 v1 = vec3(s, 0, 0);
          vec3 v2 = vec3(0, 0, s);
          vec3 v3 = vec3(-s, 0, 0);
          vec3 v4 = vec3(0, 0, -s);
          if (faceGroup < 2.0) {
            poly3D = mix(top, mix(v1, v2, edgeT), mod(polyPointId * 0.7, 1.0));
          } else if (faceGroup < 4.0) {
            poly3D = mix(top, mix(v3, v4, edgeT), mod(polyPointId * 0.7, 1.0));
          } else if (faceGroup < 6.0) {
            poly3D = mix(bottom, mix(v1, v2, edgeT), mod(polyPointId * 0.7, 1.0));
          } else {
            poly3D = mix(bottom, mix(v3, v4, edgeT), mod(polyPointId * 0.7, 1.0));
          }
        } else if (objectId < 3.0) {
          // Triangular prism
          float section = floor(polyPointId / 20.0);
          float sectionT = mod(polyPointId, 20.0) / 19.0;
          if (section < 1.0) {
            vec3 v0 = vec3(0, s*0.5, s);
            vec3 v1 = vec3(s*0.866, s*0.5, -s*0.5);
            vec3 v2 = vec3(-s*0.866, s*0.5, -s*0.5);
            float edge = mod(polyPointId * 3.0, 3.0);
            if (edge < 1.0) poly3D = mix(v0, v1, sectionT);
            else if (edge < 2.0) poly3D = mix(v1, v2, sectionT);
            else poly3D = mix(v2, v0, sectionT);
          } else if (section < 2.0) {
            vec3 v0 = vec3(0, -s*0.5, s);
            vec3 v1 = vec3(s*0.866, -s*0.5, -s*0.5);
            vec3 v2 = vec3(-s*0.866, -s*0.5, -s*0.5);
            float edge = mod(polyPointId * 3.0, 3.0);
            if (edge < 1.0) poly3D = mix(v0, v1, sectionT);
            else if (edge < 2.0) poly3D = mix(v1, v2, sectionT);
            else poly3D = mix(v2, v0, sectionT);
          } else {
            float edgeId = mod(polyPointId * 4.0, 3.0);
            vec3 top, bot;
            if (edgeId < 1.0) {
              top = vec3(0, s*0.5, s); bot = vec3(0, -s*0.5, s);
            } else if (edgeId < 2.0) {
              top = vec3(s*0.866, s*0.5, -s*0.5); bot = vec3(s*0.866, -s*0.5, -s*0.5);
            } else {
              top = vec3(-s*0.866, s*0.5, -s*0.5); bot = vec3(-s*0.866, -s*0.5, -s*0.5);
            }
            poly3D = mix(top, bot, sectionT);
          }
        } else if (objectId < 4.0) {
          // Pyramid
          float face = floor(polyPointId / 15.0);
          float edgeT = mod(polyPointId, 15.0) / 14.0;
          vec3 apex = vec3(0, s, 0);
          vec3 base1 = vec3(s, -s*0.5, s);
          vec3 base2 = vec3(s, -s*0.5, -s);
          vec3 base3 = vec3(-s, -s*0.5, -s);
          vec3 base4 = vec3(-s, -s*0.5, s);
          if (face < 1.0) {
            float e = mod(polyPointId * 3.0, 3.0);
            if (e < 1.0) poly3D = mix(apex, base1, edgeT);
            else if (e < 2.0) poly3D = mix(base1, base2, edgeT);
            else poly3D = mix(base2, apex, edgeT);
          } else if (face < 2.0) {
            float e = mod(polyPointId * 3.0, 3.0);
            if (e < 1.0) poly3D = mix(apex, base3, edgeT);
            else if (e < 2.0) poly3D = mix(base3, base4, edgeT);
            else poly3D = mix(base4, apex, edgeT);
          } else {
            float e = mod(polyPointId * 4.0, 4.0);
            if (e < 1.0) poly3D = mix(base1, base2, edgeT);
            else if (e < 2.0) poly3D = mix(base2, base3, edgeT);
            else if (e < 3.0) poly3D = mix(base3, base4, edgeT);
            else poly3D = mix(base4, base1, edgeT);
          }
        } else {
          // Dodecahedron
          float phi = (1.0 + sqrt(5.0)) / 2.0;
          float invPhi = 1.0 / phi;
          float vId = mod(polyPointId * 0.3, 20.0);
          if (vId < 4.0) {
            poly3D = vec3(s, s, s) * (mod(vId, 2.0) * 2.0 - 1.0);
          } else if (vId < 8.0) {
            poly3D = vec3(0, s*invPhi, s*phi) * (mod(vId, 2.0) * 2.0 - 1.0);
          } else if (vId < 12.0) {
            poly3D = vec3(s*invPhi, s*phi, 0) * (mod(vId, 2.0) * 2.0 - 1.0);
          } else {
            poly3D = vec3(s*phi, 0, s*invPhi) * (mod(vId, 2.0) * 2.0 - 1.0);
          }
          poly3D *= 0.5;
        }
        
        // Apply rotation (continuous from previous phase)
        float rotX = u_time * 0.7 + objectId;
        float rotY = u_time + objectId * 0.3;
        vec3 temp;
        temp = poly3D;
        poly3D.y = temp.y * cos(rotX) - temp.z * sin(rotX);
        poly3D.z = temp.y * sin(rotX) + temp.z * cos(rotX);
        temp = poly3D;
        poly3D.x = temp.x * cos(rotY) - temp.z * sin(rotY);
        poly3D.z = temp.x * sin(rotY) + temp.z * cos(rotY);
        
        // Fade out object center
        objCenter *= (1.0 - morphPhase * 0.8);
        vec2 polyPos = objCenter + vec2(poly3D.x / aspect, poly3D.y);
        
        // Target tunnel position
        float ring = mod(index, 150.0);
        float segment = floor(index / 150.0);
        float depth = segment * 0.15 + morphPhase * 4.0;
        
        float curve = sin(depth * 0.15 + u_time * 0.5) * 0.08 * morphPhase;
        float curveY = cos(depth * 0.1 + u_time * 0.3) * 0.04 * morphPhase;
        
        float z = depth * 0.12 + 0.01;
        float radius = 0.9 / (z * z);
        float tunnelAngle = (ring / 150.0) * PI * 2.0 + depth * 0.02;
        vec2 tunnelPos = vec2((cos(tunnelAngle) * radius + curve) / aspect, sin(tunnelAngle) * radius + curveY);
        
        pos = mix(polyPos, tunnelPos, smoothstep(0.0, 1.0, morphPhase));
        float tunnelBrightness = 1.4 - depth * 0.02;
        if (depth < 1.0) {
          tunnelBrightness *= smoothstep(0.0, 1.0, depth);
        }
        v_brightness = mix(0.7 + poly3D.z * 2.0, tunnelBrightness, smoothstep(0.0, 1.0, morphPhase));
      }
      
      gl_Position = vec4(pos, 0.0, 1.0);
      
      // Scale point size based on viewport
      float viewportScale = min(u_resolution.x, u_resolution.y) / 800.0;
      gl_PointSize = max(1.0, 2.0 * viewportScale);
    }
  `;

  const fragmentShaderSource = `
    precision mediump float;
    uniform float u_fade;
    uniform vec2 u_resolution;
    varying float v_brightness;
    
    void main() {
      // Distance from center of point
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      
      // Square pixels
      if (max(abs(coord.x), abs(coord.y)) > 0.5) {
        discard;
      }
      
      // Reduce opacity on smaller viewports
      float viewportScale = min(u_resolution.x, u_resolution.y) / 800.0;
      float mobileOpacityScale = mix(0.5, 1.0, clamp(viewportScale, 0.0, 1.0));
      
      float alpha = v_brightness * u_fade * 0.56 * mobileOpacityScale;
      gl_FragColor = vec4(vec3(1.0), alpha);
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
    const lines = logo.dataset.originalContent.split(/\r?\n/).filter((line => line.length > 0));

    // Generate CSS animations on the fly
    let css = '';

    // Create keyframes for each line
    lines.forEach((line, index) => {
      const animName = 'wobble-line-' + index;
      css += '@keyframes ' + animName + ' {\n';

      // Generate smooth sine wave keyframes
      for (let i = 0; i <= 100; i += 5) {
        const time = (i / 100) * Math.PI * 2;
        const offset = Math.sin(time + index * 0.7) * 10;
        css += '  ' + i + '% { transform: translateX(' + offset + 'px); }\n';
      }

      css += '}\n';
    });

    // Add line styles with overflow hidden to prevent scrollbar
    css += '.wobble-line { display: block; line-height: 1; margin: 0; padding: 0; animation: 2.5s ease-in-out infinite; overflow: hidden; }\n';
    css += '.logo { overflow: hidden; }\n';

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
    }, 500);
  }

  // Listen for music events
  window.addEventListener('xm-play', startDemo);
  window.addEventListener('xm-pause', stopDemo);

  // Check initial state
  window.addEventListener('load', function () {
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