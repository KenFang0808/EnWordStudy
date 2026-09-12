# AI Vocabulary Video Project

This project is built with `Remotion + React + TypeScript` and is currently focused on generating short English vocabulary videos.

The pipeline takes a topic or word and turns it into:

- `script`: voice-over script
- `storyboard`: structured scene data
- `voice`: per-scene narration audio
- `music`: background music
- `captions`: subtitles
- `video`: final MP4 output

The repository already includes several vocabulary-video customizations:

- vocabulary presets for selected words
- local `index-tts` voice integration
- a TTS fallback chain across ElevenLabs / Fish Audio / OpenAI / `index-tts`
- a fixed `quote / outro` ending split
- rotating fallback `outro` templates for single-sentence closings

## 1. Stack

- `Remotion`
- `React 19`
- `TypeScript`
- `Zod`
- `Tailwind CSS`
- local `index-tts`
- optional cloud TTS providers:
  - `ElevenLabs`
  - `Fish Audio`
  - `OpenAI`

## 2. Current Pipeline

The main generation pipeline lives in [generateVideo.ts](file:///Users/bytedance/ai-video/src/pipeline/generateVideo.ts).

The standard flow is:

1. Read CLI input or `data/input.json`
2. Generate `data/script.json`
3. Generate `data/storyboard.json`
4. Apply visual styling
5. Generate voice-over
6. Generate background music
7. Generate captions
8. Render QA preview frames
9. Run QA checks
10. Render the final MP4 into `output/final`

## 3. Project Structure

Path conventions are defined in [assets.ts](file:///Users/bytedance/ai-video/src/utils/assets.ts):

- `data/input.json`: current request
- `data/script.json`: generated script
- `data/storyboard.json`: generated storyboard
- `public/audio/voice/`: per-scene voice files
- `public/audio/music/`: background music
- `public/images/generated/`: generated images
- `output/previews/`: preview frames and preview artifacts
- `output/final/`: final MP4 output

Important code directories:

- `src/pipeline/`: main pipeline
- `src/agents/`: agent implementations
- `src/remotion/`: Remotion scenes and components
- `src/models/`: schemas and typed models
- `src/utils/`: helpers and path utilities

## 4. Script Generation

Script generation starts in [scriptAgent.ts](file:///Users/bytedance/ai-video/src/agents/scriptAgent.ts).

The current behavior has three layers:

1. If `OPENAI_API_KEY` is set
   - use OpenAI to generate the script
2. If OpenAI is not configured
   - try local vocabulary presets first
3. If the topic is not a preset word and not a special topic
   - fall back to a local generic template

The local script provider currently includes:

- `VOCABULARY_PRESETS`
  - best for stable, structured vocabulary videos
- `buildPublicSpeakingScript()`
  - for `public speaking / presentation / speech / communication`
- `buildGenericScript()`
  - generic topic template

Notes:

- For stable, high-quality vocabulary videos, adding a word to `VOCABULARY_PRESETS` is still the best path.
- If a word is not in the preset library, it can still be generated through a one-off script flow, but that is outside the main reusable logic.

## 5. Storyboard And Ending Logic

Storyboard logic lives in [storyboardAgent.ts](file:///Users/bytedance/ai-video/src/agents/storyboardAgent.ts).

The current fixed scene plan is:

- `intro`
- `definition`
- `loop`
- `traits`
- `audience`
- `quote`
- `outro`

Recent ending fix:

- When `closing` had only one sentence, `quote` and `outro` used to repeat the same text.
- The current rule is:
  - `quote` uses the first sentence of `closing`
  - `outro` uses the remaining sentences if any exist
  - if no sentence remains, `outro` uses a rotating fallback template

This means:

- the ending no longer duplicates itself
- different words get more natural endings
- the fallback remains stable and reproducible for the same word

## 6. Voice Generation

Voice logic lives in [voiceAgent.ts](file:///Users/bytedance/ai-video/src/agents/voiceAgent.ts).

The current TTS priority is:

1. `ElevenLabs`
2. `Fish Audio`
3. `OpenAI TTS`
4. local `index-tts`
5. macOS `say`

As long as an upstream provider is configured and available, it is preferred. If it fails, the pipeline falls back automatically.

### `index-tts` Environment Variables

In [.env.example](file:///Users/bytedance/ai-video/.env.example), the local TTS-related configuration includes:

- `INDEX_TTS_ROOT`
- `INDEX_TTS_PYTHON`
- `INDEX_TTS_MODEL_DIR`
- `INDEX_TTS_VOICE`
- `INDEX_TTS_DEVICE`
- `INDEX_TTS_DURATION_FACTOR`

Common usage:

- `INDEX_TTS_VOICE`: points to a voice file or a preset `prompt.wav`
- `INDEX_TTS_DURATION_FACTOR`: adjusts speaking speed
  - `1.0`: normal
  - `1.1 / 1.2 / 1.3 / 1.5`: larger means slower

### Common Voice Paths Already Used

- `/Users/bytedance/index-tts/examples/voice_07.wav`
- `/Users/bytedance/index-tts/examples/woman_09.wav`
- `/Users/bytedance/index-tts/examples/woman-11.wav`
- `/Users/bytedance/index-tts/outputs/presets/Bill/prompt.wav`
- `/Users/bytedance/index-tts/outputs/presets/TrumpVoice/prompt.wav`

## 7. Setup

### 7.1 Install Dependencies

```bash
npm install
```

### 7.2 Prepare `.env`

Copy the template:

```bash
cp .env.example .env
```

Fill in the values you need:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `INDEX_TTS_*`
- any other provider config you plan to use

If you mainly use local `index-tts`, make sure:

- `INDEX_TTS_ROOT` points to your local `index-tts`
- `INDEX_TTS_VOICE` points to a valid voice file

## 8. Common Commands

### Start Local Preview

```bash
npm run dev
```

### Lint And Type Check

```bash
npm run lint
```

### Generate Through The Main Pipeline

```bash
npm run generate -- <topic> --duration 60 --language en --style vocabulary-cinematic --audience "English learners"
```

Example:

```bash
npm run generate -- accolade --duration 60 --language en --style vocabulary-cinematic --audience "English learners"
```

### Generate From `data/input.json`

If `data/input.json` already exists, you can also run:

```bash
npm run generate
```

## 9. Current Input Defaults And Constraints

The input schema lives in [input.ts](file:///Users/bytedance/ai-video/src/models/input.ts).

Current constraints:

- `topic`: required
- `language`: defaults to `en`
- `duration`:
  - minimum `60`
  - default `90`
  - maximum `180`
- `style`: defaults to `modern-tech`
- `audience`: defaults to `General`

The most common real-world usage in this repository is:

- `topic`: a word
- `language`: `en`
- `duration`: `60`
- `style`: `vocabulary-cinematic`
- `audience`: `English learners`

## 10. QA Notes

QA logic lives in [qaAgent.ts](file:///Users/bytedance/ai-video/src/agents/qaAgent.ts).

Current QA mainly checks:

- storyboard schema validity
- scene duration validity
- empty narration
- missing voice files
- missing background music
- missing captions
- missing preview frames
- missing final MP4

Right now QA is mainly a structural completeness check, not a content-quality reviewer.

For example:

- it can detect missing files
- it can detect empty narration
- it does not automatically judge whether wording is repetitive unless that rule is explicitly added

## 11. Current Project State

This README reflects the current repository state. It is no longer the default Remotion starter documentation.

At this point, the repository is:

- not just an empty Remotion template
- a working English vocabulary video generation project
- already carrying real generated assets and tested voice paths
- already including the ending split fix and rotating fallback `outro` templates

## 12. FAQ

### 1. Why do some new words require changes in `scriptAgent.ts`?

Because the highest-quality vocabulary videos currently come from `VOCABULARY_PRESETS`. If a new word is not in the preset set, the main logic usually falls back to a generic script.

### 2. Why do different voices create very different video lengths?

Because:

- `INDEX_TTS_DURATION_FACTOR` directly changes pacing
- different voices naturally speak at different speeds
- final scene durations are stretched to match real generated audio

### 3. Why do background commands sometimes show very little log output?

Some recent one-off generation commands have shown incomplete background logging even while the task was still running. In those cases, rerunning in a foreground-friendly way is easier for progress confirmation.

## 13. Recommended Workflow

If you plan to keep extending this project, the recommended workflow is:

1. decide voice and speed first
2. add high-frequency vocabulary words to `VOCABULARY_PRESETS`
3. use `npm run generate -- ...` for the standard pipeline
4. use one-off script generation only for quick experimentation
5. keep logic changes and generated artifacts in separate commits whenever possible

## 14. Good Next Improvements

- move vocabulary presets out of `scriptAgent.ts` into separate data files
- add repeated-narration detection in QA
- add a batch generation entrypoint
- improve background task log visibility
- provide multiple script and ending styles for different video formats
