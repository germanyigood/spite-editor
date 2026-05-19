# Implementation Plan: Export System Overhaul

## 1. Export UI Updates (`components/panels/ExportPanel.tsx`)
- Extract the "Save Project (.sforge)" button to the top of the panel or outside it, perfectly distinct from the asset exports.
- Add an export mode toggle/radio: "Pack as Archive (.sfts, .sfa)" vs "Unpacked (Multi-file download)".
- Update the export buttons grid:
  - **Images**
  - **TS (Base64)**
  - **TS Linked (SFTS)**
  - **JSON Linked (SFA)**

## 2. Refactor `useProjectExport.ts`
- Update the `useProjectExport` hook signature to pass through a `packAsArchive` boolean flag.
- Refactor the code generation logic to cleanly support Linked TS vs Linked JSON.
- **Archive Mode:** Consolidate the generated `.ts/.json` file and the associated `.png` files into a `JSZip` and download it with the custom extension `.sfts` or `.sfa` respectively.
- **Unpacked Mode:** Write a helper to iterate over the files and trigger an `a` tag download for each individually (the source code file + all images).

## 3. Data Structure Definition for SFTS and SFA
- For `sfts`, format the output exactly like the current `ts` export, but instead of replacing the `image` string with base64, replace it with relative paths (e.g. `"./{animName}_{key}.png"`).
- For `sfa`, parse the structural data and wrap it in a proper `JSON.stringify` call, matching the TS structure but as pure JSON.

## Proceeding with Execution
Once approved:
1. Update `ExportPanel.tsx` UI and state.
2. Refactor `useProjectExport.ts` and add JSZip logic for custom extensions.
3. Write multi-file download utility in `utils/io.ts`.
4. Test both the packed (archive) and unpacked (multi-file) flows.
