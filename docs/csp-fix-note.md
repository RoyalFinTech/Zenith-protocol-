# CSP note

The production UI uses a small inline bootstrap/application script in `frontend/index.html`. Helmet's default Content-Security-Policy blocks inline scripts, which prevents the logo assignment and splash-loader JavaScript from executing. The server CSP must explicitly allow the existing inline bootstrap script while keeping other Helmet protections enabled.
