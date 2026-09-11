<!-- File timestamp: 2026-09-09 20:22:20 +09:00 -->

# Agent Instructions

## Project Overview

This is a single-file browser app for handwritten digit recognition:

- [index.html](index.html) contains the HTML, CSS, and JavaScript.
- [숫자_인식_실행.bat](숫자_인식_실행.bat) opens the app in the default browser.
- TensorFlow.js 4.22.0 and the pretrained MNIST model are loaded from external URLs at runtime.

## Working Conventions

- 앞으로 만드는 모든 파일은 날짜와 시간을 주석으로 표시해 줘.
- Add the current date and time as a comment when creating or modifying a file, using the comment syntax supported by that file type.
- Preserve the existing single-file structure unless a change clearly requires new files.
- Keep the existing DOM IDs stable: `drawingCanvas`, `clearButton`, `recognizeButton`, `resultDigit`, `confidence`, `status`, and `scores`.
- Match the existing plain JavaScript style using `const`/`let`, functions, and async model loading.
- Keep canvas preprocessing compatible with MNIST: a 28x28 grayscale input with normalized pixel values.
- Dispose TensorFlow tensors after predictions to avoid memory leaks.
- Preserve responsive behavior below 700px.

## Run and Validate

- Double-click [숫자_인식_실행.bat](숫자_인식_실행.bat) from Windows Explorer.
- If direct `file://` loading is blocked by the browser, run `py -m http.server 8000` in the project folder and open `http://localhost:8000`.
- Manual smoke test: wait for `Model ready`, draw a digit, recognize it, clear it, and verify the confidence rows update.
- There is no package manager, build script, backend, or automated test suite.

## Important Constraints

- Recognition requires internet access for the TensorFlow.js CDN and Google Cloud Storage model.
- Coordinate changes to canvas colors, dimensions, or input preprocessing carefully because they can reduce model accuracy.
- Keep the recognize button disabled or coordinated while the model is loading and predicting.
- `renderScores()` creates HTML; do not interpolate future user-controlled content into it.
