import React, { useState, useRef, useEffect } from "react";
import CloudDiagram from "./CloudDiagram";
import { callClaude, extractText } from "./claudeClient";
import { svgToPngDataUrl, downloadDataUrl } from "./exportCloud";
import "./styles.css";

// ============================================================
// TOCfE 구름(Cloud) × AI 사고 파트너
// ============================================================

const STAGE = {
  INTRO: "intro",
  CONFLICT: "conflict", // D, D' 입력
  NEEDS: "needs", // AI가 욕구를 캐묻는 대화
  GOAL: "goal", // 공동목표 제안
  ASSUMPTIONS: "assumptions", // 구름 확인 + 화살표에 숨은 가정 도출
  SOLUTIONS: "solutions", // 가정을 깨는 윈윈 해결책(주입) 도출
};

const SAMPLE = {
  d: "밤 11시까지 게임을 하고 싶다",
  dPrime: "밤 9시에는 자야 한다",
};

const SYSTEM_PROMPT = `당신은 TOCfE(Theory of Constraints for Education)의 '구름(Cloud)' 사고도구 작성을 돕는 다정하고 통찰력 있는 사고 파트너입니다.
구름 구조: A(공동목표) - B(나의 욕구), C(상대의 욕구) - D(나의 주장), D'(상대의 주장).
당신의 역할은 답을 대신 주는 것이 아니라, 소크라테스식 질문으로 학습자가 스스로 자신의 주장(D) 뒤에 숨은 진짜 욕구(B)를 발견하도록 돕는 것입니다.
규칙:
- 한 번에 하나의 질문만 하세요.
- 따뜻하고 짧게(2~3문장 이내) 말하세요.
- "왜 그것이 당신에게 중요한가요?", "그것이 충족되지 않으면 어떤 점이 불편한가요?" 같은 방식으로 욕구를 캐물으세요.
- 학습자가 답하면, 그 답을 인정해주고 한 단계 더 깊은 질문을 하거나, 충분히 욕구가 드러났다면 다음 단계로 자연스럽게 넘어가세요.
- 정답을 미리 말하지 마세요.`;

const ASSUMPTION_SYSTEM_PROMPT = `당신은 TOCfE '구름(Cloud)' 작성을 마친 학습자가 화살표 뒤에 숨은 '가정(전제, assumption)'을 스스로 발견하도록 돕는 사고 파트너입니다.
구름 구조: A(공동목표) - B(나의 욕구), C(상대의 욕구) - D(나의 주장), D'(상대의 주장).
화살표는 이렇게 읽습니다: "B하기 위해서는 D해야만 한다", "C하기 위해서는 D'해야만 한다". 이 '~해야만 한다'가 성립하려면 우리가 당연하게 여기는 숨은 가정이 있습니다. 그 가정을 드러내는 것이 목표입니다.
규칙:
- 한 번에 하나의 질문만, 따뜻하고 짧게(2~3문장 이내) 말하세요.
- 먼저 구름이 올바르게 작성됐는지 네 화살표를 문장으로 소리 내어 읽고, 자연스럽게 읽히는지 짚어주세요.
- 가정을 캐물을 때는 "B하기 위해서는 왜 꼭 D를 해야만 할까요? '왜냐하면…'으로 이어서 말해보세요" 처럼 빈칸을 채우게 하세요.
- 학습자의 답을 인정하고, 더 떠오르는 가정이 있는지 한 번 더 권한 뒤 핵심 가정을 정리하세요.
- 정답을 미리 말하지 말고, 학습자가 스스로 가정을 말하게 하세요.`;

const SOLUTION_SYSTEM_PROMPT = `당신은 TOCfE '구름(Cloud)'에서 드러난 '가정(전제)'에 도전하여 양쪽을 모두 만족시키는 윈윈 해결책(주입, injection)을 학습자가 스스로 찾도록 돕는 사고 파트너입니다.
구름 구조: A(공동목표) - B(나의 욕구), C(상대의 욕구) - D(나의 주장), D'(상대의 주장).
핵심 원리: 화살표 뒤의 가정이 '항상 참'은 아닙니다. 그 가정을 깨면, 한쪽을 포기하지 않고도 양쪽 욕구를 모두 채우는 길이 열립니다.
- B–D 가정을 깨면: D'(상대의 주장)를 하면서도 B(나의 욕구)를 충족하는 해결책을 찾을 수 있습니다.
- C–D' 가정을 깨면: D(나의 주장)를 하면서도 C(상대의 욕구)를 충족하는 해결책을 찾을 수 있습니다.
규칙:
- 한 번에 하나의 질문만, 따뜻하고 짧게(2~3문장 이내) 말하세요.
- "이 가정이 항상 참일까요?", "이 가정을 깬다면 어떤 방법이 가능할까요?" 처럼 가정에 도전하는 질문을 던지세요.
- 학습자가 해결책을 말하면 인정하고, 그 해결책이 정말 양쪽 욕구를 모두 채우는지 함께 점검하세요.
- 정답을 미리 말하지 말고, 학습자가 스스로 해결책을 떠올리게 하세요.`;

