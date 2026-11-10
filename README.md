# Vocal Studio

A browser based vocal practice app. It includes an audio comparison workflow, a live pitch monitor with a generated drone, three separate 30 minute warm-up sessions, an 18-practice library with categories, search, favorites, and completion tracking, exercise-level microphone pitch checks with saved scores, ear training, and a local practice history and schedule.

The Western Note Visualiser has Live Singing, Song Playback, and Compare Takes modes. It plots microphone F0 or analyzed audio on a Western note-and-octave grid (C1–B7), supports sharp or flat spellings, highlights a major key, shows cents from measured live F0, and can replay selected song sections. Compare Takes overlays the latest aligned Practice Studio contours and marks note gaps. Song analysis runs locally on the full mix, so accompaniment can affect its melody estimate; no vocal-source separation is performed. The existing live pitch monitor remains a separate page with a scrolling trace, automatic three-octave or full C1–B7 range, adjustable time window and trace color, hold/resume, plus microphone recording, playback, and audio download (up to three minutes).

Both live monitors can record microphone audio alongside detected pitch samples, replay and scrub the take, and save it in this browser for later review. These recordings remain local to the browser.

The app's internal pages use a holographic cherry-red studio theme with deep ruby glass surfaces, restrained crimson and pearl reflections, chrome-like borders, luminous pitch traces, and champagne-gold milestones. The Fire with Roots splash cycles through the seven supplied original images in upload order, one per launch or refresh, for ten seconds before fading into the app.

Fredoka headings and Nunito body text load from Google Fonts when online; the app falls back to Trebuchet MS/Arial when the font service is unavailable.

## Run it

1. Open this folder in a terminal.
2. Start a local web server, for example:

   ```powershell
   py -m http.server 8000
   ```

3. Visit `http://localhost:8000` in a current desktop browser.

Microphone access works on `localhost` or a secure HTTPS site. File selection, audio decoding, analysis, and playback are handled by the browser. No audio is uploaded to a service. The browser stores practice scores, warm-up completions, the schedule, locally saved recordings, and streak/reward progress in local storage or IndexedDB. Streak milestones count one qualifying session per local calendar day. To remove that data, clear this site's browser storage.

## What the comparison measures

The app decodes the selected audio locally, converts it to mono, estimates fundamental frequency per short window with a YIN-style detector, and uses dynamic time warping to line up the reference and take. It displays the aligned pitch contours, a pitch-match score derived from median pitch distance, voiced-frame coverage, approximate section-length difference, and up to three timestamps where pitch distance was greatest.

This is an experimental practice aid. Accompaniment, harmonics, breathy or noisy tone, pitch slides, and polyphonic audio can confuse pitch detection. Timing and expressive nuance are not yet separately scored. The pitch-match score is not a measure of vocal quality. Use the chart and your own listening as guidance.

## Current scope

This is the initial functional vertical slice. Analysis is in-browser and has no Python service or account sync. Song section labels, vibrato, runs, register classification, tone descriptors, and acoustic nuance scoring are not implemented yet. Warm-up suggestions add up to 30 minutes per session; the app does not run a timer. The completion score reflects all six exercises being checked off, rather than a biometric assessment.

The exercise pitch check is a local signal-processing score, not an AI model. It measures voiced coverage and pitch steadiness; pitch-target exercises also compare the detected median note with the selected target. It cannot judge tone, style, expression, or overall singing quality.
