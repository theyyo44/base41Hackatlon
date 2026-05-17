import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { coverImage, expiryImage } = body as {
      coverImage: string;
      expiryImage: string;
    };

    if (!coverImage || !expiryImage) {
      return NextResponse.json(
        { error: "Her iki fotograf da gerekli" },
        { status: 400 }
      );
    }

    const coverMime = coverImage.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
    const expiryMime = expiryImage.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
    const coverBase64 = coverImage.replace(/^data:image\/\w+;base64,/, "");
    const expiryBase64 = expiryImage.replace(/^data:image\/\w+;base64,/, "");

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Sen bir ilaç kutusu analiz uzmanısın. Sana iki fotoğraf veriyorum:
1. İlk fotoğraf: İlaç kutusunun kapak/ön yüzü
2. İkinci fotoğraf: Son kullanma tarihinin (S.K.T. veya EXP) yazıldığı kısım

İkinci fotoğrafta S.K.T., SKT, EXP, veya "Son Kullanma Tarihi" gibi bir etiketin yanında bir tarih olacak. Bu tarihi bul ve YYYY-MM-DD formatına çevir. Tarih "05/2027" gibi sadece ay/yıl formatında olabilir, bu durumda o ayın son gününü kullan (örn: 05/2027 → 2027-05-31). Tarih "12.2026" veya "2026-12" gibi de olabilir.

Bu fotoğraflardan aşağıdaki bilgileri çıkar ve SADECE JSON formatında yanıt ver, başka hiçbir şey yazma:

{
  "name": "İlaç adı (sadece marka adı, örn: Augmentin)",
  "activeIngredient": "Etken madde ve dozu (örn: Amoksisilin 875mg + Klavulanik asit 125mg)",
  "formType": "Sadece şu değerlerden biri: tablet | kapsul | surup | damla | sprey | krem | jel | ampul | flakon | diger",
  "dosage": "Önerilen doz (formType ile uyumlu, örn: 1 tablet, 5 ml, 10 damla, 1 puff, ince tabaka)",
  "expiryDate": "YYYY-MM-DD formatında son kullanma tarihi",
  "quantity": "Kutudaki tahmini adet sayısı (sayı olarak)"
}

Eğer bir bilgiyi okuyamıyorsan o alanı boş string "" olarak bırak. Tarihi mutlaka YYYY-MM-DD formatında yaz. quantity sayı olsun.`,
              },
              {
                inlineData: {
                  mimeType: coverMime,
                  data: coverBase64,
                },
              },
              {
                inlineData: {
                  mimeType: expiryMime,
                  data: expiryBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: "Gemini API hatasi: " + err },
        { status: 500 }
      );
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Fotograflardan bilgi cikarilamadi" },
        { status: 422 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);

    let expiryDate = result.expiryDate || "";
    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      const mmyyyy = expiryDate.match(/(\d{2})[\/\.\-](\d{4})/);
      if (mmyyyy) {
        const month = parseInt(mmyyyy[1], 10);
        const year = parseInt(mmyyyy[2], 10);
        const lastDay = new Date(year, month, 0).getDate();
        expiryDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
      const yyyymm = expiryDate.match(/(\d{4})[\/\.\-](\d{2})$/);
      if (yyyymm) {
        const year = parseInt(yyyymm[1], 10);
        const month = parseInt(yyyymm[2], 10);
        const lastDay = new Date(year, month, 0).getDate();
        expiryDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
    }

    const normalizeFormType = (value: unknown): string => {
      const raw = String(value || "").toLowerCase().trim();
      if (!raw) return "diger";
      if (raw.includes("tablet")) return "tablet";
      if (raw.includes("kaps")) return "kapsul";
      if (raw.includes("surup") || raw.includes("şurup") || raw.includes("syrup")) return "surup";
      if (raw.includes("damla") || raw.includes("drop")) return "damla";
      if (raw.includes("sprey") || raw.includes("spray") || raw.includes("puff")) return "sprey";
      if (raw.includes("krem")) return "krem";
      if (raw.includes("jel") || raw.includes("gel")) return "jel";
      if (raw.includes("ampul")) return "ampul";
      if (raw.includes("flakon") || raw.includes("vial")) return "flakon";
      return "diger";
    };

    const inferFormTypeFromText = (input: string): string => {
      const t = input.toLowerCase();
      if (/\btablet\b/.test(t)) return "tablet";
      if (/\bkaps[üu]l\b/.test(t)) return "kapsul";
      if (/\b(s[üu]rup|syrup)\b/.test(t)) return "surup";
      if (/\bdamla\b/.test(t)) return "damla";
      if (/\b(sprey|spray|puff)\b/.test(t)) return "sprey";
      if (/\bkrem\b/.test(t)) return "krem";
      if (/\b(jel|gel)\b/.test(t)) return "jel";
      if (/\bampul\b/.test(t)) return "ampul";
      if (/\bflakon\b/.test(t)) return "flakon";
      return "diger";
    };

    const formType =
      normalizeFormType(result.formType) !== "diger"
        ? normalizeFormType(result.formType)
        : inferFormTypeFromText(`${result.name || ""} ${result.activeIngredient || ""} ${result.dosage || ""}`);

    return NextResponse.json({
      name: result.name || "",
      activeIngredient: result.activeIngredient || "",
      dosage: result.dosage || "",
      formType,
      expiryDate,
      quantity: parseInt(result.quantity, 10) || 1,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
