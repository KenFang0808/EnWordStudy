# EnWordStudy

AI-powered English word explainer video generator built with Remotion, React, and TypeScript.

Chinese version: [README.zh-CN.md](./README.zh-CN.md)

This project turns a word topic such as `lavish`, `presumptuous`, or `squander` into a vertical short-form study video with:

- a generated script
- a scene-based storyboard
- voice-over
- captions
- background music
- a final `1080x1920` rendered video

## Current Status

The repository is no longer a default Remotion starter.

It currently contains a working pipeline for vocabulary explainer videos:

- portrait output: `1080x1920`
- frame rate: `30fps`
- default audience: English learners
- vocabulary-first script mode for selected single-word topics
- scene system: intro, content, diagram, list, quote, outro
- subtitle overlay and music bed
- multiple TTS provider fallbacks

## Quick Start

Install dependencies:

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Start Remotion Studio:

```bash
npm run dev
```

Generate a full video from a word:

```bash
npm run generate -- lavish --duration 60 --style vocabulary-cinematic --audience "English learners" --language en
```

Render the current storyboard again without re-running the full pipeline:

```bash
npx remotion render src/index.ts AIVideo output/final/lavish.mp4 --overwrite
```

Run checks:

```bash
npm run lint
```

## Pipeline

The main pipeline lives in `src/pipeline/generateVideo.ts` and runs these stages:

1. validate input
2. generate script
3. generate storyboard
4. apply visual metadata
5. generate voice-over
6. generate background music
7. generate captions
8. render preview frames
9. run QA checks
10. render final video

Generated artifacts are written to:

- `data/input.json`
- `data/script.json`
- `data/storyboard.json`
- `public/audio/voice`
- `public/audio/music`
- `output/previews`
- `output/final`

## Project Structure

```text
src/
  agents/        Script, storyboard, voice, music, caption, QA
  models/        Zod schemas and shared types
  pipeline/      End-to-end generation entrypoint
  remotion/      Video composition, scenes, animations, components
  utils/         Asset paths, duration helpers, env helpers, JSON writers
data/            Latest generated input, script, storyboard snapshots
public/audio/    Generated voice and music assets
output/          Preview frames and final rendered videos
```

## TTS Providers

Voice generation falls back in this order:

1. ElevenLabs
2. OpenAI TTS
3. local `index-tts`
4. macOS `say`

Useful environment variables are listed in `.env.example`:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `OPENAI_API_KEY`
- `INDEX_TTS_ROOT`
- `INDEX_TTS_VOICE`
- `INDEX_TTS_DEVICE`

If `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` are set, ElevenLabs is used first.

## Supported Word Presets

The local vocabulary mode currently has built-in presets for:

- `lavish`
- `presumptuous`
- `squander`

These presets live in `src/agents/scriptAgent.ts`.

If you want to add another word with a hand-tuned script template, add a new entry to `VOCABULARY_PRESETS`.

## Important Notes

- The requested duration is a target, not a hard cap. Final duration may become longer when TTS audio is longer than expected.
- The intro scene is configured so the first frame immediately shows the word instead of fading in from black.
- Outro timing is trimmed to match the voice-over more closely instead of forcing a long static ending.
- `.env` is ignored by Git, but `.env.example` is committed for reference.
- Generated `mp4` and preview image files under `output/` are ignored by Git.

## Example Commands

Generate another word video:

```bash
npm run generate -- presumptuous --duration 60 --style vocabulary-cinematic --audience "English learners" --language en
```

Open the current composition in Remotion Studio:

```bash
npm run dev
```

Render the latest storyboard snapshot:

```bash
npx remotion render src/index.ts AIVideo output/final/latest.mp4 --overwrite
```

## Tech Stack

- Remotion
- React 19
- TypeScript
- Zod
- ESLint
- ffmpeg / ffprobe
- ElevenLabs / OpenAI / index-tts / macOS say

## Repository

GitHub:

- <https://github.com/KenFang0808/EnWordStudy>
