import { useState, useRef, useEffect } from "react";
import { loginGoogle, logout, watchUser, saveCloud, loadCloud, listUsers } from "./firebase.js";

// O'ZINGIZNING Google emailingizni yozing — admin panel faqat sizga ko'rinadi:
const ADMIN_EMAIL = "j96433204@gmail.com";

const BASE_SYSTEM = `Sen JAY AI'san — aqlli, do'stona yordamchi. Seni ISHIMOV JAHONGIR yaratgan (JAY = "Jahongir AI Yasadi"). "Seni kim yaratgan?" deb so'rashsa, "Meni ISHIMOV JAHONGIR yaratgan" deb javob ber. Foydalanuvchi qaysi tilda yozsa, o'sha tilda javob ber (asosan o'zbek tilida). Qisqa, aniq va foydali javob ber.

Sen sayt ham yasay olasan: foydalanuvchi sayt, sahifa yoki dizayn so'rasa, TO'LIQ ishlaydigan bitta HTML fayl yoz (CSS va JS ichida) va uni \`\`\`html ... \`\`\` blok ichida ber.`;

const MODES = {
  chat:   { label: "Oddiy chat", extra: "" },
  write:  { label: "Write",  icon: "✏️", extra: "\n\nHOZIRGI REJIM: WRITE. Sen professional yozuvchi yordamchisisan. Matn, maqola, xat, post, insho, reklama matni — chiroyli va ta'sirli yozasan. Uslub va grammatikaga alohida e'tibor ber." },
  learn:  { label: "Learn",  icon: "🎓", extra: "\n\nHOZIRGI REJIM: LEARN. Sen sabrli o'qituvchisan. Mavzuni oddiy tildan, bosqichma-bosqich, misollar bilan tushuntir. Oxirida bilimni tekshirish uchun 1 ta savol ber." },
  life:   { label: "Hayotiy", icon: "☕", extra: "\n\nHOZIRGI REJIM: HAYOTIY. Sen do'stona hayotiy maslahatchisan — kundalik ishlar, retseptlar, rejalar, sog'lom turmush, munosabatlar bo'yicha samimiy va amaliy maslahat berasan." },
  image:  { label: "Rasm", icon: "🖼", extra: "" },
  choice: { label: "JAY tanlovi", icon: "💡", extra: "\n\nHOZIRGI REJIM: JAY TANLOVI. Foydalanuvchiga o'zing qiziqarli mavzu tanlab ber: hayratlanarli fakt, foydali maslahat, qiziqarli savol yoki mini-o'yin taklif qil. Kreativ va qiziqarli bo'l." },
  code:   { label: "Code",   icon: "</>", extra: "\n\nHOZIRGI REJIM: CODE. Sen professional dasturchi yordamchisisan. Kod yozish, xatolarni topish, tushuntirish — asosiy vazifang. Kodni doim ```til ... ``` blokda ber." },
  design: { label: "Design", icon: "🎨", extra: "\n\nHOZIRGI REJIM: DESIGN. Sen professional veb-dizaynersan. Chiroyli, zamonaviy sayt va sahifalar yasaysan. Har doim to'liq HTML (CSS ichida) yozib, ```html blokda ber. Dizaynga alohida e'tibor ber: ranglar, shriftlar, animatsiyalar." },
};

const Logo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <g stroke="#E5484D" strokeWidth="4" strokeLinecap="round">
      <line x1="20" y1="4" x2="20" y2="14" />
      <line x1="20" y1="26" x2="20" y2="36" />
      <line x1="4" y1="20" x2="14" y2="20" />
      <line x1="26" y1="20" x2="36" y2="20" />
      <line x1="8.7" y1="8.7" x2="15.8" y2="15.8" />
      <line x1="24.2" y1="24.2" x2="31.3" y2="31.3" />
      <line x1="31.3" y1="8.7" x2="24.2" y2="15.8" />
      <line x1="15.8" y1="24.2" x2="8.7" y2="31.3" />
    </g>
  </svg>
);

const fileToB64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = () => rej(new Error("Fayl o'qilmadi"));
  r.readAsDataURL(file);
});

function parseContent(text) {
  const parts = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "code", lang: (m[1] || "").toLowerCase(), value: m[2] });
    last = re.lastIndex;
  }
  if (last < text.length) {
    const rest = text.slice(last);
    const open = rest.indexOf("```");
    if (open !== -1) {
      if (open > 0) parts.push({ type: "text", value: rest.slice(0, open) });
      let code = rest.slice(open + 3);
      let lang = "";
      const nl = code.indexOf("\n");
      if (nl !== -1 && nl < 15) { lang = code.slice(0, nl).trim().toLowerCase(); code = code.slice(nl + 1); }
      parts.push({ type: "code", lang, value: code });
    } else {
      parts.push({ type: "text", value: rest });
    }
  }
  return parts;
}

