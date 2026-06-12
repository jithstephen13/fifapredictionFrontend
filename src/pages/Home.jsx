import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../App';
import { Calendar, Trophy, ArrowRight, Search, Clock } from 'lucide-react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracking Modal State
  const [showTracker, setShowTracker] = useState(false);
  const [trackerPhone, setTrackerPhone] = useState('');
  const [userPredictions, setUserPredictions] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  // Winners Modal State
  const [showWinners, setShowWinners] = useState(false);
  const [winners, setWinners] = useState([]);
  const [winnersLoading, setWinnersLoading] = useState(false);
  const [winnersError, setWinnersError] = useState(null);

  const fetchWinners = async () => {
    try {
      setWinnersLoading(true);
      setWinnersError(null);
      const res = await fetch(`${API_URL}/predictions/winners`);
      if (!res.ok) throw new Error('Failed to fetch winners list');
      const data = await res.json();
      setWinners(data);
    } catch (err) {
      setWinnersError(err.message);
    } finally {
      setWinnersLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveMatches();
  }, []);

  useEffect(() => {
    if (showWinners) {
      fetchWinners();
    }
  }, [showWinners]);

  const fetchActiveMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/matches/active`);
      if (!res.ok) throw new Error('Failed to fetch upcoming matches');
      const data = await res.json();
      setMatches(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPredictions = async (e) => {
    e.preventDefault();
    if (!trackerPhone) return;

    try {
      setTrackingLoading(true);
      setTrackingError(null);
      const res = await fetch(`${API_URL}/predictions/my-predictions?phoneNumber=${encodeURIComponent(trackerPhone)}`);
      if (!res.ok) throw new Error('Failed to fetch predictions');
      const data = await res.json();
      setUserPredictions(data);
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  const formatMatchTime = (dateStr) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getWinnersByMatch = () => {
    const grouped = {};
    winners.forEach((winner) => {
      const matchIdVal = winner.matchId._id || `${winner.matchId.teamA}-vs-${winner.matchId.teamB}`;
      if (!grouped[matchIdVal]) {
        grouped[matchIdVal] = {
          match: winner.matchId,
          winners: []
        };
      }
      grouped[matchIdVal].winners.push(winner);
    });
    return Object.values(grouped);
  };

  return (
    <div>
      <div className="title-section">
        <h1>Predict & Win Real Cash</h1>
        <p>Predict scores of upcoming FIFA matches. Correct predictions win triple (3x) their entry fee!</p>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowTracker(true)}>
            <Search size={18} /> Track My Predictions
          </button>
          <button className="btn btn-primary" onClick={() => setShowWinners(true)} style={{ background: 'linear-gradient(135deg, var(--accent), #ffb300)', color: 'var(--text-dark)' }}>
            🏆 Winners Board
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlignment: 'center', padding: '3rem' }}>
          <div className="spinner">Loading matches...</div>
        </div>
      ) : error ? (
        <div className="alert alert-error">
          Error loading matches: {error}. Please try again later.
        </div>
      ) : matches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>No Upcoming Matches</h3>
          <p className="text-muted">There are no upcoming matches available for predictions at this moment.</p>
        </div>
      ) : (
        (() => {
          // Helper to group matches by kickoff date
          const groupMatchesByDay = (list) => {
            const groups = {};
            list.forEach((match) => {
              const d = new Date(match.kickoffTime);
              const dayHeader = d.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              });
              if (!groups[dayHeader]) groups[dayHeader] = [];
              groups[dayHeader].push(match);
            });
            return groups;
          };

          const grouped = groupMatchesByDay(matches);

          return Object.keys(grouped).map((dayHeader) => (
            <div key={dayHeader} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontSize: '1.25rem',
                color: 'var(--secondary)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                borderLeft: '4px solid var(--primary)',
                paddingLeft: '0.5rem',
                letterSpacing: '-0.3px'
              }}>
                <Calendar size={18} /> {dayHeader}
              </h2>
              <div className="match-grid">
                {grouped[dayHeader].map((match) => {
                  const timeInfo = formatMatchTime(match.kickoffTime);
                  return (
                    <div key={match._id} className="card match-card">
                      <div>
                        <div className="match-header">
                          <span className="match-time" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                            <Clock size={14} /> Kickoff: {timeInfo.time}
                          </span>
                        </div>

                        <div className="match-vs">
                          <div className="team">
                            <span className="team-logo">{match.teamALogo || '🏳️'}</span>
                            <span className="team-name" title={match.teamA}>{match.teamA}</span>
                          </div>

                          <span className="vs-badge">VS</span>

                          <div className="team">
                            <span className="team-logo">{match.teamBLogo || '🏳️'}</span>
                            <span className="team-name" title={match.teamB}>{match.teamB}</span>
                          </div>
                        </div>
                      </div>

                      <div className="match-footer">
                        <div className="prize-pool">
                          Prize: <span className="prize-amount">3X Payout</span> for winners
                        </div>
                        <Link to={`/predict/${match._id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                          Predict <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()
      )}

      {/* Rules Section */}
      <div className="rules-container">
        <h2><Trophy size={22} /> How to Play & Win</h2>
        <ul className="rules-list">
          <li>Choose and pay an entry fee between <strong>₹20 and ₹100</strong> using Google Pay, PhonePe, or Paytm.</li>
          <li>Enter your <strong>12-digit UPI Transaction ID (UTR / Ref No)</strong> to complete your submission.</li>
          <li>Predictions close exactly when the match starts.</li>
          <li>Once the match concludes, the administrator will verify payments and update scores.</li>
          <li>For each match, we will select <strong>people</strong> who predicted the exact score to win <strong>triple (3x) their entry amount</strong>!</li>
        </ul>
      </div>

      {/* Track Predictions Modal */}
      {showTracker && (
        <div className="modal-overlay" onClick={() => setShowTracker(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTracker(false)}>×</button>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={20} /> Track My Predictions
            </h3>

            <form onSubmit={handleTrackPredictions} className="search-predictions-bar">
              <input
                type="tel"
                placeholder="Enter Your Phone Number"
                value={trackerPhone}
                onChange={(e) => setTrackerPhone(e.target.value)}
                className="form-input"
                required
              />
              <button type="submit" className="btn btn-primary" disabled={trackingLoading}>
                Search
              </button>
            </form>

            {trackingError && (
              <div className="alert alert-error" style={{ fontSize: '0.9rem' }}>{trackingError}</div>
            )}

            {trackingLoading && (
              <div style={{ textAlign: 'center', padding: '1rem' }}>Searching...</div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!trackingLoading && userPredictions.length === 0 && trackerPhone && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No predictions found for this phone number.
                </div>
              )}

              {userPredictions.map((pred) => (
                <div key={pred._id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: pred.matchId ? 'var(--secondary)' : 'var(--error)' }}>
                      {pred.matchId ? `${pred.matchId.teamA} vs ${pred.matchId.teamB}` : 'Deleted Match'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(pred.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        Your Pick: {pred.predictedScoreA} - {pred.predictedScoreB}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Entry: ₹{pred.entryAmount || 20} (Potential Payout: ₹{(pred.entryAmount || 20) * 3})
                      </div>
                      {pred.matchId && pred.matchId.status === 'completed' && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Final Result: {pred.matchId.result.scoreA} - {pred.matchId.result.scoreB}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      {pred.isWinner ? (
                        <span className="badge badge-winner">🏆 Winner (₹{(pred.entryAmount || 20) * 3})</span>
                      ) : pred.paymentStatus === 'verified' ? (
                        <span className="badge badge-verified">Verified</span>
                      ) : pred.paymentStatus === 'rejected' ? (
                        <span className="badge badge-rejected">Rejected</span>
                      ) : (
                        <span className="badge badge-pending">Pending Verification</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Winners Board Modal */}
      {showWinners && (
        <div className="modal-overlay" onClick={() => setShowWinners(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWinners(false)}>×</button>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)' }}>
              🏆 FIFA Predictor Winners
            </h3>

            {winnersError && (
              <div className="alert alert-error" style={{ fontSize: '0.9rem' }}>{winnersError}</div>
            )}

            {winnersLoading && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading winners list...</div>
            )}

            {!winnersLoading && winners.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.95rem' }}>
                No winners announced yet. Keep predicting to top the board!
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              {getWinnersByMatch().map((group) => (
                <div
                  key={group.match._id || `${group.match.teamA}-vs-${group.match.teamB}`}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Match Header Group */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--secondary)' }}>
                      ⚽ {group.match.teamALogo} {group.match.teamA} vs {group.match.teamBLogo} {group.match.teamB}
                    </span>
                    <span className="badge badge-verified" style={{ fontSize: '0.7rem', textTransform: 'none' }}>
                      Result: {group.match.result.scoreA} - {group.match.result.scoreB}
                    </span>
                  </div>

                  {/* List of winners for this match */}
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {group.winners.map((winner) => (
                      <div
                        key={winner._id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem',
                          background: 'rgba(255, 215, 0, 0.03)',
                          border: '1px solid rgba(255, 215, 0, 0.1)',
                          borderRadius: '8px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>
                            🎉 {winner.userName} ({winner.phoneNumber})
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Prediction: {winner.predictedScoreA} - {winner.predictedScoreB}
                          </div>
                        </div>
                        <span className="badge badge-winner" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', animation: 'none' }}>
                          Won ₹{winner.prizeAmount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
