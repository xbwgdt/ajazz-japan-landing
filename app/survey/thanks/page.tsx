import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "回答完了 | AJAZZ Japan",
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  return (
    <main className="survey-page survey-message-page">
      <header className="survey-nav">
        <a className="survey-logo" href="/"><strong>AJAZZ</strong><span>JAPAN</span></a>
      </header>
      <section className="survey-status-card">
        <span className="survey-status-code">COMPLETE / 200</span>
        <h1>ご回答<br /><em>ありがとうございました。</em></h1>
        <p>回答を受け付けました。製品開発と今後のラインナップ検討に活用します。</p>
        <a href="/">AJAZZ Japan トップへ戻る →</a>
      </section>
    </main>
  );
}
