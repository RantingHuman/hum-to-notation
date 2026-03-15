
# Hum-to-Notation Web App — Implementation Plan

## Project Context & Architecture Overview

This is a single-page React application that captures audio from a microphone, detects pitch in real-time, quantizes detected notes to musical notation, renders that notation as sheet music and tablature, and exports to multiple formats. The app uses client-side processing exclusively — no backend server.

**Key architectural decisions:**
- React with TypeScript for type safety across complex musical data structures
- IndexedDB (via `idb` wrapper) for project persistence (LocalStorage is too small for project data)
- A central "project" data model that all features read from and write to
- Processing pipeline: Audio → Pitch Detection → Note Events → Quantized Notes → Notation Model
- VexFlow for rendering, Tone.js for playback, dedicated libraries for each export format

**Data flow:**
```
Microphone → Web Audio API → Pitch Detector → Raw Pitch Events
    → Quantizer (tempo/time-sig aware) → Note[]
    → VexFlow Renderer (sheet music / tab)
    → Export (PDF / MusicXML / MIDI)
```

**Core data model (conceptual):**
```typescript
Project {
  id, name, tempo, timeSignature, createdAt, updatedAt
  layers: Layer[]
}

Layer {
  id, instrument: 'guitar' | 'bass', octaveShift: number
  notes: Note[]
}

Note {
  midiNumber, startBeat, durationBeats, detectedFrequency
}
```

---

## Phase 1: Project Scaffolding & Static Shell

### Step 1.1 — Initialize React + TypeScript project with Tailwind CSS

**What:** Create the project using Vite + React + TypeScript. Install and configure Tailwind CSS. Set up ESLint and Prettier. Create a basic `App.tsx` that renders "Hum to Notation" text.

**Why first:** Everything builds on this. No complexity yet, just a working dev environment.

**Details:**
- `npm create vite@latest hum-to-notation -- --template react-ts`
- Install Tailwind CSS via PostCSS (`tailwindcss`, `postcss`, `autoprefixer`)
- Configure `tailwind.config.js` with content paths
- Add base Tailwind directives to `index.css`
- ESLint with `@typescript-eslint` and Prettier config
- Verify: `npm run dev` shows styled heading

