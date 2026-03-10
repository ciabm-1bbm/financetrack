# 💰 FinanceTrack — Gustavo

Dashboard financeiro pessoal com análise por IA.
Processa contracheques do Estado do RS, extratos Sicredi e faturas do Cartão XP.

---

## 🚀 Como colocar no GitHub Pages (passo a passo)

### 1. Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome sugerido: `financetrack` (público ou privado)
3. **Não** inicialize com README
4. Clique em **Create repository**

### 2. Fazer o upload dos arquivos

No terminal, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "FinanceTrack v2 - initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/financetrack.git
git push -u origin main
```

### 3. Ativar GitHub Pages

1. No repositório, vá em **Settings → Pages**
2. Em **Source**, selecione: `GitHub Actions`
3. O deploy será automático a cada push na branch `main`
4. Aguarde ~2 minutos e acesse: `https://SEU_USUARIO.github.io/financetrack/`

### 4. Criar repositório para os dados (PDFs)

Crie um segundo repositório para guardar seus PDFs e JSONs:

1. Acesse [github.com/new](https://github.com/new)
2. Nome: `financetrack-data` (**privado recomendado**)
3. Inicialize com README
4. Clique em **Create repository**

Estrutura que será criada automaticamente:
```
financetrack-data/
└── data/
    ├── contracheques/
    │   ├── 2026-01/
    │   │   ├── CCheque_mensal_202601.pdf
    │   │   └── CCheque_vr_202601.pdf
    │   └── 2026-02/
    │       └── ...
    ├── sicredi/
    │   └── 2026-01/
    │       └── extrato_202601.pdf
    ├── xp_cartao/
    │   └── 2026-01/
    │       └── fatura_202601.pdf
    └── parsed/
        └── 2026-01/
            ├── transactions.json
            └── analysis.json
```

### 5. Criar Personal Access Token (PAT) do GitHub

1. Acesse: [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Note: `FinanceTrack`
3. Expiration: `No expiration` (ou 1 ano)
4. Scopes: marque `repo` (acesso completo a repositórios)
5. Clique em **Generate token**
6. **Copie o token** (começa com `ghp_`)

### 6. Configurar o app

1. Acesse seu site em `https://SEU_USUARIO.github.io/financetrack/`
2. Clique em **⚙️** no canto superior direito
3. Preencha:
   - **Chave API Claude**: sua chave em [console.anthropic.com](https://console.anthropic.com)
   - **GitHub Token**: o PAT criado acima
   - **Usuário GitHub**: seu username
   - **Repositório**: `financetrack-data`
4. Clique em **🔗 Testar conexão**
5. Clique em **💾 Salvar**

---

## 📂 Como usar

### Subir arquivos
1. Selecione a pasta correta (**Contracheques** / **Sicredi** / **Cartão XP**)
2. Arraste os PDFs ou clique na área de upload
3. Os arquivos são salvos **localmente (IndexedDB)** + **GitHub** automaticamente

### Processar
1. Clique em **⚡ Processar** em cada arquivo
2. O sistema extrai automaticamente todas as rubricas/transações
3. Cada item já vem com categoria pré-selecionada

### Corrigir categorias
- Ao lado de cada transação há um **botão dropdown** com a categoria
- Clique nele para trocar: ex. "Hair Pub" de *Cuidados Pessoais* → *Bares & Pubs*

### Analisar
1. Selecione o mês no menu superior
2. Clique em **✨ Analisar com IA**
3. O Claude gera relatório completo com alertas e dicas

---

## 🔑 Segurança

- A chave API e o token GitHub ficam **somente no seu navegador** (IndexedDB local)
- Nunca são enviados para servidores externos além da API do Claude e do GitHub
- O repositório de dados pode ser **privado**

---

## 📋 Tipos de documento reconhecidos

| Arquivo | Detectado por | Subfolder |
|---|---|---|
| Contracheque MENSAL | `Tipo Folha: MENSAL` | `contracheques/YYYY-MM/` |
| Contracheque VALE REFEIÇÃO | `Tipo Folha: Auxílio Refeição` | `contracheques/YYYY-MM/` |
| Contracheque FÉRIAS | `Tipo Folha: FÉRIAS` | `contracheques/YYYY-MM/` |
| Extrato Sicredi | `SICREDI` ou `COOPERATIVA` | `sicredi/YYYY-MM/` |
| Fatura XP | `BANCO XP` ou `VISA INFINITE` | `xp_cartao/YYYY-MM/` |
