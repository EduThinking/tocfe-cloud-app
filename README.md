# 구름(Cloud) × AI 사고 파트너 — TOCfE 데모

TOCfE 사고도구 '구름(Cloud)'을 작성할 때, AI가 정답을 주는 대신 소크라테스식
질문으로 학습자가 스스로 욕구(B, C)와 공동목표(A)를 발견하도록 돕는 인터랙티브
웹앱입니다.

## 폴더 구조

```
cloud-app/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx          # 진입점
│   ├── App.jsx            # 메인 로직 (단계 전환, 대화 흐름)
│   ├── CloudDiagram.jsx   # 구름(A-B-C-D-D') SVG 다이어그램
│   ├── claudeClient.js    # 프록시(/api/claude)를 통한 Claude API 호출
│   ├── exportCloud.js     # 구름 PNG 내보내기(의존성 없음) 유틸
│   └── styles.css
├── api/
│   └── claude.js          # Vercel 서버리스 프록시 함수 (배포 환경)
└── server/
    ├── index.js           # 로컬 개발용 Express 서버 (api/claude.js 재사용)
    └── .env.example
```

배포(Vercel)에서는 `api/claude.js` 서버리스 함수가, 로컬 개발에서는
`server/index.js`가 **같은 핸들러**를 사용해 동작이 일치합니다.

## 왜 프록시 서버가 필요한가

Claude.ai 아티팩트 환경과 달리, 일반 웹앱에서는 브라우저가 Anthropic API 키를
직접 들고 있으면 안 됩니다(노출 위험). 그래서 `server/index.js`가 키를 보관하고,
프론트엔드는 `/api/claude`로만 요청을 보내도록 구성했습니다.

```
로컬:   브라우저(React) → /api/claude → Express(server/index.js)        → api.anthropic.com
배포:   브라우저(React) → /api/claude → Vercel 서버리스(api/claude.js)  → api.anthropic.com
```

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. API 키 설정
cp server/.env.example server/.env
# server/.env 파일을 열어 ANTHROPIC_API_KEY 입력

# 3. 프록시 서버 실행 (터미널 1)
npm run dev:server

# 4. 프론트엔드 실행 (터미널 2)
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 배포 (Vercel)

별도 설정 파일 없이 Vercel이 Vite 프로젝트로 자동 인식합니다.

1. GitHub 저장소를 Vercel에 import (New Project → 저장소 선택)
2. Framework Preset: **Vite** (자동 감지), Build Command `vite build`, Output `dist`
3. **Settings → Environment Variables** 에 추가:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (절대 코드/깃에 커밋하지 말 것)
4. Deploy. 프론트는 정적 파일로, `api/claude.js`는 서버리스 함수로 배포됩니다.

> API 키는 서버리스 함수(`process.env.ANTHROPIC_API_KEY`)에서만 읽고 브라우저로는
> 노출되지 않습니다. 키를 바꾸면 Vercel에서 환경 변수 수정 후 재배포하세요.

## 핵심 흐름 (App.jsx)

1. **INTRO** — 소개 화면
2. **CONFLICT** — 학습자가 D(나의 주장), D'(상대의 주장) 입력
3. **NEEDS** — AI와 대화하며 B(나의 욕구) → C(상대의 욕구) 순서로 도출.
   `SYSTEM_PROMPT`에서 "정답을 먼저 말하지 않는다" 원칙을 강제하고 있습니다.
   대화 턴 수(`turnCount`)에 따라 다음 단계로 넘어가도록 프롬프트에
   `[지시: ...]` 형태의 숨은 가이드를 주입합니다.
4. **GOAL** — AI가 공동목표(A) 제안, 구름 다이어그램 완성
5. **ASSUMPTIONS** — 구름이 올바르게 작성됐는지 화살표를 문장으로 읽어 확인한 뒤,
   "B하기 위해서는 왜 꼭 D 해야만 할까? 왜냐하면~"으로 B–D, C–D′ 화살표에 숨은
   가정(전제)을 도출. `aPhase`(`bd` → `cd` → `done`) 상태머신으로 진행합니다.
6. **SOLUTIONS** — 도출한 가정에 도전해 윈윈 해결책(주입, injection)을 도출.
   B–D 가정을 깨며 "D′ 하면서도 B"를, C–D′ 가정을 깨며 "D 하면서도 C"를 찾습니다.
   `sPhase`(`bd` → `cd` → `done`) 상태머신으로 진행하고, 두 해결책을 모두 찾으면
   다이어그램의 갈등 화살표(D↔D′)가 해소(↔ → ✓) 상태로 바뀝니다.

AI 응답에서 `👉 욕구(B):`, `👉 욕구(C):`, `🎯 공동목표(A):` 패턴을 정규식으로
파싱해 다이어그램 상태(`b`, `c`, `a`)에 반영합니다. 가정 단계는 `🔍 가정(B–D):`,
`🔍 가정(C–D'):`, 해결책 단계는 `💡 해결책(B–D):`, `💡 해결책(C–D'):` 마커를
파싱해 `bdAssumption`/`cdAssumption`, `bdSolution`/`cdSolution`에 담습니다. 이 마커
포맷을 바꾸면 `App.jsx`의 정규식(`bMatch`, `cMatch`, `aMatch`, 가정·해결책의
`bdMatch`/`cdMatch`)도 함께 수정해야 합니다.

## 내보내기

구름이 완성되면(A 도출 후) 다이어그램 패널 하단에 내보내기 버튼이 나타납니다.

- **이미지(PNG)** — 화면의 구름 SVG를 캔버스로 렌더해 저장. `exportCloud.js`가
  CSS 변수/폰트를 인라인해 라이브러리 없이 깨지지 않는 PNG를 만듭니다.
- **PDF로 저장** — `window.print()`로 브라우저 인쇄 다이얼로그를 열고, 인쇄 전용
  레이아웃(`.print-summary`)이 구름 + D/D′/B/C/A + 가정 + 해결책을 한 장으로 정리합니다.
  "대상: PDF로 저장"을 선택하면 됩니다.

## 다음 디벨롭 아이디어

- 대화 턴 수 기반 전환 → 의미 기반 전환(AI가 "충분히 욕구가 드러났다"고
  판단할 때 전환하도록 구조화된 출력 사용)
- ~~구름 완성 후 PDF/이미지로 내보내기~~ ✅ 완료
- 가지(Branch), 목표나무(Goal Tree) 동일 패턴으로 확장 후 탭 전환
- 대화 히스토리 로컬 저장(여러 갈등 사례 비교)
- 모바일 레이아웃 폴리싱 (현재 860px 이하에서 1열로 전환되지만 다이어그램 padding 조정 필요)
