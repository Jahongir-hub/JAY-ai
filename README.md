# JAY AI — Vercel'ga joylash qo'llanmasi

## 1. API kalit olish
1. https://console.anthropic.com ga kiring (ro'yxatdan o'ting)
2. "API Keys" bo'limida yangi kalit yarating (sk-ant-... bilan boshlanadi)
3. Billing bo'limida karta qo'shing (ishlatilgancha to'lanadi)

## 2. GitHub'ga yuklash
1. github.com da yangi repository oching (masalan: jay-ai)
2. Shu papkadagi barcha fayllarni yuklang

## 3. Vercel'ga ulash
1. https://vercel.com ga GitHub bilan kiring
2. "Add New Project" -> jay-ai repository'ni tanlang
3. MUHIM: "Environment Variables" bo'limida qo'shing:
   - Name: ANTHROPIC_API_KEY
   - Value: sk-ant-... (kalitingiz)
4. Deploy bosing

Tayyor! Saytingiz jay-ai.vercel.app kabi manzilda ochiladi.

## Kompyuterda sinash (ixtiyoriy)
```
npm install
npm run dev
```

## Eslatmalar
- Token limiti endi 4000 (kodda api/chat.js da 8000 gacha oshirsa bo'ladi)
- Suhbatlar foydalanuvchi brauzerida (localStorage) saqlanadi
- API kalit hech qachon frontend kodga yozilmasin — faqat Vercel Environment Variables'da!
