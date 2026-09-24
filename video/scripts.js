const waitForEvent = (id, eventName, errorName, checkResolve) => {
  const element = document.getElementById(id)

  return new Promise((resolve, reject) => {
    if (checkResolve?.()) {
      resolve(element)
      return
    }

    const onLoad = (event) => {
      cleanup()
      resolve(event)
    }

    const onError = (event) => {
      cleanup()
      reject(event)
    }

    const cleanup = () => {
      element.removeEventListener(eventName, onLoad)
      errorName && element.removeEventListener(errorName, onError)
    }

    element.addEventListener(eventName, onLoad)
    errorName && element.addEventListener(errorName, onError)

    const originalDispatchEvent = element.dispatchEvent

    element.dispatchEvent = function (event) {
      console.log(element, event)

      return originalDispatchEvent.call(this, event)
    }
  })
}

const initScene = async ({ afterloadedScene, afterChangeBtn, afterClickStart } = {}) => {
  const scene = document.querySelector('a-scene')
  const startBtn = document.getElementById('start-btn')
  const loadingBtn = document.getElementById('loading-btn')

  scene.addEventListener('loaded', async () => {
    if (afterloadedScene) await afterloadedScene()

    loadingBtn.style.display = 'none'
    startBtn.style.display = 'flex'

    await afterChangeBtn?.()

    startBtn.addEventListener(
      'click',
      async () => {
        scene.systems['mindar-image-system'].start()

        await afterClickStart?.()

        document.querySelector('welcome-screen').remove()
      },
      { once: true },
    )
  })
}

const handleTarget = ({ found, lost } = {}) => {
  const target = document.querySelector('[mindar-image-target]')
  found && target.addEventListener('targetFound', found)
  lost && target.addEventListener('targetLost', lost)
}
