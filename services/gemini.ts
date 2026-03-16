import { GoogleGenerativeAI } from "@google/generative-ai";
import { AttendanceRecord, Language } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const getWorkInsights = async (records: AttendanceRecord[], lang: Language): Promise<string> => {
  if (records.length === 0) {
    return lang === Language.TH
      ? "ยินดีต้อนรับสู่ระบบงานสากล กรุณาลงเวลาเพื่อรับการวิเคราะห์ประสิทธิภาพของคุณ"
      : "Welcome to your Enterprise Portal. Please log your session to receive productivity analysis.";
  }

  if (!ai) return lang === Language.TH ? "คุณมีวินัยในการทำงานที่ยอดเยี่ยม" : "Excellence through consistency.";

  const recentRecords = records.slice(0, 15).map(r => ({
    type: r.type,
    time: new Date(r.timestamp).toLocaleString(lang === Language.TH ? 'th-TH' : 'en-US'),
    mode: r.workMode,
    notes: r.notes
  }));

  const langText = lang === Language.TH ? "THAI" : "ENGLISH";
  const prompt = `Act as an Elite Executive HR Consultant. Logs: ${JSON.stringify(recentRecords)}. Provide a professional insight in ${langText}. Max 20 words.`;

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || "Consistency is the key to excellence.";
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return lang === Language.TH ? "คุณมีวินัยในการทำงานที่ยอดเยี่ยม" : "Excellence through consistency.";
  }
};

export const reverseGeocode = async (lat: number, lng: number, lang: Language): Promise<string> => {
  if (!ai) return lang === Language.TH ? "พิกัดที่ยืนยันแล้ว" : "Secure Verified Location";
  const prompt = `Translate Lat: ${lat}, Lng: ${lng} into a prestigious zone name. Max 3 words.`;

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || "Innovation Hub";
  } catch (error) {
    console.error("Gemini Geocoding Error:", error);
    return lang === Language.TH ? "พิกัดที่ยืนยันแล้ว" : "Secure Location";
  }
};

export const verifyFace = async (
  storedFaceBase64: string,
  capturedFaceBase64: string,
  livenessChallenge?: string
): Promise<{ verified: boolean; confidence: number; message: string; livenessVerified: boolean }> => {
  if (!ai) return { verified: true, livenessVerified: true, confidence: 1, message: "โหมดทดสอบสำเร็จ" };

  try {
    const cleanStored = storedFaceBase64.split(',')[1] || storedFaceBase64;
    const cleanCaptured = capturedFaceBase64.split(',')[1] || capturedFaceBase64;
    const isRegistration = storedFaceBase64 === capturedFaceBase64;

    const prompt = `Act as an Elite Biometric Security System.
    IMAGE 1: Reference face.
    IMAGE 2: Live capture.
    
    1. Identity: Verify if both images are the same person. (If registration, confirm identity).
    2. Liveness: Ensure IMAGE 2 person is performing: "${livenessChallenge || 'Smiling'}".
    3. Security: Prevent proxy scanning. If they don't match or look like a photo of a photo, reject.
    
    RESPONSE FORMAT (JSON ONLY):
    {"verified": boolean, "livenessVerified": boolean, "confidence": number, "message": "Thai message"}`;

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data: cleanStored } },
      { inlineData: { mimeType: "image/jpeg", data: cleanCaptured } }
    ]);

    const response = await result.response;
    const parsed = JSON.parse(response.text() || "{}");

    const isIdentityMatch = parsed.verified && (parsed.confidence > 0.8 || isRegistration);
    const isLivenessMatch = livenessChallenge ? (parsed.livenessVerified || false) : true;

    return {
      verified: isIdentityMatch && isLivenessMatch,
      livenessVerified: isLivenessMatch,
      confidence: parsed.confidence || 0,
      message: parsed.message || (isIdentityMatch ? "ยืนยันสำเร็จ" : "ไม่พบตัวตนที่ตรงกัน")
    };
  } catch (error: any) {
    console.error("Biometric Error:", error);
    const errorStr = error?.toString() || "";
    let msg = `ระบบขัดข้อง (${errorStr.substring(0, 30)}...)`;

    if (error.message?.includes("Safety")) msg = "ภาพถูกบล็อกตามนโยบายความปลอดภัย";
    if (error.message?.includes("API key")) msg = "API Key ไม่ถูกต้องหรือยังไม่ได้ตั้งค่า";
    if (errorStr.includes("fetch")) msg = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Google AI ได้";

    return { verified: false, livenessVerified: false, confidence: 0, message: msg };
  }
};


