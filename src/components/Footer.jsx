import React from 'react';
import { Phone, ExternalLink } from 'lucide-react';

export default function Footer({ systemSettings }) {
  const userCount = systemSettings?.user_count || 0;
  const totalCount = 124 + Number(userCount);

  return (
    <footer className="premium-footer" style={{ background: 'linear-gradient(135deg, #168c54 0%, #0d5c36 100%)', color: '#bbf7d0', borderTop: 'none', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Left Side: Brand Details */}
        <div style={{ flex: '1 1 200px' }}>
          <div className="logo-footer-section" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/whatsbro_avatar.png" 
              alt="WhatsBro logo" 
              style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
            />
            <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>TN sevai</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#dcfce7', marginTop: '8px', lineHeight: '1.4', marginBottom: 0 }}>
              Assistant for E-Sevai , PAN card, Voter ID, and other certificate registrations.
          </p>
          <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', color: '#ffffff' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}></span>
            Customers served: {totalCount}+
          </div>
        </div>

        {/* Right Side: Contact Circle and description */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: '1 1 200px', justifyContent: 'flex-end', minWidth: '180px' }}>
          <div style={{ textAlign: 'right' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'white', marginBottom: '2px' }}>TN sevai WhatsApp no</h4>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '2px', fontSize: '0.75rem', color: '#86efac', fontWeight: 700 }}>
              <span><Phone size={10} style={{ display: 'inline', marginRight: '3px' }} /> +91 8300183615</span>
            </div>
          </div>
          <div className="circular-contact-badge" style={{ width: '64px', height: '64px', border: 'none', boxShadow: 'none', background: 'transparent', borderRadius: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
            <img src="/whatsbro_avatar.png" alt="WhatsBro Support Agent" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '📞';
            }} />
          </div>
        </div>

      </div>

      <div style={{ borderTop: '1px solid #15803d', paddingTop: '10px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.65rem', color: '#86efac' }}>
        <span>© 2026 TN sevai.</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          Powered by TEC Boys <ExternalLink size={8} />
        </span>
      </div>
    </footer>
  );
}
