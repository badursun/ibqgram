# Initial publication audit / İlk yayın taraması

Date: **18 November 2026**. Target: **IBQgram v0.1.0-alpha.1**, a clean public source release.

## Scope and results

- Gitleaks **8.30.1**, with redacted output, examined the old outer repository history (all refs and reflog), the project's Desktop changes after pinned upstream v7.4.4, and the project's WebView changes after its pinned upstream revision. **No findings.** Unmodified upstream history is outside this private-project audit.
- Exact local Telegram API ID/hash comparisons examined the three working trees and their project-specific historical blobs: **159 outer-repository blobs, 25 Desktop blobs, 3 WebView blobs. No matches.** Values were never printed in evidence.
- Gitleaks examined the clean publication snapshot. **No findings.** The tracked-file publication check also found no configured API values, private keys, forbidden local-data paths or non-regular tracked files.
- The current native source was reconstructed from public upstream commits and the published patches. **32 changed/added Desktop and WebView files match the development source byte for byte.** Both upstream revisions were verified as accessible in their public repositories. Re-running source preparation recognizes already-applied patches.
- **102 automated tests passed**, along with JavaScript syntax checks. No Telegram messages or account mutations were performed during publication checks.
- No `.env`, account/session data, personal recordings, compiled application, local build cache, original reference screenshot, old logo exploration, old marketing image or private Git submodule URL is included in the public snapshot.
- No GitHub Actions workflow is included. Checks are local; Actions is disabled for the published repository.

The outer public repository begins with a new root commit. The existing private repositories and their history are preserved separately. Current editable brand sources and runtime compatibility asset paths remain because the product needs them; those compatibility paths contain the current artwork.

## Limits

This is a bounded publication scan, not proof that the app has no vulnerabilities, an independent audit, a trademark clearance or a claim of reproducible native binaries. A source release does not include the logged-in development app. Application API values will still be extractable from anyone's own native build; user sessions require separate protection.

The UI preview bundle can be built from the public snapshot without the excluded sound recordings. Complete native compilation was validated in the development checkout; it was not repeated from scratch in the new publication checkout. The source-parity check above establishes that the native modifications are the same.

## Türkçe özet

Eski projeye ait commitler ve çalışma dosyaları ile yeni yayın kopyası tarandı. Gitleaks ve yerel API değerleriyle birebir karşılaştırmada sır bulunmadı. Native kaynaklar public upstream sürümlerinden yeniden oluşturuldu ve 32 değişen/eklenen dosya geliştirme kaynağıyla birebir eşleşti. 102 test geçti. Kişisel veriler, oturumlar, kayıtlar ve eski tasarım çalışmaları dışarıda bırakıldı. Yeni depo temiz bir kök commit ile başlar; eski private depolar değiştirilmez. GitHub Actions kullanılmaz. Bu sonuçlar bağımsız güvenlik sertifikası değildir.
