import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, normalize, relative, sep } from "node:path";

const REQUIRED_FIELDS = [
  "id",
  "name",
  "category",
  "body_part",
  "equipment",
  "instructions",
  "instruction_steps",
  "muscle_group",
  "secondary_muscles",
  "target",
  "media_id",
  "image",
  "gif_url",
  "attribution",
  "created_at"
];

const REQUIRED_LOCALES = ["en", "es", "it", "tr", "ru", "zh", "hi", "pl", "ko", "fr"];

function parseArgs(argv) {
  const args = {
    datasetRoot: "",
    output: ".local/exercise-import-audit.json",
    manifest: ".local/exercise-media-manifest.v1.json",
    mediaBaseUrl: "",
    sourceVersion: "v1"
  };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--dataset-root") {
      args.datasetRoot = value;
      i += 1;
    } else if (key === "--output") {
      args.output = value;
      i += 1;
    } else if (key === "--manifest") {
      args.manifest = value;
      i += 1;
    } else if (key === "--media-base-url") {
      args.mediaBaseUrl = value;
      i += 1;
    } else if (key === "--source-version") {
      args.sourceVersion = value;
      i += 1;
    }
  }
  if (!args.datasetRoot) {
    throw new Error("Missing --dataset-root");
  }
  if (args.mediaBaseUrl && !args.mediaBaseUrl.startsWith("https://")) {
    throw new Error("--media-base-url must be an HTTPS URL");
  }
  return args;
}

function listFiles(root, extension) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === extension) {
        files.push(full);
      }
    }
  }
  return files.sort();
}

function toDatasetPath(datasetRoot, filePath) {
  return relative(datasetRoot, filePath).split(sep).join("/");
}

