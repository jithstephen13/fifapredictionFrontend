import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../App';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Send, CheckCircle, CreditCard, ChevronRight, Copy } from 'lucide-react';

export default function PredictDay() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [step, setStep] = useState(1); // 1: Info & Predict, 2: Pay & Submit UTR
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  
  // Predictions state: { [matchId]: 'teamA' | 'teamB' | 'draw' }
  const [selections, setSelections] = useState({});
  
  const [entryAmount, setEntryAmount] = useState(50);
  const [transactionId, setTransactionId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!dateParam) {
      setError('No date selected.');
      setLoading(false);
      return;
    }
    fetchMatchesForDay();
  }, [dateParam]);

  const fetchMatchesForDay = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/matches`);
      if (!res.ok) throw new Error('Failed to fetch match details');
      const data = await res.json();

      const dayMatches = data.filter((m) => {
        const d = new Date(m.kickoffTime);
        const dayHeader = d.toLocaleDateString('en-US', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
        return dayHeader === dateParam;
      });

      // Filter matches to only active/scheduled ones
      const now = new Date();
      const activeMatches = dayMatches.filter(m => m.status === 'scheduled');
      const anyStarted = dayMatches.some(m => new Date(m.kickoffTime) <= now);

      if (dayMatches.length === 0) {
        throw new Error('No matches found for this day.');
      }

      if (anyStarted) {
        throw new Error('Predictions are closed for this day as a match has already started.');
      }

      setMatches(activeMatches);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(payeeUPI);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!userName || !phoneNumber || !upiId) {
      setSubmitError('Please fill in your details');
      return;
    }

    // Check that minimum 3 matches (or all if matches count < 3) are predicted
    const predictedCount = Object.keys(selections).length;
    const minRequired = Math.min(3, matches.length);
    if (predictedCount < minRequired) {
      setSubmitError(`Please select the outcome for at least ${minRequired} matches of the day.`);
      return;
    }

    setSubmitError(null);
    setShowPaymentAlert(true);
  };

  const handleConfirmAlert = () => {
    setShowPaymentAlert(false);
    setStep(2);
  };

  const handleSubmitPrediction = async (e) => {
    e.preventDefault();
    if (!transactionId) {
      setSubmitError('Please enter the 12-digit UPI UTR / Reference number.');
      return;
    }

    if (!/^\d{12}$/.test(transactionId.trim())) {
      setSubmitError('Invalid Transaction ID. UPI Transaction/UTR number must be exactly 12 digits.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const predictionsList = Object.keys(selections).map((mId) => ({
        matchId: mId,
        predictedWinner: selections[mId]
      }));

      const payload = {
        userName: userName.trim(),
        phoneNumber: phoneNumber.trim(),
        upiId: upiId.trim(),
        predictionType: 'winningTeam',
        entryAmount: entryAmount,
        transactionId: transactionId.trim(),
        referralCode: referralCode.trim() || undefined,
        predictions: predictionsList
      };

      const res = await fetch(`${API_URL}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit predictions');
      }

      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading match details...</div>;
  }

  if (error) {
    return (
      <div className="prediction-panel">
        <Link to="/" className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Matches
        </Link>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const payeeUPI = 'gjfifapredictor@axl';
  const payeeName = 'FIFA Match Prediction';
  const amount = entryAmount.toString();
  const note = `Prediction_Day_${dateParam}`.replace(/\s+/g, '_');
  const upiUrl = `upi://pay?pa=${payeeUPI}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  if (submitSuccess) {
    return (
      <div className="prediction-panel" style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '3rem 2rem' }}>
          <CheckCircle size={64} color="var(--success)" />
          <h2>Predictions Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '450px', lineHeight: '1.6' }}>
            Thank you, <strong>{userName}</strong>. Your winning team predictions for <strong>{dateParam}</strong> have been submitted.
          </p>
          <div className="badge badge-pending" style={{ fontSize: '0.9rem', padding: '0.5rem 1.25rem' }}>
            Payment Status: Pending Verification
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Once we verify your UPI Reference Number (UTR: <strong>{transactionId}</strong>), your entry will be activated. Keep tracking it using your phone number on the home page!
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-panel">
      <button className="btn btn-secondary" onClick={() => step === 2 ? setStep(1) : navigate('/')} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> {step === 2 ? 'Back to Predictions' : 'Back to Matches'}
      </button>

      <div className="card">
        <div className="predict-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--secondary)' }}>
              🏆 Predict Day Winners
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Day: {dateParam}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-pending" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'transparent' }}>
              Entry: ₹{entryAmount}
            </span>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNextStep}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--secondary)' }}>
              1. Predict Outcome of Matches (Min 3 Predictions)
            </h3>

            {/* Match list with outcome selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
              {matches.map((match) => (
                <div key={match._id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>Kickoff: {new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="match-predict-row">
                    <button
                      type="button"
                      className={`btn match-predict-btn ${selections[match._id] === 'teamA' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelections({ ...selections, [match._id]: 'teamA' })}
                      style={{
                        boxShadow: selections[match._id] === 'teamA' ? '0 0 12px rgba(255, 179, 0, 0.2)' : 'none',
                        borderColor: selections[match._id] === 'teamA' ? 'var(--primary)' : 'var(--border-color)',
                        borderWidth: selections[match._id] === 'teamA' ? '2px' : '1px'
                      }}
                    >
                      <span className="match-predict-logo">{match.teamALogo || '🏳️'}</span>
                      <span className="match-predict-text">{match.teamA} Wins</span>
                    </button>

                    <button
                      type="button"
                      className={`btn match-predict-btn ${selections[match._id] === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelections({ ...selections, [match._id]: 'draw' })}
                      style={{
                        boxShadow: selections[match._id] === 'draw' ? '0 0 12px rgba(255, 179, 0, 0.2)' : 'none',
                        borderColor: selections[match._id] === 'draw' ? 'var(--primary)' : 'var(--border-color)',
                        borderWidth: selections[match._id] === 'draw' ? '2px' : '1px'
                      }}
                    >
                      <span className="match-predict-logo">🤝</span>
                      <span className="match-predict-text">Draw</span>
                    </button>

                    <button
                      type="button"
                      className={`btn match-predict-btn ${selections[match._id] === 'teamB' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelections({ ...selections, [match._id]: 'teamB' })}
                      style={{
                        boxShadow: selections[match._id] === 'teamB' ? '0 0 12px rgba(255, 179, 0, 0.2)' : 'none',
                        borderColor: selections[match._id] === 'teamB' ? 'var(--primary)' : 'var(--border-color)',
                        borderWidth: selections[match._id] === 'teamB' ? '2px' : '1px'
                      }}
                    >
                      <span className="match-predict-logo">{match.teamBLogo || '🏳️'}</span>
                      <span className="match-predict-text">{match.teamB} Wins</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--secondary)' }}>
              2. Enter Your Details
            </h3>

            <div className="form-group">
              <label>Your Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>WhatsApp / Phone Number</label>
              <input
                type="tel"
                placeholder="Enter 10-digit phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>UPI ID (to send ₹{entryAmount * 2} prize if you win!)</label>
              <input
                type="text"
                placeholder="e.g. name@upi or phone@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>Referral Code (Optional / റെഫറൽ കോഡ്)</label>
              <input
                type="text"
                placeholder="e.g. REF123456"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Choose Entry Amount (₹50 - ₹140)</span>
                <strong style={{ color: 'var(--accent)' }}>₹{entryAmount}</strong>
              </label>
              <input
                type="range"
                min="50"
                max="140"
                step="10"
                value={entryAmount}
                onChange={(e) => setEntryAmount(parseInt(e.target.value))}
                style={{ width: '100%', margin: '0.5rem 0', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Min: ₹50</span>
                <span>Max: ₹140</span>
              </div>
              <div style={{ marginTop: '0.75rem', background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)', display: 'block' }}>
                  Potential Payout: 2x = ₹{entryAmount * 2} if all correct! 🏆
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Note: All of your day predictions must be correct to win. No single-match payouts are given.
                </span>
              </div>
            </div>

            {submitError && (
              <div className="alert alert-error" style={{ margin: '1rem 0' }}>{submitError}</div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
              Proceed to Payment <ChevronRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitPrediction}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--secondary)' }}>
              3. Complete UPI Payment (₹{entryAmount})
            </h3>

            <div className="payment-instructions">
              To verify and submit your predictions, please pay <strong>₹{entryAmount}</strong> entry fee to:
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <div className="upi-copy-wrapper">
                  <span className="upi-id-highlight" style={{ background: 'none', padding: 0 }}>{payeeUPI}</span>
                  <button
                    type="button"
                    onClick={handleCopyUPI}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', gap: '0.25rem', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <Copy size={12} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="payment-flow-card">
              <div>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                  Scan this QR Code using any UPI App (GPay, PhonePe, Paytm, BHIM):
                </p>
                <div className="upi-qr-wrapper">
                  <QRCodeSVG id="qr-code-svg" value={upiUrl} size={150} />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CreditCard size={16} /> UPI Transaction ID / UTR / Reference No (12 digits)
              </label>
              <input
                type="text"
                placeholder="Enter 12-digit UPI UTR"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="form-input"
                maxLength={12}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                Look for 12-digit number in GPay/PhonePe history after payment.
              </span>
            </div>

            {submitError && (
              <div className="alert alert-error" style={{ margin: '1rem 0' }}>{submitError}</div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Predictions'} <Send size={16} />
              </button>
            </div>
          </form>
        )}
      </div>

      {showPaymentAlert && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '500px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent)', fontSize: '1.4rem' }}>
              Important Notice / പ്രധാന അറിയിപ്പ്
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left', lineHeight: '1.6', fontSize: '0.95rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>English:</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  After completing the payment, you <strong>must copy the 12-digit UPI Transaction ID / UTR / Reference Number</strong> and enter it on the next page. <strong>Do not forget to do this!</strong>
                </p>
              </div>

              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>മലയാളം:</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  പേയ്‌മെന്റ് വിജയകരമായി പൂർത്തിയാക്കിയ ശേഷം, ദയവായി നിങ്ങളുടെ <strong>12 അക്ക UPI ട്രാൻസാക്ഷൻ ഐഡി / UTR / റഫറൻസ് നമ്പർ കോപ്പി ചെയ്ത്</strong> അടുത്ത പേജിൽ നൽകുക. <strong>ഇത് ചെയ്യാൻ മറക്കരുത്!</strong>
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleConfirmAlert}
              style={{ width: '100%', marginTop: '2rem', height: '48px', fontSize: '1.05rem', fontWeight: 600 }}
            >
              I Understand / എനിക്ക് മനസ്സിലായി
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
