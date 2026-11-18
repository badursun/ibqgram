# Licensing and asset provenance / Lisans ve varlık kaynakları

## Code

New project code is GPL-3.0-only. IBQgram modifies Telegram Desktop v7.4.4, licensed under GPLv3 with its stated OpenSSL exception. Upstream copyright headers and license notices are retained in source and patches. Copies of upstream `LICENSE` and `LEGAL` are in `desktop/upstream/`; source preparation also retrieves each dependency's own notices. The root license does not relicense third-party components.

The public source consists of the shared UI, integration/build scripts, complete project patches and exact public upstream revisions. The preparation script reconstructs the modified source; it does not depend on unpublished private forks. Distributors must provide the corresponding source and comply with the applicable license terms for their own build.

## Brand and visual assets

`branding/ibqgram/current/` contains the current five-petal IBQgram vector identity, generator and editable path data. It replaces previous product logos. Retired logo explorations and original reference screenshots are not included.

Some runtime artwork under `prototype/assets/classic/` is based on historical ICQ interface imagery or generated recreations of that imagery. The `ICQ Now!` page is a static historical homage. Including these assets does not establish ownership or grant rights held by third parties. They are not represented as covered by the project's code license; review them separately before redistributing a branded end-user package. No trademark clearance or affiliation is claimed.

`marketing/ibqgram-retro.png` was generated with ImageGen using current UI screenshots with fictional accounts/messages and the current IBQgram logo. It is promotional artwork, not a literal screenshot or independent verification of features. Third-party marks visible in the scene remain those of their respective owners.

Original sound recordings are not included in this repository or source release. The optional ignored `sounds/` directory is for locally supplied recordings only. A distributor must establish the rights to any recordings they add.

## Telegram API

Each application developer must obtain their own credentials and follow [Telegram API terms](https://core.telegram.org/api/terms). Users must be informed that the app uses Telegram. IBQgram is not the official Telegram client and does not claim Telegram or ICQ endorsement.

Before general end-user distribution, review the implementation against all current API requirements, including sponsored messages in channels, ephemeral content, privacy, presence and read/typing behavior. A successful source build alone does not establish full compliance.

## Türkçe özet

Yeni kod GPL-3.0-only kapsamındadır. Telegram Desktop ve bağımlılıklarının lisansları, istisnaları ve telif bildirimleri korunur. Tam kaynak; ortak arayüz, derleme betikleri, bütün native değişiklik yamaları ve public upstream sürümlerinden oluşur.

Eski logo denemeleri, orijinal referans görüntüleri ve ses kayıtları depoya alınmadı. Çalışan arayüzdeki tarihî ICQ grafiklerinden türeyen bazı varlıklar için kod lisansı hak sağlamaz; son kullanıcı paketi dağıtımı öncesinde ayrıca değerlendirilmelidir. Yeni ad/logonun marka uygunluğu garanti edilmez. Tanıtım görselindeki hesap ve mesajlar kurgusaldır. Telegram API koşullarına uyum ayrıca gereklidir.

Sources: [Telegram Desktop](https://github.com/telegramdesktop/tdesktop), [upstream license](https://github.com/telegramdesktop/tdesktop/blob/v7.4.4/LICENSE), [upstream legal notices](https://github.com/telegramdesktop/tdesktop/blob/v7.4.4/LEGAL), [API registration](https://core.telegram.org/api/obtaining_api_id).
