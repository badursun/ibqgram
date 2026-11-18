# Security / Güvenlik

IBQgram is an early source release. It has not had an independent security audit and does not claim production certification.

## Credentials and sessions

- Keep `.env`, Telegram user session data, login codes, two-step verification passwords and signing keys private.
- Application `api_id`/`api_hash` values can be extracted from native binaries. They identify the application; they are not user session credentials.
- Native MTProto and password primitives come from the pinned Telegram Desktop source. The web interface requests bounded native operations instead of reimplementing those protocols.
- The renderer has a restrictive resource policy. Read state, account locks and Telegram authorization remain native concerns.
- Build caches, compiler response files and local configuration logs may contain application credentials. They are excluded from publication.
- Debug output can include portable account data. Never publish a logged-in development directory, `tdata`, local logs or a diagnostic bundle without review.

## Local publication checks

Install Gitleaks locally if needed, then run:

```sh
python3 scripts/audit-source.py
gitleaks git . --redact --log-opts='--all'
```

`audit-source.py` examines tracked files and filenames without printing matching values. It also accepts `--known-env /path/to/local/.env` for exact local API ID/hash comparisons. That configuration file is read only for comparison and is not copied into evidence.

The first publication is a new root commit. Previous private history, original reference screenshots, retired branding concepts, personal recordings, compiled applications and account data are not imported. [Initial audit scope and results](SOURCE-AUDIT.md).

GitHub Actions is disabled. There is no CI or automatic release job; publication checks are local.

## Reporting an issue

Do not post credentials, session archives, phone numbers or private conversations in a public issue. For a non-sensitive bug, include the commit, operating system, reproduction steps and a sanitized screenshot. Coordinate a private disclosure channel with the maintainer before sharing exploit details or sensitive evidence. If a credential or session is exposed, deleting a Git commit is not sufficient remediation; revoke affected sessions or contact the credential issuer as appropriate.

## Türkçe özet

Bu sürüm bağımsız güvenlik denetiminden geçmedi. `.env`, oturum dosyaları, giriş kodları, parolalar ve imzalama anahtarlarını yayımlamayın. API ID/hash uygulamayı tanımlar; derlenmiş uygulamadan çıkarılabilir. İlk açık yayın temiz geçmişle hazırlanır. GitHub Actions kapalıdır; kontroller yerelde çalıştırılır. Hassas bir açığı veya hesap verisini public issue içine koymayın.
