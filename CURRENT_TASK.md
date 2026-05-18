# Implementation Plan: Export System Overhaul

## 1. Export UI Updates (`components/panels/ExportPanel.tsx`)
- Extract the "Save Project (.sforge)" button to the top of the panel or even outside it, to visually distinguish it from the final asset exports.
- Add a new "Export Settings" section with a toggle switch: "Download as ZIP Archive" (defaults to true).
- Update the export buttons grid:
  - **Images** (Currently PNG/Spritesheets).
  - **TS (Base64)** (Current TS Code).
  - **TS (SFTS)** (New: Linked TS + PNGs).
  - **JSON (SFA)** (New: Linked JSON + PNGs).

## 2. Refactor `useProjectExport.ts`
- Update the `useProjectExport` hook signature to accept export configuration (or pass it through the `handleExport` parameters), specifically a `asZip` boolean flag.
- Refactor the code generation logic:
  - Separate out a function to collect all assets (blobs mapped to filenames) and the data structure representing the animations.
  - Based on the format (Base64 TS vs SFTS vs SFA), generate the final text file.
- Handle multi-file downloading:
  - Write a helper to iterate over a Map of files (Blobs or Strings) and trigger an `a` tag download for each, with a slight delay (e.g. 100ms) to bypass basic browser multi-download prevention limiters.

## 3. Data Structure Definition for SFTS and SFA
- For `sfts`, format the output exactly like the current `ts` export, but instead of replacing the `image` string with base64, replace it with `"{animName}_{key}.png"`.
- For `sfa`, parse the structural data and wrap it in a proper `JSON.stringify` call, saving it as `[projectName].json`.

## Proceeding with Execution
Once the user confirms this plan, we will:
1. Update UI components (`ExportPanel.tsx`).
2. Update the hook (`useProjectExport.ts`).
3. Add helper functions in `utils/io.ts` if needed.
4. Verify by running the application.
