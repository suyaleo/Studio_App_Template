# Security Policy

## Supported versions

Security fixes are applied to the latest release line. Older template-generated applications maintain their own support policy.

## Reporting a vulnerability

Do not open a public issue containing credentials, private infrastructure details, or a working exploit. Use GitHub's private vulnerability reporting feature for this repository. Include the affected version, reproduction conditions, impact, and the smallest safe proof of concept.

## Configuration rules

- Commit `.env.example`, never a real `.env`.
- Supply secrets at runtime; do not use Docker build arguments for secrets.
- Treat browser-exposed variables as public.
- Review the full Git history and Docker build context before making a repository public.
- Rotate a credential whenever exposure cannot be ruled out.