**Files created:** `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `.eslintrc.cjs`, `.prettierrc`, `src/App.tsx`, `src/index.css`, `src/main.tsx`

---

### Step 1.2 — Define core TypeScript types and data model

**What:** Create type definition files for the core domain: `Project`, `Layer`, `Note`, `TimeSignature`, `Instrument`, and related enums/constants.

**Why now:** These types are referenced by virtually every feature. Defining them early prevents refactoring later.

**Details:**
- `src/types/music.ts` — `Note`, `TimeSignature`, `Instrument` (union type `'guitar' | 'bass'`), tempo-related types
- `src/types/project.ts` — `Project`, `Layer` interfaces
- `src/constants/music.ts` — tempo presets array `[{label: 'Slow Ballad', bpm: 70}, ...]`, time signature options array `[{value: '4/4', label: 'Standard beat'}, ...]`, standard tunings for guitar and bass
- All notes use MIDI number as canonical representation (0–127), with utility stubs: `midiToNoteName(midi: number): string`, `midiToFrequency(midi: number): number`, `frequencyToMidi(freq: number): number`

**Files created:** `src/types/music.ts`, `src/types/project.ts`, `src/constants/music.ts`, `src/utils/noteUtils.ts`

---

### Step 1.3 — Build static page layout with placeholder sections

**What:** Create the four-section layout from the spec: top bar, controls area, main notation area, and layer panel. All content is placeholder text/boxes. Mobile-responsive using Tailwind.

**Why now:** Establishes the visual skeleton that all features plug into.

**Details:**
- `src/components/layout/TopBar.tsx` — project name (static text), placeholder buttons for save/export/project-list
- `src/components/layout/ControlsArea.tsx` — placeholder text for tempo, time signature, metronome
- `src/components/layout/NotationDisplay.tsx` — empty bordered box with "Notation will appear here" text
- `src/components/layout/LayerPanel.tsx` — placeholder text "No layers yet"
- `src/components/layout/RecordButton.tsx` — Large red circular button (non-functional), fixed position at bottom center on mobile
- `src/App.tsx` — composes all layout components
- Mobile: single column, layer panel below notation. Desktop (≥768px): layer panel as sidebar on the right
- Use Tailwind responsive classes (`md:flex-row`, etc.)

**Files created:** All layout components listed above, updated `App.tsx`

---

## Phase 2: Project Management & Persistence

### Step 2.1 — Set up IndexedDB persistence layer

**What:** Install `idb` library. Create a database service module that initializes an IndexedDB database with a `projects` object store. Implement CRUD functions: `createProject`, `getProject`, `getAllProjects`, `updateProject`, `deleteProject`.

**Why now:** Project management is the backbone — recording, layers, and everything else writes to a project.

**Details:**
- `npm install idb`
- `src/services/storage.ts`:
  - `initDB()` — opens/creates DB version 1 with `projects` store, keyPath `id`
  - `createProject(name: string): Promise<Project>` — generates UUID, default tempo 100, default time sig 4/4, empty layers array
  - `getProject(id: string): Promise<Project | undefined>`
  - `getAllProjects(): Promise<Project[]>`
  - `updateProject(project: Project): Promise<void>`
  - `deleteProject(id: string): Promise<void>`
- Use `crypto.randomUUID()` for IDs
- All functions are async, handle DB errors gracefully

**Files created:** `src/services/storage.ts`

**Dependencies:** `idb`

---

### Step 2.2 — Create project state management with React context

**What:** Create a React context + provider that holds the current project state and a project list. Provides functions to create, open, save, delete projects. Auto-save with debounce on project changes.

**Why now:** Every UI component needs to read/write project state.

**Details:**
- `src/context/ProjectContext.tsx`:
  - State: `currentProject: Project | null`, `projectList: ProjectSummary[]` (id + name + updatedAt), `isLoading: boolean`
  - Actions: `createProject(name)`, `openProject(id)`, `deleteProject(id)`, `updateCurrentProject(partial)`, `closeProject()`
  - On mount: load project list from IndexedDB
  - Auto-save: `useEffect` that debounces (500ms) saving `currentProject` to IndexedDB whenever it changes
  - `ProjectSummary` is a lightweight type (avoid loading full note data for the list)
- `src/hooks/useProject.ts` — convenience hook wrapping `useContext(ProjectContext)`
- Wrap `App` in `<ProjectProvider>`

**Files created:** `src/context/ProjectContext.tsx`, `src/hooks/useProject.ts`. Updated `App.tsx`.

---

### Step 2.3 — Build project list dashboard and create/open/delete UI

**What:** Build the project management UI. When no project is open, show a dashboard with project list. User can create a new project (enters name), open existing, or delete (with confirmation). When a project is open, show the main workspace.

**Why now:** Completes the project management user story end-to-end.

**Details:**
- `src/components/ProjectDashboard.tsx`:
  - "Create New Project" button → inline text input + confirm
  - List of existing projects: name, last modified date, Open button, Delete button
  - Delete shows a simple confirmation dialog
  - Warning banner: "Projects are saved in your browser only. Export to keep a permanent copy."
- `src/App.tsx` conditionally renders `ProjectDashboard` (when `currentProject` is null) or the workspace layout (when a project is open)
- `TopBar.tsx`: show project name (editable inline — click to edit, blur to save), "Back to Projects" button that calls `closeProject()`
- Basic styling: clean, minimal, mobile-friendly cards for project list

**Files created:** `src/components/ProjectDashboard.tsx`. Updated `App.tsx`, `TopBar.tsx`.

---

## Phase 3: Tempo, Time Signature & Metronome Controls

### Step 3.1 — Tempo preset selector and tap tempo

**What:** Build the tempo control UI in the ControlsArea. Includes preset buttons and a tap tempo button. Tempo value updates the current project.

**Why now:** Tempo must be set before recording (it drives quantization and metronome).

**Details:**
- `src/components/controls/TempoControls.tsx`:
  - Row of preset buttons from `TEMPO_PRESETS` constant. Selected state highlighted. Clicking sets project tempo.
  - Tap tempo button: user taps repeatedly, app computes average interval of last 4-6 taps within a 3-second window, converts to BPM, rounds to nearest integer, updates project tempo
  - Display current BPM numerically (e.g., "♩ = 100 BPM")
  - `src/hooks/useTapTempo.ts`: encapsulates tap tempo logic. Records timestamps, calculates average delta, resets if gap > 3 seconds between taps. Returns `{ bpm: number | null, tap: () => void }`
- Integrate into `ControlsArea.tsx`
- All tempo changes go through `updateCurrentProject({ tempo: newBpm })`

**Files created:** `src/components/controls/TempoControls.tsx`, `src/hooks/useTapTempo.ts`. Updated `ControlsArea.tsx`.

---

### Step 3.2 — Time signature selector

**What:** Build the time signature selector. Three labeled buttons from the spec's options.

**Why now:** Time signature is needed alongside tempo for recording and quantization.

**Details:**
- `src/components/controls/TimeSignatureSelector.tsx`:
  - Three buttons from `TIME_SIGNATURE_OPTIONS` constant
  - Each shows both the notation (e.g., "4/4") and the friendly label (e.g., "Standard beat")
  - Selected state highlighted
  - Updates `currentProject.timeSignature`
- Integrate into `ControlsArea.tsx`

**Files created:** `src/components/controls/TimeSignatureSelector.tsx`. Updated `ControlsArea.tsx`.

---

### Step 3.3 — Metronome engine (audio + visual)

**What:** Build a metronome service that can produce clicks (audio) or trigger visual pulses, driven by the project's tempo and time signature. This will be used both for pre-recording count-in and during recording.

**Why now:** The metronome is essential for recording. Building the engine separately from the UI allows clean integration.

**Details:**
- `src/services/metronome.ts`:
  - Class `Metronome` using Tone.js `Transport` and scheduling
  - `npm install tone`
  - Constructor takes: `bpm`, `timeSignature`, `mode: 'audio' | 'visual'`
  - Methods: `start()`, `stop()`, `setTempo(bpm)`, `setTimeSignature(ts)`, `setMode(mode)`, `onBeat(callback: (beatNumber: number, isDownbeat: boolean) => void)`
  - Audio mode: uses `Tone.js` synth to play a short click sound (higher pitch on downbeat, lower on other beats)
  - Visual mode: only triggers the `onBeat` callback (no audio)
  - Beat number cycles 1 through beatsPerMeasure based on time signature
  - Handles start/stop cleanly, no dangling scheduled events

**Files created:** `src/services/metronome.ts`

**Dependencies:** `tone`

---

### Step 3.4 — Metronome UI toggle and visual indicator

**What:** Add metronome type selector (audio/visual) and a visual beat indicator to the controls area. Wire it up to the metronome engine.

**Why now:** Completes the metronome user story. Users can now choose and preview the metronome.

**Details:**
- `src/components/controls/MetronomeControls.tsx`:
  - Toggle between "Audio (use headphones)" and "Visual"
  - When audio is selected, show a headphones warning icon/text: "Use headphones to prevent mic interference"
  - "Test Metronome" button that starts/stops the metronome for preview
  - Visual beat indicator: a row of circles (one per beat in the time signature), the current beat circle pulses/highlights. Updates via the `onBeat` callback.
  - Store metronome mode in project state: `updateCurrentProject({ metronomeMode: 'audio' | 'visual' })`
- `src/hooks/useMetronome.ts`: manages `Metronome` instance lifecycle, syncs with project tempo/timeSignature/mode, exposes `start`, `stop`, `isPlaying`, `currentBeat`
- Integrate into `ControlsArea.tsx`

**Files created:** `src/components/controls/MetronomeControls.tsx`, `src/hooks/useMetronome.ts`. Updated `ControlsArea.tsx`.

---

## Phase 4: Audio Recording & Pitch Detection

### Step 4.1 — Microphone access and audio capture service

**What:** Build a service that requests microphone permission, captures audio via Web Audio API, and provides the audio stream/context for downstream processing. Handle permission denied gracefully.

**Why now:** Audio capture is the prerequisite for pitch detection. Separating it from pitch detection keeps concerns clean.

**Details:**
- `src/services/audioCapture.ts`:
  - `requestMicrophoneAccess(): Promise<MediaStream>` — calls `navigator.mediaDevices.getUserMedia({ audio: true })`, catches errors, returns stream
  - `AudioCaptureSession` class:
    - Constructor takes `MediaStream`
    - Creates `AudioContext`, `MediaStreamSource`, `AnalyserNode`
    - Exposes `analyserNode` for pitch detection to read from
    - `stop()` — stops all tracks, closes context
    - Tracks recording duration, enforces 2-minute max (emits event/callback when limit reached)
  - Error types: `MicrophonePermissionDenied`, `MicrophoneNotFound`, `BrowserNotSupported`
- `src/components/MicPermissionGuide.tsx`: friendly UI overlay shown when permission is denied, with step-by-step instructions per browser (detect browser via user agent for Chrome/Firefox/Safari instructions)

**Files created:** `src/services/audioCapture.ts`, `src/components/MicPermissionGuide.tsx`

---

### Step 4.2 — Real-time pitch detection integration

**What:** Integrate a pitch detection library that reads from the AnalyserNode and outputs pitch events in real-time. Collect raw pitch data (frequency + timestamp + clarity) during recording.

**Why now:** Pitch detection is the core transformation — audio in, note data out.

**Details:**
- `npm install pitchy`
- `src/services/pitchDetector.ts`:
  - `PitchDetector` class:
    - Takes `AnalyserNode` and `AudioContext`
    - Uses `pitchy`'s `PitchDetector.forFloat32Array(bufferSize)` to detect pitch from time-domain data
    - Runs detection in a `requestAnimationFrame` loop (or `setInterval` at ~50-60Hz for consistent timing)
    - Each detection yields: `{ frequency: number, clarity: number, timestamp: number }` (timestamp relative to recording start)
    - Filters: ignore detections with clarity below a threshold (e.g., 0.85) — treats as silence/rest
    - Stores all valid detections in an array: `RawPitchEvent[]`
    - `start()`, `stop()`, `getRawPitchEvents(): RawPitchEvent[]`
  - `src/types/music.ts` — add `RawPitchEvent` type

**Files created:** `src/services/pitchDetector.ts`. Updated `src/types/music.ts`.

**Dependencies:** `pitchy`

---

### Step 4.3 — Note quantization engine

**What:** Build the algorithm that converts raw pitch events into quantized musical notes, using tempo and time signature as guides.

**Why now:** This bridges raw detection data and the musical note model that notation rendering consumes.

**Details:**
- `src/services/quantizer.ts`:
  - `quantizeToNotes(rawEvents: RawPitchEvent[], tempo: number, timeSignature: TimeSignature): Note[]`
  - **Step 1: Frequency → MIDI number**: Group consecutive raw events into segments where the MIDI number is the same (allowing ±1 semitone tolerance for pitch wobble). Use median frequency of each segment to determine final MIDI number.
  - **Step 2: Onset/offset detection**: Determine start and end time of each note segment. A gap in detections (silence) above a threshold (~100ms) indicates a rest.
  - **Step 3: Time → Beat mapping**: Convert timestamps to beat positions using `beatPosition = (timestamp / 60) * tempo`. 
  - **Step 4: Beat quantization**: Snap start beats to the nearest grid position. Grid resolution = 8th notes (0.5 beats) for MVP. Calculate duration as gap to next note's start beat, snap duration to nearest grid value (0.5, 1, 1.5, 2, 3, 4 beats).
  - **Step 5: Rest insertion**: Where gaps exist, create rest notes.
  - Output: `Note[]` where each note has `midiNumber`, `startBeat`, `durationBeats`
  - Handle edge cases: very short blips (<100ms) are discarded, very long notes are capped at measure boundaries

**Files created:** `src/services/quantizer.ts`

---

### Step 4.4 — Recording flow: wire up Record button with full pipeline

**What:** Connect the Record button to the full pipeline: start metronome → start audio capture → start pitch detection → on stop → quantize → save notes to current layer. Show recording state UI (timer, beat indicator, stop button).

**Why now:** This is the moment the app becomes functional — user can hum and get note data.

**Details:**
- `src/hooks/useRecording.ts`:
  - State: `recordingState: 'idle' | 'countdown' | 'recording' | 'processing'`
  - `startRecording()`:
    1. Check if a layer is selected/active (must have instrument assigned)
    2. Request mic access (show guide if denied)
    3. Start metronome (1-measure count-in before actual recording begins)
    4. After count-in: create `AudioCaptureSession`, create `PitchDetector`, begin detection
    5. Update state to `'recording'`, track elapsed time
  - `stopRecording()`:
    1. Stop pitch detector, get raw events
    2. Stop audio capture (discards stream — per spec, raw audio is discarded)
    3. Stop metronome
    4. Set state to `'processing'`
    5. Run `quantizeToNotes(rawEvents, project.tempo, project.timeSignature)`
    6. Save resulting `Note[]` to the current layer in project state
    7. Set state to `'idle'`
  - Auto-stop at 2-minute limit
- `src/components/layout/RecordButton.tsx` — update to use `useRecording`:
  - Idle: red circle "Record" button
  - Countdown: shows beat count "1... 2... 3... 4..."
  - Recording: button becomes "Stop" (pulsing), shows elapsed time, shows visual metronome beats
  - Processing: spinner with "Processing your melody..."
- Handle "no notes detected" error: if quantization returns empty array, show friendly message from spec

**Files created:** `src/hooks/useRecording.ts`. Updated `RecordButton.tsx`.

---

## Phase 5: Notation Rendering

### Step 5.1 — VexFlow setup and basic sheet music rendering

**What:** Install VexFlow. Create a notation renderer component that takes a `Note[]` array and renders standard sheet music (treble clef for guitar, bass clef for bass) with proper time signature and tempo marking.

**Why now:** The user needs to see the result of their recording. Sheet music is the primary view.

**Details:**
- `npm install vexflow`
- `src/services/notationRenderer.ts`:
  - `renderSheetMusic(container: HTMLElement, notes: Note[], timeSignature: TimeSignature, tempo: number, instrument: Instrument): void`
  - Groups notes into measures based on time signature (e.g., 4 beats per measure in 4/4)
  - Creates VexFlow `Renderer`, `Stave`, `StaveNote` objects
  - Maps MIDI numbers to VexFlow note names (e.g., MIDI 60 → "c/4")
  - Maps note durations to VexFlow duration strings (1 beat = "q" quarter, 2 = "h" half, etc.)
  - Handles rests (VexFlow rest notation)
  - Uses treble clef for guitar, bass clef for bass guitar
  - Shows time signature on first measure
  - Shows tempo marking above first measure
  - Wraps staves across multiple lines based on container width
  - Auto-sizes: calculates how many measures fit per line
- `src/components/notation/SheetMusicView.tsx`:
  - Takes notes and project settings from context
  - Renders a `<div ref>` and calls `renderSheetMusic` on mount/update
  - Handles empty state: "Record a layer to see notation here"

**Files created:** `src/services/notationRenderer.ts`, `src/components/notation/SheetMusicView.tsx`. Updated `NotationDisplay.tsx`.

**Dependencies:** `vexflow`

---

### Step 5.2 — Guitar and bass tablature rendering

**What:** Add tab rendering capability using VexFlow's TabStave. Convert MIDI notes to fret positions using standard tuning, defaulting to lowest/easiest position.

**Why now:** Tab view is the other primary notation mode. VexFlow supports it natively.

**Details:**
- `src/utils/tabUtils.ts`:
  - `midiToGuitarTab(midiNumber: number): { string: number, fret: number }` — finds the lowest fret position on standard EADGBE tuning. Strings are numbered 1 (high E) to 6 (low E). MIDI values for open strings: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64. Choose the string where the fret number is lowest and ≥ 0.
  - `midiBassTab(midiNumber: number): { string: number, fret: number }` — same logic for EADG bass tuning. Open strings: E1=28, A1=33, D2=38, G2=43.
  - Handle out-of-range notes: if a note can't be played on the instrument, flag it (render with a visual indicator or move to closest playable note)
- `src/services/notationRenderer.ts` — add:
  - `renderTabNotation(container: HTMLElement, notes: Note[], timeSignature: TimeSignature, tempo: number, instrument: Instrument): void`
  - Uses VexFlow `TabStave`, `TabNote`
  - 6 strings for guitar, 4 strings for bass
  - Same measure grouping and line wrapping logic as sheet music
- `src/components/notation/TabView.tsx`:
  - Similar to `SheetMusicView` but calls `renderTabNotation`

**Files created:** `src/utils/tabUtils.ts`, `src/components/notation/TabView.tsx`. Updated `src/services/notationRenderer.ts`.

---

### Step 5.3 — Notation view toggle (sheet music ↔ tab)

**What:** Add a toggle switch in the notation display area that switches between sheet music and tab views. Persist the current view preference.

**Why now:** Completes the notation display feature.

**Details:**
- `src/components/notation/ViewToggle.tsx`:
  - Simple toggle/segmented control: "Sheet Music" | "Tab"
  - Styled clearly, shows which view is active
- `src/components/layout/NotationDisplay.tsx`:
  - Renders `ViewToggle` at the top
  - Conditionally renders `SheetMusicView` or `TabView` based on toggle state
  - State managed locally (or in project context if we want persistence per project)
- Both views receive the same notes from the currently selected layer
- If no layer is selected, show a prompt to create/select one

**Files created:** `src/components/notation/ViewToggle.tsx`. Updated `NotationDisplay.tsx`.

---

## Phase 6: Layer Management

### Step 6.1 — Layer panel UI with instrument assignment

**What:** Build the layer management panel. User can add a layer (up to 2), assign an instrument (guitar or bass), and select a layer to view its notation.

**Why now:** The recording flow already writes to a layer; now we need the UI to manage layers.

**Details:**
- `src/components/layers/LayerPanel.tsx`:
  - Shows list of layers from `currentProject.layers`
  - Each layer card shows: layer number, instrument icon/name, selected state
  - "Add Layer" button (disabled if 2 layers exist, with tooltip "Maximum 2 layers")
  - Adding a layer: prompts for instrument selection (Guitar or Bass) via a small inline selector, then creates a new layer object in project state
  - Clicking a layer selects it (highlight) — the notation display shows that layer's notes
- `src/context/ProjectContext.tsx` — add:
  - `selectedLayerId: string | null` state
  - `addLayer(instrument: Instrument): void`
  - `selectLayer(layerId: string): void`
  - `deleteLayer(layerId: string): void` (for re-record, we overwrite notes rather than delete)
- `src/components/layers/InstrumentSelector.tsx`:
  - Two-option selector: Guitar (with icon) / Bass Guitar (with icon)
  - Used when adding a layer

**Files created:** `src/components/layers/LayerPanel.tsx`, `src/components/layers/InstrumentSelector.tsx`. Updated `ProjectContext.tsx`, `App.tsx` layout.

---

### Step 6.2 — Layer actions: re-record and octave shift

**What:** Add re-record and octave shift buttons to each layer in the panel. Re-record clears the layer's notes and starts a new recording. Octave shift adjusts all notes up/down by 12 MIDI numbers.

**Why now:** Completes the layer management feature set from the spec.

**Details:**
- `src/components/layers/LayerActions.tsx`:
  - "Re-record" button: confirmation dialog ("This will replace the current recording. Continue?"), then triggers recording flow for this layer (clears existing notes, starts `useRecording`)
  - "Octave ↑" and "Octave ↓" buttons:
    - Shifts `layer.octaveShift` by +1 or -1
    - In the project context, `shiftOctave(layerId: string, direction: 1 | -1)`
    - The notation renderer applies the octave shift when reading notes: `effectiveMidi = note.midiNumber + (layer.octaveShift * 12)`
    - Show current octave shift value if non-zero (e.g., "+1 octave")
    - Clamp to reasonable range (e.g., -3 to +3 octaves)
  - Buttons are disabled if layer has no notes (except re-record, which is always available)
- Update `notationRenderer` and `tabUtils` to accept and apply octave shift
- Update `LayerPanel.tsx` to include `LayerActions` per layer

**Files created:** `src/components/layers/LayerActions.tsx`. Updated `LayerPanel.tsx`, `ProjectContext.tsx`, `notationRenderer.ts`, `tabUtils.ts`.

---

## Phase 7: MIDI Playback

### Step 7.1 — MIDI playback engine with instrument sounds

**What:** Build a playback service using Tone.js that plays back a layer's notes using instrument-matched sounds (guitar sampler for guitar, bass sampler for bass).

**Why now:** Playback is the next logical step after seeing notation — users want to hear what was detected.

**Details:**
- `src/services/playback.ts`:
  - `PlaybackEngine` class:
    - Uses Tone.js `Sampler` or `Synth` for each instrument
    - For MVP: use Tone.js built-in synths with characteristic settings rather than full sample libraries (keeps bundle small):
      - Guitar: `Tone.PluckSynth` or `Tone.PolySynth` with pluck-like settings
      - Bass: `Tone.MonoSynth` with bass-appropriate settings (low-pass filter, longer sustain)
    - `loadInstrument(instrument: Instrument): Promise<void>` — initializes the appropriate synth
    - `playLayer(notes: Note[], tempo: number, octaveShift: number, instrument: Instrument): void`:
      - Schedules all notes on `Tone.Transport` using `Transport.schedule`
      - Each note triggers `synth.triggerAttackRelease(frequency, duration, time)`
      - Applies octave shift to frequencies
    - `stop(): void` — stops transport, cancels all scheduled events
    - `isPlaying: boolean` state
    - Emits current playback position for potential cursor tracking (stretch goal, but include the callback hook)

**Files created:** `src/services/playback.ts`

---

### Step 7.2 — Playback UI controls integrated into layer panel

**What:** Add Play and Stop buttons to each layer. Wire up to the playback engine. Show playback state.

**Why now:** Completes the playback user story.

**Details:**
- `src/hooks/usePlayback.ts`:
  - Manages `PlaybackEngine` instance
  - `playLayer(layerId: string)`: reads notes and settings from project context, calls engine
  - `stop()`: stops playback
  - `isPlaying: boolean`, `playingLayerId: string | null`
- Update `src/components/layers/LayerActions.tsx`:
  - Add Play ▶ / Stop ■ button
  - Play is disabled if layer has no notes
  - When playing: button shows Stop, slight visual indicator on the layer card (e.g., pulsing border)
  - Only one layer can play at a time (starting playback on one stops the other)
- Ensure Tone.js AudioContext is started on user gesture (required by browsers): first Play click calls `Tone.start()`

**Files created:** `src/hooks/usePlayback.ts`. Updated `LayerActions.tsx`.

---

## Phase 8: Export

### Step 8.1 — MIDI file export

**What:** Generate and download a standard MIDI file from the project's layers.

**Why now:** MIDI is the simplest export format and validates that our note data is correct.

**Details:**
- `npm install midi-writer-js`
- `src/services/exportMidi.ts`:
  - `exportProjectToMidi(project: Project): Blob`
  - Creates a MIDI file with one track per layer
  - Sets tempo (BPM → microseconds per beat)
  - Sets time signature
  - For each layer:
    - Sets MIDI instrument (channel, program number: guitar = 25, bass = 34 in General MIDI)
    - Converts each `Note` to MIDI events: note-on at `startBeat`, note-off at `startBeat + durationBeats`
    - Applies octave shift
  - Returns a Blob
- `src/utils/download.ts`:
  - `downloadBlob(blob: Blob, filename: string)` — creates a temporary anchor element and triggers download

**Files created:** `src/services/exportMidi.ts`, `src/utils/download.ts`

**Dependencies:** `midi-writer-js`

---

### Step 8.2 — MusicXML export

**What:** Generate and download a MusicXML file from the project.

**Why now:** MusicXML enables import into GarageBand, MuseScore, etc.

**Details:**
- `src/services/exportMusicXml.ts`:
  - `exportProjectToMusicXml(project: Project): Blob`
  - Generates MusicXML string using template literals (no library needed — MusicXML is structured XML)
  - Structure:
    - `<score-partwise>` root element
    - One `<part>` per layer
    - `<attributes>` with time signature, key (C major default), clef (treble/bass based on instrument)
    - `<direction>` with tempo marking
    - Groups notes into `<measure>` elements
    - Each note: `<note>` with `<pitch>` (step, octave, alter for sharps), `<duration>`, `<type>` (quarter, half, etc.)
    - Rests: `<note>` with `<rest/>`
  - `src/utils/musicXmlUtils.ts`:
    - `midiToPitch(midi: number): { step: string, alter: number, octave: number }` — converts MIDI number to MusicXML pitch components
    - `durationToMusicXmlType(durationBeats: number): string` — maps beat durations to MusicXML type names
  - Returns Blob with `text/xml` type

**Files created:** `src/services/exportMusicXml.ts`, `src/utils/musicXmlUtils.ts`

---

### Step 8.3 — PDF export

**What:** Render the currently displayed notation (sheet music or tab) to a PDF and download it.

**Why now:** PDF is the most common format for sharing/printing.

**Details:**
- `npm install jspdf`
- `src/services/exportPdf.ts`:
  - `exportNotationToPdf(svgElement: SVGElement, projectName: string): void`
  - Strategy: VexFlow renders to SVG. We convert the SVG to a canvas image, then add to PDF.
  - Steps:
    1. Clone the SVG element from the notation display
    2. Serialize to SVG string using `XMLSerializer`
    3. Create an `Image` from the SVG data URL
    4. Draw image onto an offscreen `Canvas`
    5. Use `jsPDF.addImage()` to add canvas content to PDF
    6. Add project name as title text at top
    7. Handle pagination if notation is tall (split across pages)
    8. Download PDF
  - Alternative simpler approach for MVP: use `jsPDF` with the SVG rendered to canvas via `canvg` or just capture the container as an image. Start with the simplest approach.
- `npm install html2canvas` (as a simpler alternative to SVG serialization)
  - Capture the notation container div as canvas, add to PDF
  - Simpler, more reliable for MVP
- Update exports to handle both sheet music and tab views (exports whichever is currently displayed)

**Files created:** `src/services/exportPdf.ts`

**Dependencies:** `jspdf`, `html2canvas`

---

### Step 8.4 — Export UI in top bar

**What:** Add export buttons/dropdown to the top bar. User clicks to export in their chosen format.

**Why now:** Completes the export feature set.

**Details:**
- `src/components/ExportMenu.tsx`:
  - Dropdown button "Export ▼" that reveals three options:
    - "Download PDF" — calls `exportPdf`
    - "Download MusicXML" — calls `exportMusicXml`
    - "Download MIDI" — calls `exportMidi`
  - Each option shows a small description (e.g., "For MuseScore, GarageBand" next to MusicXML)
  - Disabled state with message if project has no recorded layers
  - Dropdown closes on selection or outside click
- Integrate into `TopBar.tsx`
- Filename format: `{projectName}_{format}.{extension}` (sanitize project name for filename)

**Files created:** `src/components/ExportMenu.tsx`. Updated `TopBar.tsx`.

---

## Phase 9: Error Handling & Polish

### Step 9.1 — Comprehensive error handling and user feedback

**What:** Add error boundaries, toast notifications, and handle all error scenarios from the spec.

**Why now:** All features are built; now we harden the experience.

**Details:**
- `src/components/ErrorBoundary.tsx`: React error boundary wrapping the app, shows a friendly "Something went wrong" message with "Reload" button
- `src/components/Toast.tsx` and `src/context/ToastContext.tsx`:
  - Simple toast notification system (bottom of screen)
  - Types: `success`, `error`, `warning`, `info`
  - Auto-dismiss after 4 seconds
  - Used for: "Project saved", "No notes detected", "Storage full", etc.
- Error handling additions:
  - Microphone denied: shows `MicPermissionGuide` (already built in Step 4.1)
  - No notes detected: toast with spec message
  - Browser not supported: check for `getUserMedia` and `AudioContext` on app load, show banner if missing
  - Storage full: catch `QuotaExceededError` in storage service, show warning toast with nudge to export and delete old projects
  - Processing failure: catch errors in quantization pipeline, show "Processing failed, please try recording again"

**Files created:** `src/components/ErrorBoundary.tsx`, `src/components/Toast.tsx`, `src/context/ToastContext.tsx`. Updated `App.tsx`, relevant hooks and services.

---

### Step 9.2 — Loading states and processing indicators

**What:** Add loading spinners, progress indicators, and skeleton states throughout the app.

**Why now:** Polish step — makes the app feel responsive per the spec's performance requirements.

**Details:**
- `src/components/common/LoadingSpinner.tsx`: simple animated spinner component
- `src/components/common/ProcessingOverlay.tsx`: full-area overlay with spinner and message, used during pitch processing ("Processing your melody... This may take a few seconds")
- Add loading states:
  - Project list loading (on app start)
  - Recording processing (after stop, before notation appears)
  - Export generation (brief, for PDF especially)
- Recording timer display: shows mm:ss elapsed, and "2:00 max" indicator
- Skeleton placeholder in notation area while loading

**Files created:** `src/components/common/LoadingSpinner.tsx`, `src/components/common/ProcessingOverlay.tsx`. Updated relevant components.

---

### Step 9.3 — Mobile responsiveness and touch optimization

**What:** Review and optimize all components for mobile viewports. Ensure touch targets are adequate, layout doesn't overflow, and the experience is smooth on phones.

**Why now:** The spec says "mobile-friendly" and "mobile-responsive" — this is a dedicated pass.

**Details:**
- Audit all components at 320px, 375px, 414px widths
- Record button: fixed at bottom of viewport on mobile, 64px minimum touch target
- Layer panel: below notation on mobile (full-width), sidebar on desktop (≥768px)
- Controls area: stack vertically on mobile, horizontal on desktop
- Notation display: horizontal scroll for wide notation on small screens (VexFlow SVG in a scrollable container)
- Export menu: full-width dropdown on mobile
- Touch-friendly: all buttons minimum 44px tap target
- Prevent double-tap zoom on controls
- Viewport meta tag in `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">`
- Test tap tempo on touch devices (use `touchstart` event in addition to `click`)

