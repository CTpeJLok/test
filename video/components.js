class HomeButton extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <a
      id="home-btn"
      aria-label="На главную"
      title="На главную"
      class="btn h-12 w-12 fixed z-9999 flex items-center justify-center rounded-lg"
      style="top: max(1rem, env(safe-area-inset-top, 0px)); left: max(1rem, env(safe-area-inset-left, 0px))"
      href="/">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path
          d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    </a>
    `
  }
}
customElements.define('home-button', HomeButton)

class WelcomeScreen extends HTMLElement {
  connectedCallback() {
    const variant = this.getAttribute('variant') || 'Вариант'
    const name = this.getAttribute('name') || 'Добро пожаловать на демо'
    const description = this.getAttribute('description') || 'Наведите камеру на Полину'
    this.innerHTML = `
    <div
      id="welcome-screen"
      class="fixed inset-0 z-999 flex flex-col items-center justify-center gap-2 text-center p-5 glow">
      <p class="eyebrow mono text-sm tracking-wide">${variant}</p>
      <h1 class="text-2xl font-extrabold mt-2">${name}</h1>
      <p
        class="text-base mt-1"
        style="color: var(--text-dim)">
        ${description}
      </p>

      <button
        id="loading-btn"
        title="Загрузка ..."
        class="mt-6 btn h-14 px-9 text-lg rounded-lg mono flex items-center justify-center">
        Загрузка ...
      </button>

      <button
        id="start-btn"
        title="Начать"
        class="mt-6 btn h-14 px-9 text-lg rounded-lg hidden items-center justify-center">
        Начать
      </button>
    </div>
    `
  }
}
customElements.define('welcome-screen', WelcomeScreen)

class ModelConstructorButton extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <button
      id="controls-toggle-btn"
      aria-label="Настройки модели"
      title="Настройки модели"
      class="btn h-12 w-12 fixed z-9999 hidden items-center justify-center rounded-lg"
      style="top: max(1rem, env(safe-area-inset-top, 0px)); right: max(1rem, env(safe-area-inset-right, 0px))">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
    `
  }
}
customElements.define('model-constructor-button', ModelConstructorButton)

class ModelConstructor extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <div
      id="model-controls"
      class="fixed z-999 rounded-lg p-3 mono text-xs hidden"
      style="bottom: max(1rem, env(safe-area-inset-bottom, 0px)); right: max(1rem, env(safe-area-inset-right, 0px)); background: var(--panel); border: 1px solid var(--panel-border); color: var(--text-dim); max-width: 360px;">
      <div class="grid grid-cols-3 gap-2 mb-2">
        <label
          >X pos
          <input
            id="pos-x"
            type="range"
            min="-2"
            max="2"
            step="0.01"
            value="0"
            class="w-full"
        /></label>
        <label
          >Y pos
          <input
            id="pos-y"
            type="range"
            min="-2"
            max="2"
            step="0.01"
            value="0"
            class="w-full"
        /></label>
        <label
          >Z pos
          <input
            id="pos-z"
            type="range"
            min="-2"
            max="2"
            step="0.01"
            value="0"
            class="w-full"
        /></label>
      </div>
      <div class="grid grid-cols-3 gap-2 mb-2">
        <label
          >X rot
          <input
            id="rot-x"
            type="range"
            min="-180"
            max="180"
            step="1"
            value="0"
            class="w-full"
        /></label>
        <label
          >Y rot
          <input
            id="rot-y"
            type="range"
            min="-180"
            max="180"
            step="1"
            value="0"
            class="w-full"
        /></label>
        <label
          >Z rot
          <input
            id="rot-z"
            type="range"
            min="-180"
            max="180"
            step="1"
            value="0"
            class="w-full"
        /></label>
      </div>
      <div class="mb-2">
        <label
          >Scale
          <input
            id="scale"
            type="range"
            min="0.01"
            max="5"
            step="0.01"
            value="1"
            class="w-full"
        /></label>
      </div>
      <div class="flex justify-between items-center gap-2">
    <span id="values-out" class="opacity-70"></span>
    <div class="flex gap-2">
      <button id="reset-values" class="btn px-2 py-1 rounded">Reset</button>
      <button id="copy-values" class="btn px-2 py-1 rounded">Copy</button>
    </div>
      </div>
    </div>
    `

    const script = document.createElement('script')
    script.src = '/modelConstructorScripts.js'
    document.body.appendChild(script)
  }
}
customElements.define('model-constructor', ModelConstructor)

NOTIFICATION_BY_TYPE = {
  vpn: [
    '⚠️ Отключите VPN',
    'При включённом VPN загрузка может занимать больше времени и работать нестабильно.',
    () => {
      try {
        return fetch('https://ipwho.is/')
          .then((res) => res.json())
          .then((res) => res.success && res.country_code !== 'RU')
      } catch {}
    },
  ],
}

class Notification extends HTMLElement {
  connectedCallback() {
    let name = this.getAttribute('name')
    let description = this.getAttribute('description')
    let show = async () => true

    let type = this.getAttribute('type')

    if (type) [name, description, show] = NOTIFICATION_BY_TYPE[type]

    show().then((res) => {
      if (res)
        this.innerHTML = `
    <div
      class="notification"
      role="alert"
      aria-live="polite">
      <div class="notification-title">
        ${name}
      </div>

      <div class="notification-text">
        ${description}
      </div>
    </div>
    `
    })
  }
}
customElements.define('custom-notification', Notification)
