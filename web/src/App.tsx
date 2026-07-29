import {
  Activity,
  Box,
  Check,
  ChevronRight,
  CircleAlert,
  CloudCog,
  Code2,
  Container,
  ExternalLink,
  FileCheck2,
  Gauge,
  GitBranch,
  Layers3,
  LoaderCircle,
  Moon,
  PackageCheck,
  PanelRightClose,
  Play,
  RefreshCw,
  ServerCog,
  Settings2,
  ShieldCheck,
  Sun,
  Workflow,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { readStoredTheme, resolveTheme, THEME_STORAGE_KEY, type ThemeMode } from './theme'

type HealthState = 'checking' | 'ready' | 'degraded' | 'offline'

type HealthResponse = {
  status: 'ready' | 'degraded'
  service: string
  version: string
  timestamp: string
}

type PreflightCheck = {
  id: string
  label: string
  ok: boolean
  detail: string
}

type PreflightResponse = {
  status: 'pass' | 'review'
  checks: PreflightCheck[]
  ranAt: string
}

type SectionId = 'overview' | 'identity' | 'runtime' | 'release'

const sections: Array<{
  id: SectionId
  label: string
  description: string
  icon: typeof Gauge
}> = [
  { id: 'overview', label: '준비 현황', description: '현재 앱의 실행 준비도', icon: Gauge },
  { id: 'identity', label: '제품 식별자', description: '화면·GitHub·시스템 이름', icon: Layers3 },
  { id: 'runtime', label: '실행 채널', description: 'Web과 Docker의 공통 소스', icon: Container },
  { id: 'release', label: '릴리스 규약', description: '검증과 공개 배포 단계', icon: PackageCheck },
]

const manifestRows = [
  ['displayName', 'Starter Studio'],
  ['repository', 'Studio_App_Template'],
  ['slug', 'studio-app-template'],
  ['container', 'ghcr.io/suyaleo/studio-app-template'],
  ['version', '0.1.0'],
  ['license', 'Apache-2.0'],
]

const sectionContent: Record<
  SectionId,
  { eyebrow: string; title: string; body: string; cards: Array<{ title: string; text: string; icon: typeof Box }> }
> = {
  overview: {
    eyebrow: 'TEMPLATE READINESS',
    title: '하나의 코드에서 두 가지 실행 형태를 준비합니다',
    body: '실제 기능 개발을 시작하기 전에 제품 식별자, API 상태, Web 빌드와 Docker 계약이 서로 맞물리는지 확인하세요.',
    cards: [
      { title: 'Design foundation', text: 'Light·Dark·System 테마와 의미 기반 토큰이 이미 연결되어 있습니다.', icon: Sun },
      { title: 'Runtime contract', text: 'Web 빌드와 API가 같은 버전·상태·데이터 경로를 사용합니다.', icon: ServerCog },
      { title: 'Release contract', text: 'Apache-2.0, CI, GHCR, SemVer 검증 기준을 포함합니다.', icon: ShieldCheck },
    ],
  },
  identity: {
    eyebrow: 'PRODUCT IDENTITY',
    title: '사람이 보는 이름과 시스템 이름을 분리합니다',
    body: '화면의 제품명은 읽기 쉽게, GitHub 저장소는 규약에 맞게, 컨테이너와 URL은 소문자 slug로 유지합니다.',
    cards: [
      { title: 'Display', text: 'Starter Studio — 제품 화면과 문서에서 사용하는 이름입니다.', icon: Layers3 },
      { title: 'Repository', text: 'Studio_App_Template — 공개 저장소와 협업의 기준 이름입니다.', icon: GitBranch },
      { title: 'System slug', text: 'studio-app-template — 컨테이너·URL·서비스 식별자입니다.', icon: Code2 },
    ],
  },
  runtime: {
    eyebrow: 'ONE SOURCE · TWO CHANNELS',
    title: 'Web과 Docker가 같은 사용자 경험을 제공합니다',
    body: 'Vite가 만든 동일한 정적 산출물을 FastAPI가 서비스하며, Docker 이미지는 여기에 API와 영속 데이터 경로를 더합니다.',
    cards: [
      { title: 'Web development', text: 'Vite 개발 서버가 빠른 UI 작업과 API 프록시를 제공합니다.', icon: CloudCog },
      { title: 'Combined service', text: '프로덕션에서는 FastAPI가 API와 빌드된 SPA를 함께 제공합니다.', icon: Workflow },
      { title: 'Docker runtime', text: '비루트 사용자, Healthcheck, /data 볼륨을 기본으로 사용합니다.', icon: Container },
    ],
  },
  release: {
    eyebrow: 'RELEASE GATES',
    title: '검증된 commit만 공개 릴리스로 승격합니다',
    body: 'manifest, 테스트, 프로덕션 빌드, 라이선스와 Docker 상태 점검이 모두 성공해야 SemVer 태그와 GHCR 이미지가 만들어집니다.',
    cards: [
      { title: 'Validate', text: 'studio.json, 공개 파일, 비밀정보와 명명 규약을 검사합니다.', icon: FileCheck2 },
      { title: 'Build', text: 'Python 테스트와 Web 타입·테스트·프로덕션 빌드를 수행합니다.', icon: PackageCheck },
      { title: 'Publish', text: '명시적으로 승인된 태그에서만 GitHub와 GHCR에 게시합니다.', icon: ExternalLink },
    ],
  },
}

function formatTime(value: string | null) {
  if (!value) return '아직 실행하지 않음'
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
    new Date(value),
  )
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredTheme())
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [health, setHealth] = useState<HealthState>('checking')
  const [healthData, setHealthData] = useState<HealthResponse | null>(null)
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null)
  const [preflightOpen, setPreflightOpen] = useState(false)
  const [preflightRunning, setPreflightRunning] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [activity, setActivity] = useState('Studio UI가 준비되었습니다.')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const resolved = resolveTheme(themeMode, media.matches)
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
    }
    applyTheme()
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [themeMode])

  const checkHealth = useCallback(async () => {
    setHealth('checking')
    setActivity('API 상태를 확인하고 있습니다…')
    try {
      const response = await fetch('/api/health')
      const payload = (await response.json()) as HealthResponse
      setHealthData(payload)
      setHealth(response.ok && payload.status === 'ready' ? 'ready' : 'degraded')
      setActivity(response.ok ? `API 연결 확인 · v${payload.version}` : 'API가 점검이 필요한 상태입니다.')
    } catch {
      setHealth('offline')
      setHealthData(null)
      setActivity('API에 연결할 수 없습니다. 개발 서버가 실행 중인지 확인하세요.')
    }
  }, [])

  useEffect(() => {
    void checkHealth()
  }, [checkHealth])

  const runPreflight = async () => {
    setPreflightOpen(true)
    setPreflightRunning(true)
    setActivity('릴리스 프리플라이트를 실행하고 있습니다…')
    try {
      const response = await fetch('/api/preflight', { method: 'POST' })
      if (!response.ok) throw new Error('preflight failed')
      const payload = (await response.json()) as PreflightResponse
      setPreflight(payload)
      setActivity(payload.status === 'pass' ? '프리플라이트를 통과했습니다.' : '검토가 필요한 항목이 있습니다.')
    } catch {
      setPreflight(null)
      setActivity('프리플라이트 API에 연결할 수 없습니다.')
    } finally {
      setPreflightRunning(false)
    }
  }

  const content = sectionContent[activeSection]
  const healthLabel = useMemo(
    () =>
      ({ checking: '확인 중', ready: 'API 준비됨', degraded: '점검 필요', offline: '연결 안 됨' })[health],
    [health],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="product-lockup">
          <div className="product-mark" aria-hidden="true">
            S
          </div>
          <div>
            <div className="product-title">Starter Studio</div>
            <div className="product-subtitle">Web + Docker application template</div>
          </div>
        </div>

        <div className="leo-brand" aria-label="Leo Studio">
          <img className="leo-logo-light" src="/brand/leo-studio-light.png" alt="Leo Studio" />
          <img className="leo-logo-dark" src="/brand/leo-studio-dark.png" alt="Leo Studio" />
        </div>

        <div className="toolbar-actions">
          <button className={`health-pill health-${health}`} type="button" onClick={() => void checkHealth()}>
            {health === 'checking' ? <LoaderCircle className="spin" size={15} /> : <Activity size={15} />}
            {healthLabel}
          </button>
          <button className="button button-secondary" type="button" onClick={() => void runPreflight()}>
            <Play size={17} fill="currentColor" />
            프리플라이트
          </button>
          <label className="theme-picker" title="화면 테마">
            {themeMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
              <option value="system">시스템</option>
              <option value="light">라이트</option>
              <option value="dark">다크</option>
            </select>
          </label>
        </div>
      </header>

      <div className={`workspace ${inspectorOpen ? '' : 'inspector-collapsed'}`}>
        <aside className="navigation-panel" aria-label="Studio 섹션">
          <div className="panel-heading">
            <span>START HERE</span>
            <strong>제품 기반 설정</strong>
          </div>
          <nav className="section-list">
            {sections.map((section) => {
              const Icon = section.icon
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  className={`section-item ${active ? 'active' : ''}`}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="section-icon">
                    <Icon size={18} />
                  </span>
                  <span>
                    <strong>{section.label}</strong>
                    <small>{section.description}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              )
            })}
          </nav>

          <div className="rail-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Apache-2.0 준비</strong>
              <span>공개 전 제3자 에셋과 Git 기록을 다시 확인하세요.</span>
            </div>
          </div>
        </aside>

        <main className="main-stage">
          <section className="hero-panel">
            <div className="eyebrow">{content.eyebrow}</div>
            <h1>{content.title}</h1>
            <p>{content.body}</p>
            <div className="hero-actions">
              <button className="button button-primary" type="button" onClick={() => void runPreflight()}>
                <Play size={17} fill="currentColor" />
                준비 상태 검사
              </button>
              <button className="button button-quiet" type="button" onClick={() => setInspectorOpen((value) => !value)}>
                <Settings2 size={17} />
                {inspectorOpen ? 'Manifest 접기' : 'Manifest 열기'}
              </button>
            </div>
          </section>

          <section className="feature-grid" aria-label={`${sections.find((item) => item.id === activeSection)?.label} 항목`}>
            {content.cards.map((card, index) => {
              const Icon = card.icon
              return (
                <article className="feature-card" key={card.title}>
                  <div className="feature-card-topline">
                    <span className="feature-number">0{index + 1}</span>
                    <Icon size={19} />
                  </div>
                  <h2>{card.title}</h2>
                  <p>{card.text}</p>
                </article>
              )
            })}
          </section>

          <section className="route-strip" aria-label="기본 사용자 경로">
            <div>
              <span>PRIMARY PATH</span>
              <strong>식별자 설정</strong>
            </div>
            <ChevronRight size={18} />
            <div>
              <span>DEVELOP</span>
              <strong>기능·UI 구현</strong>
            </div>
            <ChevronRight size={18} />
            <div>
              <span>VERIFY</span>
              <strong>Web·Docker 검증</strong>
            </div>
            <ChevronRight size={18} />
            <div>
              <span>RELEASE</span>
              <strong>승인 후 공개</strong>
            </div>
          </section>
        </main>

        <aside className="inspector-panel" aria-label="Studio manifest">
          <div className="inspector-header">
            <div>
              <span>MANIFEST</span>
              <strong>studio.json</strong>
            </div>
            <button className="icon-button" type="button" aria-label="Manifest 패널 접기" onClick={() => setInspectorOpen(false)}>
              <PanelRightClose size={18} />
            </button>
          </div>
          <div className="inspector-body">
            <div className="readiness-score">
              <div className="score-ring">
                <span>8</span>
                <small>/ 8</small>
              </div>
              <div>
                <strong>기본 계약 준비됨</strong>
                <span>실제 제품 값으로 교체하세요</span>
              </div>
            </div>

            <dl className="manifest-list">
              {manifestRows.map(([term, value]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <button className="manifest-action" type="button" onClick={() => setActiveSection('identity')}>
              <Code2 size={17} />
              식별자 규칙 보기
              <ChevronRight size={16} />
            </button>
          </div>
        </aside>
      </div>

      <footer className="statusbar" aria-live="polite">
        <div className="status-message">
          <span className={`status-dot status-${health}`} />
          {activity}
        </div>
        <div className="status-meta">
          <span>API {healthData ? `v${healthData.version}` : '—'}</span>
          <span>마지막 확인 {formatTime(healthData?.timestamp ?? null)}</span>
          <button type="button" onClick={() => void checkHealth()} aria-label="API 상태 새로고침">
            <RefreshCw size={14} />
          </button>
        </div>
      </footer>

      {preflightOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setPreflightOpen(false)}>
          <section className="preflight-dialog" role="dialog" aria-modal="true" aria-labelledby="preflight-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <span>RELEASE PREFLIGHT</span>
                <h2 id="preflight-title">실행 환경 준비 상태</h2>
              </div>
              <button className="dialog-close" type="button" onClick={() => setPreflightOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>

            {preflightRunning ? (
              <div className="dialog-loading">
                <LoaderCircle className="spin" size={28} />
                API와 빌드 산출물을 확인하고 있습니다.
              </div>
            ) : preflight ? (
              <>
                <div className={`preflight-summary ${preflight.status}`}>
                  {preflight.status === 'pass' ? <Check size={20} /> : <CircleAlert size={20} />}
                  <div>
                    <strong>{preflight.status === 'pass' ? '기본 실행 준비를 통과했습니다' : '검토할 항목이 있습니다'}</strong>
                    <span>{formatTime(preflight.ranAt)} 실행</span>
                  </div>
                </div>
                <div className="check-list">
                  {preflight.checks.map((check) => (
                    <div className="check-row" key={check.id}>
                      <span className={check.ok ? 'check-ok' : 'check-review'}>
                        {check.ok ? <Check size={15} /> : <CircleAlert size={15} />}
                      </span>
                      <div>
                        <strong>{check.label}</strong>
                        <code>{check.detail}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="dialog-error">
                <CircleAlert size={24} />
                <strong>프리플라이트를 실행할 수 없습니다</strong>
                <span>API 서버를 실행한 뒤 다시 시도하세요.</span>
              </div>
            )}

            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={() => void runPreflight()} disabled={preflightRunning}>
                <RefreshCw size={16} />
                다시 검사
              </button>
              <button className="button button-primary" type="button" onClick={() => setPreflightOpen(false)}>
                확인
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