function isSafeDatasetPath(value, expectedPrefix, expectedExtension) {
  const normalized = normalize(value);
  return (
    value === value.replaceAll("\\", "/") &&
    !value.includes("..") &&
    !value.startsWith("/") &&
    !value.includes(":") &&
    normalized.split(sep).join("/").startsWith(expectedPrefix) &&
    extname(value).toLowerCase() === expectedExtension
  );
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function jpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function gifMetadata(buffer) {
  const signature = buffer.subarray(0, 6).toString("ascii");
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  let frames = 0;
  let durationMs = 0;
  for (let i = 10; i < buffer.length - 8; i += 1) {
    if (buffer[i] === 0x21 && buffer[i + 1] === 0xf9 && buffer[i + 2] === 0x04) {
      durationMs += buffer.readUInt16LE(i + 4) * 10;
    } else if (buffer[i] === 0x2c) {
      frames += 1;
    }
  }
  return { width, height, frames, duration_ms: durationMs };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function summarizeSizes(files) {
  const sizes = files.map((file) => statSync(file).size).sort((a, b) => a - b);
  return {
    count: sizes.length,
    bytes: sizes.reduce((sum, size) => sum + size, 0),
    min_bytes: sizes[0] ?? 0,
    p50_bytes: percentile(sizes, 0.5),
    p90_bytes: percentile(sizes, 0.9),
    p99_bytes: percentile(sizes, 0.99),
    max_bytes: sizes.at(-1) ?? 0
  };
}

function validateRecordShape(record, row) {
  const issues = [];
  for (const field of REQUIRED_FIELDS) {
    if (!(field in record)) issues.push({ row, field, reason: "missing_required_field" });
  }
  if (!/^[0-9]{4}$/.test(record.id ?? "")) issues.push({ row, field: "id", reason: "invalid_id" });
  if (!isSafeDatasetPath(record.image ?? "", "images/", ".jpg")) issues.push({ row, field: "image", reason: "unsafe_or_invalid_image_path" });
  if (!isSafeDatasetPath(record.gif_url ?? "", "videos/", ".gif")) issues.push({ row, field: "gif_url", reason: "unsafe_or_invalid_gif_path" });
  for (const locale of REQUIRED_LOCALES) {
    if (!record.instructions?.[locale]) issues.push({ row, field: `instructions.${locale}`, reason: "missing_locale" });
    if (!Array.isArray(record.instruction_steps?.[locale]) || !record.instruction_steps[locale].length) {
      issues.push({ row, field: `instruction_steps.${locale}`, reason: "missing_locale_steps" });
    }
  }
  return issues;
}

function hostedUrl(baseUrl, kind, filename, sourceVersion) {
  if (!baseUrl) return "";
  return `${baseUrl.replace(/\/$/, "")}/exercise-media/${sourceVersion}/${kind}/${encodeURIComponent(filename)}`;
}

function main() {
  const args = parseArgs(process.argv);
  const datasetRoot = normalize(args.datasetRoot);
  const dataPath = join(datasetRoot, "data", "exercises.json");
  const schemaPath = join(datasetRoot, "data", "exercises.schema.json");
  const imageRoot = join(datasetRoot, "images");
  const gifRoot = join(datasetRoot, "videos");
  const records = JSON.parse(readFileSync(dataPath, "utf8"));
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const imageFiles = listFiles(imageRoot, ".jpg");
  const gifFiles = listFiles(gifRoot, ".gif");
  const imagePaths = new Set(imageFiles.map((file) => toDatasetPath(datasetRoot, file)));
  const gifPaths = new Set(gifFiles.map((file) => toDatasetPath(datasetRoot, file)));
  const referencedImages = new Set();
  const referencedGifs = new Set();
  const ids = new Map();
  const names = new Map();
  const malformed = [];
  const missingFiles = [];
  const zeroByteFiles = [];
  const corruptImages = [];
  const corruptGifs = [];
  const unsafeFilenames = [];
  const caseMap = new Map();
  const manifest = [];
  const locales = new Set();
  const gifFrameCounts = [];
  const gifDurations = [];
  const gifDimensions = new Map();

  for (const file of [...imageFiles, ...gifFiles]) {
    const rel = toDatasetPath(datasetRoot, file);
    const lower = rel.toLowerCase();
    if (caseMap.has(lower) && caseMap.get(lower) !== rel) unsafeFilenames.push({ path: rel, reason: "case_collision" });
    caseMap.set(lower, rel);
    if (!/^[a-z0-9/_., -]+$/i.test(rel) || rel.includes("..") || rel.includes(":")) {
      unsafeFilenames.push({ path: rel, reason: "unsafe_filename" });
    }
    if (statSync(file).size === 0) zeroByteFiles.push(rel);
  }

  records.forEach((record, index) => {
    const row = index + 1;
    ids.set(record.id, (ids.get(record.id) ?? 0) + 1);
    names.set((record.name ?? "").toLowerCase(), (names.get((record.name ?? "").toLowerCase()) ?? 0) + 1);
    malformed.push(...validateRecordShape(record, row));
    Object.keys(record.instructions ?? {}).forEach((locale) => locales.add(locale));
    referencedImages.add(record.image);
    referencedGifs.add(record.gif_url);

    const imagePath = join(datasetRoot, record.image ?? "");
    const gifPath = join(datasetRoot, record.gif_url ?? "");
    const imageExists = existsSync(imagePath);
    const gifExists = existsSync(gifPath);
    if (!imageExists) missingFiles.push({ exercise_id: record.id, media: record.image, kind: "image" });
    if (!gifExists) missingFiles.push({ exercise_id: record.id, media: record.gif_url, kind: "gif" });

    let imageMeta = null;
    let gifMeta = null;
    let imageHash = "";
    let gifHash = "";
    if (imageExists) {
      const buffer = readFileSync(imagePath);
      imageMeta = jpegDimensions(buffer);
      imageHash = sha256(imagePath);
      if (!imageMeta) corruptImages.push(record.image);
    }
    if (gifExists) {
      const buffer = readFileSync(gifPath);
      gifMeta = gifMetadata(buffer);
      gifHash = sha256(gifPath);
      if (!gifMeta || gifMeta.frames < 1) corruptGifs.push(record.gif_url);
      if (gifMeta) {
        gifFrameCounts.push(gifMeta.frames);
        gifDurations.push(gifMeta.duration_ms);
        gifDimensions.set(`${gifMeta.width}x${gifMeta.height}`, (gifDimensions.get(`${gifMeta.width}x${gifMeta.height}`) ?? 0) + 1);
      }
    }

    manifest.push({
      exercise_id: record.id,
      media_id: record.media_id,
      image_filename: basename(record.image ?? ""),
      gif_filename: basename(record.gif_url ?? ""),
      image_sha256: imageHash,
      gif_sha256: gifHash,
      image_url: hostedUrl(args.mediaBaseUrl, "images", basename(record.image ?? ""), args.sourceVersion),
      gif_url: hostedUrl(args.mediaBaseUrl, "videos", basename(record.gif_url ?? ""), args.sourceVersion),
      image_width: imageMeta?.width ?? 0,
      image_height: imageMeta?.height ?? 0,
      gif_width: gifMeta?.width ?? 0,
      gif_height: gifMeta?.height ?? 0,
      gif_frames: gifMeta?.frames ?? 0,
      gif_duration_ms: gifMeta?.duration_ms ?? 0,
      source_version: args.sourceVersion,
      status: imageExists && gifExists && imageMeta && gifMeta ? "validated" : "review_required"
    });
  });

  const duplicateIds = [...ids.entries()].filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));
  const duplicateNames = [...names.entries()].filter(([, count]) => count > 1).map(([name, count]) => ({ name, count }));
  const orphanImages = [...imagePaths].filter((path) => !referencedImages.has(path));
  const orphanGifs = [...gifPaths].filter((path) => !referencedGifs.has(path));
  const missingEnglish = records.filter((record) => !record.instructions?.en || !record.instruction_steps?.en?.length).map((record) => record.id);
  const missingTurkish = records.filter((record) => !record.instructions?.tr || !record.instruction_steps?.tr?.length).map((record) => record.id);

  const report = {
    source_version: args.sourceVersion,
    schema_title: schema.title,
    totals: {
      exercise_records: records.length,
      unique_ids: ids.size,
      duplicate_ids: duplicateIds.length,
      duplicate_names: duplicateNames.length,
      locales: [...locales].sort(),
      image_files: imageFiles.length,
      gif_files: gifFiles.length,
      referenced_images: referencedImages.size,
      referenced_gifs: referencedGifs.size,
      missing_english: missingEnglish.length,
      missing_turkish: missingTurkish.length,
      malformed_records: malformed.length,
      missing_files: missingFiles.length,
      zero_byte_files: zeroByteFiles.length,
      corrupt_jpg_files: corruptImages.length,
      corrupt_gif_files: corruptGifs.length,
      orphan_jpg_files: orphanImages.length,
      orphan_gif_files: orphanGifs.length,
      unsafe_filenames: unsafeFilenames.length
    },
    media_sizes: {
      images: summarizeSizes(imageFiles),
      gifs: summarizeSizes(gifFiles),
      total_bytes: summarizeSizes(imageFiles).bytes + summarizeSizes(gifFiles).bytes
    },
    gif_summary: {
      dimensions: Object.fromEntries([...gifDimensions.entries()].sort()),
      frames_min: Math.min(...gifFrameCounts),
      frames_p50: percentile(gifFrameCounts.sort((a, b) => a - b), 0.5),
      frames_p90: percentile(gifFrameCounts.sort((a, b) => a - b), 0.9),
      frames_max: Math.max(...gifFrameCounts),
      duration_ms_min: Math.min(...gifDurations),
      duration_ms_p50: percentile(gifDurations.sort((a, b) => a - b), 0.5),
      duration_ms_p90: percentile(gifDurations.sort((a, b) => a - b), 0.9),
      duration_ms_max: Math.max(...gifDurations)
    },
    duplicate_ids: duplicateIds,
    duplicate_names: duplicateNames.slice(0, 100),
    missing_english: missingEnglish,
    missing_turkish: missingTurkish,
    malformed_records: malformed.slice(0, 200),
    missing_files: missingFiles.slice(0, 200),
    zero_byte_files: zeroByteFiles.slice(0, 200),
    corrupt_jpg_files: corruptImages.slice(0, 200),
    corrupt_gif_files: corruptGifs.slice(0, 200),
    orphan_jpg_files: orphanImages.slice(0, 200),
    orphan_gif_files: orphanGifs.slice(0, 200),
    unsafe_filenames: unsafeFilenames.slice(0, 200),
    manifest_file: args.manifest
  };

  mkdirSync(dirname(args.output), { recursive: true });
  mkdirSync(dirname(args.manifest), { recursive: true });
  writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(args.manifest, `${JSON.stringify({ source_version: args.sourceVersion, media_base_url: args.mediaBaseUrl || null, items: manifest }, null, 2)}\n`);
  console.log(JSON.stringify({ status: "ok", report: args.output, manifest: args.manifest, totals: report.totals, media_sizes: report.media_sizes }, null, 2));
}

main();