function looksLikeHtml(lang, code) {
  if (lang === "html") return true;
  const c = code.trim().toLowerCase();
  return c.startsWith("<!doctype") || c.startsWith("<html") || c.startsWith("<svg") || c.includes("<body") || c.includes("<style") || c.includes("<div") || c.includes("<svg");
}

function isSvg(code) {
  const c = code.trim().toLowerCase();
  return c.startsWith("<svg") || (c.startsWith("<?xml") && c.includes("<svg"));
}

function SvgImage({ value }) {
  const clean = value.replace(/<script[\s\S]*?<\/script>/gi, "");
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };
  return (
    <div style={{ margin: "8px 0" }}>
      <div
        style={{
          borderRadius: 14, overflow: "hidden", border: "1px solid #26262B",
          background: "#FFF", lineHeight: 0, maxWidth: 420,
        }}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      <button onClick={copy} style={{
        marginTop: 6, background: "transparent", color: "#9A9AA2",
        border: "1px solid #3A3A40", borderRadius: 7, padding: "3px 10px",
        fontSize: 11, cursor: "pointer", fontFamily: "system-ui, sans-serif",
      }}>{copied ? "✓" : "SVG kodini nusxalash"}</button>
    </div>
  );
}

function CodeBlock({ lang, value, onPreview }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {}
  };
  return (
    <div style={{ margin: "10px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #2A2A2E" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#1A1A1E", padding: "7px 12px",
        fontFamily: "system-ui, sans-serif", fontSize: 12, color: "#9A9AA2",
      }}>
        <span>{lang || "kod"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {looksLikeHtml(lang, value) && (
            <button onClick={() => onPreview(value)} style={{
              background: "#C41E24", color: "#FFF", border: "none",
              borderRadius: 7, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600,
            }}>▶ Ko'rish</button>
          )}
          <button onClick={copy} style={{
            background: "transparent", color: "#9A9AA2", border: "1px solid #3A3A40",
            borderRadius: 7, padding: "4px 12px", fontSize: 12, cursor: "pointer",
          }}>{copied ? "✓" : "Nusxalash"}</button>
        </div>
      </div>
      <pre style={{
        margin: 0, padding: 14, background: "#121216", color: "#D9D9DE",
        fontSize: 12.5, lineHeight: 1.55, overflowX: "auto",
        fontFamily: "Consolas, Menlo, monospace", maxHeight: 340,
      }}>{value}</pre>
    </div>
  );
}

const LANGS = {
  uz: {
    newChat: "+ Yangi chat", chats: "💬 Chatlar", settings: "⚙️ Sozlash", admin: "🛠 Admin",
    modes: "Rejimlar", recents: "Oxirgilar", login: "Google bilan kirish", logout: "Chiqish",
    free: "{L.free}", placeholder: "JAY'ga xabar yozing...", send: "Yuborish",
    share: "📤 Ulashish", adminPanel: "Admin panel", settingsTitle: "Sozlash",
    nameLabel: "Ismingiz", extraLabel: "JAY uchun qo'shimcha ko'rsatma",
    extraPh: "Masalan: har doim juda qisqa javob ber...",
    saveNote: "O'zgarishlar avtomatik saqlanadi.",
    langLabel: "Til / Язык / Language",
    greet: (h) => h < 5 ? "Xayrli tun" : h < 11 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : h < 23 ? "Xayrli kech" : "Xayrli tun",
    ttsLang: "uz-UZ",
    sysLang: "Interfeys tili: o'zbekcha. Asosan o'zbek tilida javob ber.",
  },
  ru: {
    newChat: "+ Новый чат", chats: "💬 Чаты", settings: "⚙️ Настройки", admin: "🛠 Админ",
    modes: "Режимы", recents: "Недавние", login: "Войти через Google", logout: "Выйти",
    free: "Бесплатно · без лимита", placeholder: "Напишите JAY...", send: "Отправить",
    share: "📤 Поделиться", adminPanel: "Админ панель", settingsTitle: "Настройки",
    nameLabel: "Ваше имя", extraLabel: "Дополнительная инструкция для JAY",
    extraPh: "Например: отвечай всегда кратко...",
    saveNote: "Изменения сохраняются автоматически.",
    langLabel: "Til / Язык / Language",
    greet: (h) => h < 5 ? "Доброй ночи" : h < 11 ? "Доброе утро" : h < 18 ? "Добрый день" : h < 23 ? "Добрый вечер" : "Доброй ночи",
    ttsLang: "ru-RU",
    sysLang: "Язык интерфейса: русский. Отвечай в основном на русском языке.",
  },
  en: {
    newChat: "+ New chat", chats: "💬 Chats", settings: "⚙️ Settings", admin: "🛠 Admin",
    modes: "Modes", recents: "Recents", login: "Sign in with Google", logout: "Sign out",
    free: "Free · unlimited", placeholder: "Message JAY...", send: "Send",
    share: "📤 Share", adminPanel: "Admin panel", settingsTitle: "Settings",
    nameLabel: "Your name", extraLabel: "Extra instruction for JAY",
    extraPh: "E.g.: always answer briefly...",
    saveNote: "Changes are saved automatically.",
    langLabel: "Til / Язык / Language",
    greet: (h) => h < 5 ? "Good night" : h < 11 ? "Good morning" : h < 18 ? "Good afternoon" : h < 23 ? "Good evening" : "Good night",
    ttsLang: "en-US",
    sysLang: "Interface language: English. Reply mainly in English.",
  },
};