export default function App() {
  const [stage, setStage] = useState(STAGE.INTRO);
  const [d, setD] = useState("");
  const [dPrime, setDPrime] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [a, setA] = useState("");

  const [chat, setChat] = useState([]); // {role, text, hidden?}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState(null);
  const scrollRef = useRef(null);
  const diagramRef = useRef(null);

  // 가정(전제) 도출 단계 상태
  const [aChat, setAChat] = useState([]); // 가정 대화
  const [aInput, setAInput] = useState("");
  const [aPhase, setAPhase] = useState("bd"); // bd → cd → done
  const [bdAssumption, setBdAssumption] = useState(""); // B–D 화살표 가정
  const [cdAssumption, setCdAssumption] = useState(""); // C–D' 화살표 가정

  // 윈윈 해결책(주입) 도출 단계 상태
  const [sChat, setSChat] = useState([]);
  const [sInput, setSInput] = useState("");
  const [sPhase, setSPhase] = useState("bd"); // bd → cd → done
  const [bdSolution, setBdSolution] = useState(""); // B–D 가정을 깬 해결책
  const [cdSolution, setCdSolution] = useState(""); // C–D' 가정을 깬 해결책

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat, aChat, sChat, loading]);

  function startConflict() {
    setStage(STAGE.CONFLICT);
  }

  function useSample() {
    setD(SAMPLE.d);
    setDPrime(SAMPLE.dPrime);
  }

  async function submitConflict() {
    if (!d.trim() || !dPrime.trim()) return;
    setStage(STAGE.NEEDS);
    setHighlight("D");
    setLoading(true);
    setError("");
    const firstMsg = `나의 주장(D): "${d}"\n상대의 주장(D'): "${dPrime}"\n\n이 두 주장을 보고, 먼저 "나의 주장(D)" 뒤에 숨은 진짜 욕구가 무엇인지 질문해주세요.`;
    setChat([{ role: "user", text: firstMsg, hidden: true }]);
    try {
      const res = await callClaude([{ role: "user", content: firstMsg }], SYSTEM_PROMPT);
      const text = extractText(res) || "음, 좀 더 자세히 설명해 주시겠어요?";
      setChat((prev) => [...prev, { role: "assistant", text }]);
    } catch (e) {
      setError(e.message);
      setChat((prev) => [
        ...prev,
        { role: "assistant", text: "AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      ]);
    }
    setLoading(false);
  }

  async function sendChat() {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    const newChat = [...chat, { role: "user", text: userText }];
    setChat(newChat);
    setLoading(true);
    setError("");

    const turnCount = newChat.filter((m) => m.role === "user").length;

    try {
      const apiMessages = newChat.map((m) => ({ role: m.role, content: m.text }));

      let guidance = "";
      if (turnCount === 2) {
        guidance =
          "\n\n[지시: 이제 학습자의 답변을 바탕으로 나의 욕구(B)를 한 문장으로 요약해서 제안하고, 동의하는지 물어보세요. 형식: 먼저 공감 한마디, 그다음 줄바꿈 후 '👉 욕구(B): ...' 형태로 제안.]";
      } else if (turnCount === 3) {
        guidance =
          "\n\n[지시: 이제 상대의 주장(D')으로 넘어가서, 상대의 욕구(C)가 무엇일지 학습자가 상대 입장에서 추측해보도록 질문하세요.]";
      } else if (turnCount === 4) {
        guidance =
          "\n\n[지시: 학습자의 답변을 바탕으로 상대의 욕구(C)를 한 문장으로 요약 제안하세요. 형식: 공감 한마디 후 줄바꿈, '👉 욕구(C): ...' 형태.]";
      } else if (turnCount >= 5) {
        guidance =
          "\n\n[지시: 이제 두 욕구(B, C)를 모두 충족시킬 수 있는 더 상위의 공동목표(A)를 학습자와 함께 제안하세요. 형식: 짧은 통찰 한마디 후 줄바꿈, '🎯 공동목표(A): ...' 형태로 제시하고, 이것이 갈등을 어떻게 해소하는지 한 문장으로 설명하세요.]";
      }

      const lastIdx = apiMessages.length - 1;
      apiMessages[lastIdx] = {
        ...apiMessages[lastIdx],
        content: apiMessages[lastIdx].content + guidance,
      };

      const res = await callClaude(apiMessages, SYSTEM_PROMPT);
      const text = extractText(res) || "조금 더 말씀해 주시겠어요?";
      setChat((prev) => [...prev, { role: "assistant", text }]);

      const bMatch = text.match(/👉\s*욕구\(B\)\s*[:：]\s*(.+)/);
      const cMatch = text.match(/👉\s*욕구\(C\)\s*[:：]\s*(.+)/);
      const aMatch = text.match(/🎯\s*공동목표\(A\)\s*[:：]\s*(.+)/);

      if (bMatch) {
        setB(bMatch[1].trim());
        setHighlight("B");
      } else if (cMatch) {
        setC(cMatch[1].trim());
        setHighlight("C");
      } else if (aMatch) {
        setA(aMatch[1].trim());
        setHighlight("A");
        setTimeout(() => setStage(STAGE.GOAL), 1400);
      } else if (turnCount <= 1) {
        setHighlight("D");
      } else if (turnCount <= 3) {
        setHighlight("D'");
      }
    } catch (e) {
      setError(e.message);
      setChat((prev) => [
        ...prev,
        { role: "assistant", text: "AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      ]);
    }
    setLoading(false);
  }

  // 단계별 숨은 지시(가정 도출)
  function assumptionGuidance(phase) {
    if (phase === "bd") {
      return "\n\n[지시: 아직 B–D 가정을 정리하지 못했다면, 'B하기 위해서는 왜 꼭 D를 해야만 할까?'에 대한 가정을 학습자가 더 말하도록 도우세요. 학습자가 가정을 충분히 말했다면, 핵심 가정을 '🔍 가정(B–D): ...' 형태(한 줄)로 정리하고, 곧이어 상대 쪽(C–D') 가정으로 넘어가자고 안내하세요.]";
    }
    if (phase === "cd") {
      return "\n\n[지시: 이제 C–D' 화살표 차례입니다. 'C(상대의 욕구)하기 위해서는 왜 꼭 D'(상대의 주장)를 해야만 할까?'에 대한 가정을 학습자가 상대 입장에서 떠올리도록 도우세요. 충분히 나오면 핵심 가정을 '🔍 가정(C–D'): ...' 형태(한 줄)로 정리하세요.]";
    }
    // done
    return "\n\n[지시: 두 가정을 짧게 짚어주고, 이 가정 중 하나라도 사실이 아니라면 갈등(D vs D')이 풀릴 수 있음을 설명하세요. 어떤 가정에 도전해보고 싶은지 물으며 따뜻하게 마무리하세요.]";
  }

  async function startAssumptions() {
    setStage(STAGE.ASSUMPTIONS);
    setAPhase("bd");
    setHighlight("BD");
    setLoading(true);
    setError("");
    const firstMsg =
      `완성된 구름입니다.\n공동목표(A): "${a}"\n나의 욕구(B): "${b}"\n상대의 욕구(C): "${c}"\n나의 주장(D): "${d}"\n상대의 주장(D'): "${dPrime}"\n\n` +
      "먼저 이 구름이 올바르게 작성됐는지, 네 화살표(A→B, A→C, B→D, C→D')를 각각 '~하기 위해서는 ~해야만 한다' 문장으로 읽어 확인해주세요. 그런 다음 B–D 화살표부터, 'B하기 위해서는 왜 꼭 D를 해야만 할까?'라는 가정을 학습자가 '왜냐하면…'으로 채우도록 첫 질문을 던지세요." +
      assumptionGuidance("bd");
    setAChat([{ role: "user", text: firstMsg, hidden: true }]);
    try {
      const res = await callClaude([{ role: "user", content: firstMsg }], ASSUMPTION_SYSTEM_PROMPT);
      const text = extractText(res) || "구름을 함께 다시 읽어볼까요?";
      setAChat((prev) => [...prev, { role: "assistant", text }]);
    } catch (e) {
      setError(e.message);
      setAChat((prev) => [
        ...prev,
        { role: "assistant", text: "AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      ]);
    }
    setLoading(false);
  }

  async function sendAssumption() {
    if (!aInput.trim() || loading) return;
    const userText = aInput.trim();
    setAInput("");
    const newChat = [...aChat, { role: "user", text: userText }];
    setAChat(newChat);
    setLoading(true);
    setError("");

    try {
      const apiMessages = newChat.map((m) => ({ role: m.role, content: m.text }));
      const lastIdx = apiMessages.length - 1;
      apiMessages[lastIdx] = {
        ...apiMessages[lastIdx],
        content: apiMessages[lastIdx].content + assumptionGuidance(aPhase),
      };

      const res = await callClaude(apiMessages, ASSUMPTION_SYSTEM_PROMPT);
      const text = extractText(res) || "조금 더 말씀해 주시겠어요?";
      setAChat((prev) => [...prev, { role: "assistant", text }]);

      const bdMatch = text.match(/🔍\s*가정\(\s*B\s*[–\-]\s*D\s*\)\s*[:：]\s*(.+)/);
      const cdMatch = text.match(/🔍\s*가정\(\s*C\s*[–\-]\s*D['’′]?\s*\)\s*[:：]\s*(.+)/);

      if (aPhase === "bd" && bdMatch) {
        setBdAssumption(bdMatch[1].trim());
        setAPhase("cd");
        setHighlight("CD");
      } else if (aPhase === "cd" && cdMatch) {
        setCdAssumption(cdMatch[1].trim());
        setAPhase("done");
        setHighlight(null);
      }
    } catch (e) {
      setError(e.message);
      setAChat((prev) => [
        ...prev,
        { role: "assistant", text: "AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      ]);
    }
    setLoading(false);
  }

  // 단계별 숨은 지시(윈윈 해결책 도출)
  function solutionGuidance(phase) {
    if (phase === "bd") {
      return `\n\n[지시: B–D 가정("${bdAssumption}")에 도전합니다. 이 가정이 항상 참이 아니라면, D'(상대의 주장)를 하면서도 B(나의 욕구)를 충족하는 해결책이 무엇일지 학습자가 떠올리도록 도우세요. 아직 충분치 않으면 더 구체화하도록 묻고, 양쪽을 모두 채우는 해결책이 나오면 '💡 해결책(B–D): ...' 형태(한 줄)로 정리한 뒤 다음(C–D')으로 넘어가자고 안내하세요.]`;
    }
    if (phase === "cd") {
      return `\n\n[지시: 이제 C–D' 가정("${cdAssumption}")에 도전합니다. 이 가정을 깬다면, D(나의 주장)를 하면서도 C(상대의 욕구)를 충족하는 해결책이 무엇일지 학습자가 떠올리도록 도우세요. 양쪽을 모두 채우는 해결책이 나오면 '💡 해결책(C–D'): ...' 형태(한 줄)로 정리하세요.]`;
    }
    // done
    return "\n\n[지시: 두 해결책을 짧게 짚어주고, 이제 누구도 포기하지 않는 윈윈의 길이 열렸음을 따뜻하게 축하하며 마무리하세요.]";
  }

  async function startSolutions() {
    setStage(STAGE.SOLUTIONS);
    setSPhase("bd");
    setHighlight("BD");
    setLoading(true);
    setError("");
    const firstMsg =
      `완성된 구름과 도출한 가정입니다.\n공동목표(A): "${a}"\n나의 욕구(B): "${b}"\n상대의 욕구(C): "${c}"\n나의 주장(D): "${d}"\n상대의 주장(D'): "${dPrime}"\n` +
      `B–D 가정: "${bdAssumption}"\nC–D' 가정: "${cdAssumption}"\n\n` +
      "이제 가정에 도전해 윈윈 해결책을 찾습니다. 먼저 B–D 가정부터, 이 가정이 정말 항상 참인지 물은 뒤, D'를 하면서도 B를 충족할 방법이 있을지 학습자가 떠올리도록 첫 질문을 던지세요." +
      solutionGuidance("bd");
    setSChat([{ role: "user", text: firstMsg, hidden: true }]);
    try {
      const res = await callClaude([{ role: "user", content: firstMsg }], SOLUTION_SYSTEM_PROMPT);
      const text = extractText(res) || "이 가정, 정말 항상 참일까요?";
      setSChat((prev) => [...prev, { role: "assistant", text }]);
    } catch (e) {
      setError(e.message);
      setSChat((prev) => [
        ...prev,
        { role: "assistant", text: "AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      ]);
    }
    setLoading(false);
  }

  async function sendSolution() {
    if (!sInput.trim() || loading) return;
    const userText = sInput.trim();
    setSInput("");
    const newChat = [...sChat, { role: "user", text: userText }];
    setSChat(newChat);
    setLoading(true);
    setError("");

    try {
      const apiMessages = newChat.map((m) => ({ role: m.role, content: m.text }));
      const lastIdx = apiMessages.length - 1;
      apiMessages[lastIdx] = {
        ...apiMessages[lastIdx],
        content: apiMessages[lastIdx].content + solutionGuidance(sPhase),
      };

      const res = await callClaude(apiMessages, SOLUTION_SYSTEM_PROMPT);
      const text = extractText(res) || "조금 더 구체적으로 말씀해 주시겠어요?";
      setSChat((prev) => [...prev, { role: "assistant", text }]);

      const bdMatch = text.match(/💡\s*해결책\(\s*B\s*[–\-]\s*D\s*\)\s*[:：]\s*(.+)/);
      const cdMatch = text.match(/💡\s*해결책\(\s*C\s*[–\-]\s*D['’′]?\s*\)\s*[:：]\s*(.+)/);

      if (sPhase === "bd" && bdMatch) {
        setBdSolution(bdMatch[1].trim());
        setSPhase("cd");
        setHighlight("CD");
      } else if (sPhase === "cd" && cdMatch) {
        setCdSolution(cdMatch[1].trim());
        setSPhase("done");
        setHighlight(null);
      }
    } catch (e) {
      setError(e.message);
      setSChat((prev) => [
        ...prev,
        { role: "assistant", text: "AI 연결에 문제가 생겼어요. 잠시 후 다시 시도해주세요." },
      ]);
    }
    setLoading(false);
  }

  async function exportPng() {
    const svg = diagramRef.current && diagramRef.current.querySelector("svg");
    if (!svg) return;
    try {
      const url = await svgToPngDataUrl(svg, 2);
      downloadDataUrl(url, "cloud-구름.png");
    } catch (e) {
      setError("이미지 내보내기에 실패했어요. 다시 시도해주세요.");
    }
  }

  function exportPdf() {
    // 인쇄용 요약 레이아웃(.print-summary)이 보이도록 전환 후 인쇄 다이얼로그 호출
    window.print();
  }

  function reset() {
    setStage(STAGE.INTRO);
    setD("");
    setDPrime("");
    setB("");
    setC("");
    setA("");
    setChat([]);
    setHighlight(null);
    setInput("");
    setError("");
    setAChat([]);
    setAInput("");
    setAPhase("bd");
    setBdAssumption("");
    setCdAssumption("");
    setSChat([]);
    setSInput("");
    setSPhase("bd");
    setBdSolution("");
    setCdSolution("");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-mark">☁</div>
        <div className="topbar-text">
          <span className="topbar-kicker">TOCfE 사고도구</span>
          <span className="topbar-title">구름 × AI 사고 파트너</span>
        </div>
      </header>

      <main className="layout">
        <section className="diagram-pane" ref={diagramRef}>
          <CloudDiagram
            a={a}
            b={b}
            c={c}
            d={d}
            dPrime={dPrime}
            highlight={highlight}
            bdAssumption={bdAssumption}
            cdAssumption={cdAssumption}
            resolved={!!(bdSolution && cdSolution)}
          />
          <div className="legend">
            <span>
              <i style={{ background: "var(--navy)" }} />
              공동목표
            </span>
            <span>
              <i style={{ background: "var(--sage)" }} />
              욕구
            </span>
            <span>
              <i style={{ background: "var(--terracotta)" }} />
              주장
            </span>
          </div>

          {a && (
            <div className="export-row">
              <button className="btn ghost small" onClick={exportPng}>
                🖼 이미지(PNG) 저장
              </button>
              <button className="btn ghost small" onClick={exportPdf}>
                📄 PDF로 저장
              </button>
            </div>
          )}
        </section>

        <section className="interact-pane">
          {stage === STAGE.INTRO && (
            <div className="panel fade-in">
              <h1>갈등 속에는 늘, 숨은 목표가 있다</h1>
              <p className="lede">
                구름(Cloud)은 두 사람의 상충하는 주장(D, D') 뒤에 숨은 진짜 욕구(B, C)를 찾아내고, 그
                욕구를 모두 만족시킬 공동목표(A)를 발견하는 사고도구입니다.
              </p>
              <p className="lede small">
                여기서는 AI가 정답을 대신 채워주지 않습니다. 대신 계속 되물으며, 당신이 스스로 자신의
                욕구를 발견하도록 돕습니다.
              </p>
              <button className="btn primary" onClick={startConflict}>
                시작하기
              </button>
            </div>
          )}

          {stage === STAGE.CONFLICT && (
            <div className="panel fade-in">
              <h2>1. 갈등이 되는 두 주장을 적어보세요</h2>
              <p className="hint">예: "게임을 더 하고 싶다" vs "지금 자야 한다"</p>

              <label className="field-label terracotta">D — 나의 주장</label>
              <textarea
                className="field"
                placeholder="나는 무엇을 원하나요?"
                value={d}
                onChange={(e) => setD(e.target.value)}
                rows={2}
              />

              <label className="field-label terracotta">D′ — 상대의 주장</label>
              <textarea
                className="field"
                placeholder="상대는 무엇을 원하나요?"
                value={dPrime}
                onChange={(e) => setDPrime(e.target.value)}
                rows={2}
              />

              <div className="row">
                <button className="btn ghost" onClick={useSample}>
                  예시로 채우기
                </button>
                <button
                  className="btn primary"
                  disabled={!d.trim() || !dPrime.trim()}
                  onClick={submitConflict}
                >
                  AI와 욕구 탐색 시작 →
                </button>
              </div>
            </div>
          )}

          {(stage === STAGE.NEEDS || stage === STAGE.GOAL) && (
            <div className="panel chat-panel fade-in">
              <h2>{stage === STAGE.GOAL ? "공동목표를 찾았어요" : "2. AI가 묻습니다"}</h2>
              {error && <p className="error-text">{error}</p>}
              <div className="chat-scroll" ref={scrollRef}>
                {chat
                  .filter((m) => !m.hidden)
                  .map((m, i) => (
                    <div key={i} className={`bubble ${m.role}`}>
                      {m.text}
                    </div>
                  ))}
                {loading && (
                  <div className="bubble assistant loading">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                )}
              </div>

              {stage === STAGE.NEEDS && (
                <div className="chat-input-row">
                  <input
                    className="chat-input"
                    placeholder="생각을 적어보세요…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    disabled={loading}
                  />
                  <button className="btn primary small" onClick={sendChat} disabled={loading || !input.trim()}>
                    보내기
                  </button>
                </div>
              )}

              {stage === STAGE.GOAL && (
                <div className="goal-result">
                  <p className="goal-caption">
                    서로 달라 보였던 두 주장은, 사실 같은 곳을 향하고 있었습니다.
                  </p>
                  <div className="row" style={{ justifyContent: "center" }}>
                    <button className="btn primary" onClick={startAssumptions}>
                      숨은 가정(전제) 찾아보기 →
                    </button>
                    <button className="btn ghost" onClick={reset}>
                      다른 갈등으로
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === STAGE.ASSUMPTIONS && (
            <div className="panel chat-panel fade-in">
              <h2>3. 화살표에 숨은 가정을 찾아요</h2>
              <p className="hint">
                "B하기 위해서는 왜 꼭 D 해야만 할까? 왜냐하면…" — 그 '왜냐하면'이 숨은 가정입니다.
              </p>
              {error && <p className="error-text">{error}</p>}
              <div className="chat-scroll" ref={scrollRef}>
                {aChat
                  .filter((m) => !m.hidden)
                  .map((m, i) => (
                    <div key={i} className={`bubble ${m.role}`}>
                      {m.text}
                    </div>
                  ))}
                {loading && (
                  <div className="bubble assistant loading">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                )}
              </div>

              {(bdAssumption || cdAssumption) && (
                <div className="assumption-list">
                  {bdAssumption && (
                    <div className="assumption-item">
                      <span className="assumption-tag bd">B–D 가정</span>
                      {bdAssumption}
                    </div>
                  )}
                  {cdAssumption && (
                    <div className="assumption-item">
                      <span className="assumption-tag cd">C–D′ 가정</span>
                      {cdAssumption}
                    </div>
                  )}
                </div>
              )}

              {aPhase !== "done" ? (
                <div className="chat-input-row">
                  <input
                    className="chat-input"
                    placeholder="왜냐하면… 으로 이어서 적어보세요"
                    value={aInput}
                    onChange={(e) => setAInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendAssumption()}
                    disabled={loading}
                  />
                  <button
                    className="btn primary small"
                    onClick={sendAssumption}
                    disabled={loading || !aInput.trim()}
                  >
                    보내기
                  </button>
                </div>
              ) : (
                <div className="goal-result">
                  <p className="goal-caption">
                    이 가정 중 하나라도 무너지면, 갈등은 풀릴 수 있습니다.
                  </p>
                  <div className="row" style={{ justifyContent: "center" }}>
                    <button className="btn primary" onClick={startSolutions}>
                      가정을 깨는 윈윈 해결책 찾기 →
                    </button>
                    <button className="btn ghost" onClick={reset}>
                      다른 갈등으로
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === STAGE.SOLUTIONS && (
            <div className="panel chat-panel fade-in">
              <h2>4. 가정을 깨는 윈윈 해결책</h2>
              <p className="hint">
                가정이 항상 참은 아닙니다. 그 가정을 깨면 — 한쪽을 포기하지 않고도 둘 다 얻는 길이 열립니다.
              </p>
              {error && <p className="error-text">{error}</p>}
              <div className="chat-scroll" ref={scrollRef}>
                {sChat
                  .filter((m) => !m.hidden)
                  .map((m, i) => (
                    <div key={i} className={`bubble ${m.role}`}>
                      {m.text}
                    </div>
                  ))}
                {loading && (
                  <div className="bubble assistant loading">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                )}
              </div>

              {(bdSolution || cdSolution) && (
                <div className="assumption-list">
                  {bdSolution && (
                    <div className="assumption-item solution">
                      <span className="assumption-tag win">윈윈 B–D</span>
                      {bdSolution}
                    </div>
                  )}
                  {cdSolution && (
                    <div className="assumption-item solution">
                      <span className="assumption-tag win">윈윈 C–D′</span>
                      {cdSolution}
                    </div>
                  )}
                </div>
              )}

              {sPhase !== "done" ? (
                <div className="chat-input-row">
                  <input
                    className="chat-input"
                    placeholder="둘 다 얻는 방법을 적어보세요"
                    value={sInput}
                    onChange={(e) => setSInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendSolution()}
                    disabled={loading}
                  />
                  <button
                    className="btn primary small"
                    onClick={sendSolution}
                    disabled={loading || !sInput.trim()}
                  >
                    보내기
                  </button>
                </div>
              ) : (
                <div className="goal-result">
                  <p className="goal-caption">
                    누구도 포기하지 않는 길 — 윈윈을 찾았습니다.
                  </p>
                  <button className="btn ghost" onClick={reset}>
                    다른 갈등으로 다시 해보기
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <section className="print-summary">
        <h1 className="print-title">구름(Cloud) — 갈등 해소 요약</h1>
        <CloudDiagram
          a={a}
          b={b}
          c={c}
          d={d}
          dPrime={dPrime}
          highlight={null}
          bdAssumption={bdAssumption}
          cdAssumption={cdAssumption}
          resolved={!!(bdSolution && cdSolution)}
        />
        <div className="print-list">
          <p>
            <b>나의 주장 (D):</b> {d}
          </p>
          <p>
            <b>상대의 주장 (D′):</b> {dPrime}
          </p>
          <p>
            <b>나의 욕구 (B):</b> {b}
          </p>
          <p>
            <b>상대의 욕구 (C):</b> {c}
          </p>
          <p>
            <b>공동목표 (A):</b> {a}
          </p>
          {bdAssumption && (
            <p>
              <b>B–D 가정:</b> {bdAssumption}
            </p>
          )}
          {cdAssumption && (
            <p>
              <b>C–D′ 가정:</b> {cdAssumption}
            </p>
          )}
          {bdSolution && (
            <p>
              <b>윈윈 해결책 (B–D):</b> {bdSolution}
            </p>
          )}
          {cdSolution && (
            <p>
              <b>윈윈 해결책 (C–D′):</b> {cdSolution}
            </p>
          )}
        </div>
      </section>

      <footer className="foot">
        디자인씽킹연구소 · TOCfE 사고도구 교육자료 — AI는 답을 주지 않습니다, 질문할 뿐입니다.
      </footer>
    </div>
  );
}
