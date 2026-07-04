export const surveyQuestions = [
  {
    id: "q1",
    title: "好きなキーボードの種類",
    options: ["ラピットトリガーキーボード", "メカニカルキーボード", "メンブレンキーボード"],
  },
  {
    id: "q2",
    title: "好きなキーボードの配列",
    options: ["65%", "75%", "TKL", "98%"],
  },
  {
    id: "q3",
    title: "好きなキーボードの言語配列",
    options: ["JIS配列", "US配列"],
  },
  {
    id: "q4",
    title: "好きなキーボードの色",
    options: ["黒", "白", "透明系", "暖色系", "寒色系", "淡色系"],
  },
  {
    id: "q5",
    title: "好きなJIS配列キーキャップの印字タイプ",
    options: ["かな印字あり", "かな印字無し", "アルファベットキーだけかな印字、機能キー記号印字"],
  },
  {
    id: "q6",
    title: "ラピットトリガーキーボードにJIS配列必要？",
    options: ["必要", "必要なし"],
  },
  {
    id: "q7",
    title: "QMK/VIA機能は必要？",
    options: ["必要", "必要なし", "キーのカスタマイズ機能があればQMK/VIA機能まで必要なし"],
  },
  {
    id: "q8",
    title: "ラピットトリガーキーボードにQMK/VIA機能は必要？",
    options: ["必要", "必要なし", "キーのカスタマイズ機能があればQMK/VIA機能まで必要なし"],
  },
  {
    id: "q9",
    title: "好きなマウスの色",
    options: ["黒", "白", "透明系", "暖色系", "寒色系", "淡色系"],
  },
  {
    id: "q10",
    title: "必要なマウスのセンサーの性能",
    options: ["PAW3311", "PAW3395", "PAW3950"],
  },
] as const;

export type QuestionId = (typeof surveyQuestions)[number]["id"];
export type SurveyAnswers = Record<QuestionId, string>;

export interface SurveyResponseRecord {
  id: number;
  name: string;
  answers: SurveyAnswers;
  submittedAt: string;
}

export interface SurveyPayload {
  name: string;
  answers: SurveyAnswers;
}

export function validateSurveyPayload(value: unknown): SurveyPayload {
  if (!value || typeof value !== "object") {
    throw new Error("回答データが正しくありません。");
  }

  const payload = value as { name?: unknown; answers?: unknown };
  const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > 100) {
    throw new Error("お名前を100文字以内で入力してください。");
  }
  if (!payload.answers || typeof payload.answers !== "object") {
    throw new Error("すべての質問に回答してください。");
  }

  const source = payload.answers as Record<string, unknown>;
  const answers = {} as SurveyAnswers;
  for (const [index, question] of surveyQuestions.entries()) {
    const answer = source[question.id];
    if (typeof answer !== "string" || !(question.options as readonly string[]).includes(answer)) {
      throw new Error(`質問${index + 1}を選択してください。`);
    }
    answers[question.id] = answer;
  }
  return { name, answers };
}

export function buildSurveyStats(rows: SurveyResponseRecord[]) {
  return surveyQuestions.map((question) => {
    const counts = new Map<string, number>(
      question.options.map((option): [string, number] => [option, 0]),
    );
    for (const row of rows) {
      const answer = row.answers[question.id];
      if (counts.has(answer)) counts.set(answer, (counts.get(answer) ?? 0) + 1);
    }
    return {
      title: question.title,
      options: question.options.map((label) => {
        const count = counts.get(label) ?? 0;
        return {
          label,
          count,
          ratio: rows.length ? count / rows.length : 0,
          percent: rows.length ? Math.round((count / rows.length) * 1000) / 10 : 0,
        };
      }),
    };
  });
}

export function exportHeaders() {
  return ["回答ID", "氏名", "回答日時（JST）", ...surveyQuestions.map((question, index) => `Q${index + 1}. ${question.title}`)];
}

export function exportRows(rows: SurveyResponseRecord[]) {
  return rows.map((row) => [
    row.id,
    row.name,
    formatJst(row.submittedAt),
    ...surveyQuestions.map((question) => row.answers[question.id] ?? ""),
  ]);
}

export function formatJst(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
