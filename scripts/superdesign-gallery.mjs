/**
 * Sinh lại superdesign/gallery.html từ superdesign/metadata.json.
 *
 *   npm run design:gallery
 *
 * Gallery là file sinh ra — đừng sửa tay, sửa metadata.json rồi chạy lại script.
 * Script fail nếu metadata và thư mục design_iterations lệch nhau, để mockup mới
 * không bao giờ bị quên khai báo.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'superdesign')
const iterationsDir = join(dir, 'design_iterations')

const STATUS = {
  approved: { badge: '✅', label: 'Đã chốt' },
  candidate: { badge: '🆕', label: 'Chờ duyệt' },
  draft: { badge: '✏️', label: 'Nháp' },
  rejected: { badge: '🗄️', label: 'Không chọn' },
}
const ORDER = ['candidate', 'draft', 'approved', 'rejected']

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const designs = JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf8'))
if (!Array.isArray(designs)) {
  console.error('metadata.json phải là một mảng các thiết kế.')
  process.exit(1)
}

// Mockup trên đĩa và metadata phải khớp nhau (file bắt đầu bằng "_" là template, bỏ qua).
const onDisk = readdirSync(iterationsDir).filter((f) => f.endsWith('.html') && !f.startsWith('_'))
const declared = new Set(designs.map((d) => d.file))
const missingOnDisk = [...declared].filter((f) => !onDisk.includes(f))
const undeclared = onDisk.filter((f) => !declared.has(f))

if (missingOnDisk.length || undeclared.length) {
  if (undeclared.length)
    console.error(`Mockup chưa khai báo trong metadata.json: ${undeclared.join(', ')}`)
  if (missingOnDisk.length)
    console.error(`metadata.json trỏ tới file không tồn tại: ${missingOnDisk.join(', ')}`)
  process.exit(1)
}

const sorted = [...designs].sort((a, b) => {
  const byStatus = ORDER.indexOf(a.status ?? 'draft') - ORDER.indexOf(b.status ?? 'draft')
  if (byStatus !== 0) return byStatus
  return String(b.date ?? '').localeCompare(String(a.date ?? ''))
})

const card = (d) => {
  const status = STATUS[d.status] ?? STATUS.draft
  const badge = d.badge ?? status.badge
  const wide = d.wide || d.viewport === 'desktop'
  const src = `./design_iterations/${d.file}`
  return `      <div class="design-card" data-file="${esc(d.file)}"${wide ? ' style="grid-column: 1 / -1;"' : ''}>
        <div class="design-header">
          <div class="design-title">
            <h3>${esc(badge)} ${esc(d.title ?? d.file)}</h3>
            <span class="design-type">${esc(status.label)}</span>
          </div>
          <div class="design-meta">
            <span class="design-size">${esc(d.note ?? '')}</span>
            <span class="design-date">${esc([d.screen, d.viewport, d.date].filter(Boolean).join(' · '))}</span>
          </div>
        </div>
        <div class="design-preview" style="height: 560px;">
          <iframe src="${esc(src)}" loading="lazy"></iframe>
        </div>
        <div class="design-actions">
          <button onclick="window.open('${esc(src)}','_blank')" class="btn-primary">Xem full</button>
        </div>
      </div>`
}

const counts = ORDER.map((s) => {
  const n = designs.filter((d) => (d.status ?? 'draft') === s).length
  return n ? `${n} ${STATUS[s].label.toLowerCase()}` : null
}).filter(Boolean)

const html = `<!DOCTYPE html>
<!-- FILE SINH TỰ ĐỘNG bởi scripts/superdesign-gallery.mjs — sửa metadata.json rồi chạy \`npm run design:gallery\`. -->
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Superdesign Gallery — Tính tiền cầu lông</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-card: #ffffff;
            --text-primary: #1a202c;
            --text-secondary: #718096;
            --border-color: #e2e8f0;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-hover: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
        }

        [data-theme="dark"] {
            --bg-primary: #1a202c;
            --bg-secondary: #2d3748;
            --bg-card: #2d3748;
            --text-primary: #f7fafc;
            --text-secondary: #a0aec0;
            --border-color: #4a5568;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            --shadow-hover: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        }

        body {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            padding: 20px;
            transition: background 0.3s ease, color 0.3s ease;
        }

        .header {
            margin-bottom: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .header-content h1 {
            font-size: 2.5rem;
            color: var(--text-primary);
            margin-bottom: 8px;
            font-weight: 600;
            letter-spacing: -0.02em;
        }

        .header-content p {
            color: var(--text-secondary);
            font-size: 1rem;
            font-weight: 400;
        }

        .header-controls { display: flex; gap: 12px; align-items: center; }

        .theme-toggle {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .theme-toggle:hover { background: var(--bg-secondary); transform: translateY(-1px); }

        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
            gap: 24px;
            max-width: 1400px;
        }

        .design-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: var(--shadow);
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .design-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }

        .design-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
        }

        .design-title { display: flex; align-items: center; gap: 8px; }

        .design-title h3 {
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 500;
            font-family: inherit;
        }

        .design-type {
            background: var(--bg-secondary);
            color: var(--text-secondary);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-family: inherit;
            white-space: nowrap;
        }

        .design-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; text-align: right; }

        .design-size, .design-date {
            color: var(--text-secondary);
            font-size: 0.75rem;
            font-family: inherit;
        }

        .design-preview { height: 480px; position: relative; overflow: hidden; }

        .design-preview iframe {
            border: none;
            transform: scale(0.5);
            transform-origin: top left;
            width: 200%;
            height: 200%;
        }

        .design-actions { padding: 16px; display: flex; gap: 8px; }

        .btn-primary {
            background: #059669;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.875rem;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.2s ease;
        }

        .btn-primary:hover { background: #047857; }

        @media (max-width: 768px) {
            .gallery-grid { grid-template-columns: 1fr; }
            .design-preview { height: 300px; }
            .header { flex-direction: column; gap: 16px; align-items: flex-start; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>superdesign.gallery</h1>
            <p id="file-count">${esc(designs.length)} mockup — ${esc(counts.join(' · '))}</p>
        </div>
        <div class="header-controls">
            <button class="theme-toggle" onclick="toggleTheme()">
                <span id="theme-icon">🌙</span>
                <span id="theme-text">Dark</span>
            </button>
        </div>
    </div>

    <div class="gallery-grid">
${sorted.map(card).join('\n\n')}
    </div>

    <script>
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeButton();

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButton();
        }

        function updateThemeButton() {
            const t = document.documentElement.getAttribute('data-theme');
            document.getElementById('theme-icon').textContent = t === 'dark' ? '☀️' : '🌙';
            document.getElementById('theme-text').textContent = t === 'dark' ? 'Light' : 'Dark';
        }
    </script>
</body>
</html>
`

writeFileSync(join(dir, 'gallery.html'), html, 'utf8')
console.log(`gallery.html: ${designs.length} mockup (${counts.join(' · ')})`)
