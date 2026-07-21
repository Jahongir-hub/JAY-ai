// JAY AI Telegram bot. Kalitlar: TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, ADMIN_CHAT_ID
const SYSTEM = `Sen JAY AI'san — aqlli, do'stona yordamchi (Telegram bot versiyasi). Seni ISHIMOV JAHONGIR yaratgan (JAY = "Jahongir AI Yasadi"). "Seni kim yaratgan?" deb so'rashsa, "Meni ISHIMOV JAHONGIR yaratgan" deb javob ber. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber (asosan o'zbek tilida). Qisqa, aniq va foydali javob ber. Oddiy matn yoz, murakkab markdown ishlatma. Sayt: jayai.vercel.app`;

const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash-lite",
  "gemma-4-26b-a4b-it",
  "gemma-4-31b-it",
];

const KEYBOARD = {
  keyboard: [
    [{ text: "🆘 Adminga murojaat" }],
    [{ text: "🌐 Sayt" }, { text: "ℹ️ JAY haqida" }],
  ],
  resize_keyboard: true,
};

const SUP_MARK = "✍️ Murojaatingizni SHU XABARGA JAVOB (reply) qilib yozing — admin tez orada javob beradi.";

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

// Firestore REST (kalitsiz — public rules bilan) — tg_users kolleksiyasi
const FS_BASE = "https://firestore.googleapis.com/v1/projects/jay---ai/databases/(default)/documents";

async function getTgUser(chatId) {
  try {
    const r = await fetch(FS_BASE + "/tg_users/" + chatId);
    if (!r.ok) return null;
    const d = await r.json();
    const f = d.fields || {};
    return {
      name: f.name?.stringValue || "",
      phone: f.phone?.stringValue || "",
      step: f.step?.stringValue || "",
    };
  } catch (e) { return null; }
}

async function saveTgUser(chatId, fields) {
  try {
    const cur = await getTgUser(chatId) || {};
    const merged = { ...cur, ...fields };
    await fetch(FS_BASE + "/tg_users/" + chatId + "?updateMask.fieldPaths=name&updateMask.fieldPaths=phone&updateMask.fieldPaths=step", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: {
        name: { stringValue: merged.name || "" },
        phone: { stringValue: merged.phone || "" },
        step: { stringValue: merged.step || "" },
      } }),
    });
  } catch (e) {}
}

