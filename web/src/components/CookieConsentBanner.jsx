import { useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '../utils/analytics';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => !getAnalyticsConsent());

  if (!visible) return null;

  const choose = (value) => {
    setAnalyticsConsent(value);
    setVisible(false);
  };

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div>
        <strong>Quyen rieng tu</strong>
        <p>PTIT Learning dung cookie can thiet cho dang nhap/gio hang va cookie phan tich neu ban dong y.</p>
      </div>
      <div className="cookie-consent__actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => choose('necessary')}>
          Chi can thiet
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => choose('accepted')}>
          Dong y phan tich
        </button>
      </div>
    </div>
  );
}
