// ─── Claude API ──────────────────────────────────────────────────────────────

export async function callClaude(apiKey, system, user, maxTokens = 4000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Claude API ${res.status}: ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

export function parseJSON(raw) {
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}

// ─── System Prompts ──────────────────────────────────────────────────────────

export const SYS_ANALYSIS = `Você é um consultor financeiro pessoal brasileiro, direto e prático.
O usuário é Gustavo, servidor público do RS (Bombeiro Militar). Salário base ~R$7.682 + horas extras e substituições variáveis. Tem Cartão XP Visa Infinite e conta Sicredi.

Analise os dados e retorne SOMENTE JSON sem markdown:
{
  "resumo_executivo": "2-3 frases objetivas sobre o mês",
  "score_financeiro": número 0-100,
  "score_motivo": "frase curta explicando o score",
  "alertas": [
    {"titulo":"string","descricao":"string detalhada","nivel":"critico|alto|medio","economia_potencial":number}
  ],
  "economia_potencial": [
    {"acao":"string","valor_mes":number,"como":"string prático"}
  ],
  "pontos_positivos": ["string"],
  "comparativo": {"receita":number,"gasto":number,"saldo":number,"taxa_poupanca_pct":number},
  "top_gastos": [{"categoria":"string","valor":number,"pct":number}],
  "meta_proximos_30_dias": number,
  "dica_principal": "string direta e acionável"
}`

export const SYS_ENRICH = `Você é um parser financeiro brasileiro expert. Dada uma lista de transações já extraídas, revise e melhore as categorizações. Considere:
- Hair Pub = bar/pub noturno → bares_pubs (NÃO cuidados_pessoais, a menos que seja claramente estética)
- Vitraux = balada/bar → bares_pubs
- Qualquer "Barbearia" = cuidados_pessoais
- Posto = combustivel
- Restaurante/delivery = alimentacao
Retorne SOMENTE a lista JSON corrigida com o mesmo formato, sem markdown.`
