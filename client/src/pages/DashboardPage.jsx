import { useEffect, useMemo, useState } from 'react'
import AuthPage from './AuthPage.jsx'
import FeatureWorkspace from '../components/FeatureWorkspace.jsx'
import { clearSession, createPickup, getCurrentUser, getRequests, readSession, saveSession } from '../services/api.js'
import { estimateEcoCredit, estimateRewardPoints } from '../services/rewards.js'
import '../App.css'

const STORAGE_KEY = 'reloop-requests'
const MIN_PICKUP_DATE = new Date().toISOString().slice(0, 10)
const categories = ['Phones & tablets', 'Computers', 'Accessories', 'Home electronics', 'Other']
const workspaceNavigation = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'pickups', label: 'Pickups', icon: 'box' },
  { id: 'centers', label: 'Drop-off centers', icon: 'pin' },
  { id: 'devices', label: 'Data prep & photo AI', icon: 'phone' },
  { id: 'rewards', label: 'Eco credits & rewards', icon: 'leaf' },
  { id: 'field', label: 'Route planner', icon: 'pin' },
  { id: 'partner', label: 'Asset recovery', icon: 'recycle' },
  { id: 'impact', label: 'Impact & ESG', icon: 'chart' },
  { id: 'certificates', label: 'Certificates', icon: 'book' },
  { id: 'company', label: 'Corporate & bulk solutions', icon: 'grid' },
  { id: 'community', label: 'Community drives', icon: 'grid' },
]

const centers = [
  { name: 'GreenLoop Recycling Hub', area: 'Indiranagar', distance: '1.2 km', hours: 'Open until 6:00 PM', kinds: 'All electronics' },
  { name: 'EcoCycle Drop-off Point', area: 'Koramangala', distance: '2.8 km', hours: 'Open until 7:00 PM', kinds: 'Phones, laptops, accessories' },
  { name: 'EarthForward Collection Center', area: 'Domlur', distance: '3.4 km', hours: 'Opens tomorrow at 9:00 AM', kinds: 'Small electronics & batteries' },
]

function Icon({ name, size = 18, ...props }) {
  const paths = {
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c3-6 7-9 13-12" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m8 14 4-4 4 3 5-7" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" /><path d="M4 16a2.5 2.5 0 0 1 2.5-2.5H20M8 7h8" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    recycle: <><path d="m7 7 2-3h6l2 3M5 10l-2 4 3 5h4M19 10l2 4-3 5h-4M8 16l4 2 4-2" /><path d="m7 7 3 1-1 3M17 7l-3 1 1 3M10 19l1-3 3 1" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
    laptop: <><rect x="4" y="4" width="16" height="12" rx="1.5" /><path d="M2 20h20l-2-4H4l-2 4Z" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name] || paths.box}</svg>
}

function loadSavedRequests(userId) {
  try {
    const saved = window.localStorage.getItem(`${STORAGE_KEY}-${userId}`)
    const requests = saved ? JSON.parse(saved) : []
    return Array.isArray(requests) ? requests : []
  } catch {
    return []
  }
}

