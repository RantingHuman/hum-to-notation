# 🎵 Hum to Notation

A client-side web app that captures microphone audio, detects pitch in real-time, and converts your hummed melody into sheet music and guitar/bass tablature — with MIDI, MusicXML, and PDF export.

No backend. No sign-up. Everything runs in your browser.

See it in action: https://hum-to-notation.netlify.app/

## Features

- **Record from microphone** — count-in metronome, up to 2 minutes per layer
- **Real-time pitch detection** — powered by [pitchy](https://github.com/ianprime0509/pitchy)
- **Notation rendering** — sheet music (treble/bass clef) and tablature via [VexFlow 5](https://www.vexflow.com/)
- **Two instrument layers** — guitar or bass guitar, each with independent octave shift
- **Playback** — hear your melody back through Tone.js synths (PluckSynth for guitar, MonoSynth for bass)
- **Export** — download as PDF, MusicXML (MuseScore/GarageBand/Finale), or MIDI
- **Project management** — named projects, auto-saved to IndexedDB, rename/delete
- **Works offline** — pure client-side, no network requests after initial load

## Tech Stack

| Layer | Library |
|-------|---------|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Pitch detection | pitchy |
| Audio synthesis | Tone.js v14 |
| Notation rendering | VexFlow 5 |
| MIDI export | midi-writer-js |
| PDF export | jsPDF |
| Persistence | IndexedDB via idb |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge for the best experience.

## Production Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## Architecture

```
Microphone
  └─► Web Audio API (getUserMedia + AnalyserNode)
        └─► PitchDetector (rAF loop, pitchy, clarity ≥ 0.85)
              └─► RawPitchEvent[] (frequency, clarity, timestamp)
                    └─► Quantizer (segment → MIDI → beat grid → Note[])
                          ├─► VexFlow Renderer (sheet music + tab SVG)
                          ├─► PlaybackEngine (Tone.js scheduling)
                          └─► Exporters (MIDI / MusicXML / PDF)
```

### Key services

| File | Responsibility |
|------|---------------|
| `src/services/audioCapture.ts` | getUserMedia, AnalyserNode setup |
| `src/services/pitchDetector.ts` | rAF-based pitch detection loop |
| `src/services/quantizer.ts` | Converts raw pitch events → quantized Note[] |
| `src/services/notationRenderer.ts` | VexFlow sheet music + tab rendering |
| `src/services/playback.ts` | Tone.js note scheduling per instrument |
| `src/services/exportMidi.ts` | MIDI file generation |
| `src/services/exportMusicXml.ts` | MusicXML 3.1 generation |
| `src/services/exportPdf.ts` | SVG → canvas → jsPDF |
| `src/services/storage.ts` | IndexedDB CRUD via idb |
| `src/context/ProjectContext.tsx` | Central state, auto-save |
| `src/context/RecordingContext.tsx` | Shared recording state |
| `src/context/PlaybackContext.tsx` | Shared playback state |

### Data model

```typescript
Project {
  id, name, tempo, timeSignature, metronomeMode
  layers: Layer[]
}

Layer {
  id, instrument: 'guitar' | 'bass'
  octaveShift: number   // −3 to +3
  notes: Note[]
}

Note {
  midiNumber, startBeat, durationBeats
  isRest?: boolean, detectedFrequency?: number
}
```

Raw audio is **never stored** — only the quantized `Note[]` arrays.

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome / Edge | ✅ Fully supported |
| Firefox | ⚠️ Supported, pitch detection may vary |
| Safari | ⚠️ Supported, use headphones to avoid feedback |
| Mobile Chrome | ✅ Supported |
| Mobile Safari | ⚠️ AudioContext quirks on iOS |

## Known Limitations

- **Quantization accuracy** — rhythm quantization snaps to 8th-note grid; very fast passages or irregular rhythms may not quantize perfectly
- **Polyphony** — only monophonic melodies (one note at a time); chords are not detected
- **Browser storage** — projects are saved in your browser's IndexedDB; clearing browser data will delete them. Export regularly.
- **Bundle size** — VexFlow is ~1.1 MB uncompressed; first load of the notation view takes a moment on slow connections
- **Max 2 layers** — one guitar + one bass (or two of the same)
- **Max recording length** — 2 minutes per layer
