import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const BAR_COUNT = 28

const STATE = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
}

const btnStyle = {
  [STATE.IDLE]: 'bg-indigo-600 hover:bg-indigo-500',
  [STATE.RECORDING]: 'bg-red-500 hover:bg-red-400',
  [STATE.PROCESSING]: 'bg-zinc-800 cursor-not-allowed',
  [STATE.DONE]: 'bg-emerald-500',
  [STATE.ERROR]: 'bg-zinc-700 hover:bg-zinc-600',
}

const timerColor = {
  [STATE.IDLE]: 'text-zinc-200',
  [STATE.RECORDING]: 'text-red-400',
  [STATE.PROCESSING]: 'text-zinc-400',
  [STATE.DONE]: 'text-emerald-400',
  [STATE.ERROR]: 'text-zinc-500',
}

const statusColor = {
  [STATE.IDLE]: 'text-zinc-600',
  [STATE.RECORDING]: 'text-red-400',
  [STATE.PROCESSING]: 'text-indigo-400',
  [STATE.DONE]: 'text-emerald-400',
  [STATE.ERROR]: 'text-red-400',
}

function encodeWav(audioBuffer) {
  const samples = audioBuffer.getChannelData(0) // моно
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeStr = (offset, str) =>
    [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))

  const sampleRate = audioBuffer.sampleRate // 8000

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // моно
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byteRate
  view.setUint16(32, 2, true) // blockAlign
  view.setUint16(34, 16, true) // bitsPerSample
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // Float32 → Int16
  let offset = 44
  for (const s of samples) {
    const clamped = Math.max(-1, Math.min(1, s))
    view.setInt16(offset, clamped * 0x7fff, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

const VoiceRecorder = () => {
  const [state, setState] = useState(STATE.IDLE)
  const [duration, setDuration] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [bars, setBars] = useState(Array(BAR_COUNT).fill(2))

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const startTimeRef = useRef(null)
  const animFrameRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(
    () => () => {
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const animateWaveform = () => {
    if (!analyserRef.current) return

    // обновляем таймер по реальному времени
    if (startTimeRef.current !== null) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setDuration((_) => elapsed)
    }

    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const step = Math.floor(data.length / BAR_COUNT)
    setBars((_) =>
      Array.from({ length: BAR_COUNT }, (_, i) =>
        Math.max(2, Math.round((data[i * step] / 255) * 48)),
      ),
    )
    animFrameRef.current = requestAnimationFrame(animateWaveform)
  }

  const startRecording = async () => {
    setErrorMsg((_) => '')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 128
      audioCtx.createMediaStreamSource(stream).connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorderRef.current = recorder
      recorder.start(100)

      startTimeRef.current = Date.now()
      setDuration((_) => 0)
      setState((_) => STATE.RECORDING)
      animateWaveform()
    } catch {
      setErrorMsg((_) => 'Нет доступа к микрофону')
      setState((_) => STATE.ERROR)
    }
  }

  const stopRecording = () => {
    cancelAnimationFrame(animFrameRef.current)
    startTimeRef.current = null
    setBars((_) => Array(BAR_COUNT).fill(2))

    const recorder = mediaRecorderRef.current
    if (!recorder) return

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      setState((_) => STATE.PROCESSING)

      // Декодируем webm → AudioBuffer
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = new AudioContext()
      const decoded = await audioCtx.decodeAudioData(arrayBuffer)

      // Ресэмплируем в 8000 Гц, 1 канал
      const offlineCtx = new OfflineAudioContext(
        1,
        decoded.duration * 8000,
        8000,
      )
      const source = offlineCtx.createBufferSource()
      source.buffer = decoded
      source.connect(offlineCtx.destination)
      source.start()
      const resampled = await offlineCtx.startRendering()

      // Энкодируем в WAV
      const wavBlob = encodeWav(resampled)

      const formData = new FormData()
      formData.append('audio', wavBlob, 'voice.wav')

      try {
        // const formData = new FormData()
        // formData.append('audio', blob, 'voice.webm')
        const res = await fetch('', { method: 'POST', body: formData })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setState((_) => STATE.DONE)
      } catch (err) {
        setErrorMsg((_) => err.message || 'Ошибка при отправке')
        setState((_) => STATE.ERROR)
      }
    }

    recorder.stop()
  }

  const reset = () => {
    setState((_) => STATE.IDLE)
    setDuration((_) => 0)
    setErrorMsg((_) => '')
    setBars((_) => Array(BAR_COUNT).fill(2))
  }

  const handleClick = () => {
    if (state === STATE.IDLE) startRecording()
    else if (state === STATE.RECORDING) stopRecording()
    else if (state === STATE.DONE || state === STATE.ERROR) reset()
  }

  const statusText = {
    [STATE.IDLE]: 'нажмите, чтобы начать',
    [STATE.RECORDING]: '● запись...',
    [STATE.PROCESSING]: 'отправка...',
    [STATE.DONE]: 'отправлено успешно',
    [STATE.ERROR]: errorMsg || 'ошибка',
  }

  return (
    <div className='min-h-screen bg-zinc-950 flex items-center justify-center'>
      <div className='w-80 bg-zinc-900 border border-zinc-800 rounded-3xl px-8 py-10 flex flex-col items-center gap-8'>
        <span className='text-[10px] font-mono tracking-widest text-zinc-600 uppercase'>
          Voice Input
        </span>

        {/* Waveform */}
        <div className='flex items-center gap-0.75 h-14'>
          {bars.map((h, i) => (
            <div
              key={i}
              className={`w-0.75 rounded-full transition-all duration-75 ${
                state === STATE.RECORDING ? 'bg-indigo-500' : 'bg-zinc-800'
              }`}
              style={{ height: `${h}px` }}
            />
          ))}
        </div>

        {/* Timer */}
        <span
          className={`font-mono text-5xl font-semibold tracking-tight ${timerColor[state]}`}
        >
          {formatTime(duration)}
        </span>

        {/* Button */}
        <button
          onClick={handleClick}
          disabled={state === STATE.PROCESSING}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-90 ${btnStyle[state]}`}
        >
          {state === STATE.IDLE && (
            <Mic
              size={28}
              color='white'
            />
          )}
          {state === STATE.RECORDING && (
            <Square
              size={22}
              color='white'
              fill='white'
            />
          )}
          {state === STATE.PROCESSING && (
            <Loader2
              size={26}
              color='#6366f1'
              className='animate-spin'
            />
          )}
          {state === STATE.DONE && (
            <CheckCircle2
              size={30}
              color='white'
            />
          )}
          {state === STATE.ERROR && (
            <XCircle
              size={28}
              color='white'
            />
          )}
        </button>

        {/* Status */}
        <span
          className={`text-xs font-mono tracking-wide min-h-4 ${statusColor[state]}`}
        >
          {statusText[state]}
        </span>
      </div>
    </div>
  )
}

export default VoiceRecorder
