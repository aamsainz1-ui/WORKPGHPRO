
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export const initFaceDetection = async () => {
    if (faceLandmarker) return faceLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "IMAGE",
        numFaces: 1
    });

    return faceLandmarker;
};

// Calculate geometric signature of a face for identity comparison
const getFaceSignature = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 468) return null;

    // Key points (simplified)
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseTip = landmarks[1];
    const mouthLeft = landmarks[61];
    const mouthRight = landmarks[291];
    const chin = landmarks[152];

    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // Base distance for normalization (eye distance)
    const eyeDist = dist(leftEye, rightEye);
    if (eyeDist === 0) return null;

    return [
        dist(leftEye, noseTip) / eyeDist,
        dist(rightEye, noseTip) / eyeDist,
        dist(mouthLeft, mouthRight) / eyeDist,
        dist(noseTip, chin) / eyeDist,
        dist(leftEye, mouthLeft) / eyeDist,
        dist(rightEye, mouthRight) / eyeDist,
        dist(landmarks[33], landmarks[133]) / eyeDist, // Eye size
        dist(landmarks[61], landmarks[146]) / eyeDist, // Lip thickness
    ];
};

export const verifyFaceLocal = async (
    capturedImage: HTMLImageElement | HTMLVideoElement,
    storedSignature?: number[]
): Promise<{ verified: boolean; confidence: number; signature: number[]; message: string }> => {
    try {
        const landmarker = await initFaceDetection();
        const result = landmarker.detect(capturedImage);

        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
            return { verified: false, confidence: 0, signature: [], message: "ไม่พบใบหน้าในกล้อง" };
        }

        const currentSignature = getFaceSignature(result.faceLandmarks[0]);
        if (!currentSignature) {
            return { verified: false, confidence: 0, signature: [], message: "ไม่สามารถประมวลผลจุดสำคัญบนใบหน้าได้" };
        }

        // Liveness check (optional but helpful for stability)
        // const isSmiling = result.faceBlendshapes?.[0]?.categories?.find(c => c.categoryName === 'mouthSmileLeft')?.score > 0.3;

        if (!storedSignature || storedSignature.length === 0) {
            return { verified: true, confidence: 1, signature: currentSignature, message: "บันทึกใบหน้าเรียบร้อย" };
        }

        // Compare signatures - Use higher tolerance (lower threshold) to handle camera angle changes
        let diff = 0;
        const minLen = Math.min(currentSignature.length, storedSignature.length);
        for (let i = 0; i < minLen; i++) {
            diff += Math.pow(currentSignature[i] - storedSignature[i], 2);
        }
        const score = Math.max(0, 1 - Math.sqrt(diff) * 1.5); // Relaxed multiplier from 2 to 1.5

        const isIdentityMatch = score > 0.78; // Lowered from 0.85 to 0.78 for better UX

        return {
            verified: isIdentityMatch,
            confidence: score,
            signature: currentSignature,
            message: isIdentityMatch ? "ยืนยันตัวตนสำเร็จ" : "ใบหน้าไม่ตรงกับที่บันทึกไว้"
        };
    } catch (error) {
        console.error("Local Face Verification Error:", error);
        return { verified: false, confidence: 0, signature: [], message: "ระบบประมวลผลใบหน้าขัดข้อง" };
    }
};

