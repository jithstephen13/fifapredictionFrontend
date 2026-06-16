import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';
import { Key, Plus, Check, X, ShieldAlert, Award, Calendar, RefreshCw, Trash2, Eye } from 'lucide-react';

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Navigation
  const [activeTab, setActiveTab] = useState('matches'); // 'matches', 'payments'

  // Match Management State
  const [matches, setMatches] = useState([]);
  const [newMatch, setNewMatch] = useState({
    teamA: '',
    teamB: '',
    teamALogo: '⚽',
    teamBLogo: '⚽',
    kickoffTime: '',
    winnerCount: 2,
    prizeAmount: 100
  });
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchError, setMatchError] = useState('');

  // Payment Verification State
  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('pending');

  // Modal States
  const [selectedMatch, setSelectedMatch] = useState(null); // Match being completed
  const [completeScoreA, setCompleteScoreA] = useState('0');
  const [completeScoreB, setCompleteScoreB] = useState('0');
  const [completingMatch, setCompletingMatch] = useState(false);

  const [winnerModalMatch, setWinnerModalMatch] = useState(null); // Match for winner selection
  const [exactPredictions, setExactPredictions] = useState([]);
  const [selectedWinnerIds, setSelectedWinnerIds] = useState([]);
  const [savingWinners, setSavingWinners] = useState(false);

  // Modal predictions for score entry real-time view
  const [modalPredictions, setModalPredictions] = useState([]);
  const [modalPredictionsLoading, setModalPredictionsLoading] = useState(false);

  // Completed match winner viewer states
  const [selectedCompletedMatchId, setSelectedCompletedMatchId] = useState('');
  const [completedMatchPredictions, setCompletedMatchPredictions] = useState([]);
  const [completedMatchPredictionsLoading, setCompletedMatchPredictionsLoading] = useState(false);

  // Filters for payment verification board
  const [selectedFilterMatchId, setSelectedFilterMatchId] = useState('');
  const [selectedScoreCombination, setSelectedScoreCombination] = useState('');

  useEffect(() => {
    if (token) {
      verifyAdminToken();
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchMatches();
    }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'payments') {
      fetchPredictions();
    }
  }, [paymentFilter, selectedFilterMatchId, isLoggedIn, activeTab]);

  useEffect(() => {
    if (selectedCompletedMatchId && isLoggedIn) {
      const fetchCompletedMatchPredictions = async () => {
        try {
          setCompletedMatchPredictionsLoading(true);
          const res = await fetch(`${API_URL}/predictions/admin/all?matchId=${selectedCompletedMatchId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCompletedMatchPredictions(data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setCompletedMatchPredictionsLoading(false);
        }
      };
      fetchCompletedMatchPredictions();
    } else {
      setCompletedMatchPredictions([]);
    }
  }, [selectedCompletedMatchId, isLoggedIn, token]);

  const verifyAdminToken = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('adminToken');
        setToken('');
        setIsLoggedIn(false);
      }
    } catch (err) {
      setIsLoggedIn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoginError('');
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to authenticate');
      }
      localStorage.setItem('adminToken', data.token);
      setToken(data.token);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken('');
    setIsLoggedIn(false);
  };

  // --- Match Logic ---
  const fetchMatches = async () => {
    try {
      setMatchesLoading(true);
      const res = await fetch(`${API_URL}/matches`);
      const data = await res.json();
      console.log(data.map(

        ({

          teamA,

          teamB,

          teamALogo,

          teamBLogo,

          kickoffTime,

          status

        }) => ({

          teamA,

          teamB,

          teamALogo,

          teamBLogo,

          kickoffTime,

          status

        })

      ))
      setMatches(data);
    } catch (err) {
      setMatchError('Failed to load matches');
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      setMatchError('');
      const res = await fetch(`${API_URL}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newMatch)
      });
      const data = await res.json();
      console.log(data.map(

        ({

          teamA,

          teamB,

          teamALogo,

          teamBLogo,

          kickoffTime,

          status

        }) => ({

          teamA,

          teamB,

          teamALogo,

          teamBLogo,

          kickoffTime,

          status

        })

      ))
      if (!res.ok) throw new Error(data.error || 'Failed to create match');

      setNewMatch({
        teamA: '',
        teamB: '',
        teamALogo: '⚽',
        teamBLogo: '⚽',
        kickoffTime: '',
        winnerCount: 2,
        prizeAmount: 100
      });
      fetchMatches();
    } catch (err) {
      setMatchError(err.message);
    }
  };

  const handleDeleteMatch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this match? All predictions will be lost.')) return;
    try {
      const res = await fetch(`${API_URL}/matches/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete match');
      }
      fetchMatches();
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Complete Match Score Modal ---
  const handleOpenCompleteModal = async (match) => {
    setSelectedMatch(match);
    setCompleteScoreA('0');
    setCompleteScoreB('0');
    setModalPredictions([]);
    setModalPredictionsLoading(true);
    try {
      const res = await fetch(`${API_URL}/predictions/admin/all?matchId=${match._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModalPredictions(data);
      }
    } catch (err) {
      console.error('Failed to fetch modal predictions:', err);
    } finally {
      setModalPredictionsLoading(false);
    }
  };

  const handleCompleteMatch = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    try {
      setCompletingMatch(true);
      const res = await fetch(`${API_URL}/matches/${selectedMatch._id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          scoreA: completeScoreA,
          scoreB: completeScoreB
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete match');

      // Close completion modal and open winner selection modal immediately with exact predictions
      setSelectedMatch(null);
      setWinnerModalMatch(data.match);

      // Auto pre-select predictions that are verified paid
      const candidates = data.exactPredictions || [];
      setExactPredictions(candidates);

      const paidCandidates = candidates.filter(p => p.paymentStatus === 'verified');
      // Auto select first N paid candidates as default winners
      const defaultWinnerIds = paidCandidates.slice(0, data.match.winnerCount).map(p => p._id);
      setSelectedWinnerIds(defaultWinnerIds);

      fetchMatches();
    } catch (err) {
      alert(err.message);
    } finally {
      setCompletingMatch(false);
    }
  };

  // --- Winner Selection Modal ---
  const handleOpenWinnerModal = async (match) => {
    try {
      setWinnerModalMatch(match);
      // Fetch exact matching predictions for this completed match
      const res = await fetch(`${API_URL}/predictions/admin/all?matchId=${match._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allPreds = await res.json();

      const sA = match.result.scoreA;
      const sB = match.result.scoreB;
      let actualWinner;
      if (sA > sB) actualWinner = 'teamA';
      else if (sA < sB) actualWinner = 'teamB';
      else actualWinner = 'draw';

      const matchExact = allPreds.filter(p => {
        if (p.predictionType === 'winningTeam') {
          return p.predictedWinner === actualWinner;
        } else {
          return p.predictedScoreA === sA && p.predictedScoreB === sB;
        }
      });
      setExactPredictions(matchExact);

      // Pre-select existing winners
      const existingWinners = matchExact.filter(p => p.isWinner).map(p => p._id);

      if (existingWinners.length > 0) {
        setSelectedWinnerIds(existingWinners);
      } else {
        // Auto select first N verified paid candidates
        const paidCandidates = matchExact.filter(p => p.paymentStatus === 'verified');
        setSelectedWinnerIds(paidCandidates.slice(0, match.winnerCount).map(p => p._id));
      }
    } catch (err) {
      alert('Failed to load predictions for match');
    }
  };

  const handleSelectWinnerCheckbox = (id) => {
    setSelectedWinnerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSaveWinners = async () => {
    if (!winnerModalMatch) return;
    try {
      setSavingWinners(true);
      const res = await fetch(`${API_URL}/matches/${winnerModalMatch._id}/winners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ predictionIds: selectedWinnerIds })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save winners');
      }
      alert('Winners updated successfully!');
      setWinnerModalMatch(null);
      fetchMatches();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingWinners(false);
    }
  };

  // --- Payment Verification Logic ---
  const fetchPredictions = async () => {
    try {
      setPredictionsLoading(true);
      let query = `?paymentStatus=${paymentFilter}`;
      if (searchQuery) query += `&search=${encodeURIComponent(searchQuery)}`;
      if (selectedFilterMatchId) query += `&matchId=${selectedFilterMatchId}`;

      const res = await fetch(`${API_URL}/predictions/admin/all${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPredictions(data);
    } catch (err) {
      setPredictionError('Failed to load predictions');
    } finally {
      setPredictionsLoading(false);
    }
  };

  // Get unique prediction combinations from predictions for the current selected match
  const getScoreCombinations = () => {
    const counts = {};
    predictions.forEach((pred) => {
      const isWinningTeam = pred.predictionType === 'winningTeam';
      const key = isWinningTeam
        ? `winner-${pred.predictedWinner}`
        : `score-${pred.predictedScoreA}-${pred.predictedScoreB}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.keys(counts).map((key) => {
      const isWinningTeam = key.startsWith('winner-');
      let label = '';
      if (isWinningTeam) {
        const winner = key.replace('winner-', '');
        const match = matches.find(m => m._id === selectedFilterMatchId);
        const winnerName = winner === 'teamA' ? (match?.teamA || 'Team A') : winner === 'teamB' ? (match?.teamB || 'Team B') : 'Draw';
        label = `Winner: ${winnerName} (${counts[key]} participants)`;
      } else {
        const parts = key.replace('score-', '').split('-');
        label = `Score: ${parts[0]} - ${parts[1]} (${counts[key]} participants)`;
      }
      return {
        key,
        label
      };
    });
  };

  const scoreCombinations = selectedFilterMatchId ? getScoreCombinations() : [];

  const filteredPredictions = predictions.filter((pred) => {
    if (selectedScoreCombination) {
      const isWinningTeam = pred.predictionType === 'winningTeam';
      const key = isWinningTeam
        ? `winner-${pred.predictedWinner}`
        : `score-${pred.predictedScoreA}-${pred.predictedScoreB}`;
      return key === selectedScoreCombination;
    }
    return true;
  });

  const handleUpdatePayment = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/predictions/${id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentStatus: status })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update payment');
      }
      fetchPredictions();
    } catch (err) {
      alert(err.message);
    }
  };

  // Login Screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="prediction-panel" style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin Login</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Access restricted to site administrators.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Admin Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
              />
            </div>
            {loginError && (
              <div className="alert alert-error" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>{loginError}</div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Unlock Dashboard <Key size={16} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage predictions and match outcomes</p>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Sign Out
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Match Management
        </button>
        <button
          className={`admin-tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Payment Verification
        </button>
        <button
          className={`admin-tab ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          Referral Management
        </button>
      </div>

      {activeTab === 'matches' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Create Match */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
              <Plus size={20} /> Create Upcoming Match
            </h3>

            <form onSubmit={handleCreateMatch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Team A Name</label>
                <input
                  type="text"
                  placeholder="e.g. Argentina"
                  value={newMatch.teamA}
                  onChange={(e) => setNewMatch({ ...newMatch, teamA: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Team A Emoji/Logo</label>
                <input
                  type="text"
                  placeholder="e.g. 🇦🇷"
                  value={newMatch.teamALogo}
                  onChange={(e) => setNewMatch({ ...newMatch, teamALogo: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Team B Name</label>
                <input
                  type="text"
                  placeholder="e.g. France"
                  value={newMatch.teamB}
                  onChange={(e) => setNewMatch({ ...newMatch, teamB: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Team B Emoji/Logo</label>
                <input
                  type="text"
                  placeholder="e.g. 🇫🇷"
                  value={newMatch.teamBLogo}
                  onChange={(e) => setNewMatch({ ...newMatch, teamBLogo: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Kickoff Date & Time</label>
                <input
                  type="datetime-local"
                  value={newMatch.kickoffTime}
                  onChange={(e) => setNewMatch({ ...newMatch, kickoffTime: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Prize Payout per winner (₹)</label>
                <input
                  type="number"
                  value={newMatch.prizeAmount}
                  onChange={(e) => setNewMatch({ ...newMatch, prizeAmount: parseInt(e.target.value) })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Number of Winners</label>
                <input
                  type="number"
                  value={newMatch.winnerCount}
                  onChange={(e) => setNewMatch({ ...newMatch, winnerCount: parseInt(e.target.value) })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '42px' }}>
                  Add Match
                </button>
              </div>
            </form>
            {matchError && (
              <div className="alert alert-error" style={{ marginTop: '1rem' }}>{matchError}</div>
            )}
          </div>

          {/* Match List */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} /> Match List
            </h3>

            {matchesLoading ? (
              <div>Loading matches...</div>
            ) : matches.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No matches found.</div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Match</th>
                      <th>Kickoff Time</th>
                      <th>Prize Pool</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr key={match._id}>
                        <td>
                          <strong>
                            {match.teamALogo} {match.teamA} vs {match.teamBLogo} {match.teamB}
                          </strong>
                        </td>
                        <td>{new Date(match.kickoffTime).toLocaleString()}</td>
                        <td>₹{match.prizeAmount} ({match.winnerCount} winners)</td>
                        <td>
                          {match.status === 'completed' ? (
                            <span className="badge badge-verified">Completed</span>
                          ) : (
                            <span className="badge badge-pending">Scheduled</span>
                          )}
                        </td>
                        <td>
                          {match.status === 'completed' ? (
                            <strong>{match.result.scoreA} - {match.result.scoreB}</strong>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <div className="admin-actions">
                            {match.status !== 'completed' ? (
                              <button
                                className="action-btn action-btn-approve"
                                onClick={() => handleOpenCompleteModal(match)}
                              >
                                Record Result
                              </button>
                            ) : (
                              <button
                                className="action-btn"
                                style={{ background: 'rgba(255, 215, 0, 0.15)', color: 'var(--accent)' }}
                                onClick={() => handleOpenWinnerModal(match)}
                              >
                                <Award size={14} style={{ marginRight: '0.2rem' }} /> Pick Winners
                              </button>
                            )}
                            <button
                              className="action-btn action-btn-reject"
                              onClick={() => handleDeleteMatch(match._id)}
                              title="Delete Match"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Correct Predictions Viewer */}
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
              <Award size={20} /> Correct Predictions Viewer
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Select a completed match below to inspect all participants who predicted correctly.
            </p>

            <div style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
              <select
                value={selectedCompletedMatchId}
                onChange={(e) => setSelectedCompletedMatchId(e.target.value)}
                className="form-input"
              >
                <option value="">-- Select a completed match --</option>
                {matches
                  .filter((m) => m.status === 'completed')
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.teamALogo} {m.teamA} vs {m.teamBLogo} {m.teamB} (Result: {m.result.scoreA} - {m.result.scoreB})
                    </option>
                  ))}
              </select>
            </div>

            {selectedCompletedMatchId && (() => {
              const selectedMatchInfo = matches.find((m) => m._id === selectedCompletedMatchId);
              if (!selectedMatchInfo) return null;

              const sA = selectedMatchInfo.result.scoreA;
              const sB = selectedMatchInfo.result.scoreB;
              let actualWinner;
              if (sA > sB) actualWinner = 'teamA';
              else if (sA < sB) actualWinner = 'teamB';
              else actualWinner = 'draw';

              const correctPreds = completedMatchPredictions.filter(p => {
                if (p.predictionType === 'winningTeam') {
                  return p.predictedWinner === actualWinner;
                } else {
                  return p.predictedScoreA === sA && p.predictedScoreB === sB;
                }
              });

              return (
                <div>
                  <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                    Correct Predictions ({correctPreds.length} users)
                  </h4>

                  {completedMatchPredictionsLoading ? (
                    <div style={{ color: 'var(--text-muted)' }}>Loading predictions...</div>
                  ) : correctPreds.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                      No participants predicted correctly for this match.
                    </div>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>User / Phone</th>
                            <th>Prediction Pick</th>
                            <th>UPI ID</th>
                            <th>UTR / Ref ID</th>
                            <th>Payment Status</th>
                            <th>Is Winner Picked</th>
                          </tr>
                        </thead>
                        <tbody>
                          {correctPreds.map((pred) => {
                            const isWinningTeam = pred.predictionType === 'winningTeam';
                            const pickText = isWinningTeam
                              ? (pred.predictedWinner === 'teamA' ? `${selectedMatchInfo.teamA} to Win` : pred.predictedWinner === 'teamB' ? `${selectedMatchInfo.teamB} to Win` : 'Draw')
                              : `${pred.predictedScoreA} - ${pred.predictedScoreB}`;
                            const multiplier = isWinningTeam ? 2 : 3;
                            return (
                              <tr key={pred._id}>
                                <td>
                                  <strong>{pred.userName}</strong>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pred.phoneNumber}</div>
                                </td>
                                <td>
                                  <strong>{pickText}</strong>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {isWinningTeam ? 'Winner' : 'Score'} (Payout: ₹{(pred.entryAmount || 20) * multiplier})
                                  </div>
                                </td>
                                <td><span style={{ fontSize: '0.85rem' }}>{pred.upiId}</span></td>
                                <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{pred.transactionId}</span></td>
                                <td>
                                  <span className={`badge badge-${pred.paymentStatus}`}>{pred.paymentStatus}</span>
                                </td>
                                <td>
                                  {pred.isWinner ? (
                                    <span className="badge badge-winner">🏆 Winner Selected</span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justify: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Verification Board</span>
              <button
                onClick={fetchPredictions}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title="Reload predictions"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </h3>

          {/* Filters bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search Name, Phone, UPI or UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Match Filter Dropdown */}
            <div style={{ minWidth: '200px' }}>
              <select
                value={selectedFilterMatchId}
                onChange={(e) => {
                  setSelectedFilterMatchId(e.target.value);
                  setSelectedScoreCombination(''); // Reset combination filter when match changes
                }}
                className="form-input"
              >
                <option value="">All Matches</option>
                {matches.map((match) => (
                  <option key={match._id} value={match._id}>
                    {match.teamALogo} {match.teamA} vs {match.teamBLogo} {match.teamB}
                  </option>
                ))}
              </select>
            </div>

            {/* Score Combination Filter Dropdown */}
            {selectedFilterMatchId && (
              <div style={{ minWidth: '200px' }}>
                <select
                  value={selectedScoreCombination}
                  onChange={(e) => setSelectedScoreCombination(e.target.value)}
                  className="form-input"
                >
                  <option value="">All Score Combinations</option>
                  {scoreCombinations.map((comb) => (
                    <option key={comb.key} value={comb.key}>
                      {comb.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${paymentFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                onClick={() => setPaymentFilter('pending')}
              >
                Pending
              </button>
              <button
                className={`btn ${paymentFilter === 'verified' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                onClick={() => setPaymentFilter('verified')}
              >
                Verified
              </button>
              <button
                className={`btn ${paymentFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                onClick={() => setPaymentFilter('rejected')}
              >
                Rejected
              </button>
            </div>

            <button
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              onClick={fetchPredictions}
            >
              Apply Filter
            </button>
          </div>

          {predictionsLoading ? (
            <div>Loading predictions...</div>
          ) : filteredPredictions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No predictions match this filter.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>User / Phone</th>
                    <th>Prediction</th>
                    <th>UPI ID</th>
                    <th>UTR / Ref ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.map((pred) => (
                    <tr key={pred._id}>
                      <td>
                        {pred.matchId ? (
                          <>
                            <strong>{pred.matchId.teamA} vs {pred.matchId.teamB}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Match Status: {pred.matchId.status}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--error)', fontStyle: 'italic' }}>Deleted Match</span>
                        )}
                      </td>
                      <td>
                        <strong>{pred.userName}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pred.phoneNumber}</div>
                      </td>
                      <td>
                        {(() => {
                          const isWinningTeam = pred.predictionType === 'winningTeam';
                          const multiplier = isWinningTeam ? 2 : 3;
                          const pickText = isWinningTeam
                            ? (pred.predictedWinner === 'teamA' ? `${pred.matchId?.teamA || 'Team A'} to Win` : pred.predictedWinner === 'teamB' ? `${pred.matchId?.teamB || 'Team B'} to Win` : 'Draw')
                            : `${pred.predictedScoreA} - ${pred.predictedScoreB}`;
                          return (
                            <>
                              <strong style={{ fontSize: '1.1rem', color: 'var(--secondary)' }}>
                                {pickText}
                              </strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Entry: ₹{pred.entryAmount || 20} (Payout: ₹{(pred.entryAmount || 20) * multiplier})
                              </div>
                            </>
                          );
                        })()}
                      </td>
                      <td><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pred.upiId}</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>{pred.transactionId}</span></td>
                      <td>
                        {pred.paymentStatus === 'pending' ? (
                          <div className="admin-actions">
                            <button
                              className="action-btn action-btn-approve"
                              onClick={() => handleUpdatePayment(pred._id, 'verified')}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              className="action-btn action-btn-reject"
                              onClick={() => handleUpdatePayment(pred._id, 'rejected')}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className={`badge badge-${pred.paymentStatus}`}>{pred.paymentStatus}</span>
                            <button
                              className="action-btn"
                              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', padding: '0.2rem 0.4rem' }}
                              onClick={() => handleUpdatePayment(pred._id, 'pending')}
                              title="Reset to Pending"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'referrals' && (
        <ReferralManagementDashboard token={token} />
      )}

      {/* Record Score / Complete Match Modal */}
      {selectedMatch && (
        <div className="modal-overlay" onClick={() => setSelectedMatch(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMatch(null)}>×</button>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} color="var(--primary)" /> Complete Match Result
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Enter the final score for <strong>{selectedMatch.teamA} vs {selectedMatch.teamB}</strong>.
              This will lock the match and calculate correct predictions.
            </p>

            <form onSubmit={handleCompleteMatch}>
              <div className="predict-score-input-container" style={{ margin: '1rem 0 2rem' }}>
                <div className="score-team-box">
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedMatch.teamA}</span>
                  <input
                    type="number"
                    min="0"
                    value={completeScoreA}
                    onChange={(e) => setCompleteScoreA(e.target.value)}
                    className="score-input"
                    required
                  />
                </div>

                <span className="score-divider">-</span>

                <div className="score-team-box">
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedMatch.teamB}</span>
                  <input
                    type="number"
                    min="0"
                    value={completeScoreB}
                    onChange={(e) => setCompleteScoreB(e.target.value)}
                    className="score-input"
                    required
                  />
                </div>
              </div>

              {/* Real-time predictions matching the entered score */}
              <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
                  <Award size={16} /> Predictions for {completeScoreA || 0} - {completeScoreB || 0}
                </h4>

                {modalPredictionsLoading ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading predictions...</div>
                ) : (
                  (() => {
                    const sA = parseInt(completeScoreA || 0);
                    const sB = parseInt(completeScoreB || 0);
                    let actualWinner;
                    if (sA > sB) actualWinner = 'teamA';
                    else if (sA < sB) actualWinner = 'teamB';
                    else actualWinner = 'draw';

                    const matchingPreds = modalPredictions.filter(p => {
                      if (p.predictionType === 'winningTeam') {
                        return p.predictedWinner === actualWinner;
                      } else {
                        return p.predictedScoreA === sA && p.predictedScoreB === sB;
                      }
                    });

                    if (matchingPreds.length === 0) {
                      return (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                          No participants predicted this outcome.
                        </div>
                      );
                    }

                    return (
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {matchingPreds.map(pred => {
                            const isWinningTeam = pred.predictionType === 'winningTeam';
                            const pickText = isWinningTeam
                              ? (pred.predictedWinner === 'teamA' ? `${selectedMatch.teamA} to Win` : pred.predictedWinner === 'teamB' ? `${selectedMatch.teamB} to Win` : 'Draw')
                              : `${pred.predictedScoreA} - ${pred.predictedScoreB}`;
                            return (
                              <div
                                key={pred._id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.5rem 0.75rem',
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: 600 }}>{pred.userName}</span>
                                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({pred.phoneNumber})</span>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                    Pick: {pickText} | UPI: {pred.upiId} | UTR: {pred.transactionId}
                                  </div>
                                </div>
                                <div>
                                  <span className={`badge badge-${pred.paymentStatus}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                                    {pred.paymentStatus}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedMatch(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={completingMatch}>
                  {completingMatch ? 'Saving...' : 'Set Score & Close Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Winners Modal */}
      {winnerModalMatch && (
        <div className="modal-overlay" onClick={() => setWinnerModalMatch(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setWinnerModalMatch(null)}>×</button>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
              <Award size={20} /> Select Winners (₹{winnerModalMatch.prizeAmount} Payout)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Match: <strong>{winnerModalMatch.teamA} vs {winnerModalMatch.teamB}</strong> (Final: {winnerModalMatch.result.scoreA} - {winnerModalMatch.result.scoreB}).
              Below are users who predicted correctly.
            </p>

            <div style={{ margin: '1.5rem 0', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.5rem' }}>
              {exactPredictions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No users predicted correctly.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {exactPredictions.map((pred) => {
                    const isVerified = pred.paymentStatus === 'verified';
                    const isWinningTeam = pred.predictionType === 'winningTeam';
                    const pickText = isWinningTeam
                      ? (pred.predictedWinner === 'teamA' ? `${winnerModalMatch.teamA} to Win` : pred.predictedWinner === 'teamB' ? `${winnerModalMatch.teamB} to Win` : 'Draw')
                      : `${pred.predictedScoreA} - ${pred.predictedScoreB}`;
                    const multiplier = isWinningTeam ? 2 : 3;
                    return (
                      <div
                        key={pred._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          opacity: isVerified ? 1 : 0.6
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input
                            type="checkbox"
                            disabled={!isVerified}
                            checked={selectedWinnerIds.includes(pred._id)}
                            onChange={() => handleSelectWinnerCheckbox(pred._id)}
                            style={{ width: '18px', height: '18px', cursor: isVerified ? 'pointer' : 'not-allowed' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {pred.userName} ({pred.phoneNumber})
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Pick: {pickText} | UPI: {pred.upiId} | UTR: {pred.transactionId} | Paid: ₹{pred.entryAmount || 20} (Payout: ₹{(pred.entryAmount || 20) * multiplier})
                            </div>
                          </div>
                        </div>
                        <div>
                          {isVerified ? (
                            <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>Paid</span>
                          ) : (
                            <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>Unverified Payment</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Selected: <strong>{selectedWinnerIds.length} / {winnerModalMatch.winnerCount}</strong> winners
              </span>
              {selectedWinnerIds.length > winnerModalMatch.winnerCount && (
                <span style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>
                  Warning: Exceeds standard {winnerModalMatch.winnerCount} winners!
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setWinnerModalMatch(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleSaveWinners}
                disabled={savingWinners}
              >
                {savingWinners ? 'Saving Winners...' : 'Confirm & Save Winners'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferralManagementDashboard({ token }) {
  const [subTab, setSubTab] = React.useState('claims');
  const [claims, setClaims] = React.useState([]);
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [claimFilter, setClaimFilter] = React.useState('pending');

  const fetchClaims = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const query = claimFilter !== 'all' ? `?status=${claimFilter}` : '';
      const res = await fetch(`${API_URL}/referrals/admin/claims${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch claims');
      setClaims(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [claimFilter, token]);

  const fetchUsers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/referrals/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (subTab === 'claims') {
      fetchClaims();
    } else {
      fetchUsers();
    }
  }, [subTab, fetchClaims, fetchUsers]);

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Are you sure you want to mark this claim as paid?')) return;
    try {
      const res = await fetch(`${API_URL}/referrals/admin/claims/${id}/pay`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pay claim');
      alert('Claim successfully marked as paid.');
      fetchClaims();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div className="admin-tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', borderBottom: 'none' }}>
        <button
          className={`admin-tab ${subTab === 'claims' ? 'active' : ''}`}
          onClick={() => setSubTab('claims')}
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
        >
          Referral Claims
        </button>
        <button
          className={`admin-tab ${subTab === 'users' ? 'active' : ''}`}
          onClick={() => setSubTab('users')}
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
        >
          Referral Users
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {subTab === 'claims' ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Claim Requests</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${claimFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setClaimFilter('pending')}
              >
                Pending
              </button>
              <button
                className={`btn ${claimFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setClaimFilter('paid')}
              >
                Paid
              </button>
              <button
                className={`btn ${claimFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setClaimFilter('all')}
              >
                All
              </button>
            </div>
          </div>

          {loading ? (
            <div>Loading claims...</div>
          ) : claims.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No claims found.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Referral Code</th>
                    <th>User Details (Owner)</th>
                    <th>UPI ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim._id}>
                      <td><strong style={{ color: 'var(--primary)' }}>{claim.referralCode}</strong></td>
                      <td>
                        <strong>{claim.referralUserId?.phoneNumber || 'N/A'}</strong>
                      </td>
                      <td>{claim.referralUserId?.upiId || 'N/A'}</td>
                      <td><strong style={{ color: 'var(--secondary)' }}>₹{claim.amount}</strong></td>
                      <td>
                        <span className={`badge badge-${claim.status === 'paid' ? 'verified' : 'pending'}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td>{new Date(claim.createdAt).toLocaleString()}</td>
                      <td>
                        {claim.status === 'pending' ? (
                          <button
                            className="action-btn action-btn-approve"
                            onClick={() => handleMarkPaid(claim._id)}
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Paid on {new Date(claim.paidAt).toLocaleDateString()}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Referral Users Registry</h3>

          {loading ? (
            <div>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No referral users registered.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Referral Code</th>
                    <th>Phone Number</th>
                    <th>UPI ID</th>
                    <th>Total Earned</th>
                    <th>Total Claimed</th>
                    <th>Pending Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const pending = u.totalEarned - u.totalClaimed;
                    return (
                      <tr key={u._id}>
                        <td><strong style={{ color: 'var(--primary)' }}>{u.referralCode}</strong></td>
                        <td>{u.phoneNumber}</td>
                        <td>{u.upiId}</td>
                        <td>₹{u.totalEarned}</td>
                        <td>₹{u.totalClaimed}</td>
                        <td>
                          <strong style={{ color: pending > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                            ₹{pending}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
