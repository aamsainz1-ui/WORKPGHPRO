/**
 * AI Service — MiniMax M2.7 (OpenAI-compatible API)
 * Replaces Google Gemini for text tasks (insights, geocode).
 * Face verification uses MediaPipe locally via faceService.ts.
 */
import { AttendanceRecord, Language } from "../types";

const API_KEY = import.meta.env.VITE_MINIMAX_API_KEY;
const BASE_URL = "https://api.minimax.io/v1/chat/completions";
const MODEL = "MiniMax-M2.7";

async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!API_KEY) return "";

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 100,
    }),
  });

  if (!res.ok) throw new Error(`MiniMax API ${res.status}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

export const getWorkInsights = async (
  records: AttendanceRecord[],
  lang: Language
): Promise<string> => {
  if (records.length === 0) {
    return lang === Language.TH
      ? "ยินดีต้อนรับสู่ระบบงานสากล กรุณาลงเวลาเพื่อรับการวิเคราะห์ประสิทธิภาพของคุณ"
      : "Welcome to your Enterprise Portal. Please log your session to receive productivity analysis.";
  }

  if (!API_KEY)
    return lang === Language.TH
      ? "คุณมีวินัยในการทำงานที่ยอดเยี่ยม"
      : "Excellence through consistency.";

  const recentRecords = records.slice(0, 15).map((r) => ({
    type: r.type,
    time: new Date(r.timestamp).toLocaleString(
      lang === Language.TH ? "th-TH" : "en-US"
    ),
    mode: r.workMode,
    notes: r.notes,
  }));

  const langText = lang === Language.TH ? "THAI" : "ENGLISH";

  try {
    const text = await chatCompletion(
      "Act as an Elite Executive HR Consultant. Provide professional insights.",
      `Attendance logs: ${JSON.stringify(recentRecords)}. Provide a professional insight in ${langText}. Max 20 words.`
    );
    return text || (lang === Language.TH ? "คุณมีวินัยในการทำงานที่ยอดเยี่ยม" : "Excellence through consistency.");
  } catch (error) {
    console.error("MiniMax Insights Error:", error);
    return lang === Language.TH
      ? "คุณมีวินัยในการทำงานที่ยอดเยี่ยม"
      : "Excellence through consistency.";
  }
};

export const reverseGeocode = async (
  lat: number,
  lng: number,
  lang: Language
): Promise<string> => {
  if (!API_KEY)
    return lang === Language.TH ? "พิกัดที่ยืนยันแล้ว" : "Secure Verified Location";

  try {
    const text = await chatCompletion(
      "You translate coordinates into prestigious zone names. Reply with max 3 words only.",
      `Translate Lat: ${lat}, Lng: ${lng} into a prestigious zone name. Max 3 words.`
    );
    return text || "Innovation Hub";
  } catch (error) {
    console.error("MiniMax Geocoding Error:", error);
    return lang === Language.TH ? "พิกัดที่ยืนยันแล้ว" : "Secure Location";
  }
};

// Face verification removed — use verifyFaceLocal() from faceService.ts (MediaPipe) instead.
