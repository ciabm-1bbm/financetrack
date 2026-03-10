// ─── FOLDERS ────────────────────────────────
export const FOLDERS = [
  {
    id: 'contracheque',
    label: 'Contracheques',
    icon: '📑',
    color: '#6366f1',
    desc: 'Mensal · Vale Refeição · Férias',
    githubPath: 'data/contracheques',
    subTypes: ['MENSAL', 'AUXILIO_REFEICAO', 'FERIAS'],
  },
  {
    id: 'sicredi',
    label: 'Extratos Sicredi',
    icon: '🏦',
    color: '#22c55e',
    desc: 'PIX · Transferências · Salário',
    githubPath: 'data/sicredi',
    subTypes: [],
  },
  {
    id: 'xp_cartao',
    label: 'Cartão XP',
    icon: '💳',
    color: '#f59e0b',
    desc: 'Fatura mensal Visa Infinite',
    githubPath: 'data/xp_cartao',
    subTypes: [],
  },
]

// ─── TRANSACTION CATEGORIES ─────────────────
export const CATS = [
  // Gastos
  { key: 'alimentacao',       label: 'Alimentação',           emoji: '🍽️', color: '#f97316', grupo: 'gasto' },
  { key: 'supermercado',      label: 'Supermercado',           emoji: '🛒', color: '#84cc16', grupo: 'gasto' },
  { key: 'bares_pubs',        label: 'Bares & Pubs',           emoji: '🍺', color: '#fb7185', grupo: 'gasto' },
  { key: 'combustivel',       label: 'Combustível',            emoji: '⛽', color: '#fb923c', grupo: 'gasto' },
  { key: 'transporte',        label: 'Transporte & Pedágio',   emoji: '🚗', color: '#94a3b8', grupo: 'gasto' },
  { key: 'moradia',           label: 'Moradia',                emoji: '🏠', color: '#60a5fa', grupo: 'gasto' },
  { key: 'servicos',          label: 'Serviços',               emoji: '🔧', color: '#a78bfa', grupo: 'gasto' },
  { key: 'cuidados_pessoais', label: 'Cuidados Pessoais',      emoji: '💈', color: '#e879f9', grupo: 'gasto' },
  { key: 'saude',             label: 'Saúde & Farmácia',       emoji: '💊', color: '#34d399', grupo: 'gasto' },
  { key: 'academia',          label: 'Academia & Bem-estar',   emoji: '💪', color: '#4ade80', grupo: 'gasto' },
  { key: 'assinaturas',       label: 'Assinaturas',            emoji: '📱', color: '#38bdf8', grupo: 'gasto' },
  { key: 'streaming',         label: 'Streaming',              emoji: '🎬', color: '#818cf8', grupo: 'gasto' },
  { key: 'compras_online',    label: 'Compras Online',         emoji: '📦', color: '#2dd4bf', grupo: 'gasto' },
  { key: 'roupas',            label: 'Roupas & Calçados',      emoji: '👕', color: '#c084fc', grupo: 'gasto' },
  { key: 'educacao',          label: 'Educação',               emoji: '📚', color: '#67e8f9', grupo: 'gasto' },
  { key: 'viagem',            label: 'Viagem',                 emoji: '✈️', color: '#fbbf24', grupo: 'gasto' },
  { key: 'entretenimento',    label: 'Entretenimento',         emoji: '🎭', color: '#a78bfa', grupo: 'gasto' },
  { key: 'juros_multas',      label: 'Juros & Multas',         emoji: '⚠️', color: '#f43f5e', grupo: 'gasto' },
  { key: 'outros',            label: 'Outros',                 emoji: '📋', color: '#64748b', grupo: 'gasto' },
  // Receita
  { key: 'salario',           label: 'Salário',                emoji: '💰', color: '#22c55e', grupo: 'receita' },
  { key: 'hora_extra',        label: 'Hora Extra',             emoji: '⏰', color: '#86efac', grupo: 'receita' },
  { key: 'substituicao',      label: 'Substituição / Função',  emoji: '🔄', color: '#6ee7b7', grupo: 'receita' },
  { key: 'decimo_terceiro',   label: '13º Salário',            emoji: '🎁', color: '#a3e635', grupo: 'receita' },
  { key: 'ferias',            label: 'Férias',                 emoji: '🌴', color: '#fde68a', grupo: 'receita' },
  { key: 'vale_refeicao',     label: 'Vale Refeição',          emoji: '🎫', color: '#fca5a5', grupo: 'receita' },
  { key: 'pix_recebido',      label: 'PIX Recebido',           emoji: '↙️', color: '#86efac', grupo: 'receita' },
  // Desconto
  { key: 'previdencia',       label: 'Previdência (Ipergs)',   emoji: '🏛️', color: '#94a3b8', grupo: 'desconto' },
  { key: 'imposto_renda',     label: 'Imposto de Renda',       emoji: '📊', color: '#94a3b8', grupo: 'desconto' },
  { key: 'plano_saude',       label: 'Plano de Saúde (IPE)',   emoji: '🏥', color: '#94a3b8', grupo: 'desconto' },
  { key: 'outros_descontos',  label: 'Outros Descontos',       emoji: '➖', color: '#64748b', grupo: 'desconto' },
  // Neutro
  { key: 'pagamento_fatura',  label: 'Pagamento de Fatura',    emoji: '✅', color: '#475569', grupo: 'neutro' },
  { key: 'transferencia',     label: 'Transferência',          emoji: '↔️', color: '#475569', grupo: 'neutro' },
]

export const getCat = (key) => CATS.find(c => c.key === key) || CATS.find(c => c.key === 'outros')

export const fmt = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
