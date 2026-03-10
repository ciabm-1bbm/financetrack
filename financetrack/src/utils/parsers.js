// ─── PDF Text Extraction ─────────────────────────────────────────────────────

export async function extractPDFText(arrayBuffer) {
  // Load PDF.js dynamically
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve()
      }
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(x => x.str).join(' ') + '\n'
  }
  return fullText
}

// ─── Document Type Detection ─────────────────────────────────────────────────

export function detectDocumentType(text, filename = '') {
  const t = text.toUpperCase()
  const f = filename.toUpperCase()

  if (t.includes('SECRETARIA DA FAZENDA') || t.includes('TESOURO DO ESTADO') || t.includes('DEMONSTRATIVO DE PAGAMENTO')) {
    if (t.includes('TIPO FOLHA:  FÉRIAS') || t.includes('TIPO FOLHA: FÉRIAS') || f.includes('_3_')) return 'contracheque_ferias'
    if (t.includes('AUXÍLIO REFEIÇÃO') || t.includes('AUXILIO REFEICAO') || f.includes('_8_')) return 'contracheque_vr'
    return 'contracheque_mensal'
  }

  if (t.includes('SICREDI') || t.includes('COOPERATIVA DE CRÉDITO') || f.includes('SICREDI')) {
    return 'sicredi'
  }

  if (t.includes('CARTÃO XP') || t.includes('BANCO XP') || t.includes('VISA INFINITE') || f.includes('XP')) {
    return 'xp_cartao'
  }

  return 'unknown'
}

// ─── Contracheque Mensal Parser ──────────────────────────────────────────────

export function parseContracheque(text) {
  // Extract Mês/Ano
  const mesMatch = text.match(/Mês\/Ano:\s*(\d{2}\/\d{4})/)
  const mes = mesMatch ? mesMatch[1] : null

  // Extract type
  const tipoMatch = text.match(/Tipo Folha:\s*([^\n\r]+)/i)
  const tipo = tipoMatch ? tipoMatch[1].trim() : 'MENSAL'

  const result = {
    mes_referencia: mes,
    tipo_folha: tipo,
    fonte: 'contracheque',
    transacoes: [],
  }

  // ── Vantagens ──
  const vantagens = []
  const descontos = []

  // Parse values from the text - look for lines with monetary values
  // Pattern: Description followed by number (value)
  // For contracheque RS format

  // Subsídio (salário base)
  const subsidioMatch = text.match(/Subsídios?\s+([\d.,]+)/i)
  if (subsidioMatch) {
    vantagens.push({ rubrica: 'Subsídios', valor: parseBR(subsidioMatch[1]), categoria: 'salario' })
  }

  // Hora Extra
  const hexMatch = text.match(/Hora Extra\s+HEX:\s*[\d:]+\s+([\d.,]+)/i)
  if (hexMatch) {
    vantagens.push({ rubrica: 'Hora Extra', valor: parseBR(hexMatch[1]), categoria: 'hora_extra' })
  }

  // Substituição Posto BM
  const substMatch = text.match(/Substituição Posto BM\s+([\d.,]+)/i)
  if (substMatch) {
    vantagens.push({ rubrica: 'Substituição Posto BM', valor: parseBR(substMatch[1]), categoria: 'substituicao' })
  }

  // 13o retroativos
  const dec13SubstMatch = text.match(/13o-Substituição Posto BM\s+([\d.,]+)/i)
  if (dec13SubstMatch) {
    vantagens.push({ rubrica: '13º-Substituição Posto BM', valor: parseBR(dec13SubstMatch[1]), categoria: 'decimo_terceiro' })
  }
  const dec13HexMatch = text.match(/13o-13º Hora Extra\s+([\d.,]+)/i)
  if (dec13HexMatch) {
    vantagens.push({ rubrica: '13º-Hora Extra', valor: parseBR(dec13HexMatch[1]), categoria: 'decimo_terceiro' })
  }

  // Antecipação 1/3 Férias
  const feriasMatch = text.match(/Antecipação\s+1\/3\s+Férias\s+([\d.,]+)/i) ||
                      text.match(/FER-Antecipação\s+1\/3\s+Férias\s+([\d.,]+)/i)
  if (feriasMatch) {
    vantagens.push({ rubrica: 'Antecipação 1/3 Férias', valor: parseBR(feriasMatch[1]), categoria: 'ferias' })
  }

  // Auxílio Refeição
  const vrMatch = text.match(/Auxílio Refeição\s+[\d\s\/]+\s+([\d.,]+)/i)
  if (vrMatch) {
    vantagens.push({ rubrica: 'Auxílio Refeição / Vale Refeição', valor: parseBR(vrMatch[1]), categoria: 'vale_refeicao' })
  }

  // ── Descontos ──
  const ipergMatch = text.match(/Ipergs\s*-\s*Previdência\s+[\d.]+\s+([\d.,]+)/i)
  if (ipergMatch) {
    descontos.push({ rubrica: 'Ipergs - Previdência', valor: parseBR(ipergMatch[1]), categoria: 'previdencia' })
  }

  // 13o Ipergs
  const ipergs13Match = text.match(/13o-Ipergs\s*-\s*Previdência\s+([\d.,]+)/i)
  if (ipergs13Match) {
    descontos.push({ rubrica: '13º-Ipergs Previdência', valor: parseBR(ipergs13Match[1]), categoria: 'previdencia' })
  }

  const irMatch = text.match(/Imposto sobre Renda\s+\d+\s+Dep\.\s+([\d.,]+)/i) ||
                  text.match(/Imposto sobre Renda\s+([\d.,]+)/i)
  if (irMatch) {
    descontos.push({ rubrica: 'Imposto de Renda', valor: parseBR(irMatch[1]), categoria: 'imposto_renda' })
  }

  // IR RRA
  const irrraMatch = text.match(/Imposto sobre Renda RRA\s+[\d.]+\s+mes\(?e[s]?\)?\s+([\d.,]+)/i)
  if (irrraMatch) {
    descontos.push({ rubrica: 'IR RRA', valor: parseBR(irrraMatch[1]), categoria: 'imposto_renda' })
  }

  const ipeMatch = text.match(/IPE Saúde\s*-\s*FAS\s+CT\s+([\d.,]+)/i) ||
                   text.match(/IPE Saúde\s*-\s*FAS\s+([\d.,]+)/i)
  if (ipeMatch) {
    descontos.push({ rubrica: 'IPE Saúde - FAS', valor: parseBR(ipeMatch[1]), categoria: 'plano_saude' })
  }

  // ── Resumo ──
  const liquidoMatch = text.match(/LÍQUIDO A RECEBER\s+([\d.,]+)/i)
  const totalVantagensMatch = text.match(/TOTAL VANTAGENS\s+([\d.,]+)/i)
  const totalDescontosMatch = text.match(/TOTAL DESCONTOS\s+([\d.,]+)/i)

  const liquido = liquidoMatch ? parseBR(liquidoMatch[1]) : 0
  const totalVantagens = totalVantagensMatch ? parseBR(totalVantagensMatch[1]) : 0
  const totalDescontos = totalDescontosMatch ? parseBR(totalDescontosMatch[1]) : 0

  // Build transactions
  const txDate = mes ? `01/${mes.split('/')[0]}` : '01/01'

  vantagens.forEach(v => {
    result.transacoes.push({
      id: crypto.randomUUID(),
      data: txDate,
      descricao: v.rubrica,
      valor: v.valor,
      categoria: v.categoria,
      tipo: 'credito',
      fonte: 'contracheque',
    })
  })

  descontos.forEach(d => {
    result.transacoes.push({
      id: crypto.randomUUID(),
      data: txDate,
      descricao: d.rubrica,
      valor: d.valor,
      categoria: d.categoria,
      tipo: 'debito',
      fonte: 'contracheque',
    })
  })

  result.resumo = {
    total_vantagens: totalVantagens,
    total_descontos: totalDescontos,
    liquido_receber: liquido,
    tipo_folha: tipo,
  }

  return result
}

// ─── XP Cartão Parser ────────────────────────────────────────────────────────

