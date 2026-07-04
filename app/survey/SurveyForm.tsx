"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { surveyQuestions, type SurveyAnswers } from "../../lib/survey";

export default function SurveyForm({ alreadySubmitted }: { alreadySubmitted: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Partial<SurveyAnswers>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const progress = useMemo(
    () => Math.round((Object.keys(answers).length / surveyQuestions.length) * 100),
    [answers],
  );

  if (alreadySubmitted) {
    return (
      <section className="survey-status-card">
        <span className="survey-status-code">ANSWERED / 409</span>
        <h1>このブラウザーからの<br /><em>回答は登録済みです。</em></h1>
        <p>重複回答を防ぐため、同じブラウザーからの送信は1回までです。</p>
        <a href="/">AJAZZ Japan トップへ戻る →</a>
      </section>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      answers,
    };

    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "送信に失敗しました。");
      router.push("/survey/thanks");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "送信に失敗しました。");
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <form className="survey-form" onSubmit={submit}>
      <div className="survey-progress" aria-label={`回答進捗 ${progress}%`}>
        <div className="survey-progress-copy"><span>PROGRESS</span><b>{progress}%</b></div>
        <progress value={progress} max="100" />
      </div>

      {error && <div className="survey-alert" role="alert">{error}</div>}

      <section className="survey-identity">
        <div>
          <span className="survey-index">00 / IDENTIFICATION</span>
          <h2>回答者情報</h2>
          <p>本調査は記名式です。氏名は重複回答の防止と集計管理にのみ使用します。</p>
        </div>
        <label>
          <span>お名前 <b>必須</b></span>
          <input name="name" type="text" maxLength={100} autoComplete="name" placeholder="例：山田 太郎" required />
        </label>
      </section>

      <div className="survey-question-list">
        {surveyQuestions.map((question, questionIndex) => (
          <fieldset className="survey-question" key={question.id}>
            <legend>
              <span>{String(questionIndex + 1).padStart(2, "0")}</span>
              {question.title}
            </legend>
            <div className="survey-options">
              {question.options.map((option, optionIndex) => (
                <label className="survey-option" key={option}>
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                    required
                  />
                  <span className="survey-radio" aria-hidden="true" />
                  <span className="survey-letter">{"ABCDEF"[optionIndex]}</span>
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <section className="survey-submit">
        <div>
          <span className="survey-index">FINAL / SUBMIT</span>
          <h2>回答内容を送信します</h2>
          <p>送信後は変更できません。同じ氏名・ブラウザーからの回答は1回までです。</p>
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "送信中…" : "回答を送信"}<span aria-hidden="true">↗</span>
        </button>
      </section>
    </form>
  );
}
