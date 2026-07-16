// Rasm yaratish — OpenAI kaliti Vercel Environment Variables'da: OPENAI_API_KEY
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Faqat POST" });
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt yo'q" });
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "Rasm xatosi" });
    return res.status(200).json({ b64: data.data[0].b64_json });
  } catch (e) {
    return res.status(500).json({ error: "Server xatosi" });
  }
}
