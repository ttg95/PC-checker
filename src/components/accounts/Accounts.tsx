import { useState } from 'react';
import { Ban, CreditCard, Crown, ListChecks, LogIn, LogOut, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { useAccounts, type Account } from '../../utils/AccountContext';
import { cheatProviders, defaultRules, nonStandardPaths } from '../../utils/riskEngine';
import { formatTimestamp } from '../../utils/id';

export default function Accounts() {
  const {
    accounts,
    activeAccount,
    exclusions,
    createAccount,
    login,
    logout,
    addCredits,
    setCredits,
    addExclusion,
    removeExclusion,
    creditLabel,
    isSupabaseBacked,
  } = useAccounts();
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [initialCredits, setInitialCredits] = useState(5);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [creditEdits, setCreditEdits] = useState<Record<string, number>>({});
  const [exclusionTerm, setExclusionTerm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMaster = activeAccount?.role === 'master';
  const isFirstLocalAccount = !isSupabaseBacked && accounts.length === 0;
  const isCreatingMaster = !activeAccount && (isSupabaseBacked || isFirstLocalAccount);
  const canCreateAccounts = isCreatingMaster || isMaster;
  const showSignIn = isSupabaseBacked || accounts.length > 0;

  const handleCreate = async () => {
    setMessage(null);
    setError(null);
    try {
      const account = await createAccount({
        email: createEmail,
        password: createPassword,
        initialCredits,
      });
      setCreateEmail('');
      setCreatePassword('');
      setInitialCredits(5);
      setMessage(account.role === 'master' ? 'Master account created with unlimited credits.' : 'Account created.');
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

  const handleAddExclusion = async () => {
    setMessage(null);
    setError(null);
    try {
      await addExclusion(exclusionTerm);
      setExclusionTerm('');
      setMessage('Exclusion added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add exclusion.');
    }
  };

  const handleRemoveExclusion = async (id: string) => {
    setMessage(null);
    setError(null);
    try {
      await removeExclusion(id);
      setMessage('Exclusion removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove exclusion.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Accounts</h1>
            <p className="text-sm text-slate-400">{isSupabaseBacked ? 'Supabase-backed accounts, master access, and scan credits' : 'Account creation, master access, and scan credits'}</p>
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
            {isMaster ? <Crown className="w-6 h-6 text-amber-300" /> : <CreditCard className="w-6 h-6 text-cyan-400" />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Active Account</p>
            <p className="text-lg font-semibold text-white">{activeAccount?.email || 'No account signed in'}</p>
            <p className="text-sm text-slate-400">{activeAccount ? `${roleLabel(activeAccount)} - ${creditLabel}` : 'Create or sign in before scanning.'}</p>
          </div>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {canCreateAccounts ? (
          <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">{isCreatingMaster ? 'Create Master Account' : 'Create Account'}</h2>
            </div>
            <AccountInput label="Email" type="email" value={createEmail} onChange={setCreateEmail} />
            <AccountInput label="Password" type="password" value={createPassword} onChange={setCreatePassword} />
            {isMaster && (
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Starting Credits</label>
                <input
                  type="number"
                  min={0}
                  value={initialCredits}
                  onChange={e => setInitialCredits(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            )}
            <button onClick={() => void handleCreate()} className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400">
              <Plus className="w-4 h-4" />
              {isCreatingMaster ? 'Create Master Account' : 'Create Account'}
            </button>
            {isCreatingMaster && <p className="text-xs text-slate-500">If no master account exists yet, the first account created receives unlimited credits.</p>}
          </section>
        ) : (
          <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-200">Create Account</h2>
            </div>
            <p className="text-sm text-slate-400">Sign in as the master account to create additional accounts.</p>
          </section>
        )}

        {showSignIn && (
          <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">{isSupabaseBacked ? 'Log In to Supabase' : 'Sign In'}</h2>
            </div>
            <AccountInput label="Email" type="email" value={loginEmail} onChange={setLoginEmail} />
            <AccountInput label="Password" type="password" value={loginPassword} onChange={setLoginPassword} />
            <button onClick={() => void handleLogin()} className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-slate-100 hover:border-cyan-500/50">
              <LogIn className="w-4 h-4" />
              {isSupabaseBacked ? 'Log In and Link Backend' : 'Sign In'}
            </button>
            {isSupabaseBacked && <p className="text-xs text-slate-500">Logging in links this app session to the Supabase backend and loads the account from Supabase.</p>}
          </section>
        )}
      </div>

      {isMaster && (
        <>
          <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">Master Account Management</h2>
            </div>
            <div className="space-y-3">
              {accounts.map(account => (
                <div key={account.id} className="grid xl:grid-cols-[minmax(0,1fr)_auto] gap-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white break-all">{account.email}</p>
                      <RoleBadge account={account} />
                      {activeAccount?.id === account.id && <span className="text-[10px] uppercase tracking-wider text-cyan-300">Active</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Created {formatTimestamp(account.createdAt)} - Last login {account.lastLoginAt ? formatTimestamp(account.lastLoginAt) : 'Never'}</p>
                    <p className="text-sm text-slate-300 mt-2">{account.credits === null ? 'Unlimited credits' : `${account.credits} scan credit${account.credits === 1 ? '' : 's'}`}</p>
                  </div>
                  {account.credits !== null && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => void addCredits(account.id, 1)} className="px-3 py-2 rounded-lg bg-slate-700 text-sm text-slate-100 hover:bg-slate-600">+1</button>
                      <button onClick={() => void addCredits(account.id, 5)} className="px-3 py-2 rounded-lg bg-slate-700 text-sm text-slate-100 hover:bg-slate-600">+5</button>
                      <input
                        type="number"
                        min={0}
                        value={creditEdits[account.id] ?? account.credits}
                        onChange={e => setCreditEdits(prev => ({ ...prev, [account.id]: Number(e.target.value) }))}
                        className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                      />
                      <button onClick={() => void setCredits(account.id, creditEdits[account.id] ?? account.credits)} className="px-3 py-2 rounded-lg bg-cyan-500 text-sm text-white hover:bg-cyan-400">Set</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
              <h2 className="text-sm font-semibold text-slate-200">Master Trigger Panel</h2>
            </div>

            <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] gap-5">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rules and Corresponding Triggers</h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                  <table className="min-w-[1100px] w-full text-sm">
                    <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="text-left px-4 py-3 min-w-64">Rule</th>
                        <th className="text-left px-4 py-3 min-w-80">Trigger</th>
                        <th className="text-left px-4 py-3 min-w-28">Level</th>
                        <th className="text-left px-4 py-3 min-w-24">Weight</th>
                        <th className="text-left px-4 py-3 min-w-96">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {defaultRules.map(rule => (
                        <tr key={rule.id} className="bg-slate-900/40">
                          <td className="px-4 py-3 text-slate-100 font-medium">{rule.name}</td>
                          <td className="px-4 py-3 text-slate-300 font-mono text-xs break-all">{rule.condition}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-xs uppercase">{rule.riskLevel}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{rule.weight}</td>
                          <td className="px-4 py-3 text-slate-400">{rule.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <TriggerList title="Cheat Provider Terms" items={cheatProviders} />
                <TriggerList title="Non-standard Paths" items={nonStandardPaths} />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5 space-y-4">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Exclusion List</h3>
              </div>
              <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-3">
                <input
                  value={exclusionTerm}
                  onChange={e => setExclusionTerm(e.target.value)}
                  placeholder="Path, process name, device id, registry key, or trigger text"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button onClick={() => void handleAddExclusion()} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-sm font-medium text-white hover:bg-cyan-400">
                  <Plus className="w-4 h-4" />
                  Add Exclusion
                </button>
              </div>
              <div className="space-y-2">
                {exclusions.map(exclusion => (
                  <div key={exclusion.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                    <div>
                      <p className="text-sm text-slate-100 break-all">{exclusion.term}</p>
                      <p className="text-xs text-slate-500">Added {formatTimestamp(exclusion.createdAt)}</p>
                    </div>
                    <button onClick={() => void handleRemoveExclusion(exclusion.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10" aria-label="Remove exclusion">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {exclusions.length === 0 && <p className="text-sm text-slate-500">No exclusions have been added.</p>}
              </div>
            </div>
          </section>
        </>
      )}
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

function RoleBadge({ account }: { account: Account }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${account.role === 'master' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-600/30 text-slate-300'}`}>
      {account.role === 'master' && <Crown className="w-3 h-3" />}
      {account.role}
    </span>
  );
}

function TriggerList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span key={item} className="px-2 py-1 rounded bg-slate-900 text-xs text-slate-300 border border-slate-700/50 break-all">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function roleLabel(account: Account): string {
  return account.role === 'master' ? 'Master account' : 'Standard account';
}
