import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Our massive lists of games
const ESPORTS_LIST = ["Valorant", "CS2", "League of Legends", "Dota 2", "Apex Legends", "Overwatch 2", "Rocket League", "Rainbow Six Siege", "Fortnite", "Call of Duty"];
const SPORTS_LIST = ["Basketball", "Football (Soccer)", "Cricket", "Tennis", "Badminton", "Volleyball", "Table Tennis", "Baseball", "Rugby", "Golf"];

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('ESPORT');
  
  // Default the activity to the first item in the eSports list
  const [activity, setActivity] = useState(ESPORTS_LIST[0]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Whenever the category changes, instantly update the activity dropdown to match
  useEffect(() => {
    if (category === 'ESPORT') {
      setActivity(ESPORTS_LIST[0]);
    } else {
      setActivity(SPORTS_LIST[0]);
    }
  }, [category]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Double check that our URL is loaded correctly before sending
    console.log("Attempting to connect to Supabase...");

    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name,
          category: category,
          activity: activity, // Now it sends exactly what they picked from the list!
        }
      }
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Draft successful! Check your email to confirm.");
      setName(''); setEmail(''); setPassword('');
    }
    setLoading(false);
  };

  // Decide which list to show based on the category
  const currentActivityList = category === 'ESPORT' ? ESPORTS_LIST : SPORTS_LIST;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-200 via-yellow-200 to-blue-200 p-4 font-sans text-black overflow-hidden">
      
      <div className="w-full max-w-lg bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8 relative">

        <div className="absolute -top-4 -right-4 bg-blue-400 border-4 border-black px-3 py-1 font-black -rotate-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white z-10">
          ⭐ NEW PLAYER
        </div>

        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-purple-600">
            Join the Roster
          </h1>
          <p className="text-base font-bold mt-1 text-gray-700">
            Create your player profile.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-400 border-4 border-black p-2 font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm">
            🚨 {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-green-400 border-4 border-black p-2 font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm">
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Gamertag</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border-4 border-black p-2.5 text-sm font-medium focus:outline-none focus:bg-yellow-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1"
                placeholder="LeeFaker" required
              />
            </div>
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Email</label>
              <input 
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border-4 border-black p-2.5 text-sm font-medium focus:outline-none focus:bg-pink-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1"
                placeholder="player@squadsync.com" required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-bold uppercase tracking-wide">Password</label>
            <input 
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border-4 border-black p-2.5 text-sm font-medium focus:outline-none focus:bg-blue-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1"
              placeholder="••••••••" required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Category</label>
              <select 
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border-4 border-black p-2.5 text-sm font-bold focus:outline-none focus:bg-purple-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 cursor-pointer bg-white"
              >
                <option value="ESPORT">eSports</option>
                <option value="SPORT">Sports</option>
              </select>
            </div>
            
            {/* The Dynamic Game Dropdown */}
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Main Game</label>
              <select 
                value={activity} onChange={(e) => setActivity(e.target.value)}
                className="w-full border-4 border-black p-2.5 text-sm font-bold focus:outline-none focus:bg-green-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 cursor-pointer bg-white"
              >
                {currentActivityList.map((game) => (
                  <option key={game} value={game}>{game}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-black py-2.5 mt-2 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-150 uppercase tracking-widest cursor-pointer disabled:opacity-70"
          >
            {loading ? "Drafting..." : "🔥 Draft Me"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t-4 border-black text-center">
          <p className="text-sm font-bold">
            Already on the roster?{' '}
            <Link to="/login" className="text-purple-600 hover:text-black hover:bg-yellow-300 transition-all underline decoration-2 underline-offset-4 cursor-pointer px-1">
              Login here.
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}