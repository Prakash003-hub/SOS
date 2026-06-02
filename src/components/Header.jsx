import React, { useState, useEffect } from 'react';
import { User, LogOut, MessageSquare, X, ChevronDown, Send } from 'lucide-react';
import { submitFeedback } from '../services/db';

export default function Header({ currentUser, onLogout, onLoginTrigger, isAdmin }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (!isProfileOpen) return;
    
    const handleOutsideClick = (e) => {
      const popover = document.getElementById('profile-popover-container');
      const avatarBtn = document.getElementById('profile-avatar-button');
      if (popover && !popover.contains(e.target) && avatarBtn && !avatarBtn.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isProfileOpen]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const getAvatarUrl = () => {
    if (currentUser && currentUser.photo_url) {
      // Direct file download stream
      if (currentUser.photo_url.includes('drive.google.com')) {
        const fileId = currentUser.photo_url.match(/id=([^&]+)/)?.[1] || currentUser.photo_url.split('/d/')?.[1]?.split('/')?.[0];
        if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
      return currentUser.photo_url;
    }
    // Sleek premium default avatar placeholder (Demo person)
    return '/avatar.png';
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      alert('Please enter your feedback message.');
      return;
    }
    if (feedbackRating === 0) {
      alert('Please select a star rating.');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      await submitFeedback(
        currentUser ? currentUser.name : 'Guest User',
        currentUser ? currentUser.phone : '',
        currentUser ? currentUser.aadhar : '',
        feedbackText,
        feedbackRating
      );
      
      alert('Thank you for your valuable feedback! Your feedback has been recorded successfully.');
      setFeedbackText('');
      setFeedbackRating(0);
      setIsFeedbackOpen(false);
      setIsProfileOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <header className="fixed-header" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 9999 }}>
      <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img 
          src="/whatsbro_logo.png" 
          alt="WhatsBro Logo" 
          style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
        />
        <div>
          <div className="brand-name" style={{ fontSize: '1.4rem', lineHeight: '1.2' }}>TN sevai</div>
          <div className="brand-subtitle" style={{ fontSize: '0.8rem' }}>E-Service Portal</div>
        </div>
      </div>
      
      {!isAdmin && (
        <div className="header-auth-section" style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              
              {/* Circular profile avatar button */}
              <button
                id="profile-avatar-button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  borderRadius: '50%',
                  outline: 'none'
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--primary)',
                  boxShadow: '0 2px 8px rgba(30, 168, 103, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f1f5f9'
                }}>
                  <img 
                    src={getAvatarUrl()} 
                    alt={currentUser.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <ChevronDown size={14} style={{ color: '#64748b' }} />
              </button>

              {/* Profile Popover Overlay Dropdown */}
              {isProfileOpen && (
                <div 
                  id="profile-popover-container"
                  style={{
                    position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '240px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  zIndex: 99999
                }}>
                  {/* Large avatar and details */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid var(--primary)',
                    background: '#f8fafc',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                  }}>
                    <img 
                      src={getAvatarUrl()} 
                      alt={currentUser.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{currentUser.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>Phone: {currentUser.phone}</p>

                  </div>

                  <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Feedback button */}
                    <button
                      onClick={() => setIsFeedbackOpen(true)}
                      className="premium-btn premium-btn-success"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%'
                      }}
                    >
                      <MessageSquare size={14} /> Give Feedback
                    </button>

                    {/* Logout Option button */}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="premium-btn premium-btn-danger"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        width: '100%',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <LogOut size={14} /> Logout 
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Prominent and highly visible green Login button at top
            <button 
              onClick={onLoginTrigger}
              className="premium-btn premium-btn-success"
              style={{
                fontSize: '0.8rem',
                fontWeight: '800',
                padding: '8px 16px',
                width: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '24px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
              }}
            >
              <User size={14} /> Login / Register
            </button>
          )}
        </div>
      )}

      {/* Floating Modal for feedback form */}
      {isFeedbackOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15,23,42,0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: '16px'
        }}>
          <div className="auth-card" style={{
            background: 'white',
            width: '100%',
            maxWidth: '350px',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsFeedbackOpen(false)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '800', color: '#1e293b' }}>Feedback & Suggestions</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', margin: 0 }}>Help us improve TN sevai. We value your suggestions!</p>
            </div>

            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Star Rating */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Rating *</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        color: star <= feedbackRating ? '#f59e0b' : '#cbd5e1',
                        transition: 'color 0.15s, transform 0.15s',
                        transform: star <= feedbackRating ? 'scale(1.1)' : 'scale(1)',
                        padding: '2px'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#334155' }}>Your Message *</label>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or issues..."
                  required
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={feedbackSubmitting}
                className="premium-btn premium-btn-success"
                style={{
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  opacity: feedbackSubmitting ? 0.7 : 1
                }}
              >
                <Send size={14} /> {feedbackSubmitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
