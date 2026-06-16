import React, { useState } from 'react';
import { API_URL } from '../App';
import { Trophy, Gift, ArrowRight, Share2, Clipboard, RefreshCw, AlertCircle } from 'lucide-react';

export default function Referral() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Recovery Mode State
  const [isRecoverMode, setIsRecoverMode] = useState(false);

  // Eligibility/Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  // Copy success indicator
  const [copied, setCopied] = useState(false);

  const handleGenerateOrRecover = async (e) => {
    e.preventDefault();
    if (!phoneNumber || !upiId) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    const endpoint = isRecoverMode ? 'recover' : 'generate';
    try {
      const res = await fetch(`${API_URL}/referrals/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          upiId: upiId.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request.');
      }

      setReferralCode(data.referralCode);
      setSuccess(isRecoverMode ? 'Code recovered successfully!' : 'Code generated successfully!');

      // Proactively fetch stats for this code
      fetchEligibility(data.referralCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibility = async (code) => {
    const targetCode = code || referralCode;
    if (!targetCode) return;

    setStatsError(null);
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_URL}/referrals/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: targetCode.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch eligibility stats.');
      }
      setStats(data);
    } catch (err) {
      setStatsError(err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleClaimReward = async () => {
    if (!referralCode) return;

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_URL}/referrals/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: referralCode.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim reward.');
      }

      setSuccess('Claim request submitted successfully! Pending admin payout.');
      // Refresh stats
      fetchEligibility();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div className="title-section" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <Gift size={32} style={{ color: 'var(--primary)' }} /> Share & Earn Rewards
        </h1>
        <p>Invite friends to make match predictions. Earn when they join and play!</p>
      </div>

      <div className="match-grid" style={{ gridTemplateColumns: referralCode ? '1fr 1.2fr' : '1fr', gap: '2rem' }}>

        {/* Step 1: Code Generator Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isRecoverMode ? 'Recover Referral Code' : 'Generate Referral Code'}
          </h2>

          <form onSubmit={handleGenerateOrRecover} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                Phone Number
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                UPI ID (For cash transfers)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="example@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.75rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success" style={{ fontSize: '0.85rem', padding: '0.75rem' }}>
                {success}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Processing...' : isRecoverMode ? 'Recover Code' : 'Generate Code'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
            <button
              onClick={() => {
                setIsRecoverMode(!isRecoverMode);
                setError(null);
                setSuccess(null);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isRecoverMode ? 'Need to register? Generate code instead' : 'Already registered? Recover your code'}
            </button>
          </div>
        </div>

        {/* Step 2: Stats & Referral Display */}
        {referralCode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Share Card */}
            <div className="card" style={{ padding: '1.5rem', border: '2px dashed var(--primary)', background: 'rgba(255,215,0,0.03)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                Your Referral Code
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '2px' }}>
                  {referralCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Clipboard size={14} /> {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Share this code with friends. They must input this code when submitting their predictions.
              </p>
            </div>

            {/* Stats Summary */}
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem' }} className="spinner">Loading stats...</div>
            ) : statsError ? (
              <div className="alert alert-error">{statsError}</div>
            ) : stats && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Earned</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '0.25rem' }}>₹{stats.totalEligible}</div>
                  </div>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Claimed</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '0.25rem' }}>₹{stats.totalClaimed}</div>
                  </div>
                  <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid rgba(255,215,0,0.3)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Payout</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>₹{stats.pendingAmount}</div>
                  </div>
                </div>

                {stats.pendingAmount > 0 && (
                  <button onClick={handleClaimReward} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', background: 'linear-gradient(135deg, var(--primary), #ffa000)' }}>
                    Claim Rewards (₹{stats.pendingAmount}) <ArrowRight size={16} />
                  </button>
                )}

                {/* Reward Activity list */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Reward Activity</span>
                    <button onClick={() => fetchEligibility()} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}>
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </h3>

                  {stats.rewards.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: '1rem 0' }}>
                      No referral rewards earned yet. Keep sharing!
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {stats.rewards.map((rew) => (
                        <div key={rew._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '0.8rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                              {rew.rewardType === 'winningTeamReward' ? '₹50 Team Predict Reward' : '₹100 Score Predict Reward'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              From Friend: {rew.referredPhoneNumber}
                            </div>
                          </div>
                          <span className={`badge ${rew.status === 'claimed' ? 'badge-verified' : 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>
                            {rew.status === 'claimed' ? 'Claimed' : 'Eligible'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        )}
      </div>

      {/* Reward Rules Breakdown */}
      <div className="card" style={{ marginTop: '2.5rem', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <Trophy size={20} /> Referral Program Rules
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.85rem', lineHeight: '1.4' }}>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
            <h4 style={{ color: 'var(--secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>🏆 Prediction Type: Winner (₹50 Reward)</h4>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Earn **₹50** when your referred friend submits and verifies **5 winningTeam predictions** (paymentStatus = verified).
            </p>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
            <h4 style={{ color: 'var(--secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>🎯 Prediction Type: Exact Score (₹100 Reward)</h4>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Earn **₹100** when your referred friend submits and verifies **3 exact score predictions** (paymentStatus = verified).
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center', marginInline: 'auto', maxWidth: '600px' }}>
          *Note: Self-referrals are automatically detected and blocked. The referred user must be a different individual with a different phone number and UPI ID.
        </p>
      </div>
    </div>
  );
}
