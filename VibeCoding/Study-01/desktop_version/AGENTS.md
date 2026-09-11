<!-- File timestamp: 2026-09-09 20:22:20 +09:00 -->

# Desktop Version Agent Instructions

## Project Overview

This folder contains the desktop version of the handwritten digit recognition app. The desktop shell and recognition UI should remain clearly separated so the recognition behavior can be tested independently.

## Working Conventions

- Preserve the existing recognition contract: `drawingCanvas`, `clearButton`, `recognizeButton`, `resultDigit`, `confidence`, `status`, and `scores`.
- Keep canvas preprocessing compatible with MNIST: 28x28 grayscale input with normalized pixel values.
- Use the desktop framework selected for this project consistently. Do not introduce a second desktop runtime without a clear need.
- Keep native file-system or window APIs behind a small adapter; do not mix them into recognition logic.
- Dispose TensorFlow.js tensors after predictions to avoid memory leaks.
- Add the current date and time as a comment when creating or modifying files.
- Preserve a usable layout at narrow desktop window sizes.

## Run and Validate

- Document the chosen desktop runtime, install command, development command, and packaging command when the project is initialized.
- Manual smoke test: start the desktop app, wait for `Model ready`, draw a digit, recognize it, clear it, and verify the confidence rows update.
- Verify that the packaged app can load the model using the intended online or bundled asset strategy.

## Important Constraints

- Keep the recognize button disabled or coordinated while the model is loading and predicting.
- Treat model loading failures and offline operation as visible application states.
- `renderScores()` creates HTML; do not interpolate future user-controlled content into it.
- Do not grant broad native privileges when a narrowly scoped desktop API is sufficient.
