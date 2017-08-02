// TODO: Make a particle texture atlas in photoshop
// TODO: Particle effect tutorial lit tweet w/ gif of fire
// TODO: In the article comment that you might use a post processing effect such as bloom on your fire
var canvas = document.createElement('canvas')
canvas.width = 500
canvas.height = 500
var mountLocation = document.getElementById('webgl-particle-effect-tutorial') || document.body
mountLocation.appendChild(canvas)

var gl = canvas.getContext('webgl')
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.viewport(0, 0, 500, 500)

var vertexGLSL = `
uniform float uTime;
uniform vec3 uStartPos;
uniform vec3 uVelocity;
uniform vec3 uAcceleration;

attribute float aLifetime;
attribute vec2 aTextureCoords;
attribute vec2 aTriCorner;
attribute vec3 aCenterOffset;

uniform mat4 uPMatrix;

varying float vLifetime;
varying vec2 vTextureCoords;

void main (void) {
  vec4 position;
  if (uTime < aLifetime) {
    position.xyz = uStartPos + (uTime * uVelocity);
    position.w = 1.0;
  } else {
    position = vec4(-1000, -1000, 0, 0);
  }
  position.xyz += aCenterOffset;

  vLifetime = 1.3 - (uTime / aLifetime);
  vLifetime = clamp(vLifetime, 0.0, 1.0);

  float size = (vLifetime * vLifetime) * 0.1;
  position.xy += aTriCorner.xy * size;

  // position.xy += aTriCorner.xy * 0.3;
  position.z = -0.1;
  gl_Position = position;
  vTextureCoords = aTextureCoords;
  vLifetime = aLifetime;
}
`

var fragmentGLSL = `
precision mediump float;

// Adjust the color of the fire
uniform vec4 uColor;

uniform float uTimeFrag;

varying float vLifetime;
varying vec2 vTextureCoords;

uniform sampler2D fireAtlas;

void main (void) {
  float percentOfLife = uTimeFrag / vLifetime;
  percentOfLife = clamp(percentOfLife, 0.0, 1.0);
  float offset = floor(16.0 * percentOfLife);
  // float offset = 16.0;
  float offsetX = floor(mod(offset, 4.0)) / 4.0;
  float offsetY = 0.75 - floor(offset / 4.0) / 4.0;

 // vec4 texColor = texture2D(fireAtlas, vTextureCoords);
 vec4 texColor = texture2D(fireAtlas, vec2((vTextureCoords.x / 4.0) + offsetX, (vTextureCoords.y / 4.0) + offsetY));
 gl_FragColor = uColor * texColor;
 // gl_FragColor.a *= vLifetime;
}
`

var vertexShader = gl.createShader(gl.VERTEX_SHADER)
gl.shaderSource(vertexShader, vertexGLSL)
gl.compileShader(vertexShader)
console.log(gl.getShaderInfoLog(vertexShader))

var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
gl.shaderSource(fragmentShader, fragmentGLSL)
gl.compileShader(fragmentShader)
console.log(gl.getShaderInfoLog(fragmentShader))

var shaderProgram = gl.createProgram()
gl.attachShader(shaderProgram, vertexShader)
gl.attachShader(shaderProgram, fragmentShader)
gl.linkProgram(shaderProgram)
gl.useProgram(shaderProgram)

var lifetimeAttrib = gl.getAttribLocation(shaderProgram, 'aLifetime')
var texCoordAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoords')
var triCornerAttrib = gl.getAttribLocation(shaderProgram, 'aTriCorner')
var centerOffsetAttrib = gl.getAttribLocation(shaderProgram, 'aCenterOffset')
gl.enableVertexAttribArray(lifetimeAttrib)
gl.enableVertexAttribArray(texCoordAttrib)
gl.enableVertexAttribArray(triCornerAttrib)
gl.enableVertexAttribArray(centerOffsetAttrib)

var timeUni = gl.getUniformLocation(shaderProgram, 'uTime')
var timeUniFrag = gl.getUniformLocation(shaderProgram, 'uTimeFrag')
var startPosUni = gl.getUniformLocation(shaderProgram, 'uStartPos')
var velocityUni = gl.getUniformLocation(shaderProgram, 'uVelocity')
var accelerationUni = gl.getUniformLocation(shaderProgram, 'uAcceleration')
var perspectiveUni = gl.getUniformLocation(shaderProgram, 'uPMatrix')
var colorUni = gl.getUniformLocation(shaderProgram, 'uColor')
var fireAtlasUni = gl.getUniformLocation(shaderProgram, 'uFireAtlas')

