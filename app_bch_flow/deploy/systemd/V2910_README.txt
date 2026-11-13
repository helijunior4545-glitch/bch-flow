BCH FLOW V2.9.10 — systemd user timer PREPARATION ONLY

This installer creates sample systemd user service/timer files inside the repository.
It does NOT copy them to ~/.config/systemd/user, enable, start, or alter systemd.
It does NOT create an environment file or store provider credentials.
It does NOT change PostgreSQL, Django migrations, invoices or settlements.

BEFORE ACTIVATION:
1. Verify V299 tests and live one-shot operation; separately verify contention handling.
2. Ensure /home/farcry/Downloads/bchflow-observations exists, is owned by the user,
   and has mode 0700. Ensure snapshots and JSONL logs are rotated/retained safely.
3. Create ~/.config/bch-flow/provider.env yourself with mode 0600 and required
   provider variables. Never paste tokens into chat, source code or unit files.
   systemd EnvironmentFile syntax is KEY=value, not shell `export KEY=value`.
   Values with special characters must be quoted/escaped per systemd.syntax(7).
4. Review units, paths, user identity and provider request quota before enabling.
5. To test units manually after copying them to ~/.config/systemd/user:
   systemctl --user daemon-reload
   systemctl --user start bchflow-finance-monitor.service
   systemctl --user status bchflow-finance-monitor.service
   journalctl --user -u bchflow-finance-monitor.service -n 30 --no-pager
6. Only AFTER successful manual validation, enable timer explicitly:
   systemctl --user enable --now bchflow-finance-monitor.timer
   systemctl --user list-timers --all
   To disable: systemctl --user disable --now bchflow-finance-monitor.timer

Important: user timers run only while user systemd manager is active, unless
lingering is configured by an administrator. This installer does NOT enable lingering.
EnvironmentFile values are visible to the service process; protect file permissions.
Do not enable both cron and systemd timer for the same job. V299 uses flock.
Audit JSONL has no automatic rotation: configure it before continuous operation.
No payment verification, UTXO consensus, signing, broadcasting or settlement.
