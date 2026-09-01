import { getGenerativeModel } from 'firebase/ai'
import { ai } from '@/lib/firebase'

// gemini-3.5-flash-lite: de sobra para resumir/estructurar notas de
// campo en prosa de informe — no hace falta un modelo de última
// generación para esta tarea, y esta clase de modelo entra en la capa
// gratuita del backend Gemini Developer API. (gemini-2.0-flash-lite,
// usado originalmente, fue retirado por Google — ver PROJECT_DESCRIPTION.md.)
const MODEL_ID = 'gemini-3.5-flash-lite'

export interface DraftReportInput {
  caseNumber: string
  investigationType: string
  objectScope: string
  investigatedName: string
  investigatedAddress: string
  actionsText: string
}

export interface DraftReportResult {
  methodsUsed: string
  results: string
  actionsPerformed: string
  conclusions: string
}

function buildPrompt(input: DraftReportInput): string {
  return `Eres un asistente que ayuda a un detective privado español a preparar el borrador de un informe de investigación a partir de sus notas de campo (actuaciones). Ciñéte estrictamente a los hechos descritos en las actuaciones — no inventes datos, nombres, fechas ni conclusiones que no se deduzcan de ellas. Escribe en español, en tono profesional y objetivo, en prosa (no listas).

Expediente: ${input.caseNumber}
Tipo de investigación: ${input.investigationType}
Objeto y alcance encargado: ${input.objectScope}
Investigado: ${input.investigatedName} — ${input.investigatedAddress}

Actuaciones registradas (orden cronológico):
${input.actionsText}

Devuelve SOLO un objeto JSON con estas cuatro claves, sin texto adicional antes ni después:
- "methodsUsed": medios y técnicas de investigación empleados, deducidos de las actuaciones (vigilancia, seguimiento, fotografía, etc.).
- "actionsPerformed": redacción en prosa cronológica de las actuaciones realizadas (no una lista en bruto).
- "results": resultados y hallazgos objetivos obtenidos.
- "conclusions": conclusiones que se deducen directamente de los hechos observados, sin especular más allá de lo constatado.`
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return (fenced ? fenced[1] : text).trim()
}

export async function generateReportDraft(
  input: DraftReportInput
): Promise<DraftReportResult> {
  const model = getGenerativeModel(ai, {
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  })

  const result = await model.generateContent(buildPrompt(input))
  const raw = result.response.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(raw))
  } catch {
    throw new Error('La IA no devolvió un borrador con el formato esperado. Inténtalo de nuevo.')
  }

  const draft = parsed as Partial<DraftReportResult>
  if (
    typeof draft.methodsUsed !== 'string' ||
    typeof draft.actionsPerformed !== 'string' ||
    typeof draft.results !== 'string' ||
    typeof draft.conclusions !== 'string'
  ) {
    throw new Error('La IA no devolvió un borrador con el formato esperado. Inténtalo de nuevo.')
  }

  return draft as DraftReportResult
}
