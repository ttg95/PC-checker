import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, ExternalLink, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { useAccounts } from '../../utils/AccountContext';

const TOKEN_PRICE_AUD = 30;

export default function TokenPurchase() {
  const {
    activeAccount,
    createCheckoutSession,
    refreshAccountLink,
    creditLabel,
    isSupabaseBacked,
  } = useAccounts();
  const [tokenCount, setTokenCount] = useState(1);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStandardAccount = Boolean(activeAccount && activeAccount.credits !== null);
  const total = tokenCount * TOKEN_PRICE_AUD;

  const handleTokenChange = (value: string) => {
    const next = Math.max(1, Math.min(100, Math.floor(Number(value) || 1)));
    setTokenCount(next);
  };

  const handleBuyTokens = async () => {
    setMessage(null);
    setError(null);
    setIsStartingCheckout(true);

    try {
      const checkoutUrl = await createCheckoutSession(tokenCount);
      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      setMessage('Stripe checkout opened. Return here after payment and refresh credits.');
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
          <Wallet className="w-6 h-6 text-emerald-300" />
          <div>
            <h1 className="text-2xl font-bold text-white">Buy Scan Tokens</h1>
            <p className="text-sm text-slate-400">A$30 AUD per scan token through Stripe checkout.</p>
          </div>
        </div>
        {activeAccount && (
          <button
            type="button"
            onClick={() => void refreshAccountLink()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:border-cyan-500/50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh credits
          </button>
        )}
      </div>

      {(message || error) && (
        <div className={`border rounded-lg px-4 py-3 text-sm ${error ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Signed in as" value={activeAccount?.email || 'Not signed in'} />
        <MetricCard label="Available scans" value={activeAccount ? creditLabel : 'Sign in required'} />
        <MetricCard label="Token price" value="A$30 AUD" />
      </section>

      {!activeAccount && (
        <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Sign In Required</h2>
              <p className="text-sm text-slate-400">Tokens are added to the account used at checkout.</p>
            </div>
          </div>
          <NavLink
            to="/accounts"
            className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400"
          >
            Go to Sign In
          </NavLink>
        </section>
      )}

      {activeAccount?.credits === null && (
        <section className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Unlimited Account</h2>
              <p className="text-sm text-slate-400">This account does not need scan tokens.</p>
            </div>
          </div>
        </section>
      )}

      {isStandardAccount && (
        <section className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <CreditCard className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Purchase Tokens</h2>
              <p className="text-sm text-slate-400">Choose the number of scans, then complete payment in Stripe.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto] lg:items-end">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Tokens</label>
              <input
                type="number"
                min={1}
                max={100}
                value={tokenCount}
                onChange={event => handleTokenChange(event.target.value)}
                className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="rounded-lg border border-slate-700/50 bg-slate-950/50 px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
              <p className="text-xl font-semibold text-white">A${total} AUD</p>
            </div>

            <button
              type="button"
              onClick={() => void handleBuyTokens()}
              disabled={!isSupabaseBacked || isStartingCheckout}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              <ExternalLink className="w-4 h-4" />
              {isStartingCheckout ? 'Opening Stripe...' : 'Buy with Stripe'}
            </button>
          </div>

          {!isSupabaseBacked && (
            <p className="text-xs text-amber-300">Stripe payments require Supabase to be connected.</p>
          )}
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white break-words">{value}</p>
    </div>
  );
}
