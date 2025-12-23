(() => {
  const PROD_API_BASE = 'https://baylis-property-ltd.onrender.com/api';
  const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

  const isLocalHost = () => {
    const { hostname, protocol } = window.location;
    if (protocol === 'file:') return true;
    return LOCAL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  };

  const resolvedBase = isLocalHost() ? '/api' : PROD_API_BASE;
  if (!window.API_BASE) {
    window.API_BASE = resolvedBase;
  }

  const CSRF_COOKIE_NAME = window.CSRF_COOKIE_NAME || 'csrfToken';

  const readCookie = (name) => {
    const match = document.cookie.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : '';
  };

  const resolveBase = () => (window.API_BASE || '/api').replace(/\\/$/, '');

  const refreshCsrf = async (base) => {
    try {
      await fetch(`${(base || resolveBase())}/security/csrf`, { credentials: 'include' });
    } catch (_) {
      /* ignore */
    }
  };

  const fetchWithCsrf = async (path, options = {}) => {
    const { apiBase, retry = true, ...rest } = options;
    const base = (apiBase || resolveBase()).replace(/\\/$/, '');
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const csrf = readCookie(CSRF_COOKIE_NAME);
    const headers = Object.assign({}, rest.headers || {}, csrf ? { 'X-CSRF-Token': csrf } : {});
    const request = Object.assign({ credentials: 'include' }, rest, { headers });
    const res = await fetch(url, request);
    if (res.status === 403 && retry !== false) {
      await refreshCsrf(base);
      const freshCsrf = readCookie(CSRF_COOKIE_NAME);
      const retryHeaders = Object.assign({}, headers, freshCsrf ? { 'X-CSRF-Token': freshCsrf } : {});
      return fetch(url, Object.assign({}, request, { headers: retryHeaders }));
    }
    return res;
  };

  if (!window.BaylisCSRF) {
    window.BaylisCSRF = { readCookie, refreshCsrf, fetchWithCsrf };
  }
  if (!window.fetchWithCsrf) {
    window.fetchWithCsrf = fetchWithCsrf;
  }

  const applyBaseAttribute = () => {
    const target = document.body || document.documentElement;
    if (target) {
      target.setAttribute('data-api-base', window.API_BASE);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBaseAttribute, { once: true });
  } else {
    applyBaseAttribute();
  }
})();
