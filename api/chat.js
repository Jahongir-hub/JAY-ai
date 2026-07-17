// JAY suhbati — Google Gemini orqali (BEPUL). Kalit: GEMINI_API_KEY
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });
  try {
    const { system, messages, max_tokens } = req.body;

    // Xabarlarni Gemini formatiga o'tkazish
    const contents = [];
    for (const m of messages || []) {
      const role = m.role === "assistant" ? "model" : "user";
      const parts = [];
      if (Array.isArray(m.content)) {
        for (const b of m.content) {
          if (b.type === "text") parts.push({ text: b.text });
          if (b.type === "image") parts.push({
            inline_data: { mime_type: b.source.media_type, data: b.source.data },
          });
          if (b.type === "document") parts.push({
            inline_data: { mime_type: "application/pdf", data: b.source.data },
          });
        }
      } else {
        parts.push({ text: m.content || "" });
      }
      contents.push({ role, parts });
    }

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system || "" }] },
          contents,
          generationConfig: { maxOutputTokens: Math.min(max_tokens || 4000, 8000) },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) {
      // Xatoni chatda ko'rinadigan qilib qaytaramiz (sababni aniqlash uchun)
      const msg = "XATO: " + (data.error?.message || JSON.stringify(data).slice(0, 300));
      return res.status(200).json({ content: [{ type: "text", text: msg }] });
    }

    const text = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "")
      .join("");
    return res.status(200).json({ content: [{ type: "text", text: text || "XATO: Gemini bo'sh javob qaytardi: " + JSON.stringify(data).slice(0, 300) }] });
  } catch (e) {
    return res.status(200).json({ content: [{ type: "text", text: "XATO (server): " + (e.message || e) }] });
  }
}
