import postgres from "postgres";
import type { SurveyAnswers, SurveyResponseRecord } from "./survey";

export class DatabaseNotConfiguredError extends Error {}
export class DuplicateResponseError extends Error {}

function databaseUrl() {
  const value = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!value) throw new DatabaseNotConfiguredError("Database connection is not configured");
  return value;
}

let sqlClient: ReturnType<typeof postgres> | undefined;

function client() {
  if (!sqlClient) {
    sqlClient = postgres(databaseUrl(), {
      connect_timeout: 10,
      idle_timeout: 20,
      max: 1,
      prepare: false,
      ssl: "require",
    });
  }
  return sqlClient;
}

async function ensureSchema() {
  const sql = client();
  await sql`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      name_key CHAR(64) NOT NULL UNIQUE,
      participant_hash CHAR(64) NOT NULL UNIQUE,
      answers JSONB NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function saveSurveyResponse(input: {
  name: string;
  nameKey: string;
  participantHash: string;
  answers: SurveyAnswers;
}) {
  await ensureSchema();
  try {
    const sql = client();
    await sql`
      INSERT INTO survey_responses (name, name_key, participant_hash, answers)
      VALUES (${input.name}, ${input.nameKey}, ${input.participantHash}, ${sql.json(input.answers)})
    `;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new DuplicateResponseError("Duplicate response");
    }
    throw error;
  }
}

export async function listSurveyResponses(): Promise<SurveyResponseRecord[]> {
  await ensureSchema();
  const result = await client()`
    SELECT id, name, answers, submitted_at
    FROM survey_responses
    ORDER BY submitted_at DESC, id DESC
  `;
  return result.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    answers: row.answers as SurveyAnswers,
    submittedAt: new Date(String(row.submitted_at)).toISOString(),
  }));
}
