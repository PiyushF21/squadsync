import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Talk directly to Supabase to verify the user
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      // Success! Teleport them straight to the dashboard
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-200 via-yellow-200 to-blue-200 p-4 font-sans text-black">

      {/* Card */}
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 relative">

        {/* Color Sticker */}
        <div className="absolute -top-4 -right-4 bg-yellow-400 border-4 border-black px-3 py-1 font-black rotate-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          🎮 GAME ON
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight text-purple-600">
            SquadSync
          </h1>
          <p className="text-lg font-bold mt-2 text-gray-700">
            Enter the Arena.
          </p>
        </div>

        {/* Dynamic Error Message Box */}
        {errorMsg && (
          <div className="mb-6 bg-red-400 border-4 border-black p-3 font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            🚨 {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-base font-bold uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-4 border-black p-3 text-base font-medium focus:outline-none focus:bg-yellow-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1"
              placeholder="player@squadsync.com"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-base font-bold uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-4 border-black p-3 text-base font-medium focus:outline-none focus:bg-pink-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-black py-3 mt-4 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 uppercase tracking-widest cursor-pointer disabled:opacity-70"
          >
            {loading ? "Authenticating..." : "🚀 Login"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-4 border-black text-center">
          <p className="text-base font-bold">
            No squad yet?{' '}
            <Link
              to="/signup"
              className="text-blue-600 hover:text-black hover:bg-yellow-300 transition-all underline decoration-2 underline-offset-4 cursor-pointer px-1"
            >
              Draft yourself here.
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}