
// Rasm yaratish — Pollinations.ai orqali (BEPUL, kalit kerak emas)
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt yo'q" });
 
    const url = "https://image.pollinations.ai/prompt/" +
      encodeURIComponent(prompt) +
      "?width=1024&height=1024&nologo=true";
 
    const r = await fetch(url);
    if (!r.ok) return res.status(200).json({ error: "Rasm serveri javob bermadi, qayta urinib ko'ring" });
 
    const buf = Buffer.from(await r.arrayBuffer());
    return res.status(200).json({ b64: buf.toString("base64") });
  } catch (e) {
    return res.status(200).json({ error: "Rasm yaratishda xatolik, qayta urinib ko'ring" });
  }
}
