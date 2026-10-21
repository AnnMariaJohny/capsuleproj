import { useEffect, useRef, useState } from 'react'
import { classifyItemPhoto, getWorkspaceData, savePickupProof, saveWorkspaceData } from '../services/api.js'
import './FeatureWorkspace.css'

const redeemedKey = 'reloop-redeemed-rewards'
const wipingSteps = [
  'Back up photos, contacts, and important files',
  'Sign out of cloud, email, and payment accounts',
  'Remove SIM and memory cards',
  'Factory-reset the device and confirm the welcome screen',
]
const rewards = [
  { name: '₹100 partner voucher', cost: 300, type: 'Discount voucher' },
  { name: 'Earth-friendly store coupon', cost: 450, type: 'Brand coupon' },
  { name: 'Recycled notebook set', cost: 600, type: 'Eco product' },
]
const centers = [
  { name: 'GreenLoop Recycling Hub', area: 'Indiranagar', pin: '560038', hours: '9:00 AM–6:00 PM', accepted: 'All electronics', query: 'GreenLoop Recycling Hub Bengaluru' },
  { name: 'EcoCycle Drop-off Point', area: 'Koramangala', pin: '560034', hours: '10:00 AM–7:00 PM', accepted: 'Phones, laptops, accessories', query: 'EcoCycle Drop-off Point Bengaluru' },
  { name: 'EarthForward Collection Center', area: 'Domlur', pin: '560071', hours: '9:00 AM–5:00 PM', accepted: 'Small electronics & batteries', query: 'EarthForward Collection Center Bengaluru' },
]
const initialInventory = [
  { id: 'AS-1042', item: 'Laptop · RL-2841', stage: 0, condition: 'Repairable' },
  { id: 'AS-1043', item: 'Phone · RL-2836', stage: 1, condition: 'End of life' },
  { id: 'AS-1044', item: 'Cables · RL-2819', stage: 2, condition: 'End of life' },
]
const stages = ['Sorting', 'Dismantling', 'Component extraction', 'Raw material recovery']

function readStoredList(key) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

function saveValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    return false
  }
  return true
}

