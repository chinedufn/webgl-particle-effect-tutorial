/**
 * Section 1 - Getting our interface set up
 */

// gl-mat4 is a collection of different 4x4 matrix math operations
// You can find it at -> https://github.com/stackgl/gl-mat4
var glMat4 = require('gl-mat4')

// We'll use this variable to enable or disable billboarding whenever we
// click on a button
var billboardingEnabled = true

// We create a canvas that we'll render our particle effect onto
var canvas = document.createElement('canvas')
canvas.width = 500
canvas.height = 500
var mountLocation = document.getElementById('webgl-particle-effect-tutorial') || document.body

// Make the button that lets us turn billboarding on and off when we click it
var billboardButton = document.createElement('button')
billboardButton.innerHTML = 'Click to disable billboarding'
billboardButton.style.display = 'block'
billboardButton.style.cursor = 'pointer'
billboardButton.style.marginBottom = '3px'
billboardButton.style.height = '40px'
billboardButton.style.width = '160px'
billboardButton.onclick = function () {
  billboardingEnabled = !billboardingEnabled
  billboardButton.innerHTML = (billboardingEnabled ? 'Click to disable billboarding' : 'Click to enable billboarding')
}

// Add our button and canvas into the page
mountLocation.appendChild(billboardButton)
mountLocation.appendChild(canvas)

/**
 * Section 2 - Canvas mouse / touch movement controls
 */
var isDragging = false

// Our rotation about the x and y axes of the world
var xRotation = 0
var yRotation = 0

// The last x and y coordinate in the page that we moved
// our mouse or finger. We use this to know much much you've
// dragged the canvas
var lastMouseX = 0
var lastMouseY = 0

// When you mouse down we begin dragging
canvas.onmousedown = function (e) {
  isDragging = true
  lastMouseX = e.pageX
  lastMouseY = e.pageY
}
// As you move your mouse we adjust the x and y rotation of
// our camera around the world x and y axes
canvas.onmousemove = function (e) {
  if (isDragging) {
    xRotation += (e.pageY - lastMouseY) / 50
    yRotation -= (e.pageX - lastMouseX) / 50

    xRotation = Math.min(xRotation, Math.PI / 2.5)
    xRotation = Math.max(xRotation, -Math.PI / 2.5)

    lastMouseX = e.pageX
    lastMouseY = e.pageY
  }
}
// When you let go of your click we stop dragging the scene
canvas.onmouseup = function (e) {
  isDragging = false
}

// As you drag your finger we move the camera
canvas.addEventListener('touchstart', function (e) {
  lastMouseX = e.touches[0].clientX
  lastMouseY = e.touches[0].clientY
})
canvas.addEventListener('touchmove', function (e) {
  e.preventDefault()
  xRotation += (e.touches[0].clientY - lastMouseY) / 50
  yRotation -= (e.touches[0].clientX - lastMouseX) / 50

  xRotation = Math.min(xRotation, Math.PI / 2.5)
  xRotation = Math.max(xRotation, -Math.PI / 2.5)

  lastMouseX = e.touches[0].clientX
  lastMouseY = e.touches[0].clientY
})

/**
 * Section 3 - Setting up our shader
 */

// We get our canvas' WebGL context so that we can render onto it's
// drawing buffer
var gl = canvas.getContext('webgl')
gl.clearColor(0.0, 0.0, 0.0, 1.0)
gl.viewport(0, 0, 500, 500)