**Files updated:** Various component files, `index.html`, Tailwind config.

---

### Step 9.4 — Browser compatibility and graceful degradation

**What:** Add browser detection, polyfills if needed, and graceful degradation messages.

**Why now:** Spec requires Chrome optimization with graceful degradation for other browsers.

**Details:**
- `src/utils/browserCompat.ts`:
  - `checkBrowserSupport(): { supported: boolean, warnings: string[] }`
  - Checks: `navigator.mediaDevices.getUserMedia`, `AudioContext` or `webkitAudioContext`, `IndexedDB`, `crypto.randomUUID`
  - For Safari: `webkitAudioContext` fallback
  - For older browsers missing `crypto.randomUUID`: simple UUID polyfill
- `src/components/BrowserWarning.tsx`:
  - Shown conditionally at app load if browser is not fully supported
  - Non-blocking warning for partial support (e.g., "Some features may not work perfectly. For best experience, use Chrome.")
  - Blocking message if critical APIs are missing
- Test basic functionality in Firefox, Safari, Edge (manual testing checklist)

**Files created:** `src/utils/browserCompat.ts`, `src/components/BrowserWarning.tsx`. Updated `App.tsx`.

---

## Phase 10: Final Integration & Testing

### Step 10.1 — End-to-end integration review and bug fixes