function downloadCertificate() {
  const certificate = `RELOOP · CERTIFICATE OF RESPONSIBLE RECYCLING

Certificate: RL-CERT-2026-00284
Donor: Alex Morgan
Materials: Mixed electronic equipment
Processing: Certified collection and responsible downstream recycling
Issued: ${new Date().toLocaleDateString()}

This demo certificate is a sample and is not a legal EPR or destruction certificate.`
  const url = URL.createObjectURL(new Blob([certificate], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'reloop-recycling-certificate.txt'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function SectionHeading({ kicker, title, detail }) {
  return <div className="feature-heading"><div><span>{kicker}</span><h3>{title}</h3></div>{detail && <p>{detail}</p>}</div>
}

function FeatureWorkspace({ onNotice, requests, activePage, role, userId }) {
  const redeemedStorageKey = `${redeemedKey}-${userId}`
  const [redeemed, setRedeemed] = useState(() => readStoredList(redeemedStorageKey))
  const [checkedSteps, setCheckedSteps] = useState([])
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [classificationConsent, setClassificationConsent] = useState(false)
  const [classification, setClassification] = useState(null)
  const [classificationError, setClassificationError] = useState('')
  const [fallbackCategory, setFallbackCategory] = useState('Other')
  const [isClassifying, setIsClassifying] = useState(false)
  const [route, setRoute] = useState([])
  const [routeOptimized, setRouteOptimized] = useState(false)
  const [bagId, setBagId] = useState('')
  const [pickupPhoto, setPickupPhoto] = useState(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [proofSaved, setProofSaved] = useState(false)
  const [proofRecords, setProofRecords] = useState([])
  const [inventory, setInventory] = useState(initialInventory)
  const [decision, setDecision] = useState('')
  const [companySubmitted, setCompanySubmitted] = useState(false)
  const [eventJoined, setEventJoined] = useState(false)
  const [eventCount, setEventCount] = useState(0)
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false)
  const signatureRef = useRef(null)
  const drawingRef = useRef(false)
  const onNoticeRef = useRef(onNotice)

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  useEffect(() => {
    onNoticeRef.current = onNotice
  }, [onNotice])

  useEffect(() => {
    let active = true
    getWorkspaceData().then(({ records, communityCount }) => {
      if (!active) return
      const saved = Object.fromEntries(records.map(({ kind, data }) => [kind, data]))
      if (saved.checklist) setCheckedSteps(saved.checklist.checkedSteps)
      if (saved.rewards) {
        setRedeemed(saved.rewards.items)
        saveValue(redeemedStorageKey, saved.rewards.items)
      }
      if (saved.proofs) {
        setProofRecords(saved.proofs.records)
        setProofSaved(saved.proofs.records.length > 0)
      }
      if (saved.inventory) {
        const stageById = new Map(saved.inventory.items.map((item) => [item.id, item.stage]))
        setInventory((items) => items.map((item) => ({ ...item, stage: stageById.get(item.id) ?? item.stage })))
      }
      if (saved.refurbish) setDecision(saved.refurbish.decision)
      if (saved.corporate) setCompanySubmitted(true)
      if (saved.community) setEventJoined(true)
      setEventCount(communityCount)
      setWorkspaceLoaded(true)
    }).catch((error) => {
      if (active) {
        setWorkspaceLoaded(true)
        onNoticeRef.current(`Could not load saved workspace tools: ${error.message}`)
      }
    })
    return () => { active = false }
  }, [redeemedStorageKey])

  async function saveFeature(kind, data, successMessage) {
    try {
      await saveWorkspaceData(kind, data)
      if (successMessage) onNotice(successMessage)
      return true
    } catch (error) {
      onNoticeRef.current(`Could not save this workspace update: ${error.message}`)
      return false
    }
  }

  const points = requests.filter((request) => ['Collected', 'Processed'].includes(request.status))
      .reduce((total, request) => total + (Number(request.rewardPoints) || 0), 0)
    - redeemed.reduce((total, item) => total + (Number(item.cost) || 0), 0)

  const visibleCards = {
    rewards: ['rewards'],
    devices: ['wipe-guide', 'photo-classifier'],
    centers: ['dropoff-map'],
    field: ['driver-routes', 'pickup-proof'],
    partner: ['partner-inventory', 'refurbish'],
    certificates: ['certificates'],
    company: ['corporate'],
    community: ['community-events'],
  }[activePage] || []
  if (visibleCards.length === 0) return null

  async function redeemReward(reward) {
    if (points < reward.cost) {
      onNotice(`You need ${reward.cost - points} more points to redeem this reward.`)
      return
    }
    const updated = [...redeemed, { name: reward.name, cost: reward.cost }]
    if (!await saveFeature('rewards', { items: updated })) return
    setRedeemed(updated)
    saveValue(redeemedStorageKey, updated)
    onNotice(`${reward.name} added to your rewards.`)
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onNotice('Choose a JPEG, PNG, or WebP image smaller than 5 MB.')
      return
    }
    setPhotoUrl(URL.createObjectURL(file))
    setPhotoName(file.name)
    setPhotoFile(file)
    setClassificationConsent(false)
    setClassification(null)
    setClassificationError('')
  }

  async function classifyPhoto() {
    if (!photoFile || !classificationConsent) return
    setIsClassifying(true)
    setClassificationError('')
    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = String(reader.result)
          const separator = dataUrl.indexOf(',')
          if (separator < 0) reject(new Error('Could not read the selected photo.'))
          else resolve(dataUrl.slice(separator + 1))
        }
        reader.onerror = () => reject(new Error('Could not read the selected photo. Choose another image.'))
        reader.readAsDataURL(photoFile)
      })
      const result = await classifyItemPhoto({ imageData, mimeType: photoFile.type })
      setClassification(result)
    } catch (error) {
      if (!error.status || error.status >= 500) {
        setClassification({
          category: fallbackCategory,
          hazardLevel: 'unknown',
          materials: ['Not identified offline'],
          confidence: 0,
          safetyNote: 'This local demo uses your selected category and cannot inspect the image or assess hazardous materials.',
          disclaimer: 'Local fallback only. No AI analysis was performed.',
          source: 'demo',
        })
        setClassificationError('The photo service is unavailable. Showing a clearly labeled local demo fallback.')
      } else {
        setClassificationError(error.message || 'The photo could not be classified. Please try again.')
      }
    } finally {
      setIsClassifying(false)
    }
  }

  function startSignature(event) {
    const canvas = signatureRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    const bounds = canvas.getBoundingClientRect()
    const scaleX = canvas.width / bounds.width
    const scaleY = canvas.height / bounds.height
    const x = (event.clientX - bounds.left) * scaleX
    const y = (event.clientY - bounds.top) * scaleY
    drawingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(x, y)
  }

  function drawSignature(event) {
    if (!drawingRef.current) return
    const canvas = signatureRef.current
    const context = canvas.getContext('2d')
    const bounds = canvas.getBoundingClientRect()
    context.lineWidth = 3
    context.lineCap = 'round'
    context.strokeStyle = '#287b55'
    context.lineTo((event.clientX - bounds.left) * (canvas.width / bounds.width), (event.clientY - bounds.top) * (canvas.height / bounds.height))
    context.stroke()
    setHasSignature(true)
  }

  function clearSignature() {
    const canvas = signatureRef.current
    canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function attachPickupPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      onNotice('Choose a JPEG, PNG, or WebP condition photo smaller than 1 MB.')
      event.target.value = ''
      setPickupPhoto(null)
      return
    }
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Could not read the condition photo.'))
        reader.readAsDataURL(file)
      })
      setPickupPhoto({ name: file.name, data })
    } catch (error) {
      onNotice(error.message)
    }
  }

  async function saveProof(event) {
    event.preventDefault()
    if (!bagId.trim() || !pickupPhoto || !hasSignature) {
      onNotice('Enter a bag QR / ID, add a condition photo, and capture the recipient signature.')
      return
    }
    if (proofRecords.length >= 4) {
      onNotice('This account has reached the four-record proof limit. Contact a recycling partner for secure proof archiving.')
      return
    }
    const record = {
      bagId: bagId.trim(),
      photoName: pickupPhoto.name,
      photoData: pickupPhoto.data,
      signatureData: signatureRef.current.toDataURL('image/png'),
    }
    try {
      await savePickupProof(record)
    } catch (error) {
      onNoticeRef.current(`Could not save pickup proof: ${error.message}`)
      return
    }
    setProofRecords((current) => [...current, { bagId: record.bagId, photoName: record.photoName }])
    setProofSaved(true)
    onNotice(`Pickup proof photo and signature saved for bag ${bagId.trim()}.`)
  }

  async function moveInventoryItem(id) {
    const updated = inventory.map((item) => item.id === id
      ? { ...item, stage: Math.min(item.stage + 1, stages.length - 1) }
      : item)
    if (!await saveFeature('inventory', { items: updated.map(({ id: itemId, stage }) => ({ id: itemId, stage })) })) return
    setInventory(updated)
  }

  function optimizeRoute() {
    const stops = requests
      .filter((request) => !['Collected', 'Processed'].includes(request.status) && request.pinCode)
      .map((request) => ({
        id: request._id,
        area: request.area,
        pin: request.pinCode,
        slot: request.preferredSlot || 'Time to be confirmed',
      }))
      .sort((a, b) => a.pin.localeCompare(b.pin) || a.slot.localeCompare(b.slot))
    setRoute(stops)
    setRouteOptimized(true)
  }

  async function joinEvent() {
    if (eventJoined) return
    if (!await saveFeature('community', { joined: true }, 'You’re signed up for the community drive.')) return
    setEventJoined(true)
    setEventCount((current) => current + 1)
  }

  const completedWipingSteps = checkedSteps.length

  return (
    <section className="feature-workspace" id="features">
      <div className="feature-intro">
        <div><p className="section-kicker">{role === 'company' ? 'CORPORATE WORKSPACE' : 'INDIVIDUAL WORKSPACE'}</p><h2>{activePage === 'field' ? 'Collection routes' : activePage === 'partner' ? 'Asset recovery' : activePage === 'devices' ? 'Prepare and identify devices' : activePage === 'community' ? 'Community programs' : activePage === 'centers' ? 'Drop-off locations' : activePage === 'certificates' ? 'Compliance records' : activePage === 'company' ? 'Corporate & bulk solutions' : 'Rewards & eco credits'}</h2><p>{activePage === 'field' ? 'Routes are built from your scheduled pickups and chosen PIN codes.' : 'Only this selected workspace is shown.'}</p></div>
        <span className="demo-badge">Workspace tools</span>
      </div>

      <div className="feature-grid">
        <article className="feature-card" id="rewards" hidden={!visibleCards.includes('rewards')}>
          <SectionHeading kicker="REWARDS & IMPACT" title="Your eco credits" detail={`${points} points available`} />
          <p className="feature-copy">Points are estimated from item category, age, and weight. Final credits are confirmed after a partner weighs the collection.</p>
          <div className="reward-list">
            {rewards.map((reward) => <div className="reward-row" key={reward.name}><div><strong>{reward.name}</strong><span>{reward.type} · {reward.cost} pts</span></div><button className="feature-button" disabled={points < reward.cost} onClick={() => redeemReward(reward)}>Redeem</button></div>)}
          </div>
          <div className="recovery-metrics"><span><strong>24.8 kg</strong> recycled</span><span><strong>18.2 kg</strong> CO₂ avoided</span><span><strong>0.8 g Au</strong> recovered</span><span><strong>42 g Cu</strong> recovered</span></div>
          <p className="feature-footnote">Impact and precious-metal figures are estimates based on item mix, not certified measurements.</p>
          {redeemed.length > 0 && <p className="feature-success">Redeemed: {redeemed.map((item) => item.name).join(', ')}</p>}
        </article>

        <article className="feature-card" id="wipe-guide" hidden={!visibleCards.includes('wipe-guide')}>
          <SectionHeading kicker="BEFORE YOU HAND IT OVER" title="Data-wiping checklist" detail={`${completedWipingSteps}/${wipingSteps.length} complete`} />
          <p className="feature-copy">Back up anything you need first. A factory reset permanently removes local data.</p>
          <div className="checklist">
            {wipingSteps.map((step, index) => <label key={step} className="checklist-row"><input type="checkbox" checked={checkedSteps.includes(index)} disabled={!workspaceLoaded} onChange={async () => {
              const updated = checkedSteps.includes(index) ? checkedSteps.filter((stepIndex) => stepIndex !== index) : [...checkedSteps, index]
              if (await saveFeature('checklist', { checkedSteps: updated })) setCheckedSteps(updated)
            }} /><span>{step}</span></label>)}
          </div>
          <p className="feature-footnote">Menu names vary by device. Check the manufacturer’s instructions if you need help.</p>
        </article>

        <article className="feature-card" id="photo-classifier" hidden={!visibleCards.includes('photo-classifier')}>
          <SectionHeading kicker="PHOTO INTAKE" title="Photo AI classification" detail="Image-assisted item triage" />
          <p className="feature-copy">Upload an item photo for category and visual hazard triage through the server-configured vision provider.</p>
          <label className="upload-control">Choose item photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} /></label>
          {photoUrl && <div className="photo-preview"><img src={photoUrl} alt={`Selected item: ${photoName}`} /><span>{photoName}</span></div>}
          {photoFile && <label className="consent-row"><input type="checkbox" checked={classificationConsent} onChange={(event) => setClassificationConsent(event.target.checked)} /><span>I agree to send this image to the vision provider configured by the server for analysis.</span></label>}
          <label className="fallback-category">If the photo service is unavailable, use my selected category
            <select value={fallbackCategory} onChange={(event) => setFallbackCategory(event.target.value)}>{['Phones & tablets', 'Computers', 'Accessories', 'Home electronics', 'Other'].map((category) => <option key={category}>{category}</option>)}</select>
          </label>
          <button className="feature-button feature-button-primary" disabled={!photoFile || !classificationConsent || isClassifying} onClick={classifyPhoto}>{isClassifying ? 'Analyzing photo…' : 'Classify photo'}</button>
          {classificationError && <p className="integration-note" role="alert">{classificationError}</p>}
          {classification && <div className={`classification-result ${classification.source === 'demo' ? 'classification-demo' : ''}`}><strong>{classification.source === 'demo' ? 'LOCAL DEMO FALLBACK' : 'AI PHOTO ESTIMATE'} · {classification.category}</strong><span>Visual hazard level: {classification.hazardLevel}</span><span>Materials: {classification.materials.join(', ') || 'Not identified'}</span>{classification.source !== 'demo' && <span>Confidence: {Math.round(classification.confidence * 100)}%</span>}<span>{classification.safetyNote}</span><small>{classification.disclaimer}</small></div>}
          <p className="feature-footnote">The image is sent only after consent. Visual analysis is an estimate, not a materials test or safety certification.</p>
        </article>

        <article className="feature-card" id="driver-routes" hidden={!visibleCards.includes('driver-routes')}>
          <SectionHeading kicker="FIELD OPERATIONS" title="Pickup route planner" detail="Batch by pin code and slot" />
          <p className="feature-copy">Open pickups are grouped by PIN code, then preferred collection slot.</p>
          <button className="feature-button feature-button-primary" onClick={optimizeRoute}>Plan my pickup route</button>
          {routeOptimized && route.length > 0 && <ol className="route-list">{route.map((stop) => <li key={stop.id}><strong>{stop.area} · {stop.pin}</strong><span>{stop.id} · {stop.slot}</span></li>)}</ol>}
          {routeOptimized && route.length === 0 && <p className="empty-state"><strong>No pickups to route yet</strong><span>Create bulk pickups with a PIN code and time slot.</span></p>}
          <p className="feature-footnote">This is a local route grouping preview, not traffic-aware driver navigation.</p>
        </article>

        <article className="feature-card" id="pickup-proof" hidden={!visibleCards.includes('pickup-proof')}>
          <SectionHeading kicker="DRIVER APP" title="Digital proof of pickup" detail="Bag ID · condition photo · signature" />
          <form className="proof-form" onSubmit={saveProof}>
            <label>Scan with a connected QR reader or enter bag ID<input value={bagId} onChange={(event) => setBagId(event.target.value)} placeholder="e.g. RL-BAG-2841" required /></label>
            <label>Item condition photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={attachPickupPhoto} required /></label>
            {pickupPhoto && <span className="proof-file">Photo attached: {pickupPhoto.name}</span>}
            <div className="signature-label"><span>Recipient signature</span><button type="button" className="text-button" onClick={clearSignature}>Clear</button></div>
            <canvas ref={signatureRef} className="signature-canvas" width="600" height="140" aria-label="Draw recipient signature" onPointerDown={startSignature} onPointerMove={drawSignature} onPointerUp={() => { drawingRef.current = false }} onPointerCancel={() => { drawingRef.current = false }} />
            <button className="feature-button feature-button-primary" type="submit" disabled={!workspaceLoaded}>Save pickup proof</button>
            {proofSaved && <p className="feature-success">Pickup proof record saved to your account.</p>}
          </form>
        </article>

        <article className="feature-card" id="dropoff-map" hidden={!visibleCards.includes('dropoff-map')}>
          <SectionHeading kicker="DROP-OFF NETWORK" title="Find a certified center" detail="Bengaluru · sample locations" />
          <div className="center-map" role="img" aria-label="Schematic map showing three Bengaluru drop-off centers"><span className="map-road road-one" /><span className="map-road road-two" /><i className="map-marker marker-one">1</i><i className="map-marker marker-two">2</i><i className="map-marker marker-three">3</i><span className="map-caption">BENGALURU</span></div>
          <div className="feature-centers">{centers.map((center) => <div className="feature-center" key={center.name}><div><strong>{center.name}</strong><span>{center.area} · {center.pin} · {center.hours}</span><small>Accepts: {center.accepted}</small></div><a className="feature-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.query)}`} target="_blank" rel="noreferrer">Directions ↗</a></div>)}</div>
        </article>

        <article className="feature-card" id="partner-inventory" hidden={!visibleCards.includes('partner-inventory')}>
          <SectionHeading kicker="PARTNER WORKSPACE" title="Material recovery inventory" detail="Processing-stage tracking" />
          <div className="inventory-list">{inventory.map((item) => <div className="inventory-row" key={item.id}><div><strong>{item.item}</strong><span>{item.id} · {item.condition}</span></div><div className="inventory-stage"><span>{stages[item.stage]}</span><button className="text-button" onClick={() => moveInventoryItem(item.id)} disabled={item.stage === stages.length - 1}>{item.stage === stages.length - 1 ? 'Complete' : 'Advance →'}</button></div></div>)}</div>
        </article>

        <article className="feature-card" id="refurbish" hidden={!visibleCards.includes('refurbish')}>
          <SectionHeading kicker="RECOVERY DECISION" title="Refurbish or recycle?" detail="Triage before dismantling" />
          <p className="feature-copy">Functional and repairable items can be assessed for reuse before they enter the recycling stream.</p>
          <label className="select-label">Item condition<select value={decision} onChange={async (event) => {
            const updated = event.target.value
            if (await saveFeature('refurbish', { decision: updated })) setDecision(updated)
          }}><option value="">Choose a condition</option><option value="functional">Functional and tested</option><option value="repairable">Repairable</option><option value="end-of-life">End of life or unsafe</option></select></label>
          {decision && <div className="decision-result"><strong>{decision === 'end-of-life' ? 'Route to certified recycling' : 'Assess for refurbishment or donation'}</strong><span>{decision === 'end-of-life' ? 'Keep hazardous or damaged items with an authorized recycler.' : 'Record a functional test and data wipe before resale or educational donation.'}</span></div>}
        </article>

        <article className="feature-card" id="certificates" hidden={!visibleCards.includes('certificates')}>
          <SectionHeading kicker="COMPLIANCE" title="Recycling certificates" detail="Individual & corporate donors" />
          <p className="feature-copy">Generate a sample safe-recycling certificate for your records. Official EPR or destruction certificates must come from an authorized partner.</p>
          <button className="feature-button feature-button-primary" onClick={downloadCertificate}>Download sample certificate</button>
          <p className="feature-footnote">Demo document only — not legal proof of destruction or regulatory compliance.</p>
        </article>

        <article className="feature-card" id="corporate" hidden={!visibleCards.includes('corporate')}>
          <SectionHeading kicker="CORPORATE SOLUTIONS" title="Bulk e-waste drive" detail="Pickup · secure destruction · ESG" />
          {companySubmitted ? <p className="feature-success">Corporate drive request saved to your account. The Reloop team would follow up to confirm scope and destruction requirements.</p> : <form className="compact-form" onSubmit={async (event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const data = { companyName: String(form.get('company') || ''), quantity: Number(form.get('quantity')), shredding: String(form.get('shredding')), email: String(form.get('email') || '') }
            if (await saveFeature('corporate', data, 'Corporate drive request saved to your account.')) setCompanySubmitted(true)
          }}><label>Company name<input name="company" placeholder="Your organization" required /></label><div className="form-row"><label>Approx. devices<input name="quantity" type="number" min="1" max="10000" defaultValue="25" required /></label><label>Need drive shredding?<select name="shredding"><option>No</option><option>Yes — request quote</option></select></label></div><label>Work email<input name="email" type="email" placeholder="you@company.com" required /></label><button className="feature-button feature-button-primary" type="submit" disabled={!workspaceLoaded}>Request corporate pickup</button></form>}
          <div className="esg-summary"><strong>ESG report preview</strong><span>Weight diverted · estimated CO₂ avoided · recovery route · destruction record status</span></div>
        </article>

        <article className="feature-card" id="community-events" hidden={!visibleCards.includes('community-events')}>
          <SectionHeading kicker="COMMUNITY DROP-OFF" title="Weekend e-waste drive" detail="Indiranagar · Saturday, 9 AM–1 PM" />
          <p className="feature-copy">Bring phones, laptops, chargers, and small electronics to the community collection point.</p>
          <div className="event-progress"><div><strong>{eventCount} / 60 sign-ups</strong><span>Shared neighborhood goal</span></div><div className="progress-track"><i style={{ width: `${Math.min(eventCount / 60 * 100, 100)}%` }} /></div></div>
          <button className="feature-button feature-button-primary" disabled={!workspaceLoaded || eventJoined} onClick={joinEvent}>{eventJoined ? 'You’re signed up' : 'Join this community drive'}</button>
        </article>
      </div>
    </section>
  )
}

export default FeatureWorkspace
