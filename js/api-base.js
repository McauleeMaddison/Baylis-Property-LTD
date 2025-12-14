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
