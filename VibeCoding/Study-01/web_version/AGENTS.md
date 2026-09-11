<!-- File timestamp: 2026-09-09 20:22:20 +09:00 -->

# Web Version Agent Instructions

## Project Overview

This folder contains the web version of the handwritten digit recognition app. Keep the browser experience usable on desktop and mobile screens.

## Working Conventions

- Preserve the existing recognition contract: `drawingCanvas`, `clearButton`, `recognizeButton`, `resultDigit`, `confidence`, `status`, and `scores`.
- Keep canvas preprocessing compatible with MNIST: 28x28 grayscale input with normalized pixel values.
- Use plain browser APIs and the existing JavaScript style unless a framework is explicitly introduced.
- Dispose TensorFlow.js tensors after predictions to avoid memory leaks.
- Add the current date and time as a comment when creating or modifying files.
- Preserve responsive behavior below 700px.

## Run and Validate

- The app requires internet access for the TensorFlow.js CDN and pretrained MNIST model.
- If direct `file://` loading is blocked, run `py -m http.server 8000` from the project folder and open `http://localhost:8000`.
- Manual smoke test: wait for `Model ready`, draw a digit, recognize it, clear it, and verify the confidence rows update.

## Important Constraints

- Keep the recognize button disabled or coordinated while the model is loading and predicting.
- `renderScores()` creates HTML; do not interpolate future user-controlled content into it.
- Avoid changing canvas dimensions, colors, or input preprocessing without checking recognition accuracy.