var imageIsLoaded = false
var fireTexture = gl.createTexture()
var fireAtlas = new window.Image()
fireAtlas.onload = function () {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.bindTexture(gl.TEXTURE_2D, fireTexture)
  // TODO: What do these even do?
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fireAtlas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  imageIsLoaded = true
}
fireAtlas.src = 'fire-texture-atlas.jpg'

var numParticles = 100
var lifetimes = []
var triCorners = []
var texCoords = []
var vertexIndices = []
var centerOffsets = []
var triCornersCycle = [
  -1.0, -1.0,
  1.0, -1.0,
  1.0, 1.0,
  -1.0, 1.0
]
var texCoordsCycle = [
  0, 0,
  1, 0,
  1, 1,
  0, 1
]

for (var i = 0; i < numParticles; i++) {
  var lifetime = 10 * Math.random()

  var diameterAroundCenter = 0.5
  var halfDiameterAroundCenter = diameterAroundCenter / 2

  var xStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter
  var yStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter
  var zStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter

  for (var j = 0; j < 4; j++) {
    lifetimes.push(lifetime)
    triCorners.push(triCornersCycle[j * 2])
    triCorners.push(triCornersCycle[j * 2 + 1])
    texCoords.push(texCoordsCycle[j * 2])
    texCoords.push(texCoordsCycle[j * 2 + 1])
    centerOffsets.push(xStartOffset)
    centerOffsets.push(yStartOffset)
    centerOffsets.push(zStartOffset)
  }

  vertexIndices = vertexIndices.concat([
    0, 1, 2, 0, 2, 3
  ].map(function (num) { return num + 4 * i }))
}

var lifetimesBuffer = createBuffer('ARRAY_BUFFER', Float32Array, lifetimes)
gl.vertexAttribPointer(lifetimeAttrib, 1, gl.FLOAT, false, 0, 0)

var texCoordBuffer = createBuffer('ARRAY_BUFFER', Float32Array, texCoords)
gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 0, 0)

var triCornerBuffer = createBuffer('ARRAY_BUFFER', Float32Array, triCorners)
gl.vertexAttribPointer(triCornerAttrib, 2, gl.FLOAT, false, 0, 0)

var centerOffsetBuffer = createBuffer('ARRAY_BUFFER', Float32Array, centerOffsets)
gl.vertexAttribPointer(centerOffsetAttrib, 3, gl.FLOAT, false, 0, 0)

var vertexIndexBuffer = createBuffer('ELEMENT_ARRAY_BUFFER', Uint16Array, vertexIndices)

// Used to create a new WebGL buffer for pushing data to the GPU
function createBuffer (bufferType, DataType, data) {
  var buffer = gl.createBuffer()
  gl.bindBuffer(gl[bufferType], buffer)
  gl.bufferData(gl[bufferType], new DataType(data), gl.STATIC_DRAW)
  return buffer
}

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

gl.activeTexture(gl.TEXTURE0)
gl.bindTexture(gl.TEXTURE_2D, fireTexture)
gl.uniform1i(fireAtlasUni, 0)

gl.uniform1f(timeUni, 0.1)
gl.uniform1f(timeUniFrag, 0.1)

gl.uniform3fv(startPosUni, [0.0, 0.0, 0.0])
gl.uniform3fv(velocityUni, [0.0, 0.1, 0.0])
gl.uniform3fv(accelerationUni, [1.0, 1.0, 1.0])
gl.uniform4fv(colorUni, [1.0, 1.0, 1.0, 1.0])
gl.uniformMatrix4fv(perspectiveUni, false, [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0])

var previousTime = new Date().getTime()
var clockTime = 0
function draw () {
  if (imageIsLoaded) {
    // TODO: What does this do?
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    var currentTime = new Date().getTime()
    clockTime += (currentTime - previousTime) / 1000
    previousTime = currentTime

    gl.uniform1f(timeUni, clockTime % 10)
    gl.uniform1f(timeUniFrag, clockTime % 10)

    gl.drawElements(gl.TRIANGLES, numParticles * 6, gl.UNSIGNED_SHORT, 0)
  }

  window.requestAnimationFrame(draw)
}
draw()
