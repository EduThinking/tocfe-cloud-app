// api/claude.js
//
// Vercel 서버리스 함수. 프론트엔드(src/claudeClient.js)가 호출하는 POST /api/claude
// 요청을 받아 Anthropic API로 프록시합니다. API 키는 브라우저에 노출되지 않고
// Vercel 환경 변수(ANTHROPIC_API_KEY)에서만 읽습니다.
//
// 로컬 개발에서는 server/index.js가 이 핸들러를 그대로 재사용하므로(Express),
// 로컬과 배포 환경의 동작이 동일합니다.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." });
  }

  try {
    const { model, max_tokens, system, messages } = req.body || {};

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error("Anthropic API 오류:", data);
      return res.status(upstream.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("프록시 함수 오류:", err);
    return res.status(500).json({ error: "서버 내부 오류", detail: err.message });
  }
}
