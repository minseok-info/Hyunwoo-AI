import { useEffect, useMemo, useState } from "react";

const GoogleMapEmbed = ({ shortUrl, embedData }: { shortUrl: string; embedData?: string }) => {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  /* If coords/query were resolved at paste time and stored in the alt text, use them directly */
  const directEmbedUrl = useMemo(() => {
    if (!embedData) return null;
    if (embedData.startsWith("q=")) {
      return `https://maps.google.com/maps?${embedData}&output=embed`;
    }
    const parts = embedData.split(",");
    if (parts.length >= 2) {
      const [lat, lng, zoom = "15"] = parts;
      return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
    }
    return null;
  }, [embedData]);

  useEffect(() => {
    if (directEmbedUrl) {
      setEmbedUrl(directEmbedUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(false);
    setEmbedUrl(null);

    fetch(`/api/resolve-map?url=${encodeURIComponent(shortUrl)}`)
      .then(r => {
        if (!r.ok) throw new Error("resolve failed");
        return r.json();
      })
      .then(data => {
        if (cancelled) return;
        if (data.embedUrl) {
          setEmbedUrl(data.embedUrl);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [shortUrl, directEmbedUrl]);

  /*
   * Using <span style="display:block"> to avoid DOM nesting issues
   * (block elements inside markdown <p> tag).
   */

  if (loading) {
    return (
      <span style={{
        display: "block",
        width: "100%",
        height: "300px",
        lineHeight: "300px",
        textAlign: "center",
        background: "rgba(30,40,60,0.6)",
        borderRadius: "8px",
        color: "rgba(255,255,255,0.5)",
        fontSize: "14px"
      }}>
        Loading map...
      </span>
    );
  }

  if (error || !embedUrl) {
    return (
      <a href={shortUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#6fa8ff" }}>
        📍 Open in Google Maps
      </a>
    );
  }

  return (
    <span
      style={{ display: "block", width: "100%" }}
      dangerouslySetInnerHTML={{
        __html: `<iframe src="${embedUrl}" width="100%" height="400" style="border:0; border-radius:8px;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      }}
    />
  );
};

export default GoogleMapEmbed;
