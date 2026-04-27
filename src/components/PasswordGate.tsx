import { LockKeyhole } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';

const PASSWORD_HASH = '4d1229432ab973ed19f0dc12d69650dcf8105190056d3cea5c218a0a97b81c04';
const SESSION_KEY = 'safeconnect-site-unlocked-v1';

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function readInitialUnlockedState(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(readInitialUnlockedState);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim()) {
      setError('Please enter the website password.');
      return;
    }

    setChecking(true);
    setError('');

    try {
      const nextHash = await sha256Hex(password);

      if (nextHash !== PASSWORD_HASH) {
        setError('Incorrect password. Please try again.');
        return;
      }

      try {
        sessionStorage.setItem(SESSION_KEY, 'true');
      } catch {
        // Access can still continue for this render even if session storage is unavailable.
      }

      setUnlocked(true);
    } catch {
      setError('Password check is unavailable in this browser.');
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) {
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SafeConnect</h1>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              This project website is password protected for course review.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="site-password" className="block text-sm font-medium text-gray-700">
              Website password
            </label>
            <input
              id="site-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 block w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="Enter password"
            />
            {error ? <p className="mt-2 text-sm font-medium text-red-600">{error}</p> : null}
          </div>

          <button
            type="submit"
            disabled={checking}
            className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
          >
            {checking ? 'Checking...' : 'Enter website'}
          </button>
        </form>
      </section>
    </main>
  );
}
