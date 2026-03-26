import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Users, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [role, setRole] = useState<'senior' | 'worker'>('senior');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (r: 'senior' | 'worker') => {
    setRole(r);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signUp(email, password, name, role);
    if (result.error) {
      setError(result.error);
    } else {
      navigate(role === 'senior' ? '/senior' : '/worker');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join SafeConnect today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {step === 'role' ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">I am a...</h2>
              <p className="text-sm text-gray-500 mb-6">Choose the option that best describes you</p>

              <button
                onClick={() => handleRoleSelect('senior')}
                className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <UserCheck className="w-6 h-6 text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">Senior / Older Person</p>
                  <p className="text-sm text-gray-500">I want to manage my safety and find services</p>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('worker')}
                className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-sky-500 hover:bg-sky-50 transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                  <Users className="w-6 h-6 text-sky-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-lg">Community Support Worker</p>
                  <p className="text-sm text-gray-500">I manage and coordinate community services</p>
                </div>
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setStep('role')}
                className="text-sm text-teal-600 hover:text-teal-700 mb-4 inline-block"
              >
                &larr; Change role
              </button>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {role === 'senior' ? 'Senior Account' : 'Worker Account'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">Fill in your details below</p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                  id="name"
                  label="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
                <FormInput
                  id="email"
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <FormInput
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
                <Button type="submit" fullWidth size="lg" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 font-medium hover:text-teal-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