const newConv = (mode = "chat") => ({
  id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
  title: mode === "chat" ? "Yangi chat" : MODES[mode].label + " chat",
  msgs: [], mode,
});

export default function JayAI() {
  const [convs, setConvs] = useState([newConv()]);
  const [curId, setCurId] = useState(null);
  const [view, setView] = useState("chat"); // chat | artifacts | customize
  const [settings, setSettings] = useState({ name: "Jahongir", extra: "" });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [files, setFiles] = useState([]);
  const [sideOpen, setSideOpen] = useState(true);
  const [power, setPower] = useState("high"); // high | low
  const [user, setUser] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const fileRef = useRef(null);
  const endRef = useRef(null);

  const L = LANGS[settings.lang] || LANGS.uz;
  const cur = convs.find(c => c.id === curId) || convs[0];
  const msgs = cur ? cur.msgs : [];

  useEffect(() => {
    return watchUser(async (u) => {
      setUser(u);
      if (u) {
        const cloud = await loadCloud(u.uid);
        if (cloud && cloud.list && cloud.list.length) {
          setConvs(cloud.list);
          setCurId(cloud.cur || cloud.list[0].id);
        }
        if (u.displayName) setSettings(st => ({ ...st, name: st.name || u.displayName.split(" ")[0] }));
      }
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const v = localStorage.getItem("jay-convs");
        if (v) {
          const saved = JSON.parse(v);
          if (saved.list && saved.list.length) {
            setConvs(saved.list);
            setCurId(saved.cur || saved.list[0].id);
          }
        }
      } catch (e) {}
      try {
        const st = localStorage.getItem("jay-settings");
        if (st) setSettings(JSON.parse(st));
      } catch (e) {}
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const list = convs.map(c => ({
          ...c,
          msgs: c.msgs.slice(-30).map(m =>
            m.files ? { ...m, files: m.files.map(f => ({ kind: f.kind, name: f.name })) } : m
          ),
        })).slice(-15);
        const payload = { list, cur: cur?.id };
        localStorage.setItem("jay-convs", JSON.stringify(payload));
        if (user) saveCloud(user.uid, payload, { name: user.displayName, email: user.email });
      } catch (e) {}
    })();
  }, [convs, curId, ready, user]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      try { localStorage.setItem("jay-settings", JSON.stringify(settings)); } catch (e) {}
    })();
  }, [settings, ready]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const updateCur = (fn) => setConvs(cs => cs.map(c => (c.id === cur.id ? fn(c) : c)));

  const speak = (text) => {
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/```[\s\S]*?```/g, " ").replace(/[#*_`]/g, "");
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = L.ttsLang;
      u.rate = 1.0;
      u.pitch = 1.0;
      // Tilga mos eng yaxshi ovozni tanlash (Google ovozlari sifatliroq)
      const voices = window.speechSynthesis.getVoices();
      const pref = L.ttsLang.slice(0, 2);
      const best =
        voices.find(v => v.lang.startsWith(pref) && v.name.includes("Google")) ||
        voices.find(v => v.lang.startsWith(pref)) ||
        voices.find(v => v.lang.startsWith("ru") && v.name.includes("Google")) ||
        voices.find(v => v.lang.startsWith("ru"));
      if (best) u.voice = best;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };

  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Brauzeringiz ovozni qo'llamaydi. Chrome ishlating."); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "uz-UZ";
    rec.interimResults = true;
    rec.onresult = (e) => {
      let t = "";
      for (const r of e.results) t += r[0].transcript;
      setInput(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const shareChat = () => {
    if (!cur || cur.msgs.length === 0) return;
    const text = "JAY AI suhbati — " + cur.title + "\n\n" +
      cur.msgs.map(m => (m.role === "user" ? "Men: " : "JAY: ") + m.content).join("\n\n");
    try {
      if (navigator.share) { navigator.share({ title: "JAY AI", text }); return; }
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      alert("Suhbat nusxalandi! Istalgan joyga tashlang.");
    } catch (e) {}
  };

  const pickFiles = async (e) => {
    const list = Array.from(e.target.files || []);
    const out = [];
    for (const f of list.slice(0, 4)) {
      const isImg = f.type.startsWith("image/");
      const isPdf = f.type === "application/pdf";
      if (!isImg && !isPdf) continue;
      if (f.size > 4 * 1024 * 1024) continue;
      try {
        const data = await fileToB64(f);
        out.push({ kind: isImg ? "image" : "document", media_type: f.type, data, name: f.name });
      } catch (err) {}
    }
    setFiles(fs => [...fs, ...out].slice(0, 4));
    if (fileRef.current) fileRef.current.value = "";
  };

  const genImage = async (text, newMsgs) => {
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (data.b64) {
        updateCur(c => ({ ...c, msgs: [...newMsgs, { role: "assistant", content: "Mana rasmingiz! 🖼", image: "data:image/png;base64," + data.b64 }] }));
      } else {
        updateCur(c => ({ ...c, msgs: [...newMsgs, { role: "assistant", content: "Rasm yaratilmadi: " + (data.error || "noma'lum xato") }] }));
      }
    } catch (e) {
      updateCur(c => ({ ...c, msgs: [...newMsgs, { role: "assistant", content: "Rasm serverida xatolik." }] }));
    }
    setLoading(false);
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && files.length === 0) || loading || !cur) return;
    const newMsgs = [...msgs, { role: "user", content: text || "Faylni ko'rib chiq", files }];
    updateCur(c => ({
      ...c, msgs: newMsgs,
      title: c.msgs.length === 0 && text ? text.slice(0, 32) : c.title,
    }));
    setInput("");
    setFiles([]);
    setLoading(true);
    if (cur.mode === "image" && text) { genImage(text, newMsgs); return; }
    const system = BASE_SYSTEM
      + "\n\n" + L.sysLang
      + (power === "low" ? "\n\nJUDA QISQA javob ber — 1-3 jumla, faqat eng muhimi." : "")
      + (MODES[cur.mode || "chat"]?.extra || "")
      + (settings.name ? `\n\nFoydalanuvchining ismi: ${settings.name}.` : "")
      + (settings.extra ? `\n\nFoydalanuvchining qo'shimcha ko'rsatmasi: ${settings.extra}` : "");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_tokens: 4000,
          system,
          messages: newMsgs.map(m => {
            if (m.files && m.files.length && m.files.some(f => f.data)) {
              const blocks = m.files.filter(f => f.data).map(f =>
                f.kind === "image"
                  ? { type: "image", source: { type: "base64", media_type: f.media_type, data: f.data } }
                  : { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } }
              );
              blocks.push({ type: "text", text: m.content || "Faylni ko'rib chiq" });
              return { role: m.role, content: blocks };
            }
            return { role: m.role, content: m.image ? (m.content || "Rasm yaratildi") : m.content };
          }),
        }),
      });
      const data = await res.json();
      const reply = (data.content || [])
        .map(c => (c.type === "text" ? c.text : ""))
        .filter(Boolean)
        .join("\n") || "Kechirasiz, javob kelmadi. Qayta urinib ko'ring.";
      updateCur(c => ({ ...c, msgs: [...c.msgs, { role: "assistant", content: reply }] }));
    } catch (e) {
      updateCur(c => ({ ...c, msgs: [...c.msgs, { role: "assistant", content: "Xatolik yuz berdi. Qayta urinib ko'ring." }] }));
    }
    setLoading(false);
  };

  const addChat = (mode = "chat") => {
    const c = newConv(mode);
    setConvs(cs => [c, ...cs]);
    setCurId(c.id);
    setView("chat");
  };

  const delChat = (id, e) => {
    e.stopPropagation();
    setConvs(cs => {
      const left = cs.filter(c => c.id !== id);
      const next = left.length ? left : [newConv()];
      if (id === cur?.id) setCurId(next[0].id);
      return next;
    });
  };

  // Artifacts: barcha chatlardagi HTML kodlar
  const artifacts = [];
  convs.forEach(c => {
    c.msgs.forEach(m => {
      if (m.role !== "assistant") return;
      parseContent(m.content).forEach(p => {
        if (p.type === "code" && looksLikeHtml(p.lang, p.value)) {
          artifacts.push({ chat: c.title, code: p.value });
        }
      });
    });
  });

  const S = {
    sideBtn: {
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      background: "transparent", border: "none", color: "#D9D9DE",
      padding: "9px 12px", borderRadius: 10, fontSize: 14, cursor: "pointer",
      fontFamily: "system-ui, sans-serif", textAlign: "left",
    },
    sect: {
      fontSize: 11, color: "#7A7A82", padding: "10px 12px 5px",
      fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: 1,
    },
    inp: {
      width: "100%", background: "#161618", border: "1px solid #3A3A40", color: "#EDEDED",
      borderRadius: 12, padding: "11px 14px", fontSize: 14, outline: "none",
      fontFamily: "system-ui, sans-serif", boxSizing: "border-box",
    },
  };

  const inputBar = (
            <div style={{ padding: "12px 16px 18px" }}>
              {files.length > 0 && (
                <div style={{
                  maxWidth: 760, margin: "0 auto 8px", display: "flex", gap: 8, flexWrap: "wrap",
                  fontFamily: "system-ui, sans-serif",
                }}>
                  {files.map((f, k) => (
                    <span key={k} style={{
                      background: "#222228", border: "1px solid #3A3A40", borderRadius: 10,
                      padding: "5px 10px", fontSize: 12, color: "#D9D9DE",
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {f.kind === "image" ? "🖼" : "📄"} {f.name}
                      <span onClick={() => setFiles(fs => fs.filter((_, i) => i !== k))}
                        style={{ cursor: "pointer", color: "#E5484D", fontWeight: 700 }}>×</span>
                    </span>
                  ))}
                </div>
              )}
              <div style={{
                maxWidth: 760, margin: "0 auto", display: "flex", gap: 10,
                background: "#161618", border: "1px solid #26262B", borderRadius: 18,
                padding: 8, boxShadow: "0 2px 12px rgba(196,30,36,0.12)",
              }}>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple
                  onChange={pickFiles} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()} title="Rasm yoki PDF biriktirish" style={{
                  background: "transparent", border: "1px solid #3A3A40", color: "#D9D9DE",
                  borderRadius: 12, padding: "0 14px", fontSize: 17, cursor: "pointer",
                }}>📎</button>
                <button onClick={toggleMic} title="Ovoz bilan yozish" style={{
                  background: listening ? "#C41E24" : "transparent",
                  border: "1px solid " + (listening ? "#C41E24" : "#3A3A40"),
                  color: "#D9D9DE", borderRadius: 12, padding: "0 14px", fontSize: 17, cursor: "pointer",
                }}>🎙</button>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={L.placeholder}
                  rows={1}
                  style={{
                    flex: 1, resize: "none", background: "transparent", color: "#EDEDED",
                    border: "none", padding: "10px 12px",
                    fontSize: 15, outline: "none", fontFamily: "system-ui, sans-serif",
                  }}
                />
                <button onClick={() => setPower(pw => pw === "high" ? "low" : "high")}
                  title="Javob rejimi" style={{
                  background: "transparent", border: "none", color: "#9A9AA2",
                  fontSize: 12.5, cursor: "pointer", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: 4, padding: "0 6px", whiteSpace: "nowrap",
                }}>
                  <span style={{ fontWeight: 700, color: "#EDEDED" }}>JAY 5</span>
                  <span style={{ color: "#E5484D" }}>{power === "high" ? "High" : "Low"}</span>
                  <span style={{ fontSize: 9 }}>▼</span>
                </button>
                <button onClick={send} disabled={loading || (!input.trim() && files.length === 0)} style={{
                  background: loading || (!input.trim() && files.length === 0) ? "#1E1E20" : "#C41E24",
                  color: loading || (!input.trim() && files.length === 0) ? "#5A5A5A" : "#FFF",
                  border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 600,
                  fontSize: 14, cursor: loading ? "default" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                }}>{L.send}</button>
              </div>
            </div>
  );

  return (
    <div style={{
      height: "100vh", display: "flex",
      background: "#0C0C0E", fontFamily: "Georgia, serif", color: "#EDEDED", overflow: "hidden",
    }}>
      {/* ===== Yon panel ===== */}
      {sideOpen && (
        <div style={{
          width: 250, flexShrink: 0, background: "#111114",
          borderRight: "1px solid #26262B", display: "flex", flexDirection: "column",
          padding: "14px 10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 14px" }}>
            <Logo size={26} />
            <span style={{ fontWeight: 700, fontSize: 18 }}>JAY</span>
          </div>

          <button onClick={() => addChat("chat")} style={{
            ...S.sideBtn, background: "#C41E24", color: "#FFF",
            fontWeight: 600, justifyContent: "center", marginBottom: 10,
          }}>{L.newChat}</button>

          <button onClick={() => setView("chat")} style={{ ...S.sideBtn, background: view === "chat" ? "#222228" : "transparent" }}>
            {L.chats}
          </button>
          <button onClick={() => setView("artifacts")} style={{ ...S.sideBtn, background: view === "artifacts" ? "#222228" : "transparent" }}>
            📦 Artifacts {artifacts.length > 0 && <span style={{
              background: "#C41E24", borderRadius: 10, fontSize: 11, padding: "1px 7px", marginLeft: "auto",
            }}>{artifacts.length}</span>}
          </button>
          <button onClick={() => setView("customize")} style={{ ...S.sideBtn, background: view === "customize" ? "#222228" : "transparent" }}>
            {L.settings}
          </button>
          {user && user.email === ADMIN_EMAIL && (
            <button onClick={async () => { setView("admin"); setAdminUsers(await listUsers()); }}
              style={{ ...S.sideBtn, background: view === "admin" ? "#222228" : "transparent" }}>
              {L.admin}
            </button>
          )}

          <div style={S.sect}>{L.modes}</div>
          <button onClick={() => addChat("code")} style={S.sideBtn}>
            <span style={{ color: "#E5484D", fontFamily: "monospace", fontWeight: 700 }}>&lt;/&gt;</span> Code
          </button>
          <button onClick={() => addChat("design")} style={S.sideBtn}>🎨 Design</button>

          <div style={S.sect}>{L.recents}</div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convs.map(c => (
              <div key={c.id} onClick={() => { setCurId(c.id); setView("chat"); }} style={{
                ...S.sideBtn,
                background: c.id === cur?.id && view === "chat" ? "#222228" : "transparent",
                justifyContent: "space-between", marginBottom: 2,
              }}>
                <span style={{
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: 13.5,
                }}>{c.mode === "code" ? "‹› " : c.mode === "design" ? "🎨 " : ""}{c.title}</span>
                <span onClick={e => delChat(c.id, e)} style={{
                  color: "#7A7A82", fontSize: 15, padding: "0 4px", cursor: "pointer",
                }}>×</span>
              </div>
            ))}
          </div>

          <div style={{
            padding: "12px 8px 4px", borderTop: "1px solid #26262B",
            fontFamily: "system-ui, sans-serif",
          }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  : <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#C41E24",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 14, color: "#FFF",
                    }}>{(user.displayName || "U")[0].toUpperCase()}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{user.displayName || user.email}</div>
                  <div onClick={logout} style={{ fontSize: 11, color: "#E5484D", cursor: "pointer" }}>{L.logout}</div>
                </div>
              </div>
            ) : (
              <button onClick={() => loginGoogle().catch(() => {})} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", background: "#FFF", color: "#1A1A1E", border: "none",
                borderRadius: 10, padding: "9px 0", fontSize: 13.5, fontWeight: 600,
                cursor: "pointer", fontFamily: "system-ui, sans-serif",
              }}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.9 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.9 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
                {L.login}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== Asosiy qism ===== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid #26262B",
        }}>
          <button onClick={() => setSideOpen(o => !o)} style={{
            background: "transparent", border: "1px solid #3A3A40", color: "#D9D9DE",
            borderRadius: 8, padding: "5px 11px", fontSize: 15, cursor: "pointer",
          }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>
            {view === "artifacts" ? "Artifacts" : view === "customize" ? L.settingsTitle : view === "admin" ? L.adminPanel : (cur?.title || "JAY AI")}
          </span>
          {view === "chat" && msgs.length > 0 && (
            <button onClick={shareChat} title="Suhbatni ulashish" style={{
              background: "transparent", border: "1px solid #3A3A40", color: "#D9D9DE",
              borderRadius: 8, padding: "5px 12px", fontSize: 13, cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
            }}>{L.share}</button>
          )}
          {view === "chat" && cur?.mode && cur.mode !== "chat" && (
            <span style={{
              background: "#222228", border: "1px solid #3A3A40", borderRadius: 8,
              fontSize: 11, padding: "3px 10px", color: "#E5484D",
              fontFamily: "system-ui, sans-serif", fontWeight: 600,
            }}>{MODES[cur.mode].label} rejimi</span>
          )}
        </div>

        {/* ==== ARTIFACTS ko'rinishi ==== */}
        {view === "artifacts" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              {artifacts.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: 80, color: "#8F8F8F", fontFamily: "system-ui, sans-serif" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                  Hali artifactlar yo'q.<br />JAY sayt yasaganda, hammasi shu yerda to'planadi.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                  {artifacts.map((a, i) => (
                    <div key={i} style={{
                      background: "#161618", border: "1px solid #26262B", borderRadius: 14,
                      padding: 16, fontFamily: "system-ui, sans-serif",
                    }}>
                      <div style={{ fontSize: 26, marginBottom: 8 }}>🌐</div>
                      <div style={{
                        fontSize: 13, fontWeight: 600, marginBottom: 4,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{a.chat}</div>
                      <div style={{ fontSize: 11, color: "#8F8F8F", marginBottom: 12 }}>HTML sayt</div>
                      <button onClick={() => setPreview(a.code)} style={{
                        background: "#C41E24", color: "#FFF", border: "none", width: "100%",
                        borderRadius: 9, padding: "8px 0", fontSize: 13, cursor: "pointer", fontWeight: 600,
                      }}>▶ Ochish</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==== SOZLASH ko'rinishi ==== */}
        {view === "customize" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ maxWidth: 520, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
              <div style={{ fontSize: 13, color: "#9A9AA2", marginBottom: 6 }}>{L.langLabel}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[["uz", "O'zbekcha"], ["ru", "Русский"], ["en", "English"]].map(([code, label]) => (
                  <button key={code} onClick={() => setSettings(st => ({ ...st, lang: code }))} style={{
                    flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer",
                    fontFamily: "system-ui, sans-serif", fontSize: 13.5, fontWeight: 600,
                    background: (settings.lang || "uz") === code ? "#C41E24" : "#161618",
                    border: "1px solid " + ((settings.lang || "uz") === code ? "#C41E24" : "#3A3A40"),
                    color: (settings.lang || "uz") === code ? "#FFF" : "#D9D9DE",
                  }}>{label}</button>
                ))}
              </div>
              <div style={{ fontSize: 13, color: "#9A9AA2", marginBottom: 6 }}>{L.nameLabel}</div>
              <input value={settings.name}
                onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                style={{ ...S.inp, marginBottom: 20 }} placeholder="Ismingiz" />

              <div style={{ fontSize: 13, color: "#9A9AA2", marginBottom: 6 }}>
                {L.extraLabel}
              </div>
              <textarea value={settings.extra}
                onChange={e => setSettings(s => ({ ...s, extra: e.target.value }))}
                rows={5}
                style={{ ...S.inp, resize: "vertical" }}
                placeholder={L.extraPh} />
              <div style={{ fontSize: 12, color: "#7A7A82", marginTop: 10 }}>
                {L.saveNote}
              </div>
            </div>
          </div>
        )}

        {/* ==== ADMIN ko'rinishi ==== */}
        {view === "admin" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  ["Foydalanuvchilar", adminUsers.length],
                  ["Jami chatlar", adminUsers.reduce((n, u) => n + u.chats, 0)],
                  ["Jami xabarlar", adminUsers.reduce((n, u) => n + u.msgs, 0)],
                ].map(([t, v]) => (
                  <div key={t} style={{
                    flex: 1, minWidth: 140, background: "#161618", border: "1px solid #26262B",
                    borderRadius: 14, padding: 16,
                  }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "#E5484D" }}>{v}</div>
                    <div style={{ fontSize: 12, color: "#9A9AA2" }}>{t}</div>
                  </div>
                ))}
              </div>
              {adminUsers.map(u => (
                <div key={u.uid} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#161618", border: "1px solid #26262B",
                  borderRadius: 12, padding: "10px 14px", marginBottom: 8, fontSize: 13,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{u.name || "Nomsiz"}</div>
                    <div style={{ color: "#9A9AA2", fontSize: 12 }}>{u.email}</div>
                  </div>
                  <div style={{ color: "#9A9AA2" }}>{u.chats} chat · {u.msgs} xabar</div>
                  <div style={{ color: "#7A7A82", fontSize: 11 }}>
                    {u.updated ? new Date(u.updated).toLocaleDateString() : ""}
                  </div>
                </div>
              ))}
              {adminUsers.length === 0 && (
                <div style={{ color: "#8F8F8F", textAlign: "center", marginTop: 40 }}>
                  Hali foydalanuvchilar yo'q
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==== CHAT ko'rinishi ==== */}
        {view === "chat" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
              <div style={{ maxWidth: 760, margin: "0 auto" }}>
                {msgs.length === 0 && (
                  <div style={{ textAlign: "center", marginTop: 70 }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                      <Logo size={52} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-1px" }}>
                      {L.greet(new Date().getHours())}{settings.name ? `, ${settings.name}` : ""}
                    </div>
                    <div style={{ marginTop: 28, textAlign: "left" }}>{inputBar}</div>
                    <div style={{
                      display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap",
                      marginTop: 18, fontFamily: "system-ui, sans-serif",
                    }}>
                      {[
                        ["write", "✏️ Write"],
                        ["learn", "🎓 Learn"],
                        ["code", "‹/› Code"],
                        ["life", "☕ Hayotiy"],
                        ["image", "🖼 Rasm"],
                        ["choice", "💡 JAY tanlovi"],
                      ].map(([mode, label]) => (
                        <button key={mode}
                          onClick={() => {
                            updateCur(c => ({ ...c, mode }));
                            if (mode === "choice") {
                              setTimeout(() => setInput("Menga qiziqarli narsa ayt"), 0);
                            }
                          }}
                          style={{
                            background: cur?.mode === mode ? "#C41E24" : "#161618",
                            border: "1px solid " + (cur?.mode === mode ? "#C41E24" : "#3A3A40"),
                            color: cur?.mode === mode ? "#FFF" : "#D9D9DE",
                            borderRadius: 20, padding: "9px 16px", fontSize: 13, cursor: "pointer",
                            fontWeight: 500,
                          }}>{label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {msgs.map((m, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 14,
                  }}>
                    {m.role === "assistant" && (
                      <div style={{ marginRight: 10, marginTop: 4, flexShrink: 0 }}><Logo size={22} /></div>
                    )}
                    <div style={{
                      maxWidth: m.role === "user" ? "80%" : "88%", padding: "12px 16px",
                      fontSize: 15, lineHeight: 1.6, wordBreak: "break-word",
                      borderRadius: m.role === "user" ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                      background: m.role === "user" ? "#C41E24" : "#161618",
                      border: m.role === "user" ? "none" : "1px solid #26262B",
                      color: m.role === "user" ? "#FFF" : "#EDEDED",
                      fontFamily: m.role === "user" ? "system-ui, sans-serif" : "Georgia, serif",
                    }}>
                      {m.role === "user"
                        ? <span style={{ whiteSpace: "pre-wrap" }}>
                            {m.files && m.files.length > 0 && (
                              <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: m.content ? 8 : 0 }}>
                                {m.files.map((f, k) =>
                                  f.kind === "image" && f.data
                                    ? <img key={k} src={`data:${f.media_type};base64,${f.data}`} alt={f.name}
                                        style={{ maxWidth: 160, maxHeight: 160, borderRadius: 10, display: "block" }} />
                                    : <span key={k} style={{
                                        background: "rgba(255,255,255,0.18)", borderRadius: 8, padding: "5px 10px",
                                        fontSize: 12, fontFamily: "system-ui, sans-serif",
                                      }}>{f.kind === "image" ? "🖼" : "📄"} {f.name}</span>
                                )}
                              </span>
                            )}
                            {m.content}
                          </span>
                        : <>
                          {m.image && (
                            <img src={m.image} alt="JAY rasmi" style={{
                              maxWidth: "100%", borderRadius: 12, display: "block", marginBottom: 8,
                            }} />
                          )}
                          {parseContent(m.content).map((p, j) =>
                            p.type === "code"
                              ? (isSvg(p.value)
                                  ? <SvgImage key={j} value={p.value} />
                                  : <CodeBlock key={j} lang={p.lang} value={p.value} onPreview={setPreview} />)
                              : <span key={j} style={{ whiteSpace: "pre-wrap" }}>{p.value}</span>
                          )}
                          <button onClick={() => speak(m.content)} title="Ovozda eshitish" style={{
                            background: "transparent", border: "none", color: "#7A7A82",
                            cursor: "pointer", fontSize: 14, padding: "4px 0 0", display: "block",
                          }}>🔊</button>
                        </>}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", gap: 6, padding: "10px 16px", alignItems: "center" }}>
                    <Logo size={20} />
                    {[0, 1, 2].map(d => (
                      <span key={d} style={{
                        width: 7, height: 7, borderRadius: "50%", background: "#E5484D",
                        animation: `jayb 1s ${d * 0.15}s infinite alternate`,
                      }} />
                    ))}
                    <style>{`@keyframes jayb { from { opacity:.25; transform:translateY(0);} to { opacity:1; transform:translateY(-4px);} }`}</style>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            {msgs.length > 0 && inputBar}
          </>
        )}
      </div>

      {/* Sayt ko'rish oynasi */}
      {preview && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            background: "#161618", borderRadius: 16, width: "100%", maxWidth: 920,
            height: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderBottom: "1px solid #26262B",
              fontFamily: "system-ui, sans-serif",
            }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>JAY yasagan sayt</span>
              <button onClick={() => setPreview(null)} style={{
                background: "#C41E24", color: "#FFF", border: "none",
                borderRadius: 8, padding: "6px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600,
              }}>Yopish ✕</button>
            </div>
            <iframe srcDoc={preview} sandbox="allow-scripts"
              style={{ flex: 1, border: "none", width: "100%", background: "#FFF" }} title="preview" />
          </div>
        </div>
      )}
    </div>
  );
}
