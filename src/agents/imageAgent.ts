import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Scene, Storyboard } from "../models/storyboard.ts";
import { getEnv } from "../utils/env.ts";
import { PATHS, slugify } from "../utils/assets.ts";

type ImageGenerationResult = {
  bytes: Uint8Array;
  extension: string;
  provider: string;
};

const GENERATED_IMAGE_API =
  "https://copilot-og.byteintl.net/api/ide/v1/text_to_image";
const POLLINATIONS_IMAGE_API = "https://image.pollinations.ai/prompt";
const KNOWN_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg"] as const;
const PLACEHOLDER_IMAGE_SHA1 = "63b628babf1db4d953e95585cc1d4197d9ea3555";
const POLLINATIONS_DEFAULT_MODEL = "flux";
const POLLINATIONS_DEFAULT_TIMEOUT_MS = 45000;
const POLLINATIONS_DEFAULT_RETRY_COUNT = 2;

const normalizeText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
};

const summarizeScene = (scene: Scene): string => {
  const parts = [
    scene.onScreenText.title,
    scene.onScreenText.subtitle,
    scene.onScreenText.body,
    ...(scene.visual.items ?? []).flatMap((item) => [item.title, item.body]),
    scene.visual.quote,
    scene.visual.attribution,
    scene.narration,
  ]
    .map((part) => normalizeText(part))
    .filter((part): part is string => Boolean(part));

  return parts.slice(0, 6).join(". ");
};

const getSceneVisualDirection = (scene: Scene): string => {
  switch (scene.type) {
    case "intro":
      return "hero composition, confident speaker, premium lighting, dynamic depth";
    case "content":
      return "professional explainer scene, presenter with clear focal subject, editorial realism";
    case "diagram":
      return "abstract process visualization, layered shapes, cinematic UI environment, no labels";
    case "list":
      return "multiple key ideas represented as distinct visual zones, clean composition";
    case "quote":
      return "reflective portrait-style scene, dramatic rim light, subtle atmosphere";
    case "outro":
      return "uplifting closing shot, aspirational mood, clean ending frame";
    default:
      return "cinematic educational still frame";
  }
};

const buildImagePrompt = (
  storyboard: Storyboard,
  scene: Scene,
  index: number,
): string => {
  const orientation =
    storyboard.height > storyboard.width ? "vertical smartphone frame" : "horizontal video frame";
  const sceneSummary = summarizeScene(scene);
  const sceneLabel = normalizeText(scene.onScreenText.eyebrow) ?? `Scene ${index + 1}`;

  return [
    "Create a polished cinematic still image for an educational video.",
    `Topic: ${storyboard.topic}.`,
    `Audience: ${storyboard.audience}.`,
    `Visual style: ${storyboard.style}.`,
    `Scene focus: ${sceneLabel}.`,
    `Scene details: ${sceneSummary}.`,
    `Art direction: ${getSceneVisualDirection(scene)}.`,
    `Composition: ${orientation}, background-friendly layout with strong depth, soft negative space for title overlays, no visible text, no watermark, no logo, no collage.`,
    "Use realistic lighting, premium color grading, cohesive palette, crisp subject separation, high detail.",
  ].join(" ");
};

const resolveImageSize = (storyboard: Storyboard): string => {
  const configured = getEnv("IMAGE_SIZE");
  if (configured) {
    return configured;
  }

  return storyboard.height > storyboard.width ? "portrait_16_9" : "landscape_16_9";
};

const resolvePollinationsDimensions = (
  storyboard: Storyboard,
): { width: number; height: number } => {
  const width = Math.max(512, Math.min(storyboard.width, 1440));
  const height = Math.max(512, Math.min(storyboard.height, 1440));
  return { width, height };
};

const resolvePollinationsModel = (): string =>
  getEnv("POLLINATIONS_MODEL") ?? POLLINATIONS_DEFAULT_MODEL;