**What:** Walk through the complete user flow from the spec (steps 1–13) and fix any integration issues. Ensure data flows correctly between all components.

**Details:**
- Verify complete flow:
  1. Open app → see project dashboard
  2. Create project → enter workspace
  3. Set tempo → verify BPM updates
  4. Set time signature → verify display
  5. Choose metronome → verify audio/visual works
  6. Add layer, assign instrument → verify layer appears
  7. Record → verify metronome plays, count-in works, recording captures audio, processing completes, notes appear in notation
  8. View sheet music → verify correct clef, notes, time sig
  9. Toggle to tab → verify correct string/fret positions
  10. Shift octave → verify notation updates
  11. Play back → verify correct instrument sound
  12. Add second layer → verify it works alongside first
  13. Export all three formats → verify files are valid
- Fix any issues found
- Ensure auto-save works (close and reopen project, verify state persists)
- Test project deletion
- Test re-recording a layer

**No new files — bug fixes and adjustments to existing files.**

---

### Step 10.2 — Performance optimization

**What:** Profile the app and optimize for the spec's performance requirements (pitch detection < 5 seconds for 2 minutes of audio).

**Details:**
- Profile pitch detection + quantization pipeline with 2 minutes of test data
- If slow: consider running pitch detection in real-time during recording (already the plan) rather than post-processing, so by the time recording stops, raw events are already collected and only quantization remains
- Optimize quantization algorithm: should be O(n) over raw events
- VexFlow rendering: if slow for many measures, consider rendering visible measures first (viewport-based rendering) — likely not needed for 2-minute recordings
- Lazy-load heavy libraries (Tone.js, VexFlow) using dynamic `import()` to improve initial load time
- Check bundle size with `npx vite-bundle-visualizer`
- Minimize re-renders: `React.memo` on notation components, stable references for callbacks

