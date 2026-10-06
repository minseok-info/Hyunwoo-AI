import type { NextApiRequest, NextApiResponse } from "next";
import https from "https";
import http from "http";

/**
 * Extract map embed data from a Google Maps URL.
 * Returns an embedUrl if any usable data (coords, query, place name) is found.
 */
function extractEmbedUrl(url: string): string | null {
  const decoded = decodeURIComponent(url).replace(/\\u0026/g, "&").replace(/&amp;/g, "&");

  /* Pattern 1: /@lat,lng,zoomz */
  let m = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)z/);
  if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&z=${Math.round(parseFloat(m[3]))}&output=embed`;

  /* Pattern 2: /@lat,lng (without zoom) */
  m = decoded.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&z=15&output=embed`;

  /* Pattern 3: ?q=lat,lng or ?q=SEARCH */
  m = decoded.match(/[?&]q=([^&]+)/);
  if (m) return `https://maps.google.com/maps?q=${encodeURIComponent(decodeURIComponent(m[1]))}&output=embed`;

  /* Pattern 4: /place/PLACE_NAME/ */
  m = decoded.match(/\/place\/([^/@]+)/);
  if (m) {
    const place = decodeURIComponent(m[1].replace(/\+/g, " "));
    return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
  }

  /* Pattern 5: !3dlat!4dlng (pb-encoded data) */
  m = decoded.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&z=15&output=embed`;

  return null;
}

/**
 * Follow HTTP redirects using Node.js native https/http modules.
 * More reliable than Web Fetch API for Google short-link resolution.
 */
function resolveRedirects(
  url: string,
  maxRedirects = 10
): Promise<{ finalUrl: string; body: string }> {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) return resolve({ finalUrl: url, body: "" });

    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Cookie: "CONSENT=YES+cb.20210720-07-p0.en+FX+410",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400 && res.headers.location) {
          const location = res.headers.location;
          const redirectUrl = location.startsWith("http")
            ? location
            : new URL(location, url).href;
          res.resume();

          /* Check if the redirect URL already contains useful data */
          const embed = extractEmbedUrl(redirectUrl);
          if (embed) return resolve({ finalUrl: redirectUrl, body: "" });

          return resolve(resolveRedirects(redirectUrl, maxRedirects - 1));
        }

        /* Read the HTML body for fallback parsing */
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ finalUrl: url, body }));
        res.on("error", () => resolve({ finalUrl: url, body: "" }));
      }
    );

    req.on("error", () => resolve({ finalUrl: url, body: "" }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ finalUrl: url, body: "" });
    });
  });
}

/**
 * Search an HTML body string for any Google Maps URLs that contain usable map data.
 */
function extractFromBody(body: string): string | null {
  /* Unescape common JS and HTML escape sequences */
  const unescaped = body
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&");

  const patterns = [
    /https?:\/\/www\.google\.\w+\/maps\/[^\s"'<>\\]+/g,
    /https?:\/\/maps\.google\.com\/maps[^\s"'<>\\]+/g,
    /https?:\/\/www\.google\.com\/maps[^\s"'<>\\]+/g,
  ];

  for (const p of patterns) {
    const matches = unescaped.match(p);
    if (matches) {
      for (const m of matches) {
        const embed = extractEmbedUrl(m);
        if (embed) return embed;
      }
    }
  }

  /* Check for meta-refresh or consent continue param */
  const continueMatch = unescaped.match(/continue=([^"&\s]+)/);
  if (continueMatch) {
    const continueUrl = decodeURIComponent(continueMatch[1]);
    const embed = extractEmbedUrl(continueUrl);
    if (embed) return embed;
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    /* Strategy 1: Node.js native https redirect following (most reliable) */
    const { finalUrl, body } = await resolveRedirects(url);

    let embed = extractEmbedUrl(finalUrl);
    if (embed) return res.status(200).json({ embedUrl: embed });

    if (body) {
      embed = extractFromBody(body);
      if (embed) return res.status(200).json({ embedUrl: embed });
    }

    /* Strategy 2: Web Fetch API with redirect:follow (backup) */
    try {
      const fetchRes = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Cookie: "CONSENT=YES+cb.20210720-07-p0.en+FX+410",
        },
      });

      embed = extractEmbedUrl(fetchRes.url);
      if (embed) return res.status(200).json({ embedUrl: embed });

      const fetchBody = await fetchRes.text();
      embed = extractFromBody(fetchBody);
      if (embed) return res.status(200).json({ embedUrl: embed });
    } catch {
      /* ignore backup failure */
    }

    return res.status(200).json({ embedUrl: null });
  } catch (error) {
    console.error("resolve-map error:", error);
    return res.status(500).json({ error: "Failed to resolve map URL" });
  }
}
