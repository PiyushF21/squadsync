import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ESPORTS_LIST = ["Valorant", "CS2", "League of Legends", "Dota 2", "Apex Legends", "Overwatch 2", "Rocket League", "Rainbow Six Siege", "Fortnite", "Call of Duty"];
const SPORTS_LIST = ["Basketball", "Football (Soccer)", "Cricket", "Tennis", "Badminton", "Volleyball", "Table Tennis", "Baseball", "Rugby", "Golf"];

export default function Signup() {
  // THIS IS THE LINE THAT WAS MISSING OR MISPLACED!
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ESPORT');
  const [activity, setActivity] = useState(ESPORTS_LIST[0]);
  const [loading, setLoading] = useState(false);

  const currentActivityList = category === 'ESPORT' ? ESPORTS_LIST : SPORTS_LIST;

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Create the secure Auth account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } } // Save their gamertag in auth metadata
    });

    if (error) {
      alert("Error: " + error.message);
    } else if (data.user) {
      // 2. Save their public scouting profile to our new table!
      await supabase.from('profiles').insert([
        { 
          id: data.user.id, 
          name: name, 
          email: email, 
          category: category, 
          main_game: activity 
        }
      ]);
      
      // 3. Now the navigate will work perfectly
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 flex items-center justify-center p-4 font-sans text-black relative overflow-hidden">
      <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-300 rounded-full border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce"></div>
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-green-400 rotate-12 border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"></div>

      <div className="w-full max-w-md bg-white border-8 border-black p-6 sm:p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative z-10 transform -rotate-1">
        <div className="absolute -top-6 -right-6 bg-cyan-400 border-4 border-black px-4 py-1 font-black text-xl rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          NEW PLAYER
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase mb-2">SquadSync</h1>
          <p className="font-bold bg-yellow-200 inline-block px-2 border-2 border-black transform rotate-2">CREATE YOUR ID</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Gamertag</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border-4 border-black p-2.5 text-sm font-medium focus:outline-none focus:bg-yellow-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1" required />
            </div>
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-4 border-black p-2.5 text-sm font-medium focus:outline-none focus:bg-pink-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1" required />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-bold uppercase tracking-wide">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border-4 border-black p-2.5 text-sm font-medium focus:outline-none focus:bg-blue-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1" required />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Category</label>
              <select 
                value={category} 
                onChange={(e) => {
                  const val = e.target.value;
                  setCategory(val);
                  setActivity(val === 'ESPORT' ? ESPORTS_LIST[0] : SPORTS_LIST[0]);
                }}
                className="w-full border-4 border-black p-2.5 text-sm font-bold focus:outline-none focus:bg-purple-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 cursor-pointer bg-white"
              >
                <option value="ESPORT">eSports</option>
                <option value="SPORT">Sports</option>
              </select>
            </div>
            
            <div className="w-full sm:w-1/2 space-y-1">
              <label className="block text-sm font-bold uppercase tracking-wide">Main Game</label>
              <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full border-4 border-black p-2.5 text-sm font-bold focus:outline-none focus:bg-green-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 cursor-pointer bg-white">
                {currentActivityList.map((game) => <option key={game} value={game}>{game}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-black py-2.5 mt-2 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150 uppercase tracking-widest cursor-pointer disabled:opacity-70">
            {loading ? "Drafting..." : "🔥 Draft Me"}
          </button>
        </form>

        <p className="mt-6 text-center font-bold text-sm">
          Already a legend? <Link to="/login" className="text-blue-600 underline hover:text-blue-800">Login here</Link>
        </p>
      </div>
    </div>
  );
}