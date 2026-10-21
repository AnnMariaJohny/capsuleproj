import { useState } from 'react'
import { loginAccount, registerAccount, saveSession } from '../services/api.js'
import '../styles/AuthPage.css'

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('individual')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    const payload = { ...values, role }
    try {
      const session = mode === 'register'
        ? await registerAccount(payload)
        : await loginAccount(payload)
      saveSession(session)
      onAuthenticated(session.user)
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <a className="brand auth-brand" href="#welcome"><span className="brand-mark">♻</span><span>reloop<span className="brand-period">.</span></span></a>
        <div className="auth-promise"><span>BETTER TECH. BETTER TOMORROW.</span><h1>Give old tech<br />a better <em>next life.</em></h1><p>Schedule a pickup, find trusted drop-off points, and see the difference your e-waste makes.</p></div>
        <div className="auth-aside-foot">Thoughtfully recycling in Bengaluru</div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="section-kicker">{mode === 'register' ? 'JOIN THE CIRCULAR MOVEMENT' : 'WELCOME BACK'}</p>
          <h2>{mode === 'register' ? 'Create your account' : 'Sign in to Reloop'}</h2>
          <p className="auth-intro">Choose the workspace that fits how you recycle.</p>
          <div className="account-type-switch" role="group" aria-label="Account type">
            <button type="button" className={role === 'individual' ? 'account-type active' : 'account-type'} onClick={() => setRole('individual')}>Individual</button>
            <button type="button" className={role === 'company' ? 'account-type active' : 'account-type'} onClick={() => setRole('company')}>Company</button>
          </div>
          <p className="account-type-note">{role === 'company' ? 'Bulk collection, asset recovery, and ESG tools for organizations.' : 'Pickups, eco credits, and impact tracking for your household.'}</p>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <>
              <label>Your name<input name="name" autoComplete="name" required maxLength="80" placeholder={role === 'company' ? 'Contact person' : 'Full name'} /></label>
              {role === 'company' && <>
                <label>Company name<input name="companyName" autoComplete="organization" required maxLength="120" placeholder="Organization name" /></label>
                <label>Company size<select name="companySize" defaultValue="1–50 employees"><option>1–50 employees</option><option>51–250 employees</option><option>251–1,000 employees</option><option>1,000+ employees</option></select></label>
              </>}
            </>}
            <label>Work email<input name="email" type="email" autoComplete="email" required maxLength="254" placeholder={role === 'company' ? 'name@company.com' : 'you@example.com'} /></label>
            <label>Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength="10" maxLength="128" required placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'} /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button button-primary auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : mode === 'register' ? `Create ${role} account` : `Sign in as ${role === 'company' ? 'company' : 'individual'}`}</button>
          </form>
          <p className="auth-mode-switch">{mode === 'login' ? 'New to Reloop?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create account' : 'Log in'}</button></p>
          <p className="auth-security-note">Your password is securely hashed by the server. Use a unique password for this account.</p>
        </div>
      </section>
    </main>
  )
}

export default AuthPage
