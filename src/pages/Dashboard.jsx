import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const ESPORTS_LIST = ["Valorant", "CS2", "League of Legends", "Dota 2", "Apex Legends", "Overwatch 2", "Rocket League", "Rainbow Six Siege", "Fortnite", "Call of Duty"];
const SPORTS_LIST = ["Basketball", "Football (Soccer)", "Cricket", "Tennis", "Badminton", "Volleyball", "Table Tennis", "Baseball", "Rugby", "Golf"];
const COLORS = ["bg-pink-400", "bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-blue-400", "bg-purple-400"];

const isSessionPast = (date, time) => {
  if (!date || !time) return false;
  const sessionDateTime = new Date(`${date}T${time}`);
  return sessionDateTime < new Date();
};

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
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [location, setLocation] = useState('');

  const [isScoutModalOpen, setIsScoutModalOpen] = useState(false);
  const [players, setPlayers] = useState([]);
  const [scoutCategory, setScoutCategory] = useState('ALL');
  const [scoutGame, setScoutGame] = useState('ALL');

  const [applyLobby, setApplyLobby] = useState(null);
  const [statsInput, setStatsInput] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchLobbies = async () => {
    const { data, error } = await supabase
      .from('lobbies')
      .select('*, rsvps(user_id, status)')
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true });
    if (!error) setLobbies(data || []);
  };

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('name', { ascending: true });
    if (!error) setPlayers(data || []);
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setCurrentUser(user);
      fetchLobbies();
      fetchPlayers(); 
    };
    initializeDashboard();
  }, [navigate]);

  useEffect(() => {
    const dbSubscription = supabase.channel('schema-db-changes').on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchLobbies(); 
        fetchPlayers(); 
      }).subscribe();
    return () => supabase.removeChannel(dbSubscription);
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const handleCreateLobby = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('lobbies').insert([{
      title, game: activity, category, spots_left: spots,
      host_id: currentUser.id, host_name: currentUser.user_metadata?.name || "Unknown Player",
      session_date: sessionDate, session_time: sessionTime, location: location
    }]);

    if (!error) {
      setIsModalOpen(false); setTitle(''); setSessionDate(''); setSessionTime(''); setLocation(''); fetchLobbies(); 
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    
    // SMART LOGIC: Only demand a file if it's an ESPORT
    if (applyLobby.category === 'ESPORT' && !proofFile) {
      return alert("You must upload a screenshot of your stats!");
    }
    
    setIsUploading(true);

    try {
      let publicUrl = null;

      // Only run the Storage upload if a file was actually attached
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;
        const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, proofFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('proofs').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase.from('rsvps').insert([{ 
        lobby_id: applyLobby.id, 
        user_id: currentUser.id, 
        player_name: currentUser.user_metadata?.name || "Unknown Player",
        status: 'pending', 
        stats: statsInput, 
        proof_url: publicUrl // This will safely be null for sports
      }]);

      if (dbError) throw dbError;
      
      setApplyLobby(null); 
      setStatsInput(''); 
      setProofFile(null); 
      fetchLobbies();
      
    } catch (error) {
      alert("Application failed: " + error.message);
    } finally { 
      setIsUploading(false); 
    }
  };

  const activeLobbies = lobbies.filter(l => !isSessionPast(l.session_date, l.session_time));
  const displayedLobbies = activeLobbies.filter(l => filter === 'ALL' || l.category === filter);

  const displayedPlayers = players.filter(p => {
    if (scoutCategory !== 'ALL' && p.category !== scoutCategory) return false;
    if (scoutGame !== 'ALL' && p.main_game !== scoutGame) return false;
    return true;
  });

  const formatDateTime = (date, time) => {
    if (!date || !time) return "TBD";
    return new Date(`${date}T${time}`).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-cyan-300 font-sans text-black pb-12 relative">
      <nav className="bg-white border-b-8 border-black p-3 sm:p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight bg-yellow-300 inline-block px-2 border-4 border-black transform -rotate-2">SquadSync</h1>
        <div className="flex gap-2 sm:gap-4">
          <button onClick={() => navigate('/profile')} className="bg-purple-400 border-4 border-black px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">👤 <span className="hidden sm:inline">Profile</span></button>
          <button onClick={handleLogout} className="bg-red-500 text-white border-4 border-black px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex gap-2 bg-white border-4 border-black p-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full md:w-auto overflow-x-auto">
            {['ALL', 'ESPORT', 'SPORT'].map((type) => (
              <button key={type} onClick={() => setFilter(type)} className={`px-4 sm:px-6 py-2 font-black uppercase transition-all whitespace-nowrap ${filter === type ? 'bg-black text-white' : 'hover:bg-yellow-200'}`}>{type === 'ALL' ? 'All' : type === 'ESPORT' ? '🎮 eSports' : '⚽ Sports'}</button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <button onClick={() => setIsScoutModalOpen(true)} className="bg-purple-600 text-white text-xl sm:text-2xl font-black uppercase px-4 sm:px-8 py-3 sm:py-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none w-full sm:w-auto">🔍 Scout Players</button>
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white text-xl sm:text-2xl font-black uppercase px-4 sm:px-8 py-3 sm:py-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none w-full sm:w-auto">+ Host a Game</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {displayedLobbies.map((lobby, index) => {
            const userRsvp = lobby.rsvps?.find(rsvp => rsvp.user_id === currentUser?.id);
            const isPending = userRsvp?.status === 'pending';
            const isApproved = userRsvp?.status === 'approved';
            const isFull = lobby.spots_left <= 0;

            return (
              <div key={lobby.id} className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex flex-col relative overflow-hidden">
                <div className={`${COLORS[index % COLORS.length]} border-b-4 border-black p-4 flex justify-between items-center`}>
                  <span className="bg-white border-2 border-black font-black uppercase px-2 py-1 text-xs">{lobby.game}</span>
                  <div className="bg-black text-white font-black uppercase px-3 py-1 text-sm transform rotate-3 border-2 border-white">{lobby.spots_left} SPOTS LEFT</div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 leading-none">{lobby.title}</h2>
                    <div className="mb-4 space-y-1">
                      <p className="font-bold text-sm bg-gray-100 border-2 border-black inline-block px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">🕒 {formatDateTime(lobby.session_date, lobby.session_time)}</p>
                      {lobby.category === 'ESPORT' ? (
                        <p className="font-bold text-sm bg-gray-100 border-2 border-black inline-block px-2 py-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] block w-max">📍 {lobby.location || "TBD"}</p>
                      ) : null}
                    </div>

                    {/* NEW: LIVE EMBEDDED MAP FOR PHYSICAL SPORTS */}
                    {lobby.category === 'SPORT' && lobby.location && (
                      <iframe 
                        width="100%" height="120" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" 
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(lobby.location)}&output=embed`} 
                        className="border-4 border-black mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      ></iframe>
                    )}

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 font-bold"><span className="bg-blue-100 border-2 border-black px-2 py-1">👑 Hosted by {lobby.host_name}</span></div>
                    </div>
                  </div>
                  
                  <button onClick={() => { if (!userRsvp && !isFull) setApplyLobby(lobby); }} disabled={userRsvp || isFull} className={`w-full border-4 border-black py-4 text-xl font-black uppercase tracking-widest transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isApproved ? 'bg-green-400 cursor-not-allowed shadow-none translate-x-1 translate-y-1' : isPending ? 'bg-yellow-300 cursor-not-allowed shadow-none translate-x-1 translate-y-1' : isFull ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-yellow-300 hover:shadow-none hover:translate-x-1 hover:translate-y-1'}`}>
                    {isApproved ? '✅ APPROVED' : isPending ? '⏳ PENDING APPROVAL' : isFull ? '🚫 LOBBY FULL' : 'APPLY TO JOIN'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* APPLICATION MODAL */}
      {applyLobby && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-[6px] border-black w-full max-w-xl p-6 sm:p-8 shadow-[15px_15px_0px_0px_rgba(236,72,153,1)] relative">
            <button onClick={() => setApplyLobby(null)} className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-red-500 text-white border-4 border-black w-10 h-10 flex items-center justify-center text-xl font-black hover:rotate-90 transition-transform z-10">X</button>
            <h2 className="text-2xl sm:text-4xl font-black uppercase mb-2 italic underline decoration-pink-400 mt-4 sm:mt-0">Submit Application</h2>
            <p className="font-bold text-gray-600 mb-6">Convince the host why you belong in this squad.</p>

           <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="space-y-1">
                {/* DYNAMIC LABEL */}
                <label className="block font-black uppercase tracking-tight text-sm">
                  {applyLobby.category === 'ESPORT' ? 'Your Statistics / Rank / Role' : 'Experience Level / Message to Host'}
                </label>
                {/* DYNAMIC PLACEHOLDER */}
                <textarea 
                  className="w-full border-4 border-black p-3 font-bold text-base focus:bg-pink-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-32" 
                  placeholder={applyLobby.category === 'ESPORT' ? "Ex: Diamond II, Support Main, 1.2 K/D ratio..." : "Ex: Played college basketball, intermediate level, I can bring an extra ball!"} 
                  value={statsInput} 
                  onChange={e => setStatsInput(e.target.value)} 
                  required 
                />
              </div>

              {/* DYNAMIC UPLOAD FIELD: Only shows up for eSports! */}
              {applyLobby.category === 'ESPORT' && (
                <div className="space-y-1">
                  <label className="block font-black uppercase tracking-tight text-sm">Upload Proof (Screenshot)</label>
                  <input 
                    type="file" accept="image/*" 
                    onChange={e => setProofFile(e.target.files[0])} 
                    className="w-full border-4 border-black p-2 font-bold text-sm bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:font-black file:bg-yellow-300 file:uppercase cursor-pointer" 
                    required 
                  />
                </div>
              )}

              <button type="submit" disabled={isUploading} className="w-full bg-pink-400 border-4 border-black py-4 text-xl font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all mt-4 disabled:opacity-50">
                {isUploading ? '🚀 Sending...' : '✉️ Send Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HOST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-[6px] border-black w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-[15px_15px_0px_0px_rgba(59,130,246,1)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-red-500 text-white border-4 border-black w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-black hover:rotate-90 transition-transform z-10">X</button>
            <h2 className="text-2xl sm:text-4xl font-black uppercase mb-6 italic underline decoration-yellow-400 mt-4 sm:mt-0">Launch Session</h2>
            <form onSubmit={handleCreateLobby} className="space-y-4 sm:space-y-5">
              <div className="space-y-1">
                <label className="block font-black uppercase tracking-tight text-sm sm:text-base">Session Name</label>
                <input className="w-full border-4 border-black p-2 sm:p-3 font-bold text-base sm:text-lg focus:bg-yellow-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" placeholder="EX: LATE NIGHT 5V5" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex-1 space-y-1">
                  <label className="block font-black uppercase tracking-tight text-sm sm:text-base">Category</label>
                  <select value={category} onChange={e => { const val = e.target.value; setCategory(val); setActivity(val === 'ESPORT' ? ESPORTS_LIST[0] : SPORTS_LIST[0]); }} className="w-full border-4 border-black p-2 sm:p-3 font-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                    <option value="ESPORT">eSports</option>
                    <option value="SPORT">Sports</option>
                  </select>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block font-black uppercase tracking-tight text-sm sm:text-base">Game</label>
                  <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full border-4 border-black p-2 sm:p-3 font-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                    {(category === 'ESPORT' ? ESPORTS_LIST : SPORTS_LIST).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex-1 space-y-1">
                  <label className="block font-black uppercase tracking-tight text-sm sm:text-base">Date</label>
                  <input type="date" className="w-full border-4 border-black p-2 sm:p-3 font-bold text-base focus:bg-pink-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" value={sessionDate} onChange={e => setSessionDate(e.target.value)} required />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block font-black uppercase tracking-tight text-sm sm:text-base">Time</label>
                  <input type="time" className="w-full border-4 border-black p-2 sm:p-3 font-bold text-base focus:bg-pink-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" value={sessionTime} onChange={e => setSessionTime(e.target.value)} required />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex-[2] space-y-1">
                  <label className="block font-black uppercase tracking-tight text-sm sm:text-base">Location / Server</label>
                  <input className="w-full border-4 border-black p-2 sm:p-3 font-bold text-base focus:bg-cyan-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" placeholder="Mumbai Server / Central Park Court" value={location} onChange={e => setLocation(e.target.value)} required />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block font-black uppercase tracking-tight text-sm sm:text-base">Spots Needed</label>
                  <input type="number" min="1" max="10" className="w-full border-4 border-black p-2 sm:p-3 font-black text-lg focus:bg-yellow-50 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" value={spots} onChange={e => setSpots(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="w-full bg-green-400 border-4 border-black py-3 sm:py-5 text-xl sm:text-2xl font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all mt-4">🔥 BLAST IT LIVE</button>
            </form>
          </div>
        </div>
      )}

      {/* SCOUTING DIRECTORY MODAL */}
      {isScoutModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-[6px] border-black w-full max-w-3xl p-6 sm:p-8 max-h-[90vh] flex flex-col shadow-[15px_15px_0px_0px_rgba(168,85,247,1)] relative">
            <button onClick={() => setIsScoutModalOpen(false)} className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-red-500 text-white border-4 border-black w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-black hover:rotate-90 transition-transform z-10">X</button>
            <h2 className="text-2xl sm:text-4xl font-black uppercase mb-6 italic underline decoration-purple-400 mt-4 sm:mt-0">Player Directory</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-purple-100 p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex-1 space-y-1">
                <label className="block font-black uppercase tracking-tight text-sm">Filter Category</label>
                <select value={scoutCategory} onChange={e => { setScoutCategory(e.target.value); setScoutGame('ALL'); }} className="w-full border-4 border-black p-2 font-black bg-white cursor-pointer">
                  <option value="ALL">All Categories</option>
                  <option value="ESPORT">eSports</option>
                  <option value="SPORT">Sports</option>
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="block font-black uppercase tracking-tight text-sm">Filter Game</label>
                <select value={scoutGame} onChange={e => setScoutGame(e.target.value)} disabled={scoutCategory === 'ALL'} className="w-full border-4 border-black p-2 font-black bg-white cursor-pointer disabled:bg-gray-200 disabled:text-gray-500">
                  <option value="ALL">All Games</option>
                  {scoutCategory === 'ESPORT' && ESPORTS_LIST.map(g => <option key={g} value={g}>{g}</option>)}
                  {scoutCategory === 'SPORT' && SPORTS_LIST.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 space-y-4">
              {displayedPlayers.length === 0 ? (
                <div className="text-center py-8 font-bold text-xl border-4 border-black bg-gray-100">No players found with these filters.</div>
              ) : (
                displayedPlayers.map((player) => (
                  <div key={player.id} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <div>
                      <h3 className="text-xl font-black uppercase">{player.name}</h3>
                      <p className="font-bold text-sm text-gray-600">{player.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 border-2 border-black font-black text-xs uppercase ${player.category === 'ESPORT' ? 'bg-pink-300' : player.category === 'SPORT' ? 'bg-green-300' : 'bg-gray-300'}`}>{player.category === 'ESPORT' ? '🎮 eSports' : player.category === 'SPORT' ? '⚽ Sports' : 'Unknown'}</span>
                      <span className="px-3 py-1 border-2 border-black font-black text-xs uppercase bg-yellow-300">{player.main_game || 'Unknown'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}