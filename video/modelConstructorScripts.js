const modelEl = document.querySelector('a-gltf-model')
const controlsPanel = document.getElementById('model-controls')
const controlsToggleBtn = document.getElementById('controls-toggle-btn')

const DEFAULTS = {
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
  scale: 1,
}

const posX = document.getElementById('pos-x')
const posY = document.getElementById('pos-y')
const posZ = document.getElementById('pos-z')
const rotX = document.getElementById('rot-x')
const rotY = document.getElementById('rot-y')
const rotZ = document.getElementById('rot-z')
const scaleEl = document.getElementById('scale')
const valuesOut = document.getElementById('values-out')
const copyBtn = document.getElementById('copy-values')
const resetBtn = document.getElementById('reset-values')

function updateModel() {
  modelEl.setAttribute('position', `${posX.value} ${posY.value} ${posZ.value}`)
  modelEl.setAttribute('rotation', `${rotX.value} ${rotY.value} ${rotZ.value}`)
  const s = scaleEl.value
  modelEl.setAttribute('scale', `${s} ${s} ${s}`)

  valuesOut.textContent =
    `pos: ${posX.value} ${posY.value} ${posZ.value} | ` +
    `rot: ${rotX.value} ${rotY.value} ${rotZ.value} | ` +
    `scale: ${s}`
}

;[posX, posY, posZ, rotX, rotY, rotZ, scaleEl].forEach((el) => el.addEventListener('input', updateModel))

copyBtn.addEventListener('click', () => {
  const text =
    `position="${posX.value} ${posY.value} ${posZ.value}" ` +
    `rotation="${rotX.value} ${rotY.value} ${rotZ.value}" ` +
    `scale="${scaleEl.value} ${scaleEl.value} ${scaleEl.value}"`
  navigator.clipboard.writeText(text)
  copyBtn.textContent = 'Copied!'
  setTimeout(() => (copyBtn.textContent = 'Copy'), 1000)
})

resetBtn.addEventListener('click', () => {
  posX.value = DEFAULTS.posX
  posY.value = DEFAULTS.posY
  posZ.value = DEFAULTS.posZ
  rotX.value = DEFAULTS.rotX
  rotY.value = DEFAULTS.rotY
  rotZ.value = DEFAULTS.rotZ
  scaleEl.value = DEFAULTS.scale
  updateModel()
})

controlsToggleBtn.addEventListener('click', () => {
  controlsPanel.classList.toggle('hidden')
})

updateModel()
