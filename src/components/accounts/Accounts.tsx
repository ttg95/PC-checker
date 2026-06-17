import { useState } from 'react';
import { CreditCard, Crown, ExternalLink, LogIn, LogOut, Plus, UserPlus } from 'lucide-react';
import { useAccounts, type Account } from '../../utils/AccountContext';

export default function Accounts() {
  const {
    accounts,
    activeAccount,
    createAccount,
    login,
    requestPasswordReset,
    logout,
    createCheckoutSession,
    refreshAccountLink,
    creditLabel,
    isSupabaseBacked,
  } = useAccounts();
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenCount, setTokenCount] = useState(1);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  const isFirstLocalAccount = !isSupabaseBacked && accounts.length === 0;
  const canCreateAccount = !activeAccount && (isSupabaseBacked || isFirstLocalAccount);
  const showLogin = true;

  const handleCreate = async () => {
    setMessage(null);
    setError(null);
    try {
      const account = await createAccount({
        email: createEmail,
        password: createPassword,
      });
      setCreateEmail('');
      setCreatePassword('');
      setMessage(account.role === 'master' ? 'Master account ready with unlimited credits.' : 'Account created.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    }
  };

  const handleLogin = async () => {
    setMessage(null);
    setError(null);
    try {
      await login(loginEmail, loginPassword);
      setLoginEmail('');
      setLoginPassword('');
      setMessage('Signed in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    }
  };

  const handleForgotPassword = async () => {
    setMessage(null);
    setError(null);
    try {
      await requestPasswordReset(loginEmail || createEmail);
      setMessage('Password reset email sent. Check your inbox for the reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send password reset email.');
    }
  };

  const handleBuyTokens = async () => {
    setMessage(null);
    setError(null);
    setIsStartingCheckout(true);
    try {
      const checkoutUrl = await createCheckoutSession(tokenCount);
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      setMessage('Stripe checkout opened. After payment completes, return here and refresh credits.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Stripe checkout.');
    } finally {
      setIsStartingCheckout(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Sign In</h1>
            <p className="text-sm text-slate-400">Log in, create an account, and manage access.</p>
          </div>
        </div>
        {activeAccount && (
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:border-red-500/40">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        )}
      </div>

      {(message || error) && (
        <div className={`border rounded-lg px-4 py-3 text-sm ${error ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
          {error || message}
        </div>
      )}

      <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cyan-500/10">
            {activeAccount?.role === 'master' ? <Crown className="w-6 h-6 text-amber-300" /> : <CreditCard className="w-6 h-6 text-cyan-400" />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Active Account</p>
            <p className="text-lg font-semibold text-white">{activeAccount?.email || 'No account signed in'}</p>
            <p className="text-sm text-slate-400">{activeAccount ? `${roleLabel(activeAccount)} - ${creditLabel}` : 'Create or sign in before scanning.'}</p>
          </div>
        </div>
      </section>

      {activeAccount && activeAccount.credits !== null && (
        <section className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/10">
                <CreditCard className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Buy Scan Tokens</h2>
                <p className="text-sm text-slate-400">A$30 AUD per scan token. Payments are handled through Stripe.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshAccountLink()}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:border-cyan-500/50"
            >
              Refresh credits
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Tokens</label>
              <input
                type="number"
                min={1}
                max={100}
                value={tokenCount}
                onChange={event => setTokenCount(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 rounded-lg border border-slate-700/50 bg-slate-950/50 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
                <p className="text-lg font-semibold text-white">A${tokenCount * 30} AUD</p>
              </div>
              <button
                type="button"
                onClick={() => void handleBuyTokens()}
                disabled={!isSupabaseBacked || isStartingCheckout}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                <ExternalLink className="w-4 h-4" />
                {isStartingCheckout ? 'Opening Stripe...' : 'Buy with Stripe'}
              </button>
            </div>
          </div>

          {!isSupabaseBacked && (
            <p className="text-xs text-amber-300">Stripe payments require a connected Supabase account.</p>
          )}
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {canCreateAccount && (
          <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">Create Account</h2>
            </div>
            <AccountInput label="Email" type="email" value={createEmail} onChange={setCreateEmail} />
            <AccountInput label="Password" type="password" value={createPassword} onChange={setCreatePassword} />
            <button onClick={() => void handleCreate()} className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400">
              <Plus className="w-4 h-4" />
              Create Account
            </button>
            <p className="text-xs text-slate-500">Standard accounts start with no credits until credits are added.</p>
          </section>
        )}

        {showLogin && (
          <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">Log In</h2>
            </div>
            <AccountInput label="Email" type="email" value={loginEmail} onChange={setLoginEmail} />
            <AccountInput label="Password" type="password" value={loginPassword} onChange={setLoginPassword} />
            <button
              type="button"
              onClick={() => void handleForgotPassword()}
              className="text-left text-xs font-medium text-cyan-300 hover:text-cyan-200"
            >
              Forgot password?
            </button>
            <button onClick={() => void handleLogin()} className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-slate-100 hover:border-cyan-500/50">
              <LogIn className="w-4 h-4" />
              Log In
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function AccountInput({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
      />
    </div>
  );
}

function roleLabel(account: Account): string {
  return account.role === 'master' ? 'Master account' : 'Standard account';
}
