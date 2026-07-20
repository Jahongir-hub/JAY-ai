// Rasm yaratish — Gemini rasm modellari (Nano Banana) orqali, BEPUL. Kalit: GEMINI_API_KEY
const IMG_MODELS = [
  "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-image",
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt yo'q" });

    let lastErr = "Rasm modeli javob bermadi";
    for (const model of IMG_MODELS) {
      try {
        const r = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" +
            process.env.GEMINI_API_KEY,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
            }),
          }
        );
        const data = await r.json();
        if (r.ok) {
          const parts = data.candidates?.[0]?.content?.parts || [];
          const img = parts.find(p => p.inlineData || p.inline_data);
          if (img) {
            const d = img.inlineData || img.inline_data;
            return res.status(200).json({ b64: d.data });
          }
          lastErr = "Model rasm qaytarmadi";
        } else {
          lastErr = data.error?.message || lastErr;
          if (r.status !== 429 && r.status !== 404 && r.status !== 400) break;
        }
      } catch (e) { lastErr = e.message; }
    }
    return res.status(200).json({ error: lastErr });
  } catch (e) {
    return res.status(500).json({ error: "Server xatosi" });
  }
}
