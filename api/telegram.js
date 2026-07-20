// JAY AI Telegram bot — webhook. Kalitlar: TELEGRAM_BOT_TOKEN, GEMINI_API_KEY
const SYSTEM = `Sen JAY AI'san — aqlli, do'stona yordamchi (Telegram bot versiyasi). Seni ISHIMOV JAHONGIR yaratgan (JAY = "Jahongir AI Yasadi"). "Seni kim yaratgan?" deb so'rashsa, "Meni ISHIMOV JAHONGIR yaratgan" deb javob ber. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber (asosan o'zbek tilida). Qisqa, aniq va foydali javob ber. Telegram uchun formatlash: oddiy matn yoz, murakkab markdown ishlatma. Sayt versiyasi: jayai.vercel.app`;

const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash-lite",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
];

async function askGemini(userText) {
  for (const model of MODELS) {
    try {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" +
          process.env.GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: "user", parts: [{ text: userText }] }],
            generationConfig: { maxOutputTokens: 2000 },
          }),
        }
      );
      const data = await r.json();
      if (r.ok) {
        const text = (data.candidates?.[0]?.content?.parts || [])
          .map(p => p.text || "").join("");
        if (text) return text;
      }
      if (r.status !== 429 && r.status !== 404 && r.status !== 400) break;
    } catch (e) {}
  }
  return "Kechirasiz, hozir javob bera olmayapman. Birozdan keyin qayta urinib ko'ring 🙏";
}

async function tg(method, body) {
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {}
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("JAY AI Telegram bot ishlayapti ✓");
  try {
    const msg = req.body?.message;
    if (!msg || !msg.chat) return res.status(200).json({ ok: true });
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    if (!text) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Hozircha faqat matnli xabarlarni tushunaman 🙂 Rasm va fayllar bilan ishlash uchun saytga kiring: jayai.vercel.app",
      });
      return res.status(200).json({ ok: true });
    }

    if (text === "/start") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Salom! Men JAY AI 🤖\n\nJahongir AI Yasadi — bepul o'zbek AI yordamchisi.\n\nIstalgan savolni yozing: kod, tarjima, maslahat, insho — hammasida yordam beraman!\n\n🌐 To'liq versiya (rasm, fayl, rejimlar): jayai.vercel.app",
      });
      return res.status(200).json({ ok: true });
    }

    // "Yozmoqda..." holati
    await tg("sendChatAction", { chat_id: chatId, action: "typing" });

    const reply = await askGemini(text);

    // Telegram limiti 4096 belgi — bo'lib yuborish
    for (let i = 0; i < reply.length; i += 4000) {
      await tg("sendMessage", { chat_id: chatId, text: reply.slice(i, i + 4000) });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
}
