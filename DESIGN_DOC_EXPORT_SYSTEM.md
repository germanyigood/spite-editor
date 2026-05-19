# Export System Improvement Design Document

## Objective
Improve the project export system to support new formats (SFTS and SFA) that do not embed base64 images, and provide flexible downloading options (Package archive vs multi-file download). Additionally, visually separate the global project save (.sforge) from the asset export options.

## Current State
- The `ExportPanel` allows exporting:
  - Final Images (PNG / ZIP if multiple).
  - Project File (.sforge).
  - TS Code (.ts file with base64 images embedded).
- The `useProjectExport` hook handles the generation and triggering of downloads.

## New Requirements

### 1. Separate "Save Project" (.sforge)
- Move "Project File (.sforge)" to its own distinct section in the Left Sidebar (e.g., above or separated from "Export Assets").
- This makes a clear distinction between saving the working source file and exporting the final assets for production.

### 2. Retain "TS Code" Export
- The existing TS export (.ts with base64 embedded) remains unchanged.

### 3. Implement SFTS Format (`.sfts` or multi-file)
- **Goal:** Export TypeScript data where images are referenced by relative paths instead of embedded base64 strings.
- **Content:**
  - One `.ts` file (e.g., `[projectName].ts` or `index.ts`).
  - Several `.png` files (the outputs from the node graph).
- **Structure:** The exported `.ts` file will reference the images (e.g., `image: "./Idle_default.png"`).
- **Download Options:** 
  - As a single packaged file with the `.sfts` extension (which is internally a standard ZIP archive containing the `.ts` and images).
  - Multi-file (unarchived) — sequential browser download triggers for the `.ts` file and every `.png` file separately.

### 4. Implement SFA Format (`.sfa` or multi-file)
- **Goal:** A universal JSON-based format resembling the TS export structure.
- **Content:**
  - One `.json` file (`index.json` or `[projectName].json`).
  - The JSON contains the identical layout/frame/metadata structure, but images are referenced by relative paths under a `resources` property or directly within the animation objects.
  - Several `.png` files.
- **Download Options:**
  - As a single packaged file with the `.sfa` extension (which is internally a standard ZIP archive containing the `.json` and images).
  - Multi-file (unarchived) — sequential browser download triggers for the `.json` file and every `.png` file separately.

## Implementation Steps

### Step 1: Update the Export UI (`ExportPanel.tsx`)
Redesign the `ExportPanel` to clearly present these options:
1.  **Save Working Project (.sforge)** - distinct button.
2.  **Export Assets:**
    *   Images Only (.png / ZIP)
    *   TS Code (Base64)
    *   TS Code Linked (SFTS)
    *   JSON Linked (SFA)
    *   **Toggle/Switch:** "Pack as Archive (.sfts/.sfa)" vs "Download Separate Files"

### Step 2: Extend `useProjectExport.ts`
Modify the `handleExport` function to support the new types: `sfts` and `sfa`, taking a new parameter `packAsArchive: boolean` (or similar).
- **For `sfts` and `sfa`:**
  1. Iterate over all animations.
  2. Collect graph data and blobs (PNGs).
  3. Instead of converting blobs to Base64, store them in a Map alongside their generated relative filenames.
  4. Build the TS string or JSON object referencing these filenames.
  5. Either bundle them into a `JSZip` and download as `project.sfts` / `project.sfa`, OR loop through the Map and trigger an individual download for each blob/text file.

### Step 3: Sequential Download Utility
Implement a small utility inside `utils/io.ts` or `useProjectExport` to handle multi-file downloads. 
- It will create `a` tags and click them sequentially with a brief timeout between downloads (e.g., 200-500ms) to bypass browser restrictions.

### Step 4: JSON Format definition (SFA)
Structure roughly similar to the TS Code:
```json
{
  "meta": { "version": "1.0" },
  "animations": {
    "Idle": {
      "fps": 12,
      "loop": true,
      "frames": [...],
      "layout": [...],
      "image": "Idle_default.png" 
    }
  }
}
```
