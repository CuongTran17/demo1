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
        <strong>Quyền riêng tư</strong>
        <p>PTIT Learning dùng cookie cần thiết cho đăng nhập, giỏ hàng và cookie phân tích nếu bạn đồng ý.</p>
      </div>
      <div className="cookie-consent__actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => choose('necessary')}>
          Chỉ cần thiết
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => choose('accepted')}>
          Đồng ý phân tích
        </button>
      </div>
    </div>
  );
}
