(() => {
  const roleRedirects = {
    resident: 'resident.html',
    landlord: 'landlord.html'
  };

  const defaults = {
    roleRedirects,
    defaultLanding: 'resident.html'
  };

  if (!window.BAYLIS_CONFIG) {
    window.BAYLIS_CONFIG = defaults;
  } else {
    window.BAYLIS_CONFIG = Object.assign({}, defaults, window.BAYLIS_CONFIG);
  }
})();
