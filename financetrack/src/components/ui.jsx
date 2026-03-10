import { useState, useRef, useEffect } from 'react'
import { CATS, getCat } from '../constants.js'

const S = {
  card: {
    background: '#141b26', border: '1px solid #1e2d3d',
    borderRadius: 12, padding: '16px 18px',
  },
}

export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick}
      style={{ ...S.card, cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </div>
  )
}

export function Chip({ children, color = '#1e3a5f', text = '#60a5fa', style = {} }) {
  return (
    <span style={{
      background: color, color: text, fontSize: 10,
      fontFamily: 'monospace', padding: '2px 7px',
      borderRadius: 4, whiteSpace: 'nowrap', ...style,
    }}>
      {children}
    </span>
  )
}

export function Btn({ children, onClick, variant = 'primary', disabled, small, style = {} }) {
  const vars = {
    primary:   { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: '#fff', border: 'none' },
    secondary: { background: '#1e2d3d', color: '#94a3b8', border: '1px solid #2d4060' },
    danger:    { background: '#1a0d12', color: '#fca5a5', border: '1px solid #7f1d1d' },
    success:   { background: 'linear-gradient(135deg,#15803d,#22c55e)', color: '#fff', border: 'none' },
    ghost:     { background: 'transparent', color: '#64748b', border: '1px solid #1e2d3d' },
    warning:   { background: '#451a03', color: '#fdba74', border: '1px solid #92400e' },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        ...vars[variant], padding: small ? '5px 11px' : '9px 18px',
        borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: small ? 11 : 13, fontWeight: 600,
        opacity: disabled ? 0.5 : 1, fontFamily: 'monospace',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        ...style,
      }}>
      {children}
    </button>
  )
}

export function Spinner({ size = 14, color = '#fff' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${color}44`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin .8s linear infinite',
      flexShrink: 0,
    }} />
  )
}

export function SectionTitle({ children }) {
  return (
    <p style={{
      color: '#64748b', fontSize: 11, textTransform: 'uppercase',
      letterSpacing: '0.15em', fontFamily: 'monospace', margin: '0 0 12px',
    }}>
      {children}
    </p>
  )
}

export function Notification({ msg, type = 'success' }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      background: type === 'error' ? '#1a0d12' : '#0d1f12',
      border: `1px solid ${type === 'error' ? '#7f1d1d' : '#166534'}`,
      color: type === 'error' ? '#fca5a5' : '#86efac',
      borderRadius: 10, padding: '12px 18px', fontSize: 13,
      fontFamily: 'monospace', animation: 'slideIn .3s ease',
      maxWidth: 380, boxShadow: '0 4px 20px #00000080',
    }}>
      {msg}
    </div>
  )
}

// ─── Category Dropdown ───────────────────────────────────────────────────────
export function CatSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const c = getCat(value)

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const grupos = [
    { label: '💸 Gastos',    items: CATS.filter(x => x.grupo === 'gasto') },
    { label: '💚 Receitas',  items: CATS.filter(x => x.grupo === 'receita') },
    { label: '🏛️ Descontos', items: CATS.filter(x => x.grupo === 'desconto') },
    { label: '⚪ Neutro',    items: CATS.filter(x => x.grupo === 'neutro') },
  ]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={{
          background: (c.color || '#64748b') + '22',
          border: `1px solid ${c.color || '#64748b'}44`,
          color: c.color || '#94a3b8',
          padding: '3px 7px 3px 5px', borderRadius: 6, cursor: 'pointer',
          fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
        }}>
        <span>{c.emoji}</span>
        <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 999,
          background: '#1e2530', border: '1px solid #2d3748',
          borderRadius: 10, padding: 6, width: 220, maxHeight: 340,
          overflowY: 'auto', boxShadow: '0 8px 32px #00000090',
        }}>
          {grupos.map(g => (
            <div key={g.label}>
              <p style={{ color: '#475569', fontSize: 10, margin: '6px 6px 3px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                {g.label}
              </p>
              {g.items.map(item => (
                <div key={item.key}
                  onClick={() => { onChange(item.key); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                    background: item.key === value ? item.color + '22' : 'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = item.color + '22'}
                  onMouseLeave={e => e.currentTarget.style.background = item.key === value ? item.color + '22' : 'transparent'}>
                  <span style={{ fontSize: 14 }}>{item.emoji}</span>
                  <span style={{ color: item.key === value ? item.color : '#94a3b8', fontSize: 12 }}>{item.label}</span>
                  {item.key === value && <span style={{ marginLeft: 'auto', color: item.color, fontSize: 12 }}>✓</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
