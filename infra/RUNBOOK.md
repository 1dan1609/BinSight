# Deployment runbook

Self-managed deployment on an Oracle Cloud "Always Free" ARM VM (Ubuntu 24.04, `VM.Standard.A1.Flex`).

## Access

- Admin access (sudo, system maintenance): `ssh ubuntu@<vm-ip>` with the admin private key.
- Deploy access (no sudo, `docker` group only): `ssh deploy@<vm-ip>` with the dedicated deploy key.
  This is the key stored in GitHub Actions secrets for CD — if it ever leaks, the blast radius is
  limited to this app's containers, not the box.

  The `DEPLOY_SSH_KEY` secret holds this key **base64-encoded**, not raw PEM/OpenSSH text — a
  multi-line key pasted directly into a GitHub secret's web textarea is fragile (CRLF line endings
  from a Windows clipboard, a dropped trailing newline, a partial copy) and fails with an opaque
  client-side SSH error when it happens. To regenerate the secret value if the key ever rotates:
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("<path-to-private-key>"))` in PowerShell (or
  `base64 -w0 <path-to-private-key>` on Linux/macOS) — paste that single-line output as the secret.

## First-time setup on a fresh VM

Already done on the current instance (documented here in case the VM is ever rebuilt):

1. Create the `deploy` user, add to the `docker` group, install its own SSH key
   (`useradd -m -s /bin/bash deploy`, no sudo group membership).
2. Install Docker Engine + Compose plugin from Docker's official apt repo.
3. Harden SSH via `/etc/ssh/sshd_config.d/99-binsight-hardening.conf`: `PermitRootLogin no`,
   password auth off, `AllowUsers ubuntu deploy`, forwarding disabled. Validate with `sudo sshd -t`
   before reloading — never restart blind.
4. `ufw`: default deny incoming, allow 22/80/443, enabled — mirrors the rules already set at the
   OCI Security List layer (belt and suspenders).
5. `fail2ban`: sshd jail, 5 attempts / 10 min → 1 hour ban.
6. `unattended-upgrades`: enabled by Canonical's Ubuntu cloud image by default for security
   updates — confirmed via `unattended-upgrade --dry-run -d` and `systemctl is-enabled
   apt-daily.timer apt-daily-upgrade.timer unattended-upgrades.service`, no changes needed.
7. Copy this `infra/` directory to the VM (e.g. `/home/deploy/binsight/`), create `.env` from
   `.env.example` there with real values.

## Deploying

```bash
ssh deploy@<vm-ip>
cd ~/binsight
docker compose pull
docker compose up -d
```

The images are pulled from GHCR (`ghcr.io/1dan1609/binsight-backend`,
`ghcr.io/1dan1609/binsight-frontend`) — nothing is built on the VM itself. The `cd.yml` workflow
runs this same `pull && up -d` over SSH as the `deploy` user after a successful push to `main`.

## Operating

- **Logs**: `docker compose logs -f backend` / `docker compose logs -f frontend`.
- **Quota DB**: persisted in the `backend-data` named volume, survives container restarts and
  redeploys. To reset the daily quota counter: `docker compose down && docker volume rm
  binsight_backend-data && docker compose up -d` (destructive — only do this deliberately).
- **TLS certs**: Caddy handles renewal automatically via the `caddy-data`/`caddy-config` volumes.
  No manual cert management needed unless the domain changes.
- **Firewall status**: `sudo ufw status verbose`.
- **Fail2ban status**: `sudo fail2ban-client status sshd`.
- **Rotating `GROQ_API_KEY`**: edit `infra/.env` on the VM, then `docker compose up -d backend`
  (only restarts the backend, no downtime for static frontend serving).

## If the VM is ever rebuilt

Re-run the first-time setup above, re-point DuckDNS at the new public IP, and re-copy `infra/`
(with a fresh `.env`, never reuse an old one blindly — rotate the Groq key if this VM was ever
compromised).
