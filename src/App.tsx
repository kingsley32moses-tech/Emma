import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Flower2, Menu, Sparkles, X } from 'lucide-react'

const navItems = [
  ['About', '#about'],
  ['Services', '#services'],
  ['Gallery', '#gallery'],
  ['How it works', '#process'],
  ['Contact', '#contact'],
]

const services = [
  { number: '01', title: 'Wedding celebrations', text: 'A thoughtful setting for the beginning of something beautiful.', tag: 'For your forever', tone: 'rose' },
  { number: '02', title: 'Milestone moments', text: 'Birthdays, anniversaries and the moments worth gathering for.', tag: 'Make it memorable', tone: 'sage' },
  { number: '03', title: 'Intimate gatherings', text: 'Beautiful details for showers, engagements and family occasions.', tag: 'Gather beautifully', tone: 'gold' },
]

const gallery = [
  { title: 'The garden table', type: 'Tablescape', tone: 'gallery-one' },
  { title: 'A moment in bloom', type: 'Floral styling', tone: 'gallery-two' },
  { title: 'The celebration room', type: 'Venue styling', tone: 'gallery-three' },
]

function Brand() {
  return (
    <a className="brand" href="#home" aria-label="Emma's Decor MW home">
      <span className="brand-mark"><Flower2 size={23} strokeWidth={1.25} /></span>
      <span className="brand-copy"><strong>EMMA'S DECOR</strong><small>MW · EVENTS & CELEBRATIONS</small></span>
    </a>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [accountMode, setAccountMode] = useState<'login' | 'register'>('login')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24)
    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  const openAccount = (mode: 'login' | 'register') => {
    setAccountMode(mode)
    setShowAccount(true)
    setMenuOpen(false)
  }

  return (
    <div className="site-shell" id="home">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            {navItems.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
          </nav>
          <div className="header-actions">
            <button className="text-action" onClick={() => openAccount('login')}>Log in</button>
            <button className="header-cta" onClick={() => openAccount('register')}>Plan your event <ArrowUpRight size={15} /></button>
          </div>
          <button className="mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && <div className="mobile-nav">
          {navItems.map(([label, href]) => <a key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <button onClick={() => openAccount('login')}>Customer login</button>
          <button className="mobile-nav-cta" onClick={() => openAccount('register')}>Start planning <ArrowUpRight size={15} /></button>
        </div>}
      </header>

      <main>
        <section className="hero">
          <div className="hero-image" role="img" aria-label="A newlywed couple sharing a romantic moment in elegant wedding attire">
            <div className="hero-image-wash" />
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-flower flower-one">✳</div>
            <div className="hero-flower flower-two">✳</div>
            <div className="hero-image-caption"><span>A LOVE STORY, BEAUTIFULLY TOLD</span><span>01 — 03</span></div>
          </div>
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR DAY. YOUR STORY. BEAUTIFULLY STYLED.</div>
            <h1>Your moments,<br /><em>beautifully</em><br />made.</h1>
            <p className="hero-description">From dream weddings to life’s special gatherings, we style beautiful spaces and thoughtful details that make every celebration unforgettable.</p>
            <div className="hero-buttons">
              <button className="button-primary" onClick={() => openAccount('register')}>Begin your plans <ArrowUpRight size={17} /></button>
              <a className="button-link" href="#services">Discover what we do <ArrowDownRight size={17} /></a>
            </div>
            <div className="hero-footnote"><span className="footnote-star">✳</span><span>EVENT DECORATION<br />& CREATIVE STYLING</span><span className="footnote-rule" /><span>MALAWI</span></div>
          </div>
          <div className="hero-side-note">CELEBRATE THE WAY YOU IMAGINED IT</div>
        </section>

        <section className="intro-section section-pad" id="about">
          <div className="section-kicker">A LITTLE ABOUT US <span>✳</span></div>
          <div className="intro-grid">
            <h2>Every gathering<br />deserves a <em>feeling.</em></h2>
            <div className="intro-copy">
              <p>Some moments stay with us forever. The room, the colours, the flowers, the way everything came together. Emma's Decor MW is being shaped around one simple idea: the details matter because the moments do.</p>
              <a href="#contact" className="underlined-link">Let's create something meaningful <ArrowUpRight size={15} /></a>
            </div>
          </div>
          <div className="intro-rule"><span>01</span><span>DESIGNED WITH INTENTION</span><span>MADE FOR YOUR MOMENT</span></div>
        </section>

        <section className="services-section section-pad" id="services">
          <div className="section-heading">
            <div><div className="section-kicker">WHAT WE CAN CREATE <span>✳</span></div><h2>Made for the<br /><em>moments that matter.</em></h2></div>
            <p>Every celebration has its own character. Explore a few ways we can help shape yours. Final service categories will be confirmed with the business before publication.</p>
          </div>
          <div className="service-list">
            {services.map((service) => <article className={`service-row ${service.tone}`} key={service.number}>
              <div className="service-number">{service.number}</div>
              <div className="service-art"><span className="art-ring" /><span className="art-symbol">{service.tone === 'rose' ? '✿' : service.tone === 'sage' ? '❋' : '✳'}</span><span className="art-label">{service.tag}</span></div>
              <div className="service-info"><span className="service-overline">EVENT STYLING</span><h3>{service.title}</h3><p>{service.text}</p><a href="#contact" aria-label={`Ask about ${service.title}`}>Explore this service <ArrowUpRight size={16} /></a></div>
              <ArrowUpRight className="service-arrow" size={22} />
            </article>)}
          </div>
          <p className="provisional-note">Service examples shown for design direction. The published catalogue will contain only services confirmed by Emma's Decor MW.</p>
        </section>

        <section className="gallery-section section-pad" id="gallery">
          <div className="gallery-top">
            <div><div className="section-kicker">A WORLD OF DETAILS <span>✳</span></div><h2>Inspiration for<br /><em>your kind of beautiful.</em></h2></div>
            <a className="underlined-link" href="#contact">Discuss your vision <ArrowUpRight size={15} /></a>
          </div>
          <div className="gallery-grid">
            {gallery.map((item, i) => <article className={`gallery-item ${item.tone}`} key={item.title}>
              <div className="gallery-art"><span className="gallery-shape shape-a" /><span className="gallery-shape shape-b" /><span className="gallery-art-word">{['gather','bloom','celebrate'][i]}</span><span className="gallery-index">0{i + 1}</span></div>
              <div className="gallery-caption"><div><span>{item.type}</span><h3>{item.title}</h3></div><ArrowUpRight size={18} /></div>
            </article>)}
          </div>
          <p className="provisional-note">These are visual placeholders, not photographs of completed Emma's Decor MW projects. Genuine portfolio images will replace them.</p>
        </section>

        <section className="process-section section-pad" id="process">
          <div className="process-heading"><div className="section-kicker">THE JOURNEY <span>✳</span></div><h2>From first thought<br />to <em>the big moment.</em></h2><p>Planning should feel as considered as the celebration itself. Here's how the platform will guide you.</p></div>
          <div className="process-steps">
            {[
              ['01', 'Share your occasion', 'Tell us what you are celebrating, when and where.'],
              ['02', 'Shape your vision', 'Explore decoration ideas and build a selection that feels like you.'],
              ['03', 'Review the details', 'Receive a response and work through the proposal with the team.'],
              ['04', 'Celebrate beautifully', 'Confirm the arrangements and look forward to your day.'],
            ].map(([n, title, body]) => <div className="process-step" key={n}><span className="step-number">{n}</span><div><h3>{title}</h3><p>{body}</p></div><ArrowUpRight size={17} /></div>)}
          </div>
        </section>

        <section className="closing-section" id="contact">
          <div className="closing-decoration">✳</div>
          <div className="section-kicker">YOUR MOMENT STARTS HERE</div>
          <h2>Let's make room<br />for <em>something lovely.</em></h2>
          <p>Have an occasion in mind? Start a planning request and tell us what you are dreaming of.</p>
          <button className="button-light" onClick={() => openAccount('register')}>Start planning <ArrowUpRight size={17} /></button>
          <div className="contact-placeholder">Business contact details will appear here once verified.</div>
        </section>
      </main>

      <footer className="site-footer">
        <Brand />
        <span>© {new Date().getFullYear()} Emma's Decor MW</span>
        <div className="footer-links"><a href="#about">About</a><a href="#services">Services</a><a href="#contact">Contact</a><a href="#home">Back to top ↑</a></div>
      </footer>

      {showAccount && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAccount(false) }}>
        <div className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
          <button className="modal-close" onClick={() => setShowAccount(false)} aria-label="Close"><X size={19} /></button>
          <div className="modal-mark"><Flower2 size={25} /></div>
          <div className="section-kicker">EMMA'S DECOR MW</div>
          <h2 id="account-title">{accountMode === 'login' ? 'Welcome back.' : 'Make it yours.'}</h2>
          <p>{accountMode === 'login' ? 'Customer account access will be connected in the authentication build.' : 'Customer registration will be available when the secure account system is implemented.'}</p>
          <div className="modal-notice"><Sparkles size={17} /><span>This first milestone is the public design foundation. Account actions are visual previews and do not create or authenticate accounts yet.</span></div>
          <button className="button-primary modal-action" onClick={() => { setShowAccount(false); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }) }}>Continue exploring <ArrowRight size={16} /></button>
          <button className="modal-switch" onClick={() => setAccountMode(accountMode === 'login' ? 'register' : 'login')}>{accountMode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}</button>
        </div>
      </div>}
    </div>
  )
}

export default App
