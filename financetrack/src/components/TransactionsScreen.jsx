import { useState } from 'react'
import { getCat, CATS, fmt } from '../constants.js'
import { Card, Btn, Chip, CatSelect, Spinner } from './ui.jsx'

export function TransactionsScreen({ month, txList, onCatChange, onAnalyse, isAnalysing, hasAnalysis, onViewAnalysis }) {
  const [filter, setFilter] = useState('all')
  const [grupFilter, setGrupFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('valor')

  if (!month || !txList?.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', paddingTop: 60 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
        <p style={{ color: '#475569', fontSize: 14 }}>Selecione um mês ou processe os arquivos primeiro.</p>
      </div>
    )
  }

  // Summaries
  const gastos   = txList.filter(t => getCat(t.categoria).grupo === 'gasto')
  const receitas = txList.filter(t => getCat(t.categoria).grupo === 'receita')
  const descontos = txList.filter(t => getCat(t.categoria).grupo === 'desconto')

  const totalGasto    = gastos.reduce((s, t)   => s + (t.valor || 0), 0)
  const totalReceita  = receitas.reduce((s, t) => s + (t.valor || 0), 0)
  const totalDesconto = descontos.reduce((s, t) => s + (t.valor || 0), 0)

  // Cats used
  const usedCats = [...new Set(txList.map(t => t.categoria))].filter(Boolean)

  // Filter + sort
  let visible = txList
    .filter(t => t.tipo !== 'pagamento')
    .filter(t => filter === 'all' || t.categoria === filter)
    .filter(t => grupFilter === 'all' || getCat(t.categoria).grupo === grupFilter)
    .filter(t => !search || t.descricao?.toLowerCase().includes(search.toLowerCase()))

  if (sortBy === 'valor')  visible = [...visible].sort((a, b) => b.valor - a.valor)
  if (sortBy === 'data')   visible = [...visible].sort((a, b) => a.data?.localeCompare(b.data))
  if (sortBy === 'cat')    visible = [...visible].sort((a, b) => a.categoria?.localeCompare(b.categoria))

  return (
    <div style={{ padding: '16px 24px' }}>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total gastos',   val: fmt(totalGasto),               color: '#f43f5e', n: gastos.length },
          { label: 'Receitas brutas',val: fmt(totalReceita),             color: '#22c55e', n: receitas.length },
          { label: 'Descontos',      val: fmt(totalDesconto),            color: '#94a3b8', n: descontos.length },
          { label: 'Líquido approx', val: fmt(totalReceita - totalDesconto), color: totalReceita > totalDesconto ? '#22c55e' : '#f43f5e', n: null },
          { label: 'Saldo (rec-gas)',val: fmt(totalReceita - totalDesconto - totalGasto), color: (totalReceita - totalDesconto - totalGasto) >= 0 ? '#4ade80' : '#f43f5e', n: null },
        ].map(s => (
          <Card key={s.label} style={{ padding: '10px 12px', textAlign: 'center' }}>
            <p style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', fontFamily: 'monospace', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 15, fontWeight: 800, fontFamily: 'monospace', margin: 0 }}>{s.val}</p>
            {s.n !== null && <p style={{ color: '#2d4060', fontSize: 10, margin: '2px 0 0', fontFamily: 'monospace' }}>{s.n} tx</p>}
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{ background: '#141b26', border: '1px solid #1e2d3d', color: '#f1f5f9', padding: '7px 11px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', width: 180 }} />

        {/* Grupo filter */}
        {['all','gasto','receita','desconto'].map(g => (
          <button key={g} onClick={() => setGrupFilter(g)}
            style={{
              background: grupFilter === g ? '#1e3a5f' : '#141b26',
              border: `1px solid ${grupFilter === g ? '#3b82f6' : '#1e2d3d'}`,
              color: grupFilter === g ? '#60a5fa' : '#64748b',
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
            }}>
            {g === 'all' ? `Todos (${txList.length})` : g === 'gasto' ? `💸 Gastos (${gastos.length})` : g === 'receita' ? `💚 Receitas (${receitas.length})` : `🏛️ Descontos (${descontos.length})`}
          </button>
        ))}

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: '#141b26', border: '1px solid #1e2d3d', color: '#94a3b8', padding: '5px 9px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}>
          <option value="valor">↓ Por valor</option>
          <option value="data">↓ Por data</option>
          <option value="cat">↓ Por categoria</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {hasAnalysis && <Btn variant="secondary" small onClick={onViewAnalysis}>📊 Ver análise</Btn>}
          <Btn variant="success" small onClick={onAnalyse} disabled={isAnalysing}>
            {isAnalysing ? <><Spinner size={10} /> Analisando...</> : '✨ Analisar com IA'}
          </Btn>
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={() => setFilter('all')}
          style={{ background: filter === 'all' ? '#1e3a5f' : '#141b26', border: `1px solid ${filter === 'all' ? '#3b82f6' : '#1e2d3d'}`, color: filter === 'all' ? '#60a5fa' : '#64748b', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>
          Todas
        </button>
        {usedCats.map(k => {
          const c = getCat(k)
          return (
            <button key={k} onClick={() => setFilter(k)}
              style={{ background: filter === k ? c.color + '22' : '#141b26', border: `1px solid ${filter === k ? c.color : '#1e2d3d'}`, color: filter === k ? c.color : '#64748b', padding: '4px 9px', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}>
              {c.emoji} {c.label} ({txList.filter(t => t.categoria === k).length})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '65px 1fr 190px 120px 30px',
          padding: '8px 14px', borderBottom: '1px solid #1e2d3d', background: '#0d1520',
        }}>
          {['Data', 'Descrição', 'Categoria', 'Valor', ''].map(h => (
            <span key={h} style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{h}</span>
          ))}
        </div>

        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          {visible.length === 0 ? (
            <p style={{ color: '#2d3d50', textAlign: 'center', padding: '32px 0' }}>Nenhuma transação encontrada.</p>
          ) : visible.map((t, i) => {
            const c = getCat(t.categoria)
            const isRec = c.grupo === 'receita'
            const isDesc = c.grupo === 'desconto'
            const isJuros = c.key === 'juros_multas'
            return (
              <div key={t.id || i}
                style={{
                  display: 'grid', gridTemplateColumns: '65px 1fr 190px 120px 30px',
                  alignItems: 'center', padding: '8px 14px',
                  borderBottom: '1px solid #111a25', transition: 'background .12s',
                  background: isRec ? '#0d1f1215' : isJuros ? '#1a0d1215' : 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#141b26'}
                onMouseLeave={e => e.currentTarget.style.background = isRec ? '#0d1f1215' : isJuros ? '#1a0d1215' : 'transparent'}>

                <span style={{ color: '#475569', fontSize: 11, fontFamily: 'monospace' }}>{t.data}</span>

                <div style={{ minWidth: 0, paddingRight: 10 }}>
                  <p style={{ color: '#e2e8f0', fontSize: 13, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.descricao}
                  </p>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {t.fonte === 'xp_cartao' && <Chip color="#451a0322" text="#fb923c" style={{ fontSize: 9 }}>💳 XP</Chip>}
                    {t.fonte === 'sicredi'   && <Chip color="#0f2d1f22" text="#4ade80" style={{ fontSize: 9 }}>🏦 Sicredi</Chip>}
                    {t.fonte === 'contracheque' && <Chip color="#1e1b4b22" text="#a78bfa" style={{ fontSize: 9 }}>📑 Holerite</Chip>}
                  </div>
                </div>

                <CatSelect value={t.categoria} onChange={(nc) => onCatChange(t.id, nc)} />

                <span style={{
                  color: isRec ? '#22c55e' : isDesc ? '#94a3b8' : isJuros ? '#f43f5e' : '#f1f5f9',
                  fontWeight: 700, fontSize: 13, fontFamily: 'monospace', textAlign: 'right',
                }}>
                  {isRec ? '+' : isDesc ? '-' : '-'}{fmt(t.valor)}
                </span>

                <span style={{ color: '#1e2d3d', fontSize: 13, textAlign: 'center' }}>{c.emoji}</span>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '9px 14px', background: '#0d1520', borderTop: '1px solid #1e2d3d', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>{visible.length} de {txList.length}</span>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
            {fmt(visible.filter(t => getCat(t.categoria).grupo !== 'receita').reduce((s, t) => s + t.valor, 0))}
          </span>
        </div>
      </Card>
    </div>
  )
}
