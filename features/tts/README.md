# TTS Feature

## Purpose

This feature owns everything related to Text-to-Speech functionality, including playback control, voice selection, and sentence highlighting.

## Public API

- `useTTS()`: Manages the core TTS state, playback controls, and settings.

## Dependency Flow

Component → Hook → Service → Repository → Storage / Browser API

## Services Planned

- **Queries:** `loadVoices`, `loadTtsSettings`, `getCurrentSpeech`
- **Commands:** `startSpeech`, `pauseSpeech`, `resumeSpeech`, `stopSpeech`, `updateVoice`, `updateRate`, `updatePitch`

## Repositories Planned

- A `TtsSettingsRepository` may be created to persist user voice/rate/pitch preferences, likely using `localStorage` initially.