async function tg(method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("JAY AI Telegram bot ishlayapti ✓");
  try {
    const msg = req.body?.message;
    if (!msg || !msg.chat) return res.status(200).json({ ok: true });
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const ADMIN = process.env.ADMIN_CHAT_ID;
    const isAdmin = ADMIN && String(chatId) === String(ADMIN);

    // ===== ADMIN: murojaatga javob (reply orqali) =====
    if (isAdmin && msg.reply_to_message) {
      const orig = msg.reply_to_message.text || "";
      const m = orig.match(/#u(-?\d+)/);
      if (m) {
        await tg("sendMessage", {
          chat_id: m[1],
          text: "👑 Admin javobi:\n\n" + text,
        });
        await tg("sendMessage", { chat_id: chatId, text: "✅ Javob yuborildi" });
        return res.status(200).json({ ok: true });
      }
    }

    // ===== FOYDALANUVCHI: support xabari (reply orqali) =====
    if (msg.reply_to_message && (msg.reply_to_message.text || "").startsWith("✍️")) {
      if (ADMIN) {
        const who = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ")
          + (msg.from?.username ? " (@" + msg.from.username + ")" : "");
        await tg("sendMessage", {
          chat_id: ADMIN,
          text: "🆘 YANGI MUROJAAT\n👤 " + who + "\n#u" + chatId + "\n\n" + text +
            "\n\n↩️ Javob berish uchun shu xabarga REPLY qiling",
        });
        await tg("sendMessage", {
          chat_id: chatId,
          text: "✅ Murojaatingiz adminga yuborildi! Javob shu yerga keladi.",
          reply_markup: KEYBOARD,
        });
      } else {
        await tg("sendMessage", { chat_id: chatId, text: "Hozircha admin ulanmagan, keyinroq urinib ko'ring." });
      }
      return res.status(200).json({ ok: true });
    }

    // ===== Tugmalar va buyruqlar =====
    if (text === "/start") {
      const u = await getTgUser(chatId);
      if (u && u.name && u.phone) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Salom, " + u.name + "! 👋\n\nMen JAY AI 🤖 — savolingizni yozing.",
          reply_markup: KEYBOARD,
        });
      } else {
        await saveTgUser(chatId, { step: "name" });
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Salom! Men JAY AI 🤖\nJahongir AI Yasadi — bepul o'zbek AI yordamchisi.\n\nBoshlashdan oldin tanishib olaylik.\n\n👤 Ismingizni yozing:",
          reply_markup: { remove_keyboard: true },
        });
      }
      return res.status(200).json({ ok: true });
    }

    if (text === "/id") {
      await tg("sendMessage", { chat_id: chatId, text: "Sizning chat ID: " + chatId });
      return res.status(200).json({ ok: true });
    }

    if (text === "🆘 Adminga murojaat") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: SUP_MARK,
        reply_markup: { force_reply: true },
      });
      return res.status(200).json({ ok: true });
    }

    if (text === "🌐 Sayt") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "🌐 JAY AI to'liq versiyasi:\njayai.vercel.app\n\nU yerda: rasm yaratish, fayl yuklash, rejimlar, suhbatlar tarixi va boshqalar!",
        reply_markup: KEYBOARD,
      });
      return res.status(200).json({ ok: true });
    }

    if (text === "ℹ️ JAY haqida") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "🤖 JAY AI — Jahongir AI Yasadi\n\nBepul o'zbek AI yordamchisi. Yaratuvchi: ISHIMOV JAHONGIR.\n\n💬 Savol-javob, kod, tarjima, maslahat\n🖼 Rasm yaratish (saytda)\n🌐 jayai.vercel.app",
        reply_markup: KEYBOARD,
      });
      return res.status(200).json({ ok: true });
    }

    // ===== Telefon kontakt qabul qilish =====
    if (msg.contact && msg.contact.phone_number) {
      await saveTgUser(chatId, { phone: msg.contact.phone_number, step: "done" });
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Rahmat! Ro'yxatdan o'tdingiz. Endi istalgan savolni yozing 🤖",
        reply_markup: KEYBOARD,
      });
      return res.status(200).json({ ok: true });
    }

    // ===== Registratsiya bosqichlari =====
    {
      const u = await getTgUser(chatId);
      if (u && u.step === "name" && text) {
        await saveTgUser(chatId, { name: text.slice(0, 40), step: "phone" });
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Tanishganimdan xursandman, " + text.slice(0, 40) + "! 📱\n\nEndi telefon raqamingizni ulashing (raqamingiz faqat ro'yxatdan o'tish uchun saqlanadi):",
          reply_markup: {
            keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
            resize_keyboard: true, one_time_keyboard: true,
          },
        });
        return res.status(200).json({ ok: true });
      }
      if (u && u.step === "phone") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Iltimos, pastdagi 📱 tugma orqali raqamingizni ulashing.",
          reply_markup: {
            keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
            resize_keyboard: true, one_time_keyboard: true,
          },
        });
        return res.status(200).json({ ok: true });
      }
    }

    if (!text) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Hozircha faqat matnli xabarlarni tushunaman 🙂 Rasm va fayllar uchun: jayai.vercel.app",
        reply_markup: KEYBOARD,
      });
      return res.status(200).json({ ok: true });
    }

    // ===== Oddiy AI suhbat =====
    await tg("sendChatAction", { chat_id: chatId, action: "typing" });
    const reply = await askGemini(text);
    for (let i = 0; i < reply.length; i += 4000) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: reply.slice(i, i + 4000),
        reply_markup: KEYBOARD,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
}
