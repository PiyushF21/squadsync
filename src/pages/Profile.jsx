import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [hostedLobbies, setHostedLobbies] = useState([]);
  const [joinedLobbies, setJoinedLobbies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);

    // 1. Get Hosted Games
    const { data: hosted } = await supabase
      .from('lobbies')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false });
    
    if (hosted) setHostedLobbies(hosted);

    // 2. Get Joined Games
    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('lobbies(*)')
      .eq('user_id', user.id);
    
    if (rsvps) {
      const joined = rsvps.map(r => r.lobbies).filter(l => l !== null);
      setJoinedLobbies(joined);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfileData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteLobby = async (lobbyId) => {
    const confirmDelete = window.confirm("🚨 Are you sure you want to cancel and delete this session? This cannot be undone.");
    if (!confirmDelete) return;

    const { error } = await supabase.from('lobbies').delete().eq('id', lobbyId);
    if (error) {
      alert("Error deleting lobby: " + error.message);
    } else {
      setHostedLobbies(prev => prev.filter(lobby => lobby.id !== lobbyId));
    }
  };

  const handleLeaveSquad = async (lobby) => {
    const confirmLeave = window.confirm("Are you sure you want to leave this squad?");
    if (!confirmLeave) return;

    const { error: rsvpError } = await supabase
      .from('rsvps')
      .delete()
      .match({ lobby_id: lobby.id, user_id: currentUser.id });

    if (rsvpError) {
      alert("Error leaving squad: " + rsvpError.message);
      return;
    }

    await supabase
      .from('lobbies')
      .update({ spots_left: lobby.spots_left + 1 })
      .eq('id', lobby.id);

    setJoinedLobbies(prev => prev.filter(l => l.id !== lobby.id));
  };

  if (loading) return <div className="min-h-screen bg-purple-300 flex items-center justify-center font-black text-3xl uppercase">Loading Player Stats...</div>;

  return (
    <div className="min-h-screen bg-purple-300 font-sans text-black pb-12 relative">
      
      <nav className="bg-white border-b-8 border-black p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-3xl font-black uppercase tracking-tight bg-yellow-300 inline-block px-2 border-4 border-black transform -rotate-2">
          SquadSync
        </h1>
        <div className="flex gap-4">
          {/* THE FIXED ARENA BUTTON */}
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-cyan-400 border-4 border-black px-4 py-2 font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all flex items-center"
          >
            ⬅ Arena
          </button>
          <button onClick={handleLogout} className="bg-red-500 text-white border-4 border-black px-4 py-2 font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        
        <div className="bg-white border-8 border-black shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] p-8 mb-12 relative">
          <div className="absolute -top-6 -right-6 bg-pink-400 border-4 border-black px-4 py-2 font-black text-xl rotate-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            V.I.P
          </div>
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">
            {currentUser?.user_metadata?.name || "Unknown Player"}
          </h2>
          <p className="font-bold text-xl bg-yellow-200 inline-block px-2 border-2 border-black">
            {currentUser?.email}
          </p>
        </div>

        <div className="mb-12">
          <h3 className="text-3xl font-black uppercase mb-6 bg-black text-white inline-block px-4 py-2 transform -rotate-1 border-4 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            👑 Sessions You Host
          </h3>
          {hostedLobbies.length === 0 ? (
             <div className="bg-white border-4 border-black p-6 font-bold">You aren't hosting any active sessions yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hostedLobbies.map(lobby => (
                <div key={lobby.id} className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="bg-pink-300 border-2 border-black font-bold px-2 text-sm">{lobby.game}</span>
                      <span className="font-black">{lobby.spots_left} Spots Left</span>
                    </div>
                    <h4 className="text-2xl font-black uppercase truncate mb-4">{lobby.title}</h4>
                  </div>
                  <button 
                    onClick={() => handleDeleteLobby(lobby.id)}
                    className="w-full bg-red-400 border-2 border-black py-2 font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Cancel Session
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-3xl font-black uppercase mb-6 bg-black text-white inline-block px-4 py-2 transform rotate-1 border-4 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            ⚔️ Squads You Joined
          </h3>
          {joinedLobbies.length === 0 ? (
             <div className="bg-white border-4 border-black p-6 font-bold">You haven't joined any squads yet. Get out there!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {joinedLobbies.map(lobby => (
                <div key={lobby.id} className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="bg-green-300 border-2 border-black font-bold px-2 text-sm">{lobby.game}</span>
                      <span className="font-bold text-gray-600">Host: {lobby.host_name}</span>
                    </div>
                    <h4 className="text-2xl font-black uppercase truncate mb-4">{lobby.title}</h4>
                  </div>
                  <button 
                    onClick={() => handleLeaveSquad(lobby)}
                    className="w-full bg-yellow-300 border-2 border-black py-2 font-black uppercase tracking-wider hover:bg-yellow-400 transition-colors"
                  >
                    Leave Squad
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}