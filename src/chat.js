// JAY suhbati — OpenAI orqali (bitta OPENAI_API_KEY kifoya)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });
  try {
    const { system, messages, max_tokens } = req.body;

    // Xabarlarni OpenAI formatiga o'tkazish (rasm/PDF bloklarini ham)
    const oaMessages = [{ role: "system", content: system || "" }];
    for (const m of messages || []) {
      if (Array.isArray(m.content)) {
        const parts = [];
        for (const b of m.content) {
          if (b.type === "text") parts.push({ type: "text", text: b.text });
          if (b.type === "image") parts.push({
            type: "image_url",
            image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` },
          });
          // PDF'ni OpenAI chat qabul qilmaydi — nomini matn sifatida beramiz
          if (b.type === "document") parts.push({ type: "text", text: "(Foydalanuvchi PDF fayl yubordi)" });
        }
        oaMessages.push({ role: m.role, content: parts });
      } else {
        oaMessages.push({ role: m.role, content: m.content });
      }
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: Math.min(max_tokens || 4000, 8000),
        messages: oaMessages,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "API xatosi" });

    // Frontend Anthropic formatini kutadi — moslashtiramiz
    const text = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ content: [{ type: "text", text }] });
  } catch (e) {
    return res.status(500).json({ error: "Server xatosi" });
  }
}
