import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts'
import { CATS, getCat, fmt } from '../constants.js'
import { Card, SectionTitle, Chip, Btn } from './ui.jsx'

const NIVEL_COLOR = { critico: '#f43f5e', alto: '#f97316', medio: '#fbbf24', baixo: '#4ade80' }

export function AnalysisScreen({ analysis, txList, month, allMonths, allAnalyses, allTx }) {
  if (!analysis) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 60 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🧠</p>
        <p style={{ color: '#475569', fontSize: 14 }}>Nenhuma análise para este mês ainda.</p>
        <p style={{ color: '#2d3d50', fontSize: 12, marginTop: 4 }}>Clique em ✨ Analisar com IA após processar os arquivos.</p>
      </div>
    )
  }

  const catData = CATS.map(c => ({
    ...c,
    value: (txList || []).filter(t => t.categoria === c.key).reduce((s, t) => s + (t.valor || 0), 0),
  })).filter(c => c.value > 0 && c.grupo === 'gasto').sort((a, b) => b.value - a.value)

  const score = analysis.score_financeiro ?? 50
  const scoreColor = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#f43f5e'

  // Historical comparison
  const histData = allMonths?.map(m => ({
    mes: m,
    gastos: (allTx?.[m] || []).filter(t => getCat(t.categoria).grupo === 'gasto').reduce((s, t) => s + t.valor, 0),
    receita: (allTx?.[m] || []).filter(t => getCat(t.categoria).grupo === 'receita').reduce((s, t) => s + t.valor, 0),
    score: allAnalyses?.[m]?.score_financeiro || null,
  }))

  return (
    <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr', gap: 14 }}>
        {/* Score */}
        <Card style={{ textAlign: 'center', padding: '16px 12px' }}>
          <SectionTitle>Score · {month}</SectionTitle>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
            <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 80, height: 80 }}>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e2d3d" strokeWidth="3.5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3.5"
                strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
              <span style={{ color: scoreColor, fontSize: 20, fontWeight: 800, fontFamily: 'monospace' }}>{score}</span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{analysis.score_motivo}</p>
        </Card>

        {/* Comparativo */}
        {analysis.comparativo && (
          <Card>
            <SectionTitle>Receita × Gasto</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '💚 Receita bruta',  val: analysis.comparativo.receita,  color: '#22c55e' },
                { label: '💸 Total gastos',   val: analysis.comparativo.gasto,    color: '#f43f5e' },
                { label: '💰 Saldo',          val: analysis.comparativo.saldo,    color: analysis.comparativo.saldo >= 0 ? '#4ade80' : '#f43f5e' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{r.label}</span>
                  <span style={{ color: r.color, fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{fmt(r.val)}</span>
                </div>
              ))}
              {analysis.comparativo.taxa_poupanca_pct !== undefined && (
                <div style={{ background: '#0d1520', borderRadius: 6, padding: '6px 8px', marginTop: 4 }}>
                  <p style={{ color: '#64748b', fontSize: 10, margin: '0 0 2px', fontFamily: 'monospace' }}>Taxa de poupança</p>
                  <p style={{ color: analysis.comparativo.taxa_poupanca_pct >= 0 ? '#4ade80' : '#f43f5e', fontWeight: 700, fontSize: 16, fontFamily: 'monospace', margin: 0 }}>
                    {analysis.comparativo.taxa_poupanca_pct.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Dica principal */}
        <Card style={{ borderLeft: '3px solid #3b82f6' }}>
          <SectionTitle>💡 Dica principal</SectionTitle>
          <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 10px' }}>{analysis.dica_principal}</p>
          {analysis.meta_proximos_30_dias && (
            <div style={{ background: '#0d1f3c', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ color: '#64748b', fontSize: 10, margin: '0 0 2px', fontFamily: 'monospace' }}>Meta 30 dias</p>
              <p style={{ color: '#60a5fa', fontWeight: 800, fontSize: 18, fontFamily: 'monospace', margin: 0 }}>{fmt(analysis.meta_proximos_30_dias)}</p>
            </div>
          )}
        </Card>

        {/* Top gastos */}
        <Card>
          <SectionTitle>🔝 Top Categorias</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {catData.slice(0, 5).map(c => (
              <div key={c.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{c.emoji} {c.label}</span>
                  <span style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' }}>{fmt(c.value)}</span>
                </div>
                <div style={{ background: '#1e2d3d', borderRadius: 3, height: 4 }}>
                  <div style={{ width: `${(c.value / catData[0].value) * 100}%`, height: '100%', background: c.color, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Resumo */}
      <Card style={{ borderLeft: '3px solid #a78bfa' }}>
        <SectionTitle>Resumo executivo</SectionTitle>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{analysis.resumo_executivo}</p>
      </Card>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <SectionTitle>Distribuição por categoria</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={52} outerRadius={88}
                dataKey="value" labelLine={false}
                label={({ cx, cy, midAngle, outerRadius, percent }) => {
                  if (percent < 0.05) return null
                  const r = Math.PI / 180
                  const x = cx + (outerRadius + 14) * Math.cos(-midAngle * r)
                  const y = cy + (outerRadius + 14) * Math.sin(-midAngle * r)
                  return <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} fontSize={10}>{(percent * 100).toFixed(0)}%</text>
                }}>
                {catData.map(c => <Cell key={c.key} fill={c.color} stroke="#0a0f18" strokeWidth={2} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#1e2530', border: '1px solid #2d3748', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Historical trend */}
        {histData && histData.length >= 2 ? (
          <Card>
            <SectionTitle>Evolução histórica</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} contentStyle={{ background: '#1e2530', border: '1px solid #2d3748', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="receita" name="Receita" fill="#22c55e44" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos"  name="Gastos"  fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card>
            <SectionTitle>Ranking de gastos</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {catData.slice(0, 8).map(c => (
                <div key={c.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: '#cbd5e1', fontSize: 12 }}>{c.emoji} {c.label}</span>
                    <span style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace' }}>{fmt(c.value)}</span>
                  </div>
                  <div style={{ background: '#1e2d3d', borderRadius: 4, height: 5 }}>
                    <div style={{ width: `${(c.value / catData[0].value) * 100}%`, height: '100%', background: c.color, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Alertas + Economia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {analysis.alertas?.length > 0 && (
          <div>
            <SectionTitle>🚨 Alertas</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analysis.alertas.map((a, i) => {
                const cor = NIVEL_COLOR[a.nivel] || '#fbbf24'
                return (
                  <Card key={i} style={{ borderLeft: `3px solid ${cor}`, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{a.titulo}</span>
                      <Chip color={cor + '22'} text={cor}>{a.nivel}</Chip>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{a.descricao}</p>
                    {a.economia_potencial > 0 && (
                      <p style={{ color: '#4ade80', fontSize: 11, margin: '6px 0 0', fontFamily: 'monospace' }}>
                        💚 Potencial: {fmt(a.economia_potencial)}/mês
                      </p>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {analysis.economia_potencial?.length > 0 && (
            <div>
              <SectionTitle>💚 Onde economizar</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.economia_potencial.map((e, i) => (
                  <Card key={i} style={{ borderLeft: '3px solid #22c55e', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{e.acao}</span>
                      <span style={{ color: '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(e.valor_mes)}/mês</span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{e.como}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {analysis.pontos_positivos?.length > 0 && (
            <Card style={{ borderLeft: '3px solid #22c55e' }}>
              <SectionTitle>✅ Pontos positivos</SectionTitle>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {analysis.pontos_positivos.map((p, i) => (
                  <li key={i} style={{ color: '#94a3b8', fontSize: 12, marginBottom: 5, lineHeight: 1.5 }}>{p}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <p style={{ color: '#1e2d3d', fontSize: 10, textAlign: 'center', fontFamily: 'monospace' }}>
        Análise gerada em {analysis.savedAt ? new Date(analysis.savedAt).toLocaleString('pt-BR') : '—'} · {txList?.length || 0} transações
      </p>
    </div>
  )
}