export function parseXPCartao(text) {
  const mesMatch = text.match(/vencimento em\s+(\w+)/) ||
                   text.match(/Vencimento\s+\d{2}\/(\d{2}\/\d{4})/)
  
  // Get month from "Fatura fechada em DD/MM/YYYY"
  const fechadoMatch = text.match(/Fatura fechada em\s+\d{2}\/(\d{2}\/\d{4})/i)
  
  let mes = null
  if (fechadoMatch) {
    const [dd, mm, yyyy] = fechadoMatch[1].split('/')
    // The bill month is the one with the due date, not the closing date
    // Closing in Feb → Due in March → transactions are January/February
    mes = `${mm}/${yyyy}`
  }

  const result = {
    mes_referencia: mes,
    fonte: 'xp_cartao',
    transacoes: [],
  }

  // Parse transaction lines
  // Pattern: DD/MM/YY DESCRIPTION AMOUNT
  const txRegex = /(\d{2}\/\d{2}\/?\d{0,2})\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÜ][^\d\n]{3,60?})\s+([\d.,]+)\s+0,00/g
  let match
  while ((match = txRegex.exec(text)) !== null) {
    const [, data, desc, valorStr] = match
    const valor = parseBR(valorStr)
    if (valor <= 0 || valor > 50000) continue

    const descClean = desc.trim().replace(/\s+/g, ' ')

    // Skip payments and credits
    if (descClean.includes('Pagamento') || descClean.includes('pagamento')) continue

    result.transacoes.push({
      id: crypto.randomUUID(),
      data: data.slice(0, 5),
      descricao: descClean,
      valor,
      categoria: classifyXP(descClean),
      tipo: 'debito',
      fonte: 'xp_cartao',
    })
  }

  // Also parse juros/encargos (no "0,00" at end)
  const jurosRegex = /(Juros de Mora|Encargos de Refinanciamento|IOF Rotativo|Multa Contratual)\s+([\d.,]+)/g
  while ((match = jurosRegex.exec(text)) !== null) {
    result.transacoes.push({
      id: crypto.randomUUID(),
      data: '19/02',
      descricao: match[1],
      valor: parseBR(match[2]),
      categoria: 'juros_multas',
      tipo: 'juros',
      fonte: 'xp_cartao',
    })
  }

  return result
}

function classifyXP(desc) {
  const d = desc.toUpperCase()
  if (/ZAFFARI|RISSUL|CARREFOUR|ATACAD|MERCADO|SUPERMERC/.test(d)) return 'supermercado'
  if (/MCDONALD|SUBWAY|BURGER|PIZZA|SUSHI|DELIVERY|RESTAURANTE|LANCHE|PADARIA|CAFE|BAR DO|QUATI|PANDA|HELADE|YOGOLAT|BRASILEIRINHO|AÇAÍ|ACAI/.test(d)) return 'alimentacao'
  if (/VITRAUX|BUTECO|GOLES BAR|BOURBON|FENIX BAR|BAR OCI|BANCA DO|NICUS BAR|MEP\*TABU|DUPORTO|BOTEKO|BAR OCID/.test(d)) return 'bares_pubs'
  if (/POSTO|COMBUSTIV|GASOLINA|DUEVILLE|PODIUM|VIA MAIS/.test(d)) return 'combustivel'
  if (/AUTOPISTA|VIACOSTEIRA|CONCESSIONARIA|VIA SUL|PEDÁGIO|PEDAGIO|UBER|MULTIPLAN|ESTAC|PARKPLEX/.test(d)) return 'transporte'
  if (/HAIR PUB|BARBEARIA|BARBEAR|ESTETICA|ESTÉTICA|MANICUR|CABELEI/.test(d)) return 'cuidados_pessoais'
  if (/GRINDR|NETFLIX|SPOTIFY|AMAZON PRIME|YOUTUBE|GOOGLE PLAY|SMILES|TIDAL|DEEZER|MYHERIT/.test(d)) return 'assinaturas'
  if (/GYMPASS|WELLHUB|ACADEMIA|GYM/.test(d)) return 'academia'
  if (/MERCADOLIVRE|MERCADO LIVRE|AMAZON|TIKTOK SHOP|SHOPEE/.test(d)) return 'compras_online'
  if (/AIRBNB|POUSADA|HOTEL|RODOSNACK|SUPERMERCADO MAGI|CANTINA SANTA/.test(d)) return 'viagem'
  if (/TEATRO|CINEMA|SYMPLA|INGRESSO|TRIRS|MEAPLE|INGRESSOS/.test(d)) return 'entretenimento'
  if (/FARMACIA|FARMÁCIA|DROGARIA|DROGA/.test(d)) return 'saude'
  if (/JUROS|MULTA|ENCARGO|IOF/.test(d)) return 'juros_multas'
  if (/GOOGLE|DL \*GOOGLE/.test(d)) return 'assinaturas'
  return 'outros'
}

// ─── Sicredi Parser ──────────────────────────────────────────────────────────
// Format: Sicredi conta corrente extrato
// Transactions: DD/MM/YYYY DESCRIPTION +/- R$ VALUE (single or multiline)