**No new files — optimizations to existing code.**

---

### Step 10.3 — Final cleanup and documentation

**What:** Clean up code, add code comments for complex logic, write a README, and prepare for deployment.

**Details:**
- Remove any `console.log` statements used during development
- Add JSDoc comments to all service classes and complex utility functions
- `README.md`:
  - Project description
  - Tech stack
  - How to run locally (`npm install`, `npm run dev`)
  - How to build for production (`npm run build`)
  - Architecture overview (data flow, key services)
  - Known limitations
- Verify production build works: `npm run build && npm run preview`
- Configure Vite for clean production output (source maps, minification)

**Files created/updated:** `README.md`, various files for cleanup.

---

## Summary of Dependencies (Install Order)

| Step | Package | Purpose |
|------|---------|---------|
| 1.1 | `react`, `react-dom`, `typescript`, `tailwindcss`, `vite` | Core framework |
| 2.1 | `idb` | IndexedDB wrapper |
| 3.3 | `tone` | Metronome audio + playback |
| 4.2 | `pitchy` | Pitch detection |
| 5.1 | `vexflow` | Notation rendering |
| 8.1 | `midi-writer-js` | MIDI export |
| 8.3 | `jspdf`, `html2canvas` | PDF export |

---

## File Tree (Final State)

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── types/
│   ├── music.ts
│   └── project.ts
├── constants/
│   └── music.ts
├── context/
│   ├── ProjectContext.tsx
│   └── ToastContext.tsx
├── hooks/
│   ├── useProject.ts
│   ├── useTapTempo.ts
│   ├── useMetronome.ts
│   ├── useRecording.ts
│   └── usePlayback.ts
├── services/
│   ├── storage.ts
│   ├── metronome.ts
│   ├── audioCapture.ts
│   ├── pitchDetector.ts
│   ├── quantizer.ts
│   ├── notationRenderer.ts
│   ├── playback.ts
│   ├── exportMidi.ts
│   ├── exportMusicXml.ts
│   └── exportPdf.ts
├── utils/
│   ├── noteUtils.ts
│   ├── tabUtils.ts
│   ├── musicXmlUtils.ts
│   ├── download.ts
│   └── browserCompat.ts
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx
│   │   ├── ControlsArea.tsx
│   │   ├── NotationDisplay.tsx
│   │   ├── LayerPanel.tsx
│   │   └── RecordButton.tsx
│   ├── controls/
│   │   ├── TempoControls.tsx
│   │   ├── TimeSignatureSelector.tsx
│   │   └── MetronomeControls.tsx
│   ├── notation/
│   │   ├── SheetMusicView.tsx
│   │   ├── TabView.tsx
│   │   └── ViewToggle.tsx
│   ├── layers/
│   │   ├── LayerPanel.tsx
│   │   ├── LayerActions.tsx
│   │   └── InstrumentSelector.tsx
│   ├── common/
│   │   ├── LoadingSpinner.tsx
│   │   └── ProcessingOverlay.tsx
│   ├── ProjectDashboard.tsx
│   ├── ExportMenu.tsx
│   ├── MicPermissionGuide.tsx
│   ├── BrowserWarning.tsx
│   ├── ErrorBoundary.tsx
│   └── Toast.tsx
```

---

## Risk Mitigation Notes for the Implementing Agent

1. **VexFlow API complexity**: VexFlow's API is verbose and has breaking changes between v4 and v5. Pin to a specific version and reference that version's documentation. Start with the simplest possible rendering (single measure, single note) before scaling up.

2. **Tone.js AudioContext**: Browsers require user gesture to start AudioContext. Always call `Tone.start()` on the first user interaction (button click) before any audio operations.

3. **Pitch detection accuracy**: `pitchy` works well with clean vocal input but struggles with background noise. The clarity threshold (0.85 suggested) may need tuning. Make it a configurable constant.

4. **Quantization is the hardest algorithmic piece**: The rhythm quantization in Step 4.3 is where most musical intelligence lives. Start with a simple implementation (snap to nearest 8th note grid) and accept imperfect results for MVP. Don't over-engineer this.

5. **IndexedDB data size**: Storing note arrays for layers is fine (small data). Never store raw audio blobs — the spec explicitly says to discard them.

6. **Mobile Safari quirks**: `getUserMedia` works but has quirks around AudioContext suspension. Test the audio pipeline specifically on iOS Safari if possible.

7. **Bundle size**: Tone.js and VexFlow are large libraries. Use dynamic imports (code splitting) for both so the initial page load is fast.