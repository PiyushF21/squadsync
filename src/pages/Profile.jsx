import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const isSessionPast = (date, time) => {
  if (!date || !time) return false;
  const sessionDateTime = new Date(`${date}T${time}`);
  return sessionDateTime < new Date();
};

// NEW: REPUTATION CALCULATOR
const getReputationBadge = (avgScore) => {
  if (avgScore === 0) return { label: '🆕 ROOKIE (UNRATED)', color: 'bg-gray-300' };
  if (avgScore >= 4.5) return { label: '🌟 S-TIER LEGEND', color: 'bg-yellow-400' };
  if (avgScore >= 3.0) return { label: '👍 SOLID TEAMMATE', color: 'bg-blue-400' };
  return { label: '🚩 TOXIC WARNING', color: 'bg-red-500 text-white' };
};

export default function Profile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  const [activeHostedLobbies, setActiveHostedLobbies] = useState([]);
  const [pastHostedLobbies, setPastHostedLobbies] = useState([]);
  const [joinedLobbies, setJoinedLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleRosters, setVisibleRosters] = useState({});

  const [activeChatLobby, setActiveChatLobby] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef(null);

  // NEW: REPUTATION STATE
  const [reputation, setReputation] = useState({ score: 0, totalReviews: 0 });

  const fetchProfileData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }
    setCurrentUser(user);

    const { data: hosted } = await supabase
      .from('lobbies')
      .select('*, rsvps(id, player_name, user_id, host_rating, status, stats, proof_url)')
      .eq('host_id', user.id)
      .order('session_date', { ascending: false })
      .order('session_time', { ascending: false });
    
    if (hosted) {
      const active = hosted.filter(l => !isSessionPast(l.session_date, l.session_time));
      const past = hosted.filter(l => isSessionPast(l.session_date, l.session_time));
      setActiveHostedLobbies(active);
      setPastHostedLobbies(past);
    }

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select('host_rating, status, lobbies(*)')
      .eq('user_id', user.id);
    
    if (rsvps) {
      // Calculate Reputation Score
      const ratedRsvps = rsvps.filter(r => r.host_rating > 0);
      if (ratedRsvps.length > 0) {
        const totalScore = ratedRsvps.reduce((sum, r) => sum + r.host_rating, 0);
        setReputation({ score: (totalScore / ratedRsvps.length).toFixed(1), totalReviews: ratedRsvps.length });
      }

      const joined = rsvps
        .filter(r => r.lobbies !== null)
        .map(r => ({ ...r.lobbies, my_rating: r.host_rating, my_status: r.status }))
        .sort((a, b) => {
          const dateA = new Date(`${a.session_date}T${a.session_time}`);
          const dateB = new Date(`${b.session_date}T${b.session_time}`);
          return dateB - dateA; 
        });
      setJoinedLobbies(joined);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfileData(); }, [navigate]);

  useEffect(() => {
    if (!activeChatLobby) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('lobby_id', activeChatLobby.id).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();
    const messageSubscription = supabase.channel(`chat-${activeChatLobby.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lobby_id=eq.${activeChatLobby.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      }).subscribe();
    return () => supabase.removeChannel(messageSubscription);
  }, [activeChatLobby]);

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  const handleDeleteLobby = async (lobbyId) => {
    const confirmDelete = window.confirm("🚨 Are you sure you want to cancel and delete this session? This cannot be undone.");
    if (!confirmDelete) return;
    const { error } = await supabase.from('lobbies').delete().eq('id', lobbyId);
    if (!error) {
      setActiveHostedLobbies(prev => prev.filter(lobby => lobby.id !== lobbyId));
      setPastHostedLobbies(prev => prev.filter(lobby => lobby.id !== lobbyId));
    }
  };

  const handleLeaveSquad = async (lobby) => {
    const confirmLeave = window.confirm("Are you sure you want to leave or cancel your application?");
    if (!confirmLeave) return;
    await supabase.from('rsvps').delete().match({ lobby_id: lobby.id, user_id: currentUser.id });
    if (lobby.my_status === 'approved') {
      await supabase.from('lobbies').update({ spots_left: lobby.spots_left + 1 }).eq('id', lobby.id);
    }
    setJoinedLobbies(prev => prev.filter(l => l.id !== lobby.id));
  };

  const toggleRoster = (lobbyId) => setVisibleRosters(prev => ({ ...prev, [lobbyId]: !prev[lobbyId] }));

  const handleRatePlayer = async (playerId, rating, lobbyId) => {
    const { error } = await supabase.from('rsvps').update({ host_rating: rating }).match({ lobby_id: lobbyId, user_id: playerId });
    if (!error) fetchProfileData();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const { error } = await supabase.from('messages').insert([{ lobby_id: activeChatLobby.id, user_id: currentUser.id, player_name: currentUser.user_metadata?.name || "Unknown Player", content: newMessage.trim() }]);
    if (!error) setNewMessage('');
  };

  const handleApprove = async (rsvp, lobby) => {
    if (lobby.spots_left <= 0) return alert("Your lobby is already full!");
    await supabase.from('rsvps').update({ status: 'approved' }).eq('id', rsvp.id);
    await supabase.from('lobbies').update({ spots_left: lobby.spots_left - 1 }).eq('id', lobby.id);
    fetchProfileData(); 
  };

  const handleReject = async (rsvpId) => {
    const confirm = window.confirm("Reject this player?");
    if (confirm) {
      await supabase.from('rsvps').delete().eq('id', rsvpId);
      fetchProfileData();
    }
  };

  const formatDateTime = (date, time) => {
    if (!date || !time) return "TBD";
    return new Date(`${date}T${time}`).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const userBadge = getReputationBadge(Number(reputation.score));

  if (loading) return <div className="min-h-screen bg-purple-300 flex items-center justify-center font-black text-3xl uppercase">Loading Player Stats...</div>;

  return (
    <div className="min-h-screen bg-purple-300 font-sans text-black pb-12 relative">
      <nav className="bg-white border-b-8 border-black p-3 sm:p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight bg-yellow-300 inline-block px-2 border-4 border-black transform -rotate-2">SquadSync</h1>
        <div className="flex gap-2 sm:gap-4">
          <button onClick={() => navigate('/dashboard')} className="bg-cyan-400 border-4 border-black px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all flex items-center">⬅ <span className="hidden sm:inline ml-1">Arena</span></button>
          <button onClick={handleLogout} className="bg-red-500 text-white border-4 border-black px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base font-bold uppercase hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">Logout</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        
        {/* REPUTATION PLAYER CARD */}
        <div className="bg-white border-4 sm:border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] p-4 sm:p-8 mb-12 relative mt-6 sm:mt-0">
          <div className="absolute -top-4 -right-2 sm:-top-6 sm:-right-6 bg-pink-400 border-4 border-black px-2 py-1 sm:px-4 sm:py-2 font-black text-sm sm:text-xl rotate-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">V.I.P</div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter mb-2 break-words">{currentUser?.user_metadata?.name || "Unknown Player"}</h2>
          <p className="font-bold text-sm sm:text-xl bg-gray-200 inline-block px-2 border-2 border-black break-all mb-4">{currentUser?.email}</p>
          
          {/* REPUTATION BADGE UI */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t-4 border-black pt-4">
             <div className="text-center">
               <span className="block text-sm font-black uppercase">Avg Score</span>
               <span className="text-3xl font-black drop-shadow-md text-yellow-500">★ {reputation.score > 0 ? reputation.score : '-'}</span>
             </div>
             <div className={`${userBadge.color} border-4 border-black px-4 py-2 font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1`}>
               {userBadge.label}
             </div>
             <span className="font-bold text-gray-500 text-sm italic">({reputation.totalReviews} Host Reviews)</span>
          </div>
        </div>

        {/* ... The rest of the Profile content remains EXACTLY the same ... */}
        <div className="mb-12">
          <h3 className="text-3xl font-black uppercase mb-6 bg-black text-white inline-block px-4 py-2 transform -rotate-1 border-4 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">🟢 Active Hosted Sessions</h3>
          {activeHostedLobbies.length === 0 ? (
             <div className="bg-white border-4 border-black p-6 font-bold">You aren't hosting any upcoming sessions.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 items-start">
              {activeHostedLobbies.map(lobby => {
                const pendingRsvps = lobby.rsvps?.filter(r => r.status === 'pending') || [];
                const approvedRsvps = lobby.rsvps?.filter(r => r.status === 'approved') || [];

                return (
                  <div key={lobby.id} className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="bg-pink-300 border-2 border-black font-bold px-2 text-sm">{lobby.game}</span>
                        <span className="font-black text-lg bg-yellow-200 border-2 border-black px-2 transform rotate-2">{lobby.spots_left} Spots Left</span>
                      </div>
                      <h4 className="text-2xl font-black uppercase truncate mb-2">{lobby.title}</h4>
                      <p className="font-bold text-sm bg-yellow-100 border-2 border-black inline-block px-2 mb-4">🕒 {formatDateTime(lobby.session_date, lobby.session_time)}</p>

                      {/* MAP EMBED FOR SPORTS */}
                      {lobby.category === 'SPORT' && lobby.location && (
                        <iframe width="100%" height="150" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(lobby.location)}&output=embed`} className="border-4 border-black mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></iframe>
                      )}

                      <div className="flex gap-2 mb-6 flex-wrap">
                        <button onClick={() => toggleRoster(lobby.id)} className="bg-blue-300 border-2 border-black px-3 py-1.5 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center gap-2">
                          {visibleRosters[lobby.id] ? '👁️ Hide Dashboard' : `👁️ View Dashboard (${pendingRsvps.length} Pending)`}
                        </button>
                        <button onClick={() => setActiveChatLobby(lobby)} className="bg-indigo-400 text-white border-2 border-black px-3 py-1.5 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center gap-2">💬 Squad Chat</button>
                      </div>

                      {visibleRosters[lobby.id] && (
                        <div className="mb-6 border-t-4 border-black pt-4">
                          <div className="mb-6">
                            <h5 className="font-black uppercase text-sm mb-2 text-pink-600">📥 Pending Applications:</h5>
                            {pendingRsvps.length > 0 ? (
                              <div className="space-y-4">
                                {pendingRsvps.map(rsvp => (
                                  <div key={rsvp.id} className="bg-pink-50 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <div className="flex justify-between items-start mb-2">
                                      <span className="font-black text-lg">👤 {rsvp.player_name}</span>
                                      <div className="flex gap-2">
                                        <button onClick={() => handleApprove(rsvp, lobby)} className="bg-green-400 border-2 border-black px-3 py-1 font-black text-xs uppercase hover:bg-green-500 transition-colors">Approve</button>
                                        <button onClick={() => handleReject(rsvp.id)} className="bg-red-400 border-2 border-black px-3 py-1 font-black text-xs uppercase hover:bg-red-500 transition-colors">Reject</button>
                                      </div>
                                    </div>
                                    <p className="font-bold text-sm mb-3 text-gray-700 bg-white p-2 border-2 border-black">"{rsvp.stats}"</p>
                                    {rsvp.proof_url && (
                                      <a href={rsvp.proof_url} target="_blank" rel="noreferrer" className="inline-block bg-blue-200 border-2 border-black px-3 py-1 text-xs font-black uppercase hover:bg-blue-300">
                                        🖼️ View Proof Image
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : ( <p className="text-sm font-bold text-gray-500 italic">No pending applications.</p> )}
                          </div>
                          <div>
                            <h5 className="font-black uppercase text-sm mb-2 text-green-600">✅ Approved Squad:</h5>
                            {approvedRsvps.length > 0 ? (
                              <ul className="space-y-2">
                                {approvedRsvps.map(rsvp => (
                                   <li key={rsvp.id} className="bg-green-50 border-2 border-black px-2 py-1 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">👤 {rsvp.player_name}</li>
                                ))}
                              </ul>
                            ) : ( <p className="text-sm font-bold text-gray-500 italic">No one approved yet.</p> )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDeleteLobby(lobby.id)} className="w-full mt-4 bg-red-400 border-2 border-black py-2 font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors">Cancel Session</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-12">
          <h3 className="text-3xl font-black uppercase mb-6 bg-gray-800 text-white inline-block px-4 py-2 transform rotate-1 border-4 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">⏳ Past Sessions (Rate Players)</h3>
          {pastHostedLobbies.length === 0 ? (
             <div className="bg-gray-200 border-4 border-black p-6 font-bold text-gray-600">No past sessions to review yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {pastHostedLobbies.map(lobby => {
                const approvedRsvps = lobby.rsvps?.filter(r => r.status === 'approved') || [];
                return (
                  <div key={lobby.id} className="bg-gray-200 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col justify-between opacity-90">
                    <div>
                      <h4 className="text-2xl font-black uppercase truncate mb-2 line-through decoration-red-500 decoration-4">{lobby.title}</h4>
                      <div className="mb-4 border-t-4 border-black pt-4">
                        <h5 className="font-black uppercase text-sm mb-2">⭐ Leave Player Reviews:</h5>
                        {approvedRsvps.length > 0 ? (
                          <ul className="space-y-3">
                            {approvedRsvps.map(rsvp => (
                               <li key={rsvp.id} className="bg-white border-2 border-black px-2 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                 <span>👤 {rsvp.player_name}</span>
                                 <div className="flex gap-1">
                                   {[1, 2, 3, 4, 5].map(star => (
                                     <button key={star} onClick={() => handleRatePlayer(rsvp.user_id, star, lobby.id)} className={`text-xl hover:scale-125 transition-transform ${(rsvp.host_rating || 0) >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                                   ))}
                                 </div>
                               </li>
                            ))}
                          </ul>
                        ) : ( <p className="text-sm font-bold text-gray-500 italic">No one showed up!</p> )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-3xl font-black uppercase mb-6 bg-black text-white inline-block px-4 py-2 transform rotate-1 border-4 border-white shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">⚔️ Your Applications & Squads</h3>
          {joinedLobbies.length === 0 ? (
             <div className="bg-white border-4 border-black p-6 font-bold">You haven't applied to any squads yet. Get out there!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {joinedLobbies.map(lobby => {
                const isPast = isSessionPast(lobby.session_date, lobby.session_time);
                const isPending = lobby.my_status === 'pending';
                return (
                  <div key={lobby.id} className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 flex flex-col justify-between transition-all ${isPast ? 'bg-gray-200 opacity-90' : ''}`}>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className={`border-2 border-black font-bold px-2 text-sm ${isPast ? 'bg-gray-300' : 'bg-green-300'}`}>{lobby.game}</span>
                        <span className="font-bold text-gray-600">Host: {lobby.host_name}</span>
                      </div>
                      <h4 className={`text-2xl font-black uppercase truncate mb-2 ${isPast ? 'line-through decoration-red-500 decoration-4 text-gray-600' : ''}`}>{lobby.title}</h4>

                      <div className="mb-4">
                        {isPending ? (
                          <span className="bg-yellow-300 border-2 border-black font-black px-2 py-1 text-sm inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">⏳ PENDING HOST APPROVAL</span>
                        ) : (
                          <span className="bg-green-400 border-2 border-black font-black px-2 py-1 text-sm inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white">✅ APPROVED & JOINED</span>
                        )}
                      </div>

                      {isPast ? (
                        <div className="mt-4 mb-4">
                           <p className="font-bold text-sm bg-gray-300 border-2 border-black inline-block px-2 mb-2">✅ Session Completed</p>
                           {lobby.my_rating > 0 ? (
                             <div className="bg-white border-2 border-black p-3 mt-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                               <p className="text-xs font-black uppercase mb-1 tracking-wider">Host Rating Received:</p>
                               <div className="text-2xl text-yellow-400 drop-shadow-md">{'★'.repeat(lobby.my_rating)}{'☆'.repeat(5 - lobby.my_rating)}</div>
                             </div>
                           ) : (
                             <p className="text-sm font-bold text-gray-500 italic mt-2">Waiting for host review...</p>
                           )}
                        </div>
                      ) : (
                        <>
                          <p className="font-bold text-sm bg-yellow-100 border-2 border-black inline-block px-2 mb-4">🕒 {formatDateTime(lobby.session_date, lobby.session_time)}</p>
                          
                          {/* MAP EMBED FOR SPORTS */}
                          {lobby.category === 'SPORT' && lobby.location && (
                            <iframe width="100%" height="150" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(lobby.location)}&output=embed`} className="border-4 border-black mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></iframe>
                          )}

                          {!isPending && (
                            <button onClick={() => setActiveChatLobby(lobby)} className="mb-4 bg-indigo-400 text-white border-2 border-black px-3 py-1.5 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all w-max flex items-center gap-2">💬 Squad Chat</button>
                          )}
                        </>
                      )}
                    </div>
                    {!isPast && (
                      <button onClick={() => handleLeaveSquad(lobby)} className="w-full mt-4 bg-yellow-300 border-2 border-black py-2 font-black uppercase tracking-wider hover:bg-yellow-400 transition-colors">
                        {isPending ? 'Cancel Application' : 'Leave Squad'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CHAT MODAL UI */}
      {activeChatLobby && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border-[6px] border-black w-full max-w-lg h-[80vh] flex flex-col shadow-[15px_15px_0px_0px_rgba(99,102,241,1)] relative">
            <div className="bg-indigo-400 border-b-6 border-black p-4 flex justify-between items-center text-white">
              <h2 className="text-2xl font-black uppercase truncate pr-4">💬 {activeChatLobby.title}</h2>
              <button onClick={() => setActiveChatLobby(null)} className="bg-red-500 text-white border-4 border-black w-10 h-10 flex items-center justify-center text-xl font-black hover:rotate-90 transition-transform flex-shrink-0">X</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {messages.length === 0 ? <div className="text-center font-bold text-gray-400 mt-10 italic">No messages yet. Be the first to say hi!</div> : messages.map(msg => {
                  const isMe = msg.user_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs font-black uppercase mb-1 text-gray-500">{msg.player_name}</span>
                      <div className={`px-4 py-2 border-4 border-black font-bold max-w-[80%] break-words ${isMe ? 'bg-green-300 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>{msg.content}</div>
                    </div>
                  );
                })}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="bg-white border-t-6 border-black p-4 flex gap-2">
              <input type="text" placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 border-4 border-black p-2 font-bold focus:bg-yellow-50 outline-none" />
              <button type="submit" className="bg-green-400 border-4 border-black px-6 font-black uppercase hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}