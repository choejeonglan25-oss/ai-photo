// Vercel Serverless Function: Google Gemini API 연동 사진 분위기 분석기
// API 키는 서버 환경 변수(GEMINI_API_KEY)로 안전하게 보호됩니다.

// 사용 가능한 Gemini 비전 모델 자동 탐색 함수
async function resolveGeminiModel(apiKey) {
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      const models = listData.models || [];

      // generateContent를 지원하는 모델 필터링
      const contentModels = models.filter(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent")
      );

      // 1순위: 최신 flash 모델 (gemini-2.0-flash, gemini-1.5-flash-latest, gemini-2.5-flash 등)
      const flashModel = contentModels.find((m) =>
        m.name.toLowerCase().includes("flash")
      );
      if (flashModel) {
        return flashModel.name;
      }

      // 2순위: gemini pro 등 기타 gemini 모델
      const anyGemini = contentModels.find((m) =>
        m.name.toLowerCase().includes("gemini")
      );
      if (anyGemini) {
        return anyGemini.name;
      }

      if (contentModels.length > 0) {
        return contentModels[0].name;
      }
    }
  } catch (err) {
    console.warn("모델 목록 자동 조회 실패, 기본 후보 목록으로 진행:", err.message);
  }

  // 기본 fallback
  return "models/gemini-2.0-flash";
}

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed. POST 요청만 지원합니다."
    });
  }

  // GEMINI_API_KEY 환경 변수 확인
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error:
        "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. Vercel 프로젝트 환경 변수(Environment Variables)에 GEMINI_API_KEY를 등록해 주세요."
    });
  }

  try {
    const { imageUrl } = req.body || {};

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({
        success: false,
        error: "분석할 이미지 URL(imageUrl)이 제공되지 않았습니다."
      });
    }

    // 1. Cloudinary 이미지 다운로드 후 Base64로 인코딩
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`이미지 다운로드 실패 (HTTP ${imageResponse.status})`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    // 2. Gemini 프롬프트 구성 (신원 추측 금지, 시각적 요소 및 감성 분석)
    const systemPrompt = `당신은 사진의 분위기와 스타일을 감성적이면서도 재치 있게 분석하는 전문 사진 큐레이터 AI입니다.

[분석 가이드라인]
1. 사람의 신원, 이름, 나이 등 구체적인 개인정보는 절대로 추측하거나 언급하지 마세요.
2. 사진에서 직접 눈으로 확인할 수 있는 색상, 배경, 조명, 의상, 표정, 구도와 전체적인 시각적 분위기를 중심으로 분석하세요.
3. 결과는 반드시 아래 JSON 규격에 정확히 맞추어 응답하세요. 다른 설명 문장 없이 순수 JSON 형식만 출력하세요.

[JSON 응답 포맷]
{
  "oneLineReview": "사진에 대한 감성적이고 재치 있는 AI 한줄평 (1~2문장, 이모지 포함)",
  "keywords": [
    {
      "name": "분위기 키워드 1 (예: 나른한 오후의 햇살)",
      "percent": 88,
      "desc": "색감이나 조명 등 사진에서 느껴지는 이유"
    },
    {
      "name": "분위기 키워드 2 (예: 포근한 코지 웜톤)",
      "percent": 75,
      "desc": "배경이나 의상 등 사진에서 느껴지는 이유"
    },
    {
      "name": "분위기 키워드 3 (예: 여유로운 힐링 바이브)",
      "percent": 62,
      "desc": "표정이나 구도 등 사진에서 느껴지는 이유"
    }
  ],
  "hashtags": [
    "#해시태그1",
    "#해시태그2",
    "#해시태그3",
    "#해시태그4"
  ],
  "colors": [
    "#HEX1",
    "#HEX2",
    "#HEX3",
    "#HEX4",
    "#HEX5"
  ]
}

- keywords는 정확히 3개여야 합니다.
- 각 percent는 사진의 분위기 강도를 재미있게 표현한 1~100 사이의 정수여야 합니다.
- hashtags는 사진과 어울리는 해시태그 정확히 4개여야 하며 '#' 기호로 시작해야 합니다.
- colors는 사진의 분위기를 대표하는 주요 색상 5개의 HEX 코드입니다.`;

    const geminiRequestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.7
      }
    };

    // 3. 사용 가능한 모델 자동 탐색 및 Fallback 리스트 준비
    const discoveredModel = await resolveGeminiModel(apiKey);
    const candidateModels = Array.from(
      new Set([
        discoveredModel,
        "models/gemini-2.0-flash",
        "models/gemini-1.5-flash-latest",
        "models/gemini-2.5-flash",
        "models/gemini-1.5-pro",
        "models/gemini-pro-vision"
      ])
    );

    let lastError = null;
    let geminiData = null;

    // 지원되는 모델을 순차적으로 호출하여 성공할 때까지 시도
    for (const modelPath of candidateModels) {
      const cleanModelPath = modelPath.startsWith("models/")
        ? modelPath
        : `models/${modelPath}`;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/${cleanModelPath}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geminiRequestBody)
        });

        if (response.ok) {
          geminiData = await response.json();
          break; // 성공 시 루프 탈출
        } else {
          const errJson = await response.json().catch(() => ({}));
          lastError = new Error(
            errJson.error?.message || `HTTP ${response.status} (${cleanModelPath})`
          );
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!geminiData) {
      throw lastError || new Error("모든 Gemini 모델 호출에 실패했습니다.");
    }

    const rawContent =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawContent) {
      throw new Error("Gemini로부터 분석 결과를 전달받지 못했습니다.");
    }

    // 마크다운 코드블록 제거 방어 처리
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsedResult = JSON.parse(cleanedJson);

    return res.status(200).json({
      success: true,
      data: parsedResult
    });
  } catch (error) {
    console.error("Gemini 분석 중 오류 발생:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "이미지 분위기 분석 중 오류가 발생했습니다."
    });
  }
};
