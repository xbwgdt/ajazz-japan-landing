import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COMPLETED_COOKIE } from "../../lib/survey-security";
import SurveyForm from "./SurveyForm";

export const metadata: Metadata = {
  title: "ゲーミングデバイス調査 | AJAZZ Japan",
  description: "キーボードとマウスの好みに関するAJAZZ Japan公式アンケート。",
};

export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const alreadySubmitted = Boolean((await cookies()).get(COMPLETED_COOKIE));
  return (
    <main className="survey-page">
      <header className="survey-nav">
        <a className="survey-logo" href="/"><strong>AJAZZ</strong><span>JAPAN</span></a>
        <a className="survey-back" href="/">公式サイトへ戻る ↗</a>
      </header>

      {!alreadySubmitted && (
        <section className="survey-hero">
          <div>
            <p className="survey-kicker">AJAZZ PRODUCT RESEARCH · 2026</p>
            <h1>あなたの理想の<br /><em>デバイス</em>を教えてください。</h1>
          </div>
          <div className="survey-meta">
            <p><strong>10</strong><span>QUESTIONS</span></p>
            <p><strong>03</strong><span>MINUTES</span></p>
          </div>
        </section>
      )}

      <SurveyForm alreadySubmitted={alreadySubmitted} />
      <footer className="survey-footer">© 2026 AJAZZ Japan · PRODUCT RESEARCH</footer>
    </main>
  );
}