function cleanSicrediDesc(d) {
  d = d.replace(/PAGAMENTO PIX\s*-\s*[\d./]+\s*/g, '')
  d = d.replace(/TED SALARIO\s*-\s*[\d./]+\s*/g, 'SALÁRIO - ')
  d = d.replace(/DEVOLUCAO PIX\s*-\s*[\d./]+\s*/g, 'DEVOLUÇÃO PIX - ')
  d = d.replace(/PAGAMENTO DE FATURA CARTAO CREDITO VIA DEBITO[^R]*/g, 'Pgto Fatura Cartão ')
  d = d.replace(/Sicredi Tradi.*?$/g, '')
  d = d.replace(/RS\s*-\s*032/g, '')
  // Remove leftover CPF/CNPJ numbers at start
  d = d.replace(/^[\d./\-]+\s+/, '')
  return d.replace(/\s+/g, ' ').trim() || 'PIX'
}

// Returns array of {mes, txList}
function parseSicrediAllMonths(text) {
  const SKIP_PREFIX = [
    'Saldo do dia', 'Saldo Anterior', 'Movimentações', 'Data Descrição',
    'Lançamentos futuros', 'Não está previsto', 'Cheque especial em',
    'Limite contratado', 'Limite utilizado', 'Limite disponível',
    'Taxa de cheque', 'Fim desse extrato', 'Central de atendimento',
    'ola@sicredi', 'Momento de emissão', 'Extrato de conta corrente',
    'Titular - CPF', 'Saldo em conta', 'Lançamento a conferir',
    'Cooperativa:', 'SAC Ouvidoria', '0800', 'De 0',
  ]
  const shouldSkip = (line) => {
    if (!line || line.length < 2) return true
    for (const p of SKIP_PREFIX) if (line.startsWith(p)) return true
    if (/^R\$\s*[\d.,]+$/.test(line)) return true
    if (/^[-+]?R\$\s*[\d.,]+$/.test(line)) return true
    return false
  }

  const pFull     = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([+\-])\s*R\$\s*([\d.,]+)$/
  const pDateVal  = /^(\d{2}\/\d{2}\/\d{4})\s+[-–]\s*R\$\s*([\d.,]+)$/
  const pDateOnly = /^\d{2}\/\d{2}\/\d{4}$/

  const lines = text.split('\n').map(l => l.trim())
  const txAll = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (shouldSkip(line)) { i++; continue }

    // A) Full single line:  DD/MM/YYYY DESCRIPTION +/- R$ VALUE
    let m = line.match(pFull)
    if (m) {
      const [, date, desc, sign, val] = m
      if (!shouldSkip(desc) && !desc.startsWith('Saldo')) {
        txAll.push({
          data: date.slice(0, 5), year: date.slice(6),
          descricao: cleanSicrediDesc(desc),
          valor: parseBR(val),
          tipo: sign === '+' ? 'credito' : 'debito',
        })
      }
      i++; continue
    }

    // B) Description-first multiline:
    //   Line i:   DESCRIPTION_START (no leading date)
    //   Line i+1: DD/MM/YYYY - R$ VALUE
    if (!/^\d{2}\/\d{2}/.test(line) && i + 1 < lines.length) {
      const mNext = lines[i + 1].match(pDateVal)
      if (mNext) {
        const [, dateStr, val] = mNext
        const descParts = [line]
        let j = i + 2
        while (j < lines.length) {
          const nxt = lines[j]
          if (!nxt || /^\d{2}\/\d{2}\/\d{4}/.test(nxt) || shouldSkip(nxt)) break
          descParts.push(nxt)
          j++
        }
        const fullDesc = descParts.join(' ')
        txAll.push({
          data: dateStr.slice(0, 5), year: dateStr.slice(6),
          descricao: cleanSicrediDesc(fullDesc),
          valor: parseBR(val),
          tipo: 'debito',
        })
        i = j; continue
      }
    }

    // C) Date+value first, description on next line:
    //   Line i:   DD/MM/YYYY - R$ VALUE
    //   Line i+1: DESCRIPTION
    m = line.match(pDateVal)
    if (m) {
      const [, dateStr, val] = m
      const desc = (i + 1 < lines.length && !shouldSkip(lines[i + 1])) ? lines[i + 1] : ''
      txAll.push({
        data: dateStr.slice(0, 5), year: dateStr.slice(6),
        descricao: cleanSicrediDesc(desc),
        valor: parseBR(val),
        tipo: 'debito',
      })
      i += desc ? 2 : 1; continue
    }

    i++
  }

  return txAll
}

