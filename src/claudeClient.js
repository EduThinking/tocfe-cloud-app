// src/claudeClient.js
//
// 이 프로젝트는 Claude API 키를 브라우저에 노출하지 않기 위해
// 작은 백엔드 프록시(server/index.js)를 통해 API를 호출합니다.
//
// 흐름: 브라우저(fetch) → 로컬 서버(/api/claude) → Anthropic API
//
// 로컬 개발 시 .env 파일에 ANTHROPIC_API_KEY를 넣고
// `npm run dev:server` 로 프록시 서버를 함께 실행하세요. (README 참고)

const PROXY_URL = import.meta.env.VITE_API_PROXY_URL || "/api/claude";

export async function callClaude(messages, system) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API 프록시 오류: ${res.status}`);
  }

  return res.json();
}

export function extractText(data) {
  try {
    return (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  } catch {
    return "";
  }
}