function DashboardPage({ user, onLogout }) {
  const [requests, setRequests] = useState(() => loadSavedRequests(user.id))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All requests')
  const [activePage, setActivePage] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [apiConnected, setApiConnected] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formEstimate, setFormEstimate] = useState({ category: 'Computers', ageYears: 3, weightKg: 2.5 })
  const activeCount = requests.filter((request) => !['Processed', 'Collected'].includes(request.status)).length
  const completedRequests = requests.filter((request) => ['Collected', 'Processed'].includes(request.status))
  const recycledWeight = completedRequests.reduce((total, request) => total + (Number(request.weightKg) || 0), 0)
  const estimatedCo2 = recycledWeight * 0.73
  const earnedPoints = completedRequests.reduce((total, request) => total + (Number(request.rewardPoints) || 0), 0)
  const estimatedPoints = estimateRewardPoints(formEstimate)
  const estimatedCredit = estimateEcoCredit(formEstimate)

  const navigation = workspaceNavigation.map((item) => (
    item.id === 'pickups' ? { ...item, count: activeCount } : item
  ))
  const pageTitle = navigation.find((item) => item.id === activePage)?.label || 'Overview'

  useEffect(() => {
    let isMounted = true
    getRequests()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setRequests(data)
          setApiConnected(true)
        }
      })
      .catch(() => {
        if (isMounted) setApiConnected(false)
      })
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(`${STORAGE_KEY}-${user.id}`, JSON.stringify(requests))
  }, [requests, user.id])

  const visibleRequests = useMemo(() => requests.filter((request) => {
    const matchesFilter = activeFilter === 'All requests' || request.status === activeFilter
    const query = searchTerm.trim().toLowerCase()
    const matchesSearch = !query || [request.item, request.category, request.area, request._id].some((value) => value?.toLowerCase().includes(query))
    return matchesFilter && matchesSearch
  }), [requests, activeFilter, searchTerm])

  async function createRequest(event) {
    event.preventDefault()
    setIsSubmitting(true)
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    payload.quantity = Number(payload.quantity)
    payload.ageYears = Number(payload.ageYears)
    payload.weightKg = Number(payload.weightKg)
    payload.pinCode = String(payload.pinCode || '')
    payload.preferredSlot = payload.preferredSlot || '09:00–11:00'
    payload.rewardPoints = estimateRewardPoints(payload)
    payload.estimatedCredit = estimateEcoCredit(payload)
    if (user.role === 'company') payload.companyName = user.companyName
    const localRequest = {
      ...payload,
      _id: `RL-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Pending',
      partner: 'Partner assignment pending',
      rewardPoints: payload.rewardPoints,
      estimatedCredit: payload.estimatedCredit,
      createdAt: new Date().toISOString(),
    }
    try {
      const saved = await createPickup(payload)
      setRequests((current) => [saved, ...current])
      setApiConnected(true)
    } catch (error) {
      if (!error.status && error.message.startsWith('Cannot reach the Reloop API')) {
        setRequests((current) => [localRequest, ...current])
        setApiConnected(false)
        setNotice('Pickup saved on this device. Connect the API to sync it.')
        setIsModalOpen(false)
        setIsSubmitting(false)
        window.setTimeout(() => setNotice(''), 4200)
        return
      }
      setNotice(error.message)
      setIsSubmitting(false)
      window.setTimeout(() => setNotice(''), 4200)
      return
    }
    setIsModalOpen(false)
    setIsSubmitting(false)
    setNotice('Pickup request submitted. We’ll be in touch soon!')
    window.setTimeout(() => setNotice(''), 4200)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" aria-label="Reloop home" onClick={(event) => { event.preventDefault(); setActivePage('overview') }}>
          <span className="brand-mark"><Icon name="leaf" size={21} /></span>
          <span>reloop<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map((item) => <button type="button" key={item.id} className={`nav-link ${activePage === item.id ? 'selected' : ''}`} onClick={() => { setActivePage(item.id); setMenuOpen(false) }}><Icon name={item.icon} /> {item.label}{item.count > 0 && <span className="nav-count">{item.count}</span>}</button>)}
          <button type="button" className="nav-link schedule-nav-link" onClick={() => { setIsModalOpen(true); setMenuOpen(false) }}><Icon name="plus" /> Schedule a pickup</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-illustration"><Icon name="recycle" size={24} /></div>
            <strong>A little less waste.<br />A lot more future.</strong>
            <p>Your next pickup makes a difference.</p>
            <button type="button" onClick={() => setActivePage(user.role === 'company' ? 'impact' : 'impact')}>See your impact <Icon name="arrow" size={14} /></button>
          </div>
          <div className="profile">
            <div className="avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div className="profile-copy"><strong>{user.name}</strong><span>{user.role === 'company' ? user.companyName : 'Individual account'}</span></div>
            <button className="icon-button profile-more" aria-label="Log out" title="Log out" onClick={onLogout}>↪</button>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <main className="main-content" id="overview">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumbs">{user.role === 'company' ? user.companyName : 'Workspace'} <Icon name="chevron" size={14} /> <strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <span className={`connection ${apiConnected ? 'connected' : ''}`}><i />{apiConnected ? 'Live' : 'Demo mode'}</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Icon name="bell" /><span /></button>
            <div className="top-avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          </div>
        </header>

        <div className="page-container">
          {activePage !== 'overview' && <section className="screen-heading"><div><p className="section-kicker">{user.role === 'company' ? 'COMPANY WORKSPACE' : 'YOUR RELOOP WORKSPACE'}</p><h1>{pageTitle}</h1><p>{activePage === 'pickups' ? 'Manage collections and see your estimated eco credits.' : activePage === 'field' ? 'Plan collections using pickup area, postal code, and time slot.' : activePage === 'partner' ? 'Review assets and choose recovery routes.' : `Your ${pageTitle.toLowerCase()} in one place.`}</p></div>{activePage === 'pickups' && <button className="button button-primary" onClick={() => setIsModalOpen(true)}><Icon name="plus" size={16} /> Schedule a pickup</button>}</section>}
          {activePage === 'overview' && <>
          <section className="welcome-row">
            <div><p className="eyebrow">{user.role === 'company' ? 'CORPORATE E-WASTE WORKSPACE' : 'YOUR RECYCLING WORKSPACE'} <span className="eyebrow-dot" /> BENGALURU, IN</p><h1>{user.role === 'company' ? `Welcome, ${user.companyName}` : `Welcome, ${user.name}`} <span className="wave">✳</span></h1><p className="welcome-subtitle">{user.role === 'company' ? 'Plan bulk collection and track your organization’s impact.' : 'Ready to give your old tech a better next chapter?'}</p></div>
            <button className="button button-primary" onClick={() => setIsModalOpen(true)}><Icon name="plus" size={18} /> Schedule a pickup</button>
          </section>

          <section className="hero-banner">
            <div className="hero-copy">
              <span className="hero-kicker"><span className="sparkle">✳</span> SMALL ACT, BIG IMPACT</span>
              <h2>Make space for<br />a <em>greener</em> tomorrow.</h2>
              <p>That drawer full of old tech? It could become something wonderful.</p>
              <button className="button button-light" onClick={() => setIsModalOpen(true)}>Recycle something <Icon name="arrow" size={16} /></button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="sun-glow" />
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="plant plant-left"><i /><i /><i /><b /></div>
              <div className="device laptop-device"><div className="laptop-screen"><div className="screen-sun" /><div className="screen-hill" /></div><div className="laptop-base" /></div>
              <div className="device phone-device"><div className="phone-camera" /><div className="phone-leaf">✳</div></div>
              <span className="art-sticker sticker-one">♻</span><span className="art-sticker sticker-two">✳</span>
            </div>
            <span className="hero-index">01 — 03</span>
          </section>

          <section className="stats-grid" aria-label="Your recycling stats">
            <article className="stat-card"><div className="stat-top"><span className="stat-icon mint"><Icon name="recycle" size={19} /></span><span className="stat-note">LIFETIME</span></div><div className="stat-value">{recycledWeight.toFixed(1)} <span>kg</span></div><div className="stat-label">E-waste recycled</div><div className="stat-foot">From your completed collections</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon peach"><Icon name="leaf" size={18} /></span><span className="stat-note">ESTIMATED</span></div><div className="stat-value">{estimatedCo2.toFixed(1)} <span>kg</span></div><div className="stat-label">CO₂ emissions avoided</div><div className="stat-foot">Estimate based on recycled weight</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon lavender">✳</span><span className="stat-note">REDEEM FOR GOOD</span></div><div className="stat-value">{earnedPoints} <span>pts</span></div><div className="stat-label">Eco credits earned</div><div className="stat-foot"><button className="inline-nav-link" onClick={() => setActivePage('rewards')}>Explore rewards <Icon name="arrow" size={13} /></button></div></article>
            <article className="stat-card stat-card-dark"><div className="stat-top"><span className="dark-stat-icon"><Icon name="box" size={18} /></span><span className="dark-stat-note">IN PROGRESS</span></div><div className="stat-value">{activeCount.toString().padStart(2, '0')} <span>pickups</span></div><div className="stat-label">Making their next move</div><button className="dark-stat-link" onClick={() => setActivePage('pickups')}>Track your items <Icon name="arrow" size={14} /></button><div className="dark-decoration" /></article>
          </section>

          </>}

          {(activePage === 'overview' || activePage === 'pickups' || activePage === 'centers' || activePage === 'impact') && <div className="content-grid" data-page={activePage}>
            {(activePage === 'overview' || activePage === 'pickups') &&
            <section className="panel requests-panel" id="requests">
              <div className="section-heading"><div><p className="section-kicker">YOUR ACTIVITY</p><h2>Recent pickups</h2></div><button className="text-button" onClick={() => setIsModalOpen(true)}>New request <Icon name="plus" size={15} /></button></div>
              <div className="table-toolbar"><div className="filter-tabs">{['All requests', 'Pending', 'Pickup scheduled', 'Collected', 'Processed'].map((filter) => <button key={filter} className={activeFilter === filter ? 'filter-tab active' : 'filter-tab'} onClick={() => setActiveFilter(filter)}>{filter}</button>)}</div><label className="search-box"><Icon name="search" size={16} /><input aria-label="Search pickups" placeholder="Search pickups" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label></div>
              <div className="request-list">
                {visibleRequests.map((request) => <RequestRow key={request._id} request={request} />)}
                {visibleRequests.length === 0 && <div className="empty-state"><Icon name="box" size={22} /><strong>No pickups found</strong><span>Try another search or schedule your first pickup.</span></div>}
              </div>
              <button className="view-all" onClick={() => { setActiveFilter('All requests'); setSearchTerm('') }}>View all activity <Icon name="arrow" size={14} /></button>
            </section>}

            {(activePage === 'overview' || activePage === 'impact' || activePage === 'centers') && <div className="right-column">
              {(activePage === 'overview' || activePage === 'impact') && <section className="impact-card" id="impact">
                <div className="impact-heading"><div><p className="section-kicker">YOUR GREEN FOOTPRINT</p><h2>Look what you’ve done.</h2></div><span className="impact-leaf"><Icon name="leaf" size={17} /></span></div>
                <p className="impact-copy">Every device recycled is a little less pressure on our planet.</p>
                <div className="impact-chart">
                  <div className="chart-labels"><span>Waste recycled <strong>{recycledWeight.toFixed(1)} kg</strong></span><span>CO₂ avoided <strong>{estimatedCo2.toFixed(1)} kg</strong></span></div>
                  <div className="chart-bars" aria-label="Your monthly recycling activity"><span style={{ height: '35%' }} /><span style={{ height: '53%' }} /><span style={{ height: '42%' }} /><span style={{ height: '72%' }} /><span style={{ height: '56%' }} /><span style={{ height: '88%' }} /><span style={{ height: '66%' }} /><span style={{ height: '100%' }} /><span style={{ height: '76%' }} /><span style={{ height: '82%' }} /><span style={{ height: '58%' }} /><span className="bar-current" style={{ height: '94%' }} /></div>
                  <div className="chart-months"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
                </div>
                <div className="impact-footer"><span><span className="legend-dot" /> You’re in the top <strong>18%</strong> of recyclers</span><button aria-label="More impact details"><Icon name="arrow" size={15} /></button></div>
              </section>}

              {(activePage === 'overview' || activePage === 'centers') && <section className="centers-card" id="centers">
                <div className="section-heading centers-heading"><div><p className="section-kicker">NEAR YOU</p><h2>Drop-off centers</h2></div><button className="round-arrow" aria-label="View all centers"><Icon name="arrow" size={16} /></button></div>
                {centers.slice(0, 2).map((center, index) => <div className="center-row" key={center.name}><div className={`center-pin pin-${index}`}><Icon name="pin" size={17} /></div><div className="center-info"><strong>{center.name}</strong><span>{center.area} · {center.distance}</span></div><Icon name="chevron" size={16} className="center-chevron" /></div>)}
                <a href="https://maps.google.com/?q=recycling+center+Bengaluru" target="_blank" rel="noreferrer" className="centers-link">Explore all centers <Icon name="arrow" size={14} /></a>
              </section>}
            </div>}
          </div>}

          {activePage === 'overview' && user.role === 'individual' && <section className="guide-banner" id="guides"><div className="guide-icon"><Icon name="phone" size={21} /></div><div><span className="section-kicker">BEFORE YOUR PICKUP</span><h3>A fresh start for your old phone.</h3><p>Back up, sign out, and wipe your data with our device checklist.</p></div><button type="button" onClick={() => setActivePage('devices')} className="guide-link">Open data-wiping guide <Icon name="arrow" size={15} /></button><div className="guide-decoration">✳</div></section>}

          <FeatureWorkspace activePage={activePage} role={user.role} userId={user.id} requests={requests} onNotice={(message) => { setNotice(message); window.setTimeout(() => setNotice(''), 4200) }} />

          <footer className="page-footer"><span>© 2026 Reloop. A little better, every day.</span><span><i /> Thoughtfully recycling in Bengaluru</span></footer>
        </div>
      </main>

      {isModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) setIsModalOpen(false) }}><section className="request-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="section-kicker">PICKUP COLLECTION</span><h2 id="modal-title">Schedule a pickup</h2><p>Tell us what you’re ready to let go of.</p></div><button className="icon-button" aria-label="Close" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}><Icon name="close" /></button></div><form onSubmit={createRequest}><label>What are you recycling?<input name="item" required maxLength="80" placeholder="e.g. Old laptop, phones, batteries" /></label><div className="form-row"><label>Item type<select name="category" required value={formEstimate.category} onChange={(event) => setFormEstimate((current) => ({ ...current, category: event.target.value }))}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Quantity<input name="quantity" type="number" min="1" max="100" defaultValue="1" required /></label></div><div className="form-row"><label>Device age (years)<input name="ageYears" type="number" min="0" max="50" value={formEstimate.ageYears} onChange={(event) => setFormEstimate((current) => ({ ...current, ageYears: Number(event.target.value) }))} required /></label><label>Total estimated weight (kg)<input name="weightKg" type="number" min="0.1" max="1000" step="0.1" value={formEstimate.weightKg} onChange={(event) => setFormEstimate((current) => ({ ...current, weightKg: Number(event.target.value) }))} required /></label></div><label>Pickup address<input name="address" required maxLength="180" placeholder="Street and building" /></label><div className="form-row"><label>Area<input name="area" required maxLength="80" placeholder="e.g. Indiranagar" /></label><label>PIN code<input name="pinCode" inputMode="numeric" pattern="[0-9]{6}" minLength="6" maxLength="6" placeholder="6-digit PIN" required /></label></div><div className="form-row"><label>Preferred pickup date<input name="date" type="date" min={MIN_PICKUP_DATE} required /></label><label>Pickup time slot<select name="preferredSlot" defaultValue="09:00–11:00" required><option>09:00–11:00</option><option>11:00–13:00</option><option>14:00–16:00</option><option>16:00–18:00</option></select></label></div><div className="route-estimate"><strong>Estimated value: ₹{estimatedCredit} eco credit · {estimatedPoints} points</strong><span>Route availability is planned from your PIN code and selected pickup slot.</span><span>Illustrative credit only — no cash payout is promised; final credit depends on partner verification and item condition.</span></div><button className="button button-primary submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Request pickup'} <Icon name="arrow" size={16} /></button></form></section></div>}
      {notice && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={16} /></span>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={15} /></button></div>}
    </div>
  )
}

function RequestRow({ request }) {
  const statusClass = request.status.toLowerCase().replaceAll(' ', '-')
  const iconName = request.category === 'Computers' ? 'laptop' : request.category === 'Phones & tablets' ? 'phone' : 'box'
  const date = request.date ? new Date(`${String(request.date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date pending'
  return <article className="request-row"><div className={`item-icon item-${iconName}`}><Icon name={iconName} size={19} /></div><div className="request-main"><strong>{request.item}</strong><span>{request.quantity} item{request.quantity === 1 ? '' : 's'} <i /> {request.area}</span><span className="request-credit">₹{Number(request.estimatedCredit) || 0} estimated eco credit · {Number(request.rewardPoints) || 0} pts</span></div><div className="request-partner"><span>RECYCLING PARTNER</span><strong>{request.partner || 'Partner assignment pending'}</strong></div><span className={`status-pill status-${statusClass}`}><i />{request.status}</span><span className="request-date">{date}</span><button className="row-arrow" aria-label={`View ${request.item}`}><Icon name="chevron" size={16} /></button></article>
}

function App() {
  const [user, setUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(readSession()))

  useEffect(() => {
    const existingSession = readSession()
    if (!existingSession) return undefined
    let isMounted = true
    getCurrentUser()
      .then((result) => {
        if (!isMounted) return
        saveSession({ ...existingSession, user: result.user })
        setUser(result.user)
      })
      .catch(() => {
        clearSession()
      })
      .finally(() => {
        if (isMounted) setIsCheckingSession(false)
      })
    return () => { isMounted = false }
  }, [])

  if (isCheckingSession) return <div className="session-loading" role="status">Checking your secure session…</div>
  if (!user) return <AuthPage onAuthenticated={setUser} />

  return <DashboardPage key={user.id} user={user} onLogout={() => { clearSession(); setUser(null) }} />
}

export default App
