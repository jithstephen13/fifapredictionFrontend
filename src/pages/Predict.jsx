import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../App';
import { QRCodeSVG } from 'qrcode.react'; // Standard package from qrcode.react
import { ArrowLeft, Send, CheckCircle, Smartphone, CreditCard, ChevronRight, Copy } from 'lucide-react';

export default function Predict() {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [step, setStep] = useState(1); // 1: Info & Predict, 2: Pay & Submit UTR
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [predictionType, setPredictionType] = useState('winningTeam');
  const [predictedWinner, setPredictedWinner] = useState('');
  const [predictedScoreA, setPredictedScoreA] = useState('0');
  const [predictedScoreB, setPredictedScoreB] = useState('0');
  const [entryAmount, setEntryAmount] = useState(20);
  const [transactionId, setTransactionId] = useState('');
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(payeeUPI);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    try {
      setLoading(true);
      // We can fetch from all matches or list active ones
      const res = await fetch(`${API_URL}/matches`);
      if (!res.ok) throw new Error('Failed to fetch match details');
      const data = await res.json();
      const currentMatch = data.find((m) => m._id === matchId);

      if (!currentMatch) {
        throw new Error('Match not found');
      }

      // Check if match already started
      const now = new Date();
      if (new Date(currentMatch.kickoffTime) <= now && currentMatch.status === 'scheduled') {
        throw new Error('Predictions are closed for this match as it has already started.');
      } else if (currentMatch.status === 'completed') {
        throw new Error('Match is already completed. Predictions are closed.');
      }

      setMatch(currentMatch);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!userName || !phoneNumber || !upiId) {
      setSubmitError('Please fill in your details');
      return;
    }
    if (predictionType === 'winningTeam') {
      if (!predictedWinner) {
        setSubmitError('Please select a team or draw prediction');
        return;
      }
    } else {
      if (predictedScoreA === '' || predictedScoreB === '') {
        setSubmitError('Please enter predicted scores');
        return;
      }
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

      const payload = {
        matchId,
        userName: userName.trim(),
        phoneNumber: phoneNumber.trim(),
        upiId: upiId.trim(),
        predictionType,
        entryAmount: entryAmount,
        transactionId: transactionId.trim()
      };

      if (predictionType === 'winningTeam') {
        payload.predictedWinner = predictedWinner;
      } else {
        payload.predictedScoreA = parseInt(predictedScoreA);
        payload.predictedScoreB = parseInt(predictedScoreB);
      }

      const res = await fetch(`${API_URL}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit prediction');
      }

      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 300;
    canvas.height = 300;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 25, 25, 250, 250);

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_Code_${match.teamA}_vs_${match.teamB}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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

  // Generate UPI payment URL
  // pa = Payment Address (UPI ID)
  // pn = Payee Name
  // am = Amount
  // cu = Currency
  // tn = Transaction Note
  const payeeUPI = 'gjfifapredictor@axl';
  const payeeName = 'FIFA Match Prediction';
  const amount = entryAmount.toString();
  const note = `Prediction_${match.teamA}_vs_${match.teamB}`.replace(/\s+/g, '_');
  const upiUrl = `upi://pay?pa=${payeeUPI}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  if (submitSuccess) {
    return (
      <div className="prediction-panel" style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '3rem 2rem' }}>
          <CheckCircle size={64} color="var(--success)" />
          <h2>Prediction Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.6' }}>
            Thank you, <strong>{userName}</strong>. Your prediction of <strong>{predictionType === 'winningTeam' ? (predictedWinner === 'teamA' ? `${match.teamA} to Win` : predictedWinner === 'teamB' ? `${match.teamB} to Win` : 'Draw') : `${predictedScoreA} - ${predictedScoreB}`}</strong> has been submitted.
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
        <ArrowLeft size={16} /> {step === 2 ? 'Back to Prediction' : 'Back to Matches'}
      </button>

      <div className="card">
        <div className="predict-header">
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {match.teamA} vs {match.teamB}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Kickoff: {new Date(match.kickoffTime).toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-pending" style={{ color: 'var(--accent)', borderColor: 'var(--accent)', background: 'transparent' }}>
              Entry: ₹{entryAmount}
            </span>
          </div>
        </div>

        {/* Form Steps */}
        {step === 1 ? (
          <form onSubmit={handleNextStep}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: 'var(--secondary)' }}>
              1. Predict Outcome & Enter Details
            </h3>

            {/* Prediction Type Toggle */}
            <div className="admin-tabs" style={{ marginBottom: '1.5rem', display: 'flex', width: '100%', gap: '0.25rem', padding: '0.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className={`admin-tab ${predictionType === 'winningTeam' ? 'active' : ''}`}
                onClick={() => {
                  setPredictionType('winningTeam');
                  setEntryAmount(20);
                  setPredictedWinner('');
                }}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  borderBottom: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  fontSize: '0.9rem',
                  background: predictionType === 'winningTeam' ? 'var(--primary)' : 'transparent',
                  color: predictionType === 'winningTeam' ? 'var(--text-dark)' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                Predict Winner (2x Payout)
              </button>
              <button
                type="button"
                className={`admin-tab ${predictionType === 'score' ? 'active' : ''}`}
                onClick={() => {
                  setPredictionType('score');
                  setEntryAmount(100);
                }}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  borderBottom: 'none',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  fontSize: '0.9rem',
                  background: predictionType === 'score' ? 'var(--primary)' : 'transparent',
                  color: predictionType === 'score' ? 'var(--text-dark)' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                Predict Score (3x Payout)
              </button>
            </div>

            {/* Conditional Inputs */}
            {predictionType === 'winningTeam' ? (
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Select Match Outcome</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className={`btn ${predictedWinner === 'teamA' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPredictedWinner('teamA')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.25rem 0.5rem',
                      borderRadius: '12px',
                      gap: '0.5rem',
                      border: predictedWinner === 'teamA' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: predictedWinner === 'teamA' ? '0 0 12px rgba(255, 179, 0, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>{match.teamALogo || '🏳️'}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{match.teamA} Wins</span>
                  </button>

                  <button
                    type="button"
                    className={`btn ${predictedWinner === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPredictedWinner('draw')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.25rem 0.5rem',
                      borderRadius: '12px',
                      gap: '0.5rem',
                      border: predictedWinner === 'draw' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: predictedWinner === 'draw' ? '0 0 12px rgba(255, 179, 0, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>🤝</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Draw</span>
                  </button>

                  <button
                    type="button"
                    className={`btn ${predictedWinner === 'teamB' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPredictedWinner('teamB')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.25rem 0.5rem',
                      borderRadius: '12px',
                      gap: '0.5rem',
                      border: predictedWinner === 'teamB' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: predictedWinner === 'teamB' ? '0 0 12px rgba(255, 179, 0, 0.2)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>{match.teamBLogo || '🏳️'}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{match.teamB} Wins</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Score Inputs */
              <div className="predict-score-input-container" style={{ marginBottom: '1.5rem' }}>
                <div className="score-team-box">
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{match.teamA}</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={predictedScoreA}
                    onChange={(e) => setPredictedScoreA(e.target.value)}
                    className="score-input"
                    required
                  />
                </div>

                <span className="score-divider">-</span>

                <div className="score-team-box">
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{match.teamB}</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={predictedScoreB}
                    onChange={(e) => setPredictedScoreB(e.target.value)}
                    className="score-input"
                    required
                  />
                </div>
              </div>
            )}

            {/* User Details */}
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
              <label>UPI ID (to send ₹{predictionType === 'winningTeam' ? entryAmount * 2 : entryAmount * 3} prize if you win!)</label>
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
              <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Choose Entry Amount ({predictionType === 'winningTeam' ? '₹20 - ₹40' : '₹100 - ₹300'})</span>
                <strong style={{ color: 'var(--accent)' }}>₹{entryAmount}</strong>
              </label>
              <input
                type="range"
                min={predictionType === 'winningTeam' ? "20" : "100"}
                max={predictionType === 'winningTeam' ? "40" : "300"}
                step="10"
                value={entryAmount}
                onChange={(e) => setEntryAmount(parseInt(e.target.value))}
                style={{ width: '100%', margin: '0.5rem 0', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Min: ₹{predictionType === 'winningTeam' ? '20' : '100'}</span>
                <span>Max: ₹{predictionType === 'winningTeam' ? '40' : '300'}</span>
              </div>
              <div style={{ marginTop: '0.75rem', background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.25)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--success)' }}>
                  Potential Payout: {predictionType === 'winningTeam' ? '2x' : '3x'} = ₹{predictionType === 'winningTeam' ? entryAmount * 2 : entryAmount * 3} if correct! 🏆
                </span>
              </div>
            </div>

            {submitError && (
              <div className="alert alert-error" style={{ margin: '1rem 0' }}>{submitError}</div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Proceed to Payment <ChevronRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitPrediction}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--secondary)' }}>
              2. Complete UPI Payment (₹{entryAmount})
            </h3>

            <div className="payment-instructions">
              To verify and submit your prediction, please pay <strong>₹{entryAmount}</strong> entry fee to:
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
              {/* Desktop QR Code */}
              <div style={{ display: 'none', display: 'block' }}>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                  Scan this QR Code using any UPI App (GPay, PhonePe, Paytm, BHIM):
                </p>
                <div className="upi-qr-wrapper">
                  <QRCodeSVG id="qr-code-svg" value={upiUrl} size={150} />
                </div>
                <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={downloadQRCode}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                  >
                    📥 Save QR to Photos
                  </button>
                </div>
              </div>

              {/* Mobile Intent link - Commented out to prevent routing to WhatsApp on mobile devices */}
              {/*
              <div className="upi-intent-buttons">
                <p style={{ fontSize: '0.85rem', margin: '0.5rem 0', color: 'var(--text-muted)' }}>
                  Or tap below to pay directly using installed UPI App on mobile:
                </p>
                <a href={upiUrl} className="upi-intent-btn">
                  <Smartphone size={18} /> Pay with GPay / PhonePe / Paytm
                </a>
              </div>
              */}
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
                {submitting ? 'Submitting...' : 'Submit Prediction'} <Send size={16} />
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
              {/* English */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>English:</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  After completing the payment, you <strong>must copy the 12-digit UPI Transaction ID / UTR / Reference Number</strong> and enter it on the next page. <strong>Do not forget to do this!</strong>
                </p>
              </div>

              {/* Malayalam */}
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