// Let's create our particles' vertex shader. This is the meat of our
// simulation.
var vertexGLSL = `
// The current time in our simulation. A particle's
// position is a function of the current time.
uniform float uTime;

// The location of the center of the fire
uniform vec3 uFirePos;

// The random amount of time that this particle should
// live before re-starting it's motion.
attribute float aLifetime;

// The uv coordinates of this vertex
attribute vec2 aTextureCoords;

// How far this vertex is from the center of this invidual particle
attribute vec2 aTriCorner;

// How far this particle starts from the center of the entire flame
attribute vec3 aCenterOffset;

// The randomly generated velocity of the particle
attribute vec3 aVelocity;

// Our perspective and world view matrix
uniform mat4 uPMatrix;
uniform mat4 uViewMatrix;

// Whether or not to make our particles face the camera. This
// is used to illustrate the difference between billboarding and
// not billboarding your particle quads.
uniform bool uUseBillboarding;

// We pass the lifetime and uv coordinates to our fragment shader
varying float vLifetime;
varying vec2 vTextureCoords;

void main (void) {
  // Loop the particle through it's lifetime by using the modulus
  // of the current time and the lifetime
  float time = mod(uTime, aLifetime);

  // We start by positioning our particle at the fire's position. We then
  //
  vec4 position = vec4(uFirePos + aCenterOffset + (time * aVelocity), 1.0);

  vLifetime = 1.3 - (time / aLifetime);
  vLifetime = clamp(vLifetime, 0.0, 1.0);

  float size = (vLifetime * vLifetime) * 0.05;

  if (uUseBillboarding) {
    vec3 cameraRight = vec3(uViewMatrix[0].x, uViewMatrix[1].x, uViewMatrix[2].x);
    vec3 cameraUp = vec3(uViewMatrix[0].y, uViewMatrix[1].y, uViewMatrix[2].y);

    position.xyz += (cameraRight * aTriCorner.x * size) + (cameraUp * aTriCorner.y * size);
  } else {
    position.xy += aTriCorner.xy * size;
  }

  gl_Position = uPMatrix * uViewMatrix * position;

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
  float time = mod(uTimeFrag, vLifetime);

  float percentOfLife = time / vLifetime;
  percentOfLife = clamp(percentOfLife, 0.0, 1.0);
  float offset = floor(16.0 * percentOfLife);
  // float offset = 16.0;
  float offsetX = floor(mod(offset, 4.0)) / 4.0;
  float offsetY = 0.75 - floor(offset / 4.0) / 4.0;

  // vec4 texColor = texture2D(fireAtlas, vTextureCoords);
  vec4 texColor = texture2D(fireAtlas, vec2((vTextureCoords.x / 4.0) + offsetX, (vTextureCoords.y / 4.0) + offsetY));
  gl_FragColor = uColor * texColor;

  gl_FragColor.a *= vLifetime;
}
`

var vertexShader = gl.createShader(gl.VERTEX_SHADER)
gl.shaderSource(vertexShader, vertexGLSL)
gl.compileShader(vertexShader)

var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
gl.shaderSource(fragmentShader, fragmentGLSL)
gl.compileShader(fragmentShader)

var shaderProgram = gl.createProgram()
gl.attachShader(shaderProgram, vertexShader)
gl.attachShader(shaderProgram, fragmentShader)
gl.linkProgram(shaderProgram)
gl.useProgram(shaderProgram)

var lifetimeAttrib = gl.getAttribLocation(shaderProgram, 'aLifetime')
var texCoordAttrib = gl.getAttribLocation(shaderProgram, 'aTextureCoords')
var triCornerAttrib = gl.getAttribLocation(shaderProgram, 'aTriCorner')
var centerOffsetAttrib = gl.getAttribLocation(shaderProgram, 'aCenterOffset')
var velocityAttrib = gl.getAttribLocation(shaderProgram, 'aVelocity')
gl.enableVertexAttribArray(lifetimeAttrib)
gl.enableVertexAttribArray(texCoordAttrib)
gl.enableVertexAttribArray(triCornerAttrib)
gl.enableVertexAttribArray(centerOffsetAttrib)
gl.enableVertexAttribArray(velocityAttrib)

var timeUni = gl.getUniformLocation(shaderProgram, 'uTime')
var timeUniFrag = gl.getUniformLocation(shaderProgram, 'uTimeFrag')
var firePosUni = gl.getUniformLocation(shaderProgram, 'uFirePos')
var perspectiveUni = gl.getUniformLocation(shaderProgram, 'uPMatrix')
var viewUni = gl.getUniformLocation(shaderProgram, 'uViewMatrix')
var colorUni = gl.getUniformLocation(shaderProgram, 'uColor')
var fireAtlasUni = gl.getUniformLocation(shaderProgram, 'uFireAtlas')
var useBillboardUni = gl.getUniformLocation(shaderProgram, 'uUseBillboarding')

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

var numParticles = 1000
var lifetimes = []
var triCorners = []
var texCoords = []
var vertexIndices = []
var centerOffsets = []
var velocities = []
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
  var lifetime = 8 * Math.random()

  var diameterAroundCenter = 0.5
  var halfDiameterAroundCenter = diameterAroundCenter / 2

  var xStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter
  xStartOffset /= 3
  var yStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter
  yStartOffset /= 10
  var zStartOffset = diameterAroundCenter * Math.random() - halfDiameterAroundCenter
  zStartOffset /= 3

  var upVelocity = 0.1 * Math.random()

  var xSideVelocity = 0.02 * Math.random()
  if (xStartOffset > 0) {
    xSideVelocity *= -1
  }

  var zSideVelocity = 0.02 * Math.random()
  if (zStartOffset > 0) {
    zSideVelocity *= -1
  }

  for (var j = 0; j < 4; j++) {
    lifetimes.push(lifetime)
    triCorners.push(triCornersCycle[j * 2])
    triCorners.push(triCornersCycle[j * 2 + 1])
    texCoords.push(texCoordsCycle[j * 2])
    texCoords.push(texCoordsCycle[j * 2 + 1])
    centerOffsets.push(xStartOffset)
    centerOffsets.push(yStartOffset + Math.abs(xStartOffset / 2.0))
    centerOffsets.push(zStartOffset)
    velocities.push(xSideVelocity)
    velocities.push(upVelocity)
    velocities.push(zSideVelocity)
  }

  vertexIndices = vertexIndices.concat([
    0, 1, 2, 0, 2, 3
  ].map(function (num) { return num + 4 * i }))
}

