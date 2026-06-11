import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../App';
import { QRCodeSVG } from 'qrcode.react'; // Standard package from qrcode.react
import { ArrowLeft, Send, CheckCircle, Smartphone, CreditCard, ChevronRight } from 'lucide-react';

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
  const [predictedScoreA, setPredictedScoreA] = useState('0');
  const [predictedScoreB, setPredictedScoreB] = useState('0');
  const [transactionId, setTransactionId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
    if (!userName || !phoneNumber || !upiId || predictedScoreA === '' || predictedScoreB === '') {
      setSubmitError('Please fill in all prediction details');
      return;
    }
    setSubmitError(null);
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
        predictedScoreA: parseInt(predictedScoreA),
        predictedScoreB: parseInt(predictedScoreB),
        transactionId: transactionId.trim()
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
  const amount = '20';
  const note = `Prediction_${match.teamA}_vs_${match.teamB}`.replace(/\s+/g, '_');
  const upiUrl = `upi://pay?pa=${payeeUPI}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  if (submitSuccess) {
    return (
      <div className="prediction-panel" style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '3rem 2rem' }}>
          <CheckCircle size={64} color="var(--success)" />
          <h2>Prediction Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.6' }}>
            Thank you, <strong>{userName}</strong>. Your prediction of <strong>{predictedScoreA} - {predictedScoreB}</strong> has been submitted.
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
              Entry: ₹20
            </span>
          </div>
        </div>

        {/* Form Steps */}
        {step === 1 ? (
          <form onSubmit={handleNextStep}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--secondary)' }}>
              1. Predict Score & Enter Details
            </h3>

            {/* Score Inputs */}
            <div className="predict-score-input-container">
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
              <label>UPI ID (to send ₹100 prize if you win!)</label>
              <input
                type="text"
                placeholder="e.g. name@upi or phone@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="form-input"
                required
              />
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
              2. Complete UPI Payment (₹20)
            </h3>

            <div className="payment-instructions">
              To verify and submit your prediction, please pay <strong>₹20</strong> entry fee to:
              <div style={{ margin: '0.5rem 0' }}>
                <span className="upi-id-highlight">{payeeUPI}</span>
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

              {/* Mobile Intent link */}
              <div className="upi-intent-buttons">
                <p style={{ fontSize: '0.85rem', margin: '0.5rem 0', color: 'var(--text-muted)' }}>
                  Or tap below to pay directly using installed UPI App on mobile:
                </p>
                <a href={upiUrl} className="upi-intent-btn">
                  <Smartphone size={18} /> Pay with GPay / PhonePe / Paytm
                </a>
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
                {submitting ? 'Submitting...' : 'Submit Prediction'} <Send size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
