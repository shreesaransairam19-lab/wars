#!/usr/bin/env node
// WARS — PDF to WebP page splitter
// Usage: node scripts/split-pdf.mjs <input.pdf> <output-dir> [--dpi 150] [--format webp]
//
// Converts a PDF into individual page images for manga reading.
// Requires: npm install pdf2pic sharp
//
// Example:
//   node scripts/split-pdf.mjs ~/Downloads/death-note.pdf ./public/preprocessed/death-note

import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node scripts/split-pdf.mjs <input.pdf> <output-dir> [--dpi 150] [--format webp]");
    process.exit(1);
  }

  const inputPath = args[0];
  const outputDir = args[1];
  const dpi = parseInt(args.find((a) => a === "--dpi") ? args[args.indexOf("--dpi") + 1] : "150", 10);
  const format = args.find((a) => a === "--format") ? args[args.indexOf("--format") + 1] : "webp";

  console.log(`Reading: ${inputPath}`);
  console.log(`Output: ${outputDir}`);
  console.log(`DPI: ${dpi}, Format: ${format}`);

  let fromPath, pdf;
  try {
    ({ fromPath } = await import("pdf2pic"));
    const { PDFDocument } = await import("pdf-lib");
    const fs = await import("node:fs");
    const pdfBytes = fs.readFileSync(inputPath);
    pdf = await PDFDocument.load(pdfBytes);
  } catch (err) {
    console.error("Missing dependencies. Install them first:");
    console.error("  npm install pdf2pic pdf-lib sharp");
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  const totalPages = pdf.getPageCount();
  console.log(`Total pages: ${totalPages}`);

  await mkdir(outputDir, { recursive: true });

  const converter = fromPath(inputPath, {
    density: dpi,
    format,
    outputDir,
    width: 1200,
    saveFilename: "page",
  });

  // Convert all pages
  console.log("Converting pages…");
  const results = await converter.bulk(1, { total: totalPages });

  // Rename to padded format: page-001.webp, page-002.webp, etc.
  const { rename } = await import("node:fs/promises");

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result?.name) {
      const padded = String(i + 1).padStart(4, "0");
      const newName = `page-${padded}.${format}`;
      try {
        await rename(result.path, join(outputDir, newName));
      } catch {
        // File might already be named correctly
      }
    }
  }

  // Write a manifest
  const manifest = {
    source: basename(inputPath),
    total_pages: totalPages,
    dpi,
    format,
    pages: Array.from({ length: totalPages }, (_, i) => ({
      page_number: i + 1,
      filename: `page-${String(i + 1).padStart(4, "0")}.${format}`,
    })),
  };

  await writeFile(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Done! ${totalPages} pages written to ${outputDir}`);
  console.log(`Manifest saved to ${join(outputDir, "manifest.json")}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
