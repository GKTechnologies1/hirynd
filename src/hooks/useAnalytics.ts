import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsApi } from '@/services/api';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useAnalytics = () => {
  const location = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let visitorId = localStorage.getItem('hyrind_visitor_id');
    if (!visitorId) {
      visitorId = generateUUID();
      localStorage.setItem('hyrind_visitor_id', visitorId);
    }

    let sessionId = sessionStorage.getItem('hyrind_session_id');
    if (!sessionId) {
      sessionId = generateUUID();
      sessionStorage.setItem('hyrind_session_id', sessionId);
    }

    // Fire and forget, wrap in try/catch so it doesn't break UI
    const track = async () => {
      try {
        await analyticsApi.trackPageView({
          visitor_id: visitorId,
          session_id: sessionId,
          url_path: location.pathname + location.search,
          referrer: document.referrer || null,
          device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
        });
      } catch (e) {
        console.error('Analytics tracking failed', e);
      }
    };

    track();
    initialized.current = true;
  }, [location]);
};