const resolvePollinationsTimeoutMs = (): number => {
  const raw = getEnv("POLLINATIONS_TIMEOUT_MS");
  if (!raw) {
    return POLLINATIONS_DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : POLLINATIONS_DEFAULT_TIMEOUT_MS;
};

const resolvePollinationsRetryCount = (): number => {
  const raw = getEnv("POLLINATIONS_RETRY_COUNT");
  if (!raw) {
    return POLLINATIONS_DEFAULT_RETRY_COUNT;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.floor(parsed)
    : POLLINATIONS_DEFAULT_RETRY_COUNT;
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const toAbsolutePublicFile = (relativeFile: string): string =>
  join(process.cwd(), "public", relativeFile.replace(/^public\//, ""));

const resolveExtension = (contentType: string | null): string => {
  if (!contentType) {
    return ".png";
  }

  if (contentType.includes("image/png")) {
    return ".png";
  }
  if (contentType.includes("image/jpeg")) {
    return ".jpg";
  }
  if (contentType.includes("image/webp")) {
    return ".webp";
  }
  if (contentType.includes("image/svg+xml")) {
    return ".svg";
  }

  return ".png";
};

const getSha1 = (bytes: Uint8Array): string =>
  createHash("sha1").update(bytes).digest("hex");

const isPlaceholderImage = (bytes: Uint8Array): boolean =>
  getSha1(bytes) === PLACEHOLDER_IMAGE_SHA1;

const generateWithByteIntl = async (
  prompt: string,
  imageSize: string,
): Promise<ImageGenerationResult> => {
  const response = await fetch(
    `${GENERATED_IMAGE_API}?prompt=${encodeURIComponent(prompt)}&image_size=${encodeURIComponent(imageSize)}`,
    {
      headers: {
        Accept: "image/*",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`ByteIntl image generation failed (${response.status}): ${await response.text()}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (isPlaceholderImage(bytes)) {
    throw new Error("ByteIntl image generation is still returning a placeholder image.");
  }

  return {
    bytes,
    extension: resolveExtension(response.headers.get("content-type")),
    provider: "byteintl",
  };
};

const generateWithPollinations = async (
  prompt: string,
  storyboard: Storyboard,
  seed: number,
): Promise<ImageGenerationResult> => {
  const { width, height } = resolvePollinationsDimensions(storyboard);
  const model = resolvePollinationsModel();
  const timeoutMs = resolvePollinationsTimeoutMs();
  const retries = resolvePollinationsRetryCount();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const query = new URLSearchParams({
      model,
      width: String(width),
      height: String(height),
      seed: String(seed),
      enhance: "true",
      negative:
        "abstract, illustration, cartoon, empty room, no person, extra limbs, duplicated person, text, watermark, blurry, low detail",
    });

    try {
      const response = await fetch(
        `${POLLINATIONS_IMAGE_API}/${encodeURIComponent(prompt)}?${query.toString()}`,
        {
          headers: {
            Accept: "image/*",
          },
          signal: AbortSignal.timeout(timeoutMs),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Pollinations image generation failed (${response.status}): ${await response.text()}`,
        );
      }

      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        extension: resolveExtension(response.headers.get("content-type")),
        provider: "pollinations",
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await sleep(12000 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("Pollinations image generation failed.");
};

const buildSeed = (scene: Scene, prompt: string): number => {
  const source = `${scene.id}|${scene.onScreenText.title}|${prompt}`;
  return [...source].reduce((sum, char, index) => {
    return (sum + char.charCodeAt(0) * (index + 17)) % 100000;
  }, 0);
};

const seedValue = (seed: number, offset: number, min: number, max: number): number => {
  const normalized = ((seed * (offset * 73 + 17)) % 1000) / 1000;
  return min + normalized * (max - min);
};

const buildTopography = (seed: number, accent: string): string => {
  const paths = Array.from({ length: 4 }, (_, index) => {
    const startX = seedValue(seed, index + 1, 40, 180);
    const startY = seedValue(seed, index + 2, 1050, 1600);
    const cp1X = seedValue(seed, index + 3, 260, 480);
    const cp1Y = seedValue(seed, index + 4, 860, 1480);
    const cp2X = seedValue(seed, index + 5, 620, 860);
    const cp2Y = seedValue(seed, index + 6, 960, 1700);
    const endX = seedValue(seed, index + 7, 860, 1040);
    const endY = seedValue(seed, index + 8, 860, 1600);

    return `<path d="M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}" stroke="${accent}" stroke-opacity="${0.1 + index * 0.04}" stroke-width="${10 - index}" fill="none" stroke-linecap="round"/>`;
  });

  return paths.join("");
};

const buildContentCards = (seed: number, accent: string): string => {
  return Array.from({ length: 3 }, (_, index) => {
    const x = seedValue(seed, index + 11, 108, 220);
    const y = 360 + index * 230;
    const width = seedValue(seed, index + 12, 620, 760);
    const height = seedValue(seed, index + 13, 130, 170);
    const opacity = 0.12 + index * 0.05;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="34" fill="${accent}" fill-opacity="${opacity}" stroke="rgba(255,255,255,0.18)" />`;
  }).join("");
};

const buildSpeakerSilhouette = (
  seed: number,
  accent: string,
  centerX: number,
  centerY: number,
): string => {
  const shoulderWidth = seedValue(seed, 71, 150, 220);
  const torsoHeight = seedValue(seed, 72, 240, 320);
  const headRadius = seedValue(seed, 73, 56, 82);
  return `<g>
    <circle cx="${centerX}" cy="${centerY - torsoHeight * 0.6}" r="${headRadius}" fill="${accent}" fill-opacity="0.34" />
    <rect x="${centerX - shoulderWidth / 2}" y="${centerY - torsoHeight * 0.2}" width="${shoulderWidth}" height="${torsoHeight}" rx="64" fill="#020617" fill-opacity="0.78" stroke="rgba(255,255,255,0.12)" />
    <path d="M ${centerX - shoulderWidth * 0.62} ${centerY + torsoHeight * 0.18} Q ${centerX} ${centerY - 22}, ${centerX + shoulderWidth * 0.62} ${centerY + torsoHeight * 0.18}" stroke="rgba(255,255,255,0.2)" stroke-width="18" fill="none" stroke-linecap="round"/>
  </g>`;
};

const buildPodium = (seed: number, accent: string): string => {
  const podiumX = seedValue(seed, 74, 380, 520);
  const podiumY = seedValue(seed, 75, 1080, 1240);
  const width = seedValue(seed, 76, 180, 260);
  const height = seedValue(seed, 77, 180, 240);
  return `<g>
    <rect x="${podiumX}" y="${podiumY}" width="${width}" height="${height}" rx="28" fill="#0F172A" fill-opacity="0.88" stroke="${accent}" stroke-opacity="0.32"/>
    <rect x="${podiumX + 22}" y="${podiumY + 22}" width="${width - 44}" height="18" rx="9" fill="${accent}" fill-opacity="0.48" />
    <rect x="${podiumX + width / 2 - 18}" y="${podiumY - 140}" width="36" height="168" rx="18" fill="#111827" />
    <circle cx="${podiumX + width / 2}" cy="${podiumY - 148}" r="18" fill="${accent}" fill-opacity="0.5" />
  </g>`;
};

const buildFlowLayers = (seed: number, accent: string): string => {
  return Array.from({ length: 4 }, (_, index) => {
    const x = 108 + index * 208;
    const y = seedValue(seed, index + 78, 360, 720);
    const width = 160 + index * 12;
    const height = seedValue(seed, index + 79, 140, 220);
    return `<g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30" fill="${accent}" fill-opacity="${0.08 + index * 0.03}" stroke="rgba(255,255,255,0.12)" />
      <rect x="${x + 24}" y="${y + 26}" width="${width - 48}" height="18" rx="9" fill="${accent}" fill-opacity="0.44" />
      <rect x="${x + 24}" y="${y + 62}" width="${width - 60}" height="${height - 86}" rx="18" fill="#020617" fill-opacity="0.44" />
    </g>`;
  }).join("");
};

const buildDiagramNodes = (scene: Scene, seed: number, accent: string): string => {
  const nodes = scene.visual.nodes?.slice(0, 4) ?? [];
  const fallbackCount = Math.max(nodes.length, 3);
  const renderedNodes = Array.from({ length: fallbackCount }, (_, index) => {
    const x = 180 + index * 220 + seedValue(seed, index + 20, -35, 35);
    const y = 620 + (index % 2) * 240 + seedValue(seed, index + 21, -24, 24);
    return `<g><circle cx="${x}" cy="${y}" r="82" fill="#0F172A" fill-opacity="0.86" stroke="${accent}" stroke-width="8"/><circle cx="${x}" cy="${y}" r="36" fill="${accent}" fill-opacity="0.42"/></g>`;
  });
  const connectors = Array.from({ length: fallbackCount - 1 }, (_, index) => {
    const fromX = 180 + index * 220 + seedValue(seed, index + 20, -35, 35);
    const fromY = 620 + (index % 2) * 240 + seedValue(seed, index + 21, -24, 24);
    const toX = 180 + (index + 1) * 220 + seedValue(seed, index + 21, -35, 35);
    const toY = 620 + ((index + 1) % 2) * 240 + seedValue(seed, index + 22, -24, 24);
    return `<path d="M ${fromX} ${fromY} C ${(fromX + toX) / 2} ${fromY - 40}, ${(fromX + toX) / 2} ${toY - 40}, ${toX} ${toY}" stroke="rgba(255,255,255,0.28)" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  });

  return `${connectors.join("")}${renderedNodes.join("")}`;
};

const buildListColumns = (seed: number, accent: string): string => {
  return Array.from({ length: 3 }, (_, index) => {
    const x = 118 + index * 280;
    const y = seedValue(seed, index + 31, 520, 700);
    const height = seedValue(seed, index + 32, 420, 760);
    const innerHeight = height - 96;
    return `<g><rect x="${x}" y="${y}" width="220" height="${height}" rx="42" fill="#0F172A" fill-opacity="0.84" stroke="rgba(255,255,255,0.14)"/><rect x="${x + 28}" y="${y + 30}" width="164" height="26" rx="13" fill="${accent}" fill-opacity="0.52"/><rect x="${x + 28}" y="${y + 88}" width="164" height="${innerHeight}" rx="24" fill="${accent}" fill-opacity="${0.12 + index * 0.05}"/></g>`;
  }).join("");
};

const buildQuoteOrb = (seed: number, accent: string): string => {
  const cx = seedValue(seed, 41, 540, 660);
  const cy = seedValue(seed, 42, 760, 900);
  return `<g><circle cx="${cx}" cy="${cy}" r="280" fill="${accent}" fill-opacity="0.12"/><circle cx="${cx}" cy="${cy}" r="186" fill="#E2E8F0" fill-opacity="0.08"/><circle cx="${cx - 34}" cy="${cy - 28}" r="92" fill="rgba(255,255,255,0.08)"/><circle cx="${cx + 130}" cy="${cy - 18}" r="64" fill="rgba(255,255,255,0.1)"/></g>`;
};

const buildHeroShapes = (seed: number, accent: string): string => {
  const x = seedValue(seed, 51, 600, 760);
  const y = seedValue(seed, 52, 480, 720);
  const rotation = seedValue(seed, 53, -18, 18);
  return `<g>${buildSpeakerSilhouette(seed, accent, x, y)}${buildPodium(seed, accent)}<g transform="translate(${x + 130} ${y - 70}) rotate(${rotation})"><rect x="-170" y="-220" width="340" height="440" rx="56" fill="#E2E8F0" fill-opacity="0.06" stroke="rgba(255,255,255,0.12)"/><circle cx="0" cy="-84" r="88" fill="${accent}" fill-opacity="0.2"/><path d="M -84 112 C -52 18, 52 18, 84 112" stroke="rgba(255,255,255,0.26)" stroke-width="22" fill="none" stroke-linecap="round"/></g></g>`;
};

const buildFallbackArt = (scene: Scene, prompt: string): string => {
  const accent = scene.visual.accentColor ?? "#38BDF8";
  const seed = buildSeed(scene, prompt);
  const dots = Array.from({ length: 28 }, (_, index) => {
    const cx = seedValue(seed, index + 61, 40, 1040);
    const cy = seedValue(seed, index + 62, 80, 1840);
    const radius = seedValue(seed, index + 63, 6, 22);
    const opacity = seedValue(seed, index + 64, 0.08, 0.28);
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${accent}" fill-opacity="${opacity}"/>`;
  }).join("");

  let centerpiece = "";
  switch (scene.type) {
    case "diagram":
      centerpiece = `${buildFlowLayers(seed, accent)}${buildDiagramNodes(scene, seed, accent)}${buildSpeakerSilhouette(seed, accent, 862, 1250)}`;
      break;
    case "list":
      centerpiece = `${buildListColumns(seed, accent)}${buildSpeakerSilhouette(seed, accent, 840, 1240)}`;
      break;
    case "quote":
      centerpiece = `${buildQuoteOrb(seed, accent)}${buildSpeakerSilhouette(seed, accent, 782, 1320)}`;
      break;
    case "content":
      centerpiece = `${buildFlowLayers(seed, accent)}${buildContentCards(seed, accent)}${buildSpeakerSilhouette(seed, accent, 824, 1260)}`;
      break;
    case "intro":
    case "outro":
      centerpiece = buildHeroShapes(seed, accent);
      break;
    default:
      centerpiece = buildContentCards(seed, accent);
      break;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="55%" stop-color="#111827" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <radialGradient id="glowA" cx="18%" cy="14%" r="70%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.56" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glowB" cx="82%" cy="80%" r="54%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#A855F7" stop-opacity="0" />
    </radialGradient>
    <filter id="blur24"><feGaussianBlur stdDeviation="24" /></filter>
    <filter id="blur48"><feGaussianBlur stdDeviation="48" /></filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)" />
  <rect width="1080" height="1920" fill="url(#glowA)" />
  <rect width="1080" height="1920" fill="url(#glowB)" />
  <rect x="76" y="92" width="928" height="1736" rx="56" fill="rgba(15,23,42,0.54)" stroke="rgba(255,255,255,0.08)" />
  <g filter="url(#blur48)"><ellipse cx="312" cy="360" rx="220" ry="160" fill="${accent}" fill-opacity="0.12" /><ellipse cx="782" cy="1430" rx="260" ry="180" fill="#8B5CF6" fill-opacity="0.09" /></g>
  <g filter="url(#blur24)">${buildTopography(seed, accent)}</g>
  ${centerpiece}
  <g>${dots}</g>
  <rect width="1080" height="1920" fill="rgba(2,6,23,0.12)" />
</svg>`;
};

const generateFallbackImage = (scene: Scene, prompt: string): ImageGenerationResult => {
  return {
    bytes: new TextEncoder().encode(buildFallbackArt(scene, prompt)),
    extension: ".svg",
    provider: "local-illustration",
  };
};

const resolveExistingImage = (relativeFile: string | null | undefined): string | null => {
  if (!relativeFile) {
    return null;
  }

  const absolute = toAbsolutePublicFile(relativeFile);
  if (!existsSync(absolute)) {
    return null;
  }

  if (relativeFile.endsWith(".jpg") || relativeFile.endsWith(".jpeg")) {
    const bytes = new Uint8Array(readFileSync(absolute));
    if (isPlaceholderImage(bytes)) {
      return null;
    }
  }

  return relativeFile;
};

const sceneStem = (scene: Scene, index: number): string => {
  const base = slugify(scene.id || scene.onScreenText.title || `scene-${index + 1}`);
  return `${String(index + 1).padStart(2, "0")}-${base}`;
};

export const generateImages = async (
  storyboard: Storyboard,
): Promise<Storyboard> => {
  const topicDir = slugify(storyboard.topic);
  const absoluteDir = join(process.cwd(), PATHS.imageDir, topicDir);
  const imageSize = resolveImageSize(storyboard);
  const forceRegenerate = getEnv("IMAGE_FORCE_REGEN") === "1";

  mkdirSync(absoluteDir, { recursive: true });

  let lastProvider = "cache";
  const scenes = [];
  for (const [index, scene] of storyboard.scenes.entries()) {
    const prompt = scene.visual.imagePrompt ?? buildImagePrompt(storyboard, scene, index);
    const seed = buildSeed(scene, prompt);
    const cachedImage =
      !forceRegenerate && resolveExistingImage(scene.visual.imageFile);

    if (cachedImage) {
      scenes.push({
        ...scene,
        visual: {
          ...scene.visual,
          imagePrompt: prompt,
          imageFile: cachedImage,
        },
      });
      continue;
    }

    let generated: ImageGenerationResult;
    try {
      generated = await generateWithPollinations(prompt, storyboard, seed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Image Agent: Pollinations failed for "${scene.id}" (${message})`);
      try {
        generated = await generateWithByteIntl(prompt, imageSize);
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.warn(`Image Agent: falling back for "${scene.id}" (${fallbackMessage})`);
        generated = generateFallbackImage(scene, prompt);
      }
    }

    for (const extension of KNOWN_IMAGE_EXTENSIONS) {
      const staleFile = join(absoluteDir, `${sceneStem(scene, index)}${extension}`);
      if (existsSync(staleFile)) {
        unlinkSync(staleFile);
      }
    }

    const fileName = `${sceneStem(scene, index)}${generated.extension}`;
    const absoluteFile = join(absoluteDir, fileName);
    const relativeFile = `${PATHS.imageDir}/${topicDir}/${fileName}`.replace(
      /^public\//,
      "",
    );

    writeFileSync(absoluteFile, generated.bytes);
    lastProvider = generated.provider;

    scenes.push({
      ...scene,
      visual: {
        ...scene.visual,
        imagePrompt: prompt,
        imageFile: relativeFile,
      },
    });
  }

  console.log(`Image Agent: using ${lastProvider}`);

  return {
    ...storyboard,
    scenes,
  };
};
