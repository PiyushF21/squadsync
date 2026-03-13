import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ESPORTS_LIST = ["Valorant", "CS2", "League of Legends", "Dota 2", "Apex Legends", "Overwatch 2", "Rocket League", "Rainbow Six Siege", "Fortnite", "Call of Duty"];
const SPORTS_LIST = ["Basketball", "Football (Soccer)", "Cricket", "Tennis", "Badminton", "Volleyball", "Table Tennis", "Baseball", "Rugby", "Golf"];
const COLORS = ["bg-pink-400", "bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-blue-400", "bg-purple-400"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [lobbies, setLobbies] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ESPORT');
  const [activity, setActivity] = useState(ESPORTS_LIST[0]);
  const [spots, setSpots] = useState(1);

  const fetchLobbies = async () => {
    const { data, error } = await supabase
      .from('lobbies')
      .select('*, rsvps(user_id)')
      .order('created_at', { ascending: false });
    if (!error) setLobbies(data || []);
  };
  // Add this right below your fetchLobbies function!
  useEffect(() => {
    // Put our ear to the ground to listen for Supabase broadcasts
    const lobbySubscription = supabase
      .channel('live-lobbies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, (payload) => {
        console.log("Database changed! Refreshing UI instantly...", payload);
        fetchLobbies(); 
      })
      .subscribe();

    // Clean up the listener if the user logs out or leaves the page
    return () => {
      supabase.removeChannel(lobbySubscription);
    };
  }, []);

  useEffect(() => {
    const initializeDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setCurrentUser(user);
      fetchLobbies();
    };
    initializeDashboard();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('lobbies').insert([{
      title,
      game: activity,
      category,
      spots_left: spots,
      host_id: currentUser.id,
      host_name: currentUser.user_metadata?.name || "Unknown Player"
    }]);

    if (error) alert("Error creating lobby: " + error.message);
    else {
      setIsModalOpen(false);
      setTitle('');
      fetchLobbies(); 
    }
  };

  const handleJoinSquad = async (lobby) => {
    if (lobby.spots_left <= 0) return;
    const { error } = await supabase.from('rsvps').insert([
      { lobby_id: lobby.id, user_id: currentUser.id }
    ]);

    if (error) alert("You are already in this squad!");
    else {
      await supabase.from('lobbies')
        .update({ spots_left: lobby.spots_left - 1 })
        .eq('id', lobby.id);
      fetchLobbies(); 
    }
  };

  const displayedLobbies = lobbies.filter(l => filter === 'ALL' || l.category === filter);

  return (
    <div className="min-h-screen bg-cyan-300 font-sans text-black pb-12 relative">
      <nav className="bg-white border-b-8 border-black p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-3xl font-black uppercase tracking-tight bg-yellow-300 inline-block px-2 border-4 border-black transform -rotate-2">
          SquadSync
        </h1>
        <div className="flex gap-4">
          <button onClick={() => navigate('/profile')} className="bg-purple-400 border-4 border-black px-4 py-2 font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
            👤 Profile
          </button>
          <button onClick={handleLogout} className="bg-red-500 text-white border-4 border-black px-4 py-2 font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex gap-2 bg-white border-4 border-black p-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {['ALL', 'ESPORT', 'SPORT'].map((type) => (
              <button key={type} onClick={() => setFilter(type)} className={`px-6 py-2 font-black uppercase transition-all ${filter === type ? 'bg-black text-white' : 'hover:bg-yellow-200'}`}>
                {type === 'ALL' ? 'All' : type === 'ESPORT' ? '🎮 eSports' : '⚽ Sports'}
              </button>
            ))}
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white text-2xl font-black uppercase px-8 py-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none">
            + Host a Game
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {displayedLobbies.map((lobby, index) => {
            const hasJoined = lobby.rsvps?.some(rsvp => rsvp.user_id === currentUser?.id);
            const isFull = lobby.spots_left <= 0;

            return (
              <div key={lobby.id} className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col relative overflow-hidden">
                <div className={`${COLORS[index % COLORS.length]} border-b-4 border-black p-4 flex justify-between items-center`}>
                  <span className="bg-white border-2 border-black font-black uppercase px-2 py-1 text-xs">{lobby.game}</span>
                  <div className="bg-black text-white font-black uppercase px-3 py-1 text-sm transform rotate-3 border-2 border-white">{lobby.spots_left} SPOTS LEFT</div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 leading-none">{lobby.title}</h2>
                    <div className="space-y-2 mb-8">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="bg-blue-100 border-2 border-black px-2 py-1">👑 Hosted by {lobby.host_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button onClick={() => handleJoinSquad(lobby)} disabled={hasJoined || isFull} className={`w-full border-4 border-black py-4 text-xl font-black uppercase tracking-widest transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${hasJoined ? 'bg-green-400 cursor-not-allowed shadow-none translate-x-1 translate-y-1' : isFull ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-yellow-300 hover:shadow-none hover:translate-x-1 hover:translate-y-1'}`}>
                    {hasJoined ? '✅ SQUAD JOINED' : isFull ? '🚫 LOBBY FULL' : 'JOIN SQUAD'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-[6px] border-black w-full max-w-xl p-8 shadow-[20px_20px_0px_0px_rgba(59,130,246,1)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute -top-6 -right-6 bg-red-500 text-white border-4 border-black w-12 h-12 flex items-center justify-center text-2xl font-black hover:rotate-90 transition-transform">X</button>
            <h2 className="text-4xl font-black uppercase mb-8 italic underline decoration-yellow-400">Launch a Session</h2>

            <form onSubmit={handleCreateLobby} className="space-y-6">
              <div className="space-y-1">
                <label className="block font-black uppercase tracking-tight">Session Name</label>
                <input className="w-full border-4 border-black p-3 font-bold text-lg focus:bg-yellow-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" placeholder="EX: LATE NIGHT 5V5" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-1">
                  <label className="block font-black uppercase tracking-tight">Category</label>
                  <select 
                    value={category} 
                    onChange={e => {
                      const val = e.target.value;
                      setCategory(val);
                      setActivity(val === 'ESPORT' ? ESPORTS_LIST[0] : SPORTS_LIST[0]);
                    }} 
                    className="w-full border-4 border-black p-3 font-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                  >
                    <option value="ESPORT">eSports</option>
                    <option value="SPORT">Sports</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block font-black uppercase tracking-tight">Game</label>
                  <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full border-4 border-black p-3 font-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                    {(category === 'ESPORT' ? ESPORTS_LIST : SPORTS_LIST).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-black uppercase tracking-tight">Spots Needed</label>
                <input type="number" min="1" max="10" className="w-40 border-4 border-black p-3 font-black text-lg focus:bg-pink-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" value={spots} onChange={e => setSpots(e.target.value)} required />
              </div>

              <button type="submit" className="w-full bg-green-400 border-4 border-black py-5 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all mt-4">
                🔥 BLAST IT LIVE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}