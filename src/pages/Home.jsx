import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../App';
import { Calendar, Trophy, ArrowRight, Search, Clock } from 'lucide-react';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeHomeTab, setActiveHomeTab] = useState('predictDay'); // 'predictDay', 'predictScore'

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
      const res = await fetch(`${API_URL}/predictions_v2/winners`);
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
      const res = await fetch(`${API_URL}/predictions_v2/my-predictions?phoneNumber=${encodeURIComponent(trackerPhone)}`);
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

  const getWinnersGrouped = () => {
    const dayWinners = [];
    const matchWinners = {};

    winners.forEach((winner) => {
      if (winner.predictionType === 'winningTeam' && winner.matches && winner.matches.length > 0) {
        dayWinners.push(winner);
      } else {
        const matchIdVal = winner.matchId?._id || `${winner.matchId?.teamA}-vs-${winner.matchId?.teamB}`;
        if (!matchWinners[matchIdVal]) {
          matchWinners[matchIdVal] = {
            match: winner.matchId,
            winners: []
          };
        }
        matchWinners[matchIdVal].winners.push(winner);
      }
    });

    return {
      dayWinners,
      matchWinners: Object.values(matchWinners)
    };
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

      {/* Prediction Mode Tabs */}
      <div className="home-mode-tabs">
        <button
          className={`home-mode-tab-btn ${activeHomeTab === 'predictDay' ? 'active' : ''}`}
          onClick={() => setActiveHomeTab('predictDay')}
        >
          🏆 Predict Day Winners (2x Payout)
        </button>
        <button
          className={`home-mode-tab-btn ${activeHomeTab === 'predictScore' ? 'active' : ''}`}
          onClick={() => setActiveHomeTab('predictScore')}
        >
          ⚽ Predict Match Score (3x Payout)
        </button>
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
          // Helper to group matches by kickoff date in Asia/Kolkata time
          const groupMatchesByDay = (list) => {
            const groups = {};
            list.forEach((match) => {
              const d = new Date(match.kickoffTime);
              const dayHeader = d.toLocaleDateString('en-US', {
                timeZone: 'Asia/Kolkata',
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

          return Object.keys(grouped).map((dayHeader) => {
            const dayMatches = grouped[dayHeader];
            const hasScheduledMatches = dayMatches.some(m => m.status === 'scheduled');
            
            return (
              <div key={dayHeader} style={{ marginBottom: '2.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <h2 style={{
                    fontSize: '1.25rem',
                    color: 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderLeft: '4px solid var(--primary)',
                    paddingLeft: '0.5rem',
                    letterSpacing: '-0.3px',
                    margin: 0
                  }}>
                    <Calendar size={18} /> {dayHeader}
                  </h2>

                  {activeHomeTab === 'predictDay' && hasScheduledMatches && (
                    <Link
                      to={`/predict-day?date=${encodeURIComponent(dayHeader)}`}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary), #ffa000)',
                        color: 'var(--text-dark)',
                        fontSize: '0.8rem',
                        padding: '0.35rem 0.85rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(255, 179, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      🔮 Predict Winners (2x Payout)
                    </Link>
                  )}
                </div>

                <div className="match-grid">
                  {dayMatches.map((match) => {
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

                        <div className="match-footer" style={{ justifyContent: activeHomeTab === 'predictDay' ? 'center' : 'space-between' }}>
                          {activeHomeTab === 'predictDay' ? (
                            <div className="prize-pool">
                              Prize: <span className="prize-amount">2X Payout</span> for Day Winners
                            </div>
                          ) : (
                            <>
                              <div className="prize-pool">
                                Prize: <span className="prize-amount">3X Payout</span> for winners
                              </div>
                              <Link to={`/predict/${match._id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                Predict Score <ArrowRight size={16} />
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeHomeTab === 'predictDay' && hasScheduledMatches && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                    <Link
                      to={`/predict-day?date=${encodeURIComponent(dayHeader)}`}
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary), #ffa000)',
                        color: 'var(--text-dark)',
                        fontSize: '1rem',
                        padding: '0.75rem 2.25rem',
                        fontWeight: 800,
                        borderRadius: '12px',
                        boxShadow: '0 4px 15px rgba(255, 179, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      🔮 Predict Winners for {dayHeader} (2x Payout)
                    </Link>
                  </div>
                )}
              </div>
            );
          });
        })()
      )}

      {/* Rules Section */}
      <div className="rules-container">
        <h2><Trophy size={22} /> How to Play & Win</h2>
        <ul className="rules-list">
          <li>Choose your prediction style: <strong>Predict Winner</strong> (entry ₹50 - ₹140) or <strong>Predict Score</strong> (entry ₹100 - ₹300). Pay the entry fee using Google Pay, PhonePe, or Paytm.</li>
          <li>Enter your <strong>12-digit UPI Transaction ID (UTR / Ref No)</strong> to complete your submission.</li>
          <li>Predictions close exactly when the match starts.</li>
          <li>Once the match concludes, the administrator will verify payments and update results.</li>
          <li>For Day Winners, predict at least 3 matches of the day. ALL of your predicted outcomes for that day must be correct to win (2x Payout). No single-match payouts are given for day predictions. Predict Score (3x Payout) is single-match based.</li>
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
            {/* Helper to group user's predictions by base transaction ID */}
            {(() => {
              const getGroupedUserPredictions = (preds) => {
                const groups = {};
                preds.forEach((pred) => {
                  const baseTx = pred.transactionId.split('_')[0];
                  if (!groups[baseTx]) {
                    groups[baseTx] = {
                      ...pred,
                      transactionId: baseTx,
                      matches: []
                    };
                  }
                  groups[baseTx].matches.push(pred);
                });
                return Object.values(groups);
              };

              const groupedPreds = getGroupedUserPredictions(userPredictions);

              if (!trackingLoading && groupedPreds.length === 0 && trackerPhone) {
                return (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No predictions found for this phone number.
                  </div>
                );
              }

              return groupedPreds.map((group) => {
                const isWinningTeam = group.predictionType === 'winningTeam';
                const overallWinner = group.matches.every(m => m.isWinner);
                const overallPayment = group.paymentStatus;

                let isFailed = false;
                group.matches.forEach((pred) => {
                  if (pred.matchId && pred.matchId.status === 'completed') {
                    let isCorrect = false;
                    if (isWinningTeam) {
                      const sA = pred.matchId.result.scoreA;
                      const sB = pred.matchId.result.scoreB;
                      const actualWinner = sA > sB ? 'teamA' : sA < sB ? 'teamB' : 'draw';
                      isCorrect = pred.predictedWinner === actualWinner;
                    } else {
                      isCorrect = pred.predictedScoreA === pred.matchId.result.scoreA && pred.predictedScoreB === pred.matchId.result.scoreB;
                    }
                    if (!isCorrect) {
                      isFailed = true;
                    }
                  }
                });
                
                return (
                  <div key={group.transactionId} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: 'rgba(0,0,0,0.15)', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                        {isWinningTeam ? '🏆 Winning Team Prediction' : '⚽ Score Prediction'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(group.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {group.matches.map((pred) => {
                        const pickText = isWinningTeam
                          ? (pred.predictedWinner === 'teamA' ? `${pred.matchId?.teamA || 'Team A'} to Win` : pred.predictedWinner === 'teamB' ? `${pred.matchId?.teamB || 'Team B'} to Win` : 'Draw')
                          : `${pred.predictedScoreA} - ${pred.predictedScoreB}`;

                        return (
                          <div key={pred._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600 }}>
                                {pred.matchId ? `${pred.matchId.teamALogo} ${pred.matchId.teamA} vs ${pred.matchId.teamBLogo} ${pred.matchId.teamB}` : 'Deleted Match'}
                              </span>
                              <span style={{ color: 'var(--accent)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                                Your Pick: {pickText}
                              </span>
                              {pred.matchId && pred.matchId.status === 'completed' && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  Result: {pred.matchId.result.scoreA} - {pred.matchId.result.scoreB}
                                </span>
                              )}
                            </div>
                            <div>
                              {pred.matchId && pred.matchId.status === 'completed' && (
                                (() => {
                                  let isCorrect = false;
                                  if (isWinningTeam) {
                                    const sA = pred.matchId.result.scoreA;
                                    const sB = pred.matchId.result.scoreB;
                                    const actualWinner = sA > sB ? 'teamA' : sA < sB ? 'teamB' : 'draw';
                                    isCorrect = pred.predictedWinner === actualWinner;
                                  } else {
                                    isCorrect = pred.predictedScoreA === pred.matchId.result.scoreA && pred.predictedScoreB === pred.matchId.result.scoreB;
                                  }
                                  return isCorrect ? (
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Correct</span>
                                  ) : (
                                    <span style={{ color: 'var(--error)', fontWeight: 600 }}>✗ Incorrect</span>
                                  );
                                })()
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Entry Fee: ₹{group.entryAmount}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                          Potential Payout: ₹{group.entryAmount * (isWinningTeam ? 2 : 3)}
                        </div>
                      </div>

                      <div>
                        {overallWinner ? (
                          <span className="badge badge-winner">🏆 Winner (₹{group.entryAmount * (isWinningTeam ? 2 : 3)})</span>
                        ) : isFailed ? (
                          <span className="badge badge-lost">Incorrect / No Payout</span>
                        ) : overallPayment === 'rejected' ? (
                          <span className="badge badge-rejected">Rejected</span>
                        ) : overallPayment === 'verified' ? (
                          <span className="badge badge-verified">Verified</span>
                        ) : (
                          <span className="badge badge-pending">Pending Verification</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
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

            {(() => {
              const { dayWinners, matchWinners } = getWinnersGrouped();
              
              if (!winnersLoading && dayWinners.length === 0 && matchWinners.length === 0) {
                return (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.95rem' }}>
                    No winners announced yet. Keep predicting to top the board!
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Day-wise Winner Predictions */}
                  {dayWinners.length > 0 && (
                    <div>
                      <h4 style={{ color: 'var(--secondary)', marginBottom: '0.75rem', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                        📅 Day Winners (Winning Team Predictors)
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {dayWinners.map((winner) => (
                          <div
                            key={winner._id}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'rgba(255, 215, 0, 0.03)',
                              padding: '1rem',
                              borderLeft: '4px solid var(--accent)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>
                                🎉 {winner.userName} ({winner.phoneNumber})
                              </span>
                              <span className="badge badge-winner" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', animation: 'none' }}>
                                Won ₹{winner.prizeAmount}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {winner.matches.map((m) => (
                                <div key={m._id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>⚽ {m.teamALogo} {m.teamA} vs {m.teamBLogo} {m.teamB}</span>
                                  <span style={{ fontWeight: 600 }}>
                                    Pick: {m.predictedWinner === 'teamA' ? m.teamA : m.predictedWinner === 'teamB' ? m.teamB : 'Draw'} (Result: {m.result.scoreA}-{m.result.scoreB})
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match score predictions */}
                  {matchWinners.length > 0 && (
                    <div>
                      <h4 style={{ color: 'var(--secondary)', marginBottom: '0.75rem', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                        ⚽ Match Score Winners (Exact Score Predictors)
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {matchWinners.map((group) => (
                          <div
                            key={group.match?._id || Math.random().toString()}
                            style={{
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              padding: '0.75rem 1rem',
                              borderBottom: '1px solid var(--border-color)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--secondary)' }}>
                                ⚽ {group.match?.teamALogo} {group.match?.teamA} vs {group.match?.teamBLogo} {group.match?.teamB}
                              </span>
                              <span className="badge badge-verified" style={{ fontSize: '0.7rem', textTransform: 'none' }}>
                                Result: {group.match?.result.scoreA} - {group.match?.result.scoreB}
                              </span>
                            </div>

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
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
