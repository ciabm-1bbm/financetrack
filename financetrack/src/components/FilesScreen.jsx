import { useState, useRef } from 'react'
import { FOLDERS, getCat } from '../constants.js'
import { Card, Btn, Chip, SectionTitle, Spinner } from './ui.jsx'
import { fmt } from '../constants.js'

export function FilesScreen({
  files, activeFolder, setActiveFolder,
  onUpload, onProcess, onDelete, onViewTx,
  processingId, months, transactions,
  analyses, onSelectMonth, githubEnabled,
  syncingId,
}) {
  const fileRef = useRef()
  const [dragging, setDragging] = useState(false)

  const folderFiles = files.filter(f => f.folder === activeFolder)
  const folder = FOLDERS.find(f => f.id === activeFolder)

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* Folder tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {FOLDERS.map(f => {
          const count = files.filter(x => x.folder === f.id).length
          const active = activeFolder === f.id
          return (
            <div key={f.id} onClick={() => setActiveFolder(f.id)}
              style={{
                background: active ? f.color + '15' : '#141b26',
                border: `1px solid ${active ? f.color + '60' : '#1e2d3d'}`,
                borderRadius: 12, padding: '16px', cursor: 'pointer',
                transition: 'all .2s',
              }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, margin: '0 0 3px' }}>{f.label}</p>
              <p style={{ color: '#475569', fontSize: 11, margin: '0 0 8px', fontFamily: 'monospace' }}>{f.desc}</p>
              <Chip color={f.color + '22'} text={f.color}>
                {count} arquivo{count !== 1 ? 's' : ''}
              </Chip>
            </div>
          )
        })}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onUpload(e.dataTransfer.files, activeFolder) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? folder?.color || '#3b82f6' : '#2d3d50'}`,
          borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? (folder?.color || '#3b82f6') + '11' : '#0d1520',
          transition: 'all .2s', marginBottom: 20,
        }}>
        <input ref={fileRef} type="file" multiple accept=".pdf" style={{ display: 'none' }}
          onChange={e => onUpload(e.target.files, activeFolder)} />
        <div style={{ fontSize: 32, marginBottom: 8 }}>{folder?.icon || '📂'}</div>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 4px', fontWeight: 600 }}>
          Soltar PDFs aqui ou clicar para selecionar
        </p>
        <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>
          Salvando em: <span style={{ color: folder?.color || '#3b82f6' }}>{folder?.label}</span>
          {githubEnabled && <span style={{ color: '#4ade80', marginLeft: 6 }}>· Sync GitHub ativo</span>}
        </p>
      </div>

      {/* File list */}
      <SectionTitle>{folder?.label} — {folderFiles.length} arquivo(s)</SectionTitle>

      {folderFiles.length === 0 ? (
        <p style={{ color: '#2d3d50', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
          Nenhum arquivo nesta pasta ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {folderFiles.map(file => (
            <FileRow key={file.id} file={file}
              onProcess={() => onProcess(file)}
              onDelete={() => onDelete(file.id)}
              onViewTx={() => { onSelectMonth(file.month); onViewTx() }}
              isProcessing={processingId === file.id}
              isSyncing={syncingId === file.id}
              githubEnabled={githubEnabled}
              folder={folder}
            />
          ))}
        </div>
      )}

      {/* Months overview */}
      {months.length > 0 && (
        <>
          <SectionTitle>Meses com dados</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
            {months.map(m => {
              const txList = transactions[m] || []
              const gastos = txList.filter(t => getCat(t.categoria).grupo === 'gasto')
              const total = gastos.reduce((s, t) => s + (t.valor || 0), 0)
              return (
                <Card key={m} onClick={() => { onSelectMonth(m); onViewTx() }}
                  style={{ padding: '12px 14px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12, margin: 0 }}>📅 {m}</p>
                    {analyses[m] && <Chip color="#15803d22" text="#4ade80">✓</Chip>}
                  </div>
                  <p style={{ color: '#f43f5e', fontWeight: 700, fontSize: 16, fontFamily: 'monospace', margin: '6px 0 3px' }}>
                    {fmt(total)}
                  </p>
                  <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>
                    {txList.length} transações
                  </p>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function FileRow({ file, onProcess, onDelete, onViewTx, isProcessing, isSyncing, githubEnabled, folder }) {
  const kb = Math.round((file.size || 0) / 1024)
  return (
    <div style={{
      background: '#141b26', border: '1px solid #1e2d3d',
      borderRadius: 10, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{folder?.icon || '📄'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </p>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip>{kb} KB</Chip>
          {file.month && <Chip color="#1e3a5f" text="#60a5fa">📅 {file.month}</Chip>}
          {file.docType && <Chip color="#2d1b6922" text="#a78bfa">{file.docType}</Chip>}
          {file.parsedAt
            ? <Chip color="#15803d22" text="#4ade80">✓ {file.txCount} tx · {file.parsedAt}</Chip>
            : <Chip color="#451a0322" text="#fb923c">⏳ Não processado</Chip>}
          {githubEnabled && file.githubSynced && <Chip color="#0f2d1f22" text="#6ee7b7">🐙 GitHub</Chip>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {file.parsedAt && (
          <Btn variant="ghost" small onClick={onViewTx}>Ver transações</Btn>
        )}
        <Btn variant="primary" small onClick={onProcess} disabled={isProcessing}>
          {isProcessing ? <><Spinner size={10} /> Processando...</> : file.parsedAt ? '↺ Reprocessar' : '⚡ Processar'}
        </Btn>
        {githubEnabled && (
          <Btn variant="secondary" small disabled={isSyncing || !file.parsedAt} title="Sincronizar com GitHub">
            {isSyncing ? <Spinner size={10} color="#94a3b8" /> : '🐙'}
          </Btn>
        )}
        <Btn variant="danger" small onClick={onDelete}>✕</Btn>
      </div>
    </div>
  )
}