export function parseSicredi(text) {
  // Detect period from header: "De DD/MM/YYYY a DD/MM/YYYY"
  const periodoMatch = text.match(/De\s+(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/)

  // Primary month = last month in range (most recent)
  let mesPrimario = null
  if (periodoMatch) {
    mesPrimario = `${periodoMatch[5]}/${periodoMatch[6]}`
  } else {
    const mm = text.match(/(\d{2})\/(\d{4})/)
    if (mm) mesPrimario = `${mm[1]}/${mm[2]}`
  }

  const rawTx = parseSicrediAllMonths(text)

  const result = {
    mes_referencia: mesPrimario,
    fonte: 'sicredi',
    transacoes: rawTx.map(t => ({
      id: crypto.randomUUID(),
      data: t.data,
      descricao: t.descricao,
      valor: t.valor,
      categoria: t.tipo === 'credito' ? classifySicrediCred(t.descricao) : classifySicrediDeb(t.descricao),
      tipo: t.tipo,
      fonte: 'sicredi',
      // Tag month for multi-month extratos
      mesReferencia: t.year ? `${t.data.slice(3, 5)}/${t.year}` : mesPrimario,
    })),
    // Also expose per-month splits so App can route to correct month
    meses: periodoMatch
      ? [`${periodoMatch[2]}/${periodoMatch[3]}`, `${periodoMatch[5]}/${periodoMatch[6]}`].filter((v, i, a) => a.indexOf(v) === i)
      : [mesPrimario],
  }

  return result
}

function classifySicrediCred(desc) {
  const d = desc.toUpperCase()
  if (/SALÁRIO|SALARIO|TED SALARIO/.test(d)) return 'salario'
  if (/DEVOLUÇÃO|DEVOLUCAO/.test(d)) return 'pix_recebido'
  if (/VALE REFEIÇÃO|AUXILIO REFEICAO|VALE ALIMENTACAO/.test(d)) return 'vale_refeicao'
  return 'pix_recebido'
}

function classifySicrediDeb(desc) {
  const d = desc.toUpperCase()
  // Self-transfers (pay credit card bill or own savings)
  if (/GUSTAVO DA ROSA|GUSTAVO MEDEIROS/.test(d)) return 'pagamento_fatura'
  if (/FATURA CARTÃO|FATURA CARTAO|PGTO FATURA/.test(d)) return 'pagamento_fatura'
  // Fuel
  if (/POSTO|COMBUSTIVEL|COMBUSTIVEIS|ELDORADO LTDA|MEGA ELDORADO|BUFFON|GHS COMERCIO|JP SANTA LUCIA|SIM REDE DE POSTOS/.test(d)) return 'combustivel'
  // Supermarket / food
  if (/MERCADO MASTER|ZAFFARI|RISSUL|CARREFOUR|ATACAD|SUPERMERC/.test(d)) return 'supermercado'
  if (/LANCHERIA|RESTAURANTE|PIZZA|PADARIA|CAFE & CO|DOOR CAFE|DOOR COFF/.test(d)) return 'alimentacao'
  // Subscriptions / services
  if (/MILETO|TELEVISAO POR ASSINATURA|NET |CLARO|OI |VIVO|EMBRATEL/.test(d)) return 'assinaturas'
  if (/ZONA AZUL|PARKPLEX|ESTACION/.test(d)) return 'transporte'
  // Health / wellness
  if (/HOLISTICA|HOLISTIC|FARMACIA|FARMACIAS|SAO JOAO FARM|DROGARIA|CLINICA|HOSPITAL/.test(d)) return 'saude'
  // Entertainment
  if (/CINESYSTEM|CINEMA|TEATRO|SYMPLA|INGRESSO/.test(d)) return 'entretenimento'
  // Bank fees
  if (/CHEQUE ESPECIAL/.test(d)) return 'juros_multas'
  // Transfers to known contacts (recurring - categorize as others for review)
  if (/SERGEI IGNACIO|PAULO JOSE BARCELOS|ANDERSON PEREIRA/.test(d)) return 'outros'
  // Generic PIX to people
  if (d.length > 3) return 'outros'
  return 'outros'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseBR(str) {
  if (!str) return 0
  // Brazilian format: 1.234,56 → 1234.56
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}