createBuffer('ARRAY_BUFFER', Float32Array, lifetimes)
gl.vertexAttribPointer(lifetimeAttrib, 1, gl.FLOAT, false, 0, 0)

createBuffer('ARRAY_BUFFER', Float32Array, texCoords)
gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 0, 0)

createBuffer('ARRAY_BUFFER', Float32Array, triCorners)
gl.vertexAttribPointer(triCornerAttrib, 2, gl.FLOAT, false, 0, 0)

createBuffer('ARRAY_BUFFER', Float32Array, centerOffsets)
gl.vertexAttribPointer(centerOffsetAttrib, 3, gl.FLOAT, false, 0, 0)

createBuffer('ARRAY_BUFFER', Float32Array, velocities)
gl.vertexAttribPointer(velocityAttrib, 3, gl.FLOAT, false, 0, 0)

createBuffer('ELEMENT_ARRAY_BUFFER', Uint16Array, vertexIndices)

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

gl.uniformMatrix4fv(perspectiveUni, false, glMat4.perspective([], Math.PI / 3, 1, 0.01, 1000))

/**
 * Section 4 - Creating our camera's view matrix
 */

function createCamera () {
  var camera = glMat4.create()

  // Start our camera off at a height of 0.25 and 1 unit
  // away from the origin
  glMat4.translate(camera, camera, [0, 0.25, 1])

  // Rotate our camera around the y and x axis of the world
  // as the viewer clicks or drags their finger
  var xAxisRotation = glMat4.create()
  var yAxisRotation = glMat4.create()
  glMat4.rotateX(xAxisRotation, xAxisRotation, -xRotation)
  glMat4.rotateY(yAxisRotation, yAxisRotation, yRotation)
  glMat4.multiply(camera, xAxisRotation, camera)
  glMat4.multiply(camera, yAxisRotation, camera)

  // Make our camera look at the first red fire
  var cameraPos = [camera[12], camera[13], camera[14]]
  glMat4.lookAt(camera, cameraPos, redFirePos, [0, 1, 0])

  return camera
}

/**
 * Section 5 - Drawing our particles
 */
var previousTime = new Date().getTime()

// Start a bit into the simulation so that we skip the wall of fire
// that forms at the beginning. To see what I mean set this value to
// zero seconds, instead of the current 3 seconds
var clockTime = 3

// Our first flame's position is at the world origin and it is red
var redFirePos = [0.0, 0.0, 0.0]
var redFireColor = [0.8, 0.25, 0.25, 1.0]

// Our second flame is 0.5 units to the right of the first flame
// and is purple
var purpFirePos = [0.5, 0.0, 0.0]
var purpFireColor = [0.25, 0.25, 8.25, 1.0]

function draw () {
  // Once the image is loaded we'll start drawing our particle effect
  if (imageIsLoaded) {
    // Clear our color buffer and depth buffer so that
    // nothing is left over in our drawing buffer now that we're
    // completely redrawing the entire canvas
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Get the current time and subtract it by the time that we
    // last drew to calculate the new number of seconds
    var currentTime = new Date().getTime()
    clockTime += (currentTime - previousTime) / 1000
    previousTime = currentTime

    // Pass the current time into our vertex and fragment shaders
    gl.uniform1f(timeUni, clockTime)
    gl.uniform1f(timeUniFrag, clockTime)

    // Pass our world view matrix into our vertex shader
    gl.uniformMatrix4fv(viewUni, false, createCamera())

    // Set whether or not we will use billboarding for this draw call
    gl.uniform1i(useBillboardUni, billboardingEnabled)

    // We pass information specific to our first flame into our vertex shader
    // and then draw our first flame.
    gl.uniform3fv(firePosUni, redFirePos)
    gl.uniform4fv(colorUni, redFireColor)
    // What does numParticles * 6 mean?
    //  For each particle there are two triangles drawn (to form the square)
    //  The first triangle has 3 vertices and the second triangle has 3 vertices
    //  making for a total of 6 vertices per particle.
    gl.drawElements(gl.TRIANGLES, numParticles * 6, gl.UNSIGNED_SHORT, 0)

    // We pass information specific to our second flame into our vertex shader
    // and then draw our second flame.
    gl.uniform3fv(firePosUni, purpFirePos)
    gl.uniform4fv(colorUni, purpFireColor)
    gl.drawElements(gl.TRIANGLES, numParticles * 6, gl.UNSIGNED_SHORT, 0)
  }

  // On the next animation frame we re-draw our particle effect
  window.requestAnimationFrame(draw)
}
draw()
