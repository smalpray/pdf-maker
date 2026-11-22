import { useState, type FormEvent } from 'react'
import './App.css'

type Mode = 'html' | 'url'

const starterHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; color: #17211d; padding: 48px; }
      .eyebrow { color: #628071; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
      h1 { font-size: 38px; margin: 14px 0 8px; }
      p { color: #62706a; line-height: 1.6; }
      .rule { border: 0; border-top: 1px solid #dfe6e1; margin: 28px 0; }
      .total { font-size: 22px; font-weight: bold; }
    </style>
  </head>
  <body>
    <p class="eyebrow">Your document starts here</p>
    <h1>A little more paper, a lot less work.</h1>
    <p>Paste your HTML on the left and make a print-ready PDF in seconds.</p>
    <hr class="rule">
    <p class="total">Looking good already.</p>
  </body>
</html>`

function App() {
  const [mode, setMode] = useState<Mode>('html')
  const [html, setHtml] = useState(starterHtml)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [downloaded, setDownloaded] = useState(false)

  async function createPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setDownloaded(false)

    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/pdf, application/json' },
        body: JSON.stringify(mode === 'html' ? { mode, html } : { mode, url }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        const message = result?.message ?? Object.values(result?.errors ?? {}).flat()[0]
        throw new Error(typeof message === 'string' ? message : 'Could not create the PDF. Please try again.')
      }

      const pdf = await response.blob()
      const downloadUrl = window.URL.createObjectURL(pdf)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'document.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000)
      setDownloaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Papertrail home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M8 4.75h10l6 6V27.25H8V4.75Z" />
              <path d="M18 5v6h6M12 17h8M12 21h8" />
            </svg>
          </span>
          <span>papertrail<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> Simple, print-ready PDFs</div>
        <a className="topbar-link" href="https://github.com/smalpray/pdf-maker" target="_blank" rel="noreferrer">
          Built for makers <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className="intro">
          <div className="eyebrow"><span className="eyebrow-line" /> A calmer way to create documents</div>
          <h1>Make it a <span>PDF.</span></h1>
          <p>Turn HTML or a public web page into a polished, ready-to-share document.</p>
        </section>

        <section className="workspace" aria-label="PDF maker">
          <form className="editor-panel" onSubmit={createPdf}>
            <div className="panel-heading">
              <div>
                <span className="step-label">STEP 01</span>
                <h2>Your source</h2>
              </div>
              <span className="secure-label"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3 7h10v7H3z" /></svg> Private by default</span>
            </div>

            <div className="mode-tabs" role="tablist" aria-label="Source type">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'html'}
                className={mode === 'html' ? 'mode-tab active' : 'mode-tab'}
                onClick={() => { setMode('html'); setError(''); setDownloaded(false) }}
              >
                <span className="tab-icon code-icon">&lt;/&gt;</span> Paste HTML
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'url'}
                className={mode === 'url' ? 'mode-tab active' : 'mode-tab'}
                onClick={() => { setMode('url'); setError(''); setDownloaded(false) }}
              >
                <span className="tab-icon link-icon">↗</span> From a URL
              </button>
            </div>

            {mode === 'html' ? (
              <label className="field-label" htmlFor="html-source">HTML CONTENT
                <textarea
                  id="html-source"
                  className="code-editor"
                  value={html}
                  onChange={(event) => { setHtml(event.target.value); setDownloaded(false) }}
                  spellCheck={false}
                  required
                  maxLength={500000}
                />
              </label>
            ) : (
              <label className="field-label" htmlFor="page-url">PAGE URL
                <input
                  id="page-url"
                  className="url-input"
                  type="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(event) => { setUrl(event.target.value); setDownloaded(false) }}
                  required
                />
                <span className="field-hint">Use a public HTTP or HTTPS page. Private and local addresses aren’t allowed.</span>
              </label>
            )}

            <div className="form-footer">
              <span className="format-note"><span className="a4-icon">A4</span> A4 · Portrait · Backgrounds on</span>
              <button className="create-button" type="submit" disabled={busy}>
                {busy ? 'Creating PDF…' : 'Create PDF'}
                {!busy && <span aria-hidden="true">→</span>}
              </button>
            </div>
            {error && <p className="form-message error-message" role="alert">{error}</p>}
            {downloaded && <p className="form-message success-message" role="status">Your PDF is ready and downloading.</p>}
          </form>

          <section className="preview-panel" aria-label="Document preview">
            <div className="panel-heading preview-heading">
              <div>
                <span className="step-label">STEP 02</span>
                <h2>A little preview</h2>
              </div>
              <span className="live-badge"><span /> LIVE</span>
            </div>
            <div className="preview-stage">
              {mode === 'html' ? (
                <iframe title="HTML document preview" srcDoc={html} sandbox="" />
              ) : (
                <div className="url-preview">
                  <div className="browser-dots"><i /><i /><i /></div>
                  <div className="preview-document">
                    <span className="preview-page-icon"><svg viewBox="0 0 32 32" fill="none"><path d="M8 4.75h10l6 6V27.25H8V4.75Z" /><path d="M18 5v6h6M12 17h8M12 21h5" /></svg></span>
                    <strong>{url ? 'Page ready to convert' : 'Your page, on paper'}</strong>
                    <span>{url || 'Paste a public web address to get started'}</span>
                    <div className="skeleton-line wide" /><div className="skeleton-line" /><div className="skeleton-line short" />
                  </div>
                </div>
              )}
            </div>
            <div className="preview-caption"><span className="caption-dot" /> Preview updates as you edit</div>
          </section>
        </section>

        <section className="benefits" aria-label="Features">
          <div className="benefit-item"><span className="benefit-icon">✳</span><div><strong>Made for the page</strong><span>Clean A4 layout, every time</span></div></div>
          <div className="benefit-item"><span className="benefit-icon">↗</span><div><strong>One-click download</strong><span>No account, no fuss</span></div></div>
          <div className="benefit-item"><span className="benefit-icon">⌁</span><div><strong>Yours to keep</strong><span>Your content isn’t stored</span></div></div>
        </section>
      </main>
      <footer className="site-footer"><span>papertrail<span className="brand-dot">.</span></span><span>Small tool. Nicely done.</span></footer>
    </div>
  )
}

export default App
