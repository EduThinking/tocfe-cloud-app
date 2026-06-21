// server/index.js
//
// 로컬 개발용 최소 프록시 서버.
// 배포(Vercel)에서는 api/claude.js 서버리스 함수가 같은 역할을 하며,
// 이 서버는 그 핸들러를 그대로 재사용해 로컬과 배포 동작을 일치시킵니다.
//
// 키는 server/.env의 ANTHROPIC_API_KEY에서 읽습니다(.env.example 참고).

import "dotenv/config";
import express from "express";
import cors from "cors";
import claudeHandler from "../api/claude.js";

const app = express();
const PORT = process.env.PORT || 8787;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[경고] ANTHROPIC_API_KEY가 .env에 설정되지 않았습니다. server/.env.example을 참고하세요."
  );
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Vercel 서버리스 핸들러는 (req, res) 시그니처라 Express에서 그대로 사용 가능
app.post("/api/claude", (req, res) => claudeHandler(req, res));

app.listen(PORT, () => {
  console.log(`Claude API 프록시 서버 실행 중: http://localhost:${PORT}`);
});
