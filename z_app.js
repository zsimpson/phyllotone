import { z } from './zscript.js'

/* =========================
   TUNABLE VISUAL CONSTANTS
   ========================= */

const HEIGHT_SCALE = 1.5          // overall column height scaling
const FREQ_WEIGHT_ALPHA = 0.8     // low-frequency boost (0.3–0.6 typical)
const REF_FREQ = 261.625565       // C4 reference for weighting

/* =========================
   PITCH LUT
   ========================= */

function build_pitch_lut(n_bins, sample_rate, fft_size) {
    const base_c = REF_FREQ
    const min_freq = 40
    const nyquist = sample_rate * 0.5

    const lut = new Array(n_bins)

    for(let i = 0; i < n_bins; i++) {
        const freq = i * sample_rate / fft_size
        if(freq < min_freq || freq > nyquist) {
            lut[i] = null
            continue
        }

        const semitones = 12 * Math.log2(freq / base_c)
        const pc = ((Math.round(semitones) % 12) + 12) % 12
        const octave = Math.floor(semitones / 12)

        lut[i] = { pc, octave, freq }
    }

    return lut
}

/* =========================
   AMPLITUDE + WEIGHTING
   ========================= */

function db_to_amp(db) {
    const floor_db = -120
    const db_c = Math.max(db, floor_db)
    return Math.pow(10, db_c / 20)
}

function freq_weight(freq) {
    return Math.pow(freq / REF_FREQ, -FREQ_WEIGHT_ALPHA)
}

/* =========================
   DRAW STACKED PITCH CLASSES
   ========================= */

function draw_pitch_class_stacks(canvas_el, freq_data, pitch_lut) {
    if(!pitch_lut || !freq_data) {
        return
    }

    const ctx = canvas_el.getContext("2d")
    const rect = canvas_el.getBoundingClientRect()

    ctx.clearRect(0, 0, rect.width, rect.height)

    const n_pc = 12
    const col_w = rect.width / n_pc

    const stacks = Array.from({ length: n_pc }, () => [])

    for(let i = 0; i < freq_data.length; i++) {
        const lut = pitch_lut[i]
        if(!lut) {
            continue
        }

        const amp_raw = db_to_amp(freq_data[i])
        if(amp_raw <= 0) {
            continue
        }

        const amp = amp_raw * freq_weight(lut.freq)

        const { pc, octave } = lut
        if(!stacks[pc][octave]) {
            stacks[pc][octave] = 0
        }

        stacks[pc][octave] += amp
    }

    for(let pc = 0; pc < n_pc; pc++) {
        let y = rect.height
        const col = stacks[pc]

        for(let octave = 0; octave < col.length; octave++) {
            const v = col[octave]
            if(!v) {
                continue
            }

            const h = Math.min(
                rect.height,
                Math.sqrt(v) * rect.height * HEIGHT_SCALE
            )

            const alpha = Math.max(0.15, 1.0 - octave * 0.15)
            ctx.fillStyle = `rgba(120,120,120,${alpha})`

            y -= h
            ctx.fillRect(
                pc * col_w,
                y,
                col_w - 2,
                h
            )
        }
    }
}

/* =========================
   AUDIO / FFT
   ========================= */

async function start_mic_fft(draw_cb, set_pitch_lut) {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
    })

    const audio_ctx = new AudioContext()
    await audio_ctx.resume()

    const source = audio_ctx.createMediaStreamSource(stream)

    const analyser = audio_ctx.createAnalyser()
    analyser.fftSize = 2048

    source.connect(analyser)

    const n_bins = analyser.frequencyBinCount
    const freq_data = new Float32Array(n_bins)

    const pitch_lut = build_pitch_lut(
        analyser.frequencyBinCount,
        audio_ctx.sampleRate,
        analyser.fftSize
    )

    set_pitch_lut(pitch_lut)

    function tick() {
        analyser.getFloatFrequencyData(freq_data)
        draw_cb(freq_data)
        requestAnimationFrame(tick)
    }

    tick()
}

/* =========================
   APP
   ========================= */

export function z_app() {
    let self, canvas_el, ctx
    let pitch_lut = null

    self = z("$#main",
        z("div.container-fluid#alerts.mt-1.fixed-top"),
        z("div.vh-100.vw-100.overflow-hidden",
            canvas_el = z("canvas.w-100.h-100"),
        ),
        {
            resize_canvas_to_css_pixels() {
                const dpr = window.devicePixelRatio || 1
                const rect = canvas_el.getBoundingClientRect()
                canvas_el.width = Math.max(1, Math.round(rect.width * dpr))
                canvas_el.height = Math.max(1, Math.round(rect.height * dpr))
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            },

            draw(freq_data) {
                if(!pitch_lut) {
                    return
                }

                draw_pitch_class_stacks(
                    canvas_el,
                    freq_data,
                    pitch_lut
                )
            },

            async startup() {
                ctx = canvas_el.getContext("2d")
                window.addEventListener("resize", self.resize_canvas_to_css_pixels)
                self.resize_canvas_to_css_pixels()

                start_mic_fft(
                    self.draw,
                    (lut) => {
                        pitch_lut = lut
                    }
                )
            },
        },
    )

    return self
}
