# IBQgram yapılacaklar listesi

18 Kasım 2026 · Başlangıç: `v0.1.0-alpha.1`.

Bu liste, mevcut retro arayüzü, JavaScript–native bağlantısını, yayımlanan Desktop/WebView yamalarını ve derleme/dağıtım düzenini kapsar. Telegram Desktop içinde bir özelliğin bulunması, IBQgram ekranından kullanılabildiği anlamına gelmez. Amaç önce güvenilir günlük mesajlaşma, ardından son kullanıcıya dağıtılabilir bir macOS sürümüdür.

**Etiketler:** **Eksik** = bu arayüzde/dağıtımda yok; **Kısmi** = temel işlev var, belirtilen bölüm eksik; **Doğrulama** = kod yolu var veya risk görüldü, canlı kabul testi gerekiyor; **Karar** = ürün kapsamına alınması henüz kararlaştırılmadı. Doğrulama maddeleri kesinleşmiş hata olarak okunmamalıdır. Bir kutu ancak açıklanan sonuç doğrulandığında işaretlenir.

**Öncelikler:** **P0** = veri doğruluğu, güvenlik veya dağıtımı engelleyen işler; **P1** = günlük kullanımı tamamlayan işler; **P2** = kullanım kalitesi ve bakım; **P3** = isteğe bağlı kapsam genişletmeleri. P0 işlerinin tamamı aynı büyüklükte değildir; ilk uygulama sırası en alttadır.

Toplam **111 takip maddesi**: 43 eksik işlev/düzen, 43 kısmen tamamlanmış iş, 17 doğrulama ve 8 kapsam kararı. Bu sayı 111 hata bulunduğu anlamına gelmez. Öncelik dağılımı: 19 P0, 64 P1, 22 P2, 6 P3.

## 1. Mesaj doğruluğu ve bağlantı

- [ ] **CORE-01 · P0 · Kısmi — Eski mesajların düzenlenmesi ve silinmesi.** Yeni olaylar son 50 mesajı yeniden getiriyor; daha eski, ekrana yüklenmiş mesajların değişiklikleri doğrudan uygulanmıyor. Mesaj kimliğiyle güncelleme/silme işle ve gerekirse ilgili aralığı yeniden getir. Kabul: son sayfanın dışında düzenlenen/silinen mesaj, pencereyi yeniden açmadan doğru hale gelir.
- [ ] **CORE-02 · P0 · Kısmi — Belirsiz gönderimin kalıcı kimliği.** Aynı pencere içindeki metin tekrarında `random_id` korunuyor; uygulama yeniden başladıktan sonra korunmuyor. Onayı kaybolan metin ve dosyaları hesap/sohbet/konu bazında uzlaştır. Kabul: sunucunun aldığı ama yanıtı kaybolan gönderi, yeniden başlatma ve tekrar denemede çift gönderilmez.
- [ ] **CORE-03 · P0 · Kısmi — Dosyada başarısızlık ile belirsiz sonucu ayır.** Son gönderim adımındaki hatalar aynı belirsiz duruma dönüşebiliyor. Kesin ret, ağ kesilmesi ve sunucu onayı ayrı gösterilsin; yeniden deneme önce mevcut gönderiyi kontrol etsin.
- [ ] **CORE-04 · P1 · Eksik — Gerçek bağlantı göstergesi.** Kullanıcının seçtiği Online/Away etiketinden ayrı olarak Connecting, Updating ve Offline bilgisi göster. Mevcut `bootstrap.connected` tek seferlik; sürekli bağlantı değişikliği arayüze taşınmalı.
- [ ] **CORE-05 · P0 · Doğrulama — Kopma ve yeniden bağlanma matrisi.** Wi-Fi değişimi, uçak modu, uyku/uyanma, uzun süre çevrimdışı kalma ve oturumun başka cihazdan sonlandırılmasını test et. Mesaj, taslak, okunmamış sayısı ve kişi listesi yeniden uzlaşmalı; gizlice tekrar gönderim olmamalı.
- [ ] **CORE-06 · P1 · Kısmi — Çevrimdışı açılış.** Native önbelleği arayüze bağla; ağ yokken mevcut geçmişi okuyabilme ve yerel taslağı düzenleme sağla. Şu an özel geçmiş ekranı sunucu `GetHistory/GetReplies` yanıtına bağlı. Kalıcı gönderim kuyruğunu ancak CORE-02 tamamlandıktan sonra ekle.
- [ ] **CORE-07 · P1 · Kısmi — Yeni mesajda kaydırma konumu.** `load()` yeni mesaj alınca geçmişin sonuna zorluyor. Eski mesajları okuyan kullanıcı yerinde kalmalı; yeni mesaj sayacı ve sona git düğmesi gösterilmeli.
- [ ] **CORE-08 · P1 · Kısmi — Sunucu bekleme süreleri ve hatalar.** Native taraftaki gerçek FLOOD_WAIT süresini arayüze geçir; sabit 60 saniyelik tahminleri kaldır. Slow mode, ücretli gönderim gereksinimi, üyelik/izin değişimi ve engellenme için açıklayıcı sonuç ver; ücretli işlem kendiliğinden yapılmasın.
- [ ] **CORE-09 · P1 · Kısmi — Uzun oturum sınırları.** Bir sohbet nesnesinde 2.048 gönderim denemesi sonrasında `SESSION_SEND_LIMIT` oluşuyor. Tamamlanmış kayıtları güvenli biçimde temizle; belirsiz kayıtları koru. Kabul: sırf bu sınıra ulaştığı için uygulamayı yeniden başlatmak gerekmez.
- [ ] **CORE-10 · P1 · Kısmi — Taslak dayanıklılığı.** Yerel taslak var; her tuşta yazma kuyruğu oluşuyor. Kaydı birleştir, kapanışta tamamla, başarısız kaydı görünür tut; bulut taslağı senkronizasyonunu ve başka cihazdan gelen değişiklik çatışmasını ayrıca ele al.
- [ ] **CORE-11 · P1 · Kısmi — Karakter sayısı ve gönderim sınırı.** Sayaç Unicode kod noktası sayıyor; HTML/native sınır UTF-16 üzerinden 4.000. Emoji ve birleşik karakterlerde sayaç/kalan kapasite tutarlı olsun; uzun metin için açık hata veya kullanıcı kontrollü bölme sağla.

Dayanak: [chat.js](prototype/chat.js), [chat-model.js](prototype/chat-model.js), [native yama](desktop/patches/ibqgram-desktop.patch), `Api::IcqramChat::{history,send,finishUpload,saveDraft}`. CORE-01 için yerel bir model kontrolünde 1–100 önbelleğine 51–100 güncel sayfası uygulanınca silinen 10 numaralı kayıt korunuyor. Bu kontrol canlı hesaba mesaj göndermedi.

## 2. Mesajlaşma araçları

- [ ] **CHAT-01 · P1 · Eksik — Mesaja yanıtla.** Alıntı kartı, yanıtı iptal etme ve asıl mesaja gitme; konu içindeki yanıtlarda doğru konu kimliği. Mevcut `replyTo()` yalnız forum konusu hedefliyor.
- [ ] **CHAT-02 · P1 · Eksik — Mesaj düzenleme.** Kendi mesajını seçip düzenleme, sunucu izin/süre hatası, düzenlendi işareti ve diğer cihazlarla güncelleme.
- [ ] **CHAT-03 · P1 · Eksik — Mesaj silme.** Kendinden/herkesten silme seçeneklerini sunucunun izinlerine göre göster; çoklu seçim ve açık kapsam onayı ekle.
- [ ] **CHAT-04 · P1 · Eksik — İletme.** Hedef sohbet/konu seçimi, kaynak bilgisi ve içerik koruma kurallarına uyum.
- [ ] **CHAT-05 · P1 · Eksik — Mesaj arama.** Sohbet içinde metin/tarih/gönderen arama, sonuçtan mesaja gitme; ana ekrandaki arama şu an yalnız kişi/sohbet listesini filtreliyor.
- [ ] **CHAT-06 · P1 · Eksik — Mesaj biçimleri ve bağlantılar.** URL, metin bağlantısı, kullanıcı etiketi, kalın/italik/kod, alıntı ve spoiler gibi Telegram entity türlerini güvenli çiz; şu an yalnız bot komutları etkileşimli. Gönderim biçimlendirmesi ve bağlantı önizlemesi için ayrı kullanıcı kontrolleri ekle.
- [ ] **CHAT-07 · P1 · Eksik — Tepkiler.** Gelen tepkileri göster, izin verilen tepkiyi ekle/kaldır; kapalı/özel tepki izinlerini uygula.
- [ ] **CHAT-08 · P1 · Eksik — Sabitlenmiş mesajlar.** Sabitlenen mesajı görme ve mesaja gitme; yetkili kullanıcı için sabitle/kaldır.
- [ ] **CHAT-09 · P1 · Kısmi — Sistem mesajları.** Katılma/ayrılma, ad/fotoğraf değişimi ve sabitleme gibi olaylar tek bir genel metinle gösteriliyor. Olay türünü, kişiyi ve ilgili hedefi anlamlı göster.
- [ ] **CHAT-10 · P2 · Eksik — Mesaj bağlam menüsü.** Kopyala, bağlantıyı kopyala, seç/çoklu seç ve ilgili yanıtla/düzenle/sil işlemlerini klasik menüye bağla. Mevcut metin seçimini bozma.
- [ ] **CHAT-11 · P2 · Eksik — Zamanlanmış ve sessiz gönderim.** Gönderim seçenekleri, zamanlanmış mesaj listesi ve iptal/düzenleme akışı.

Dayanak: [bridge izin verilen işlemleri](prototype/bridge.js), [mesaj çizimi](prototype/chat.js), [native yama](desktop/patches/ibqgram-desktop.patch), `IcqramChat::history/send`.

## 3. Botlar

- [ ] **BOT-01 · P1 · Eksik — Mesaj altındaki bot düğmeleri.** Inline keyboard ve callback düğmelerini çiz; basılma/yüklenme sonucu, URL düğmesi ve callback uyarısını işle. Komut paleti bunların yerine geçmiyor.
- [ ] **BOT-02 · P1 · Eksik — Bot cevap klavyesi ve ForceReply.** Klavyeyi göster/gizle, tek kullanımlık seçim ve yanıt hedefi; telefon/konum paylaşımı gibi istekler için açık kullanıcı seçimi.
- [ ] **BOT-03 · P1 · Eksik — Bot başlatma bağlantıları.** `/start` parametresi, `t.me` bot bağlantısı ve gruba ekleme akışını doğru hedefe bağla; bağlantı açılması kendi başına mesaj göndermesin.
- [ ] **BOT-04 · P2 · Kısmi — Grup bağlamındaki komutlar.** Palet yalnız doğrudan bot sohbetinde var. Gruptaki bot seçimi, kapsam/dil bazlı komutlar ve `@bot` hedefini destekle.
- [ ] **BOT-05 · P2 · Eksik — Inline bot araması.** `@bot sorgu` sonuçları, kullanıcı seçimiyle gönderim ve izin/iptal durumları.
- [ ] **BOT-06 · P3 · Karar — Mini Apps, bot web oturumu ve ödemeler.** Ayrı izin/erişim sınırları tasarlamadan mevcut yerel WebView'e uzaktan içerik yükleme. İlk sürüm kapsamına alınmazsa desteklenmeyen düğme kullanıcıya açıkça bildirilsin.

Dayanak: [bot paleti](prototype/bot-commands.js), [chat.js](prototype/chat.js), [bridge.js](prototype/bridge.js), native `IcqramChat::state/history`.

## 4. Kişiler ve sohbet listesi

- [ ] **LIST-01 · P1 · Eksik — Kişi düzenleme ve kaldırma.** Eklenen kişinin görünen adını düzenle, rehberden kaldır; engelleme ile rehber silmeyi ayrı tut.
- [ ] **LIST-02 · P1 · Kısmi — Eklenmiş botları yönetme.** Yerel listedeki botu kaldırma yok; 100 kayıt sınırı var. Kullanıcı adı değişse de aynı botu kimliğiyle tut, yeniden eklemeyi tekilleştir ve sınırı açık göster.
- [ ] **LIST-03 · P1 · Kısmi — Arşiv, sabit sohbet ve klasörler.** Ana liste ve arşiv birlikte getiriliyor; arşiv ayrımı, Telegram klasörleri ve pin sırası arayüzde yok. Bunları All/User/Group/Channel filtreleri ve mevcut General/Bots/Groups/Channels gruplarıyla uyumlu ekle.
- [ ] **LIST-04 · P1 · Eksik — Sohbet işlemleri.** Sessize al/aç, arşivle/çıkar, sabitle/kaldır, okundu/okunmadı işaretle ve sohbet silme; ilgili Telegram değişiklikleriyle senkronizasyon.
- [ ] **LIST-05 · P1 · Kısmi — Genel aramada grup ve kanal.** Directory sunucu sonuçlarından yalnız kullanıcıları/botları alıyor. Grup/kanal sonuçlarını, üyelik durumunu ve katılma/katılma isteği akışını ekle.
- [ ] **LIST-06 · P2 · Kısmi — Arama sınırlarını anlaşılır göster.** Username alanı 5–32 karakter ile sınırlı; uygun kısa/alternatif adlar için sunucu destekli çözümlemeyi doğrula. UIN aramasını yalnız bu oturumda tanınan kullanıcılarla sınırlı olarak etiketle; e-posta ve ilgi alanı sekmelerinde destek varmış izlenimi verme.
- [ ] **LIST-07 · P2 · Kısmi — Liste tercihleri.** Seçili filtre, açık/kapalı gruplar, sıralama ve kaydırma konumunu hesap bazında koru; anlık yenileme klavye odağını kaybetmesin.
- [ ] **LIST-08 · P1 · Kısmi — Durum doğruluğu.** Gizlilik nedeniyle görünmeyen çevrimiçi bilgisi ile kesin offline bilgisini ayır. Silinmiş hesap, bot, verified/scam/fake işaretlerini tutarlı göster; başkasının `[ST:…]` etiketi doğrulanmış sistem durumu gibi sunulmasın.

Dayanak: [app.js](prototype/app.js), [directory.js](prototype/directory.js), [presence.js](prototype/presence.js), native `IcqramAccount::{loadDialogs,contactSnapshot,searchDirectory,addDirectoryContact}`.

## 5. Gruplar, kanallar ve konular

- [ ] **GROUP-01 · P1 · Eksik — Grup/kanal bilgileri.** Açıklama, üye listesi/sayısı, yöneticiler, herkese açık bağlantı ve paylaşılan medya ekranı. Mevcut User Details kimlik ve kullanıcı adı ile sınırlı.
- [ ] **GROUP-02 · P1 · Eksik — Üyelik ve yönetim.** Ayrılma, davet bağlantısı kullanma, uygun izinlerle kişi ekleme/çıkarma ve raporlama. Kullanıcı engellemesi, gruptan banlama değildir.
- [ ] **GROUP-03 · P2 · Eksik — Grup/kanal oluşturma ve yönetici ayarları.** Başlık/fotoğraf, izinler, davetler ve yönetici işlemlerini kapsam ve yetki kontrolleriyle ekle.
- [ ] **GROUP-04 · P1 · Eksik — Kanal yorumları ve normal mesaj dizileri.** Forum konusu seçimi var; kanal yorumlarına/bağlı tartışmaya ve diğer reply thread'lerine geçiş yok.
- [ ] **GROUP-05 · P1 · Kısmi — Konu görünümünü tamamlama.** Gerçek konu emoji/ikonları, pin sırası, konu başına unread/mention sayısı, arama ve son seçilen konu. Şu an ikon, başlığın ilk karakteri ve renkten üretiliyor; sıra ID'ye göre.
- [ ] **GROUP-06 · P2 · Eksik — Konu yönetimi.** Yetkiye göre yeni konu, yeniden adlandırma, kapat/aç, gizle ve silme. Konu seçimi sırasında taslak ve aktarım bağlamını koru.
- [ ] **GROUP-07 · P0 · Doğrulama — Üyelik/izin/konu değişiklikleri.** Açık pencerede konunun silinmesi, grubun süpergruba dönüşmesi, kullanıcının çıkarılması ve yazma izninin değişmesini test et; eski hedefe gönderim ve yanlış okunma oluşmasın.

Dayanak: [chat.js](prototype/chat.js), native `IcqramChat::{topics,selectTopic,canSend,replyTo}` ve `IcqramAccount::contactSnapshot`.

## 6. Dosya, fotoğraf, video ve ses

- [ ] **MEDIA-01 · P1 · Eksik — Fotoğraf/video olarak gönderim.** Şu an ekler `force_file` ile belge olarak gidiyor. Fotoğraf/video modu, dosya olarak gönder seçeneği, açıklama ve albüm gönderimi ekle.
- [ ] **MEDIA-02 · P1 · Eksik — Çoklu dosya ve ekleme yöntemleri.** Birden fazla dosya seçme, sürükle-bırak ve panodan görsel yapıştırma; seçilenleri göndermeden önce inceleme/kaldırma.
- [ ] **MEDIA-03 · P1 · Kısmi — Aktarım kuyruğu ve devam ettirme.** Sohbet başına tek yükleme durumu var. Başarısız yüklemeyi baştan dosya seçmeden tekrar dene; kesinti/yeniden başlatma politikası, ilerleme, hız ve kalan süreyi ekle. CORE-02/03 ile birlikte çalışmalı.
- [ ] **MEDIA-04 · P1 · Kısmi — Video/ses akışı.** Oynatma dosya tamamen indirilene kadar bekliyor; 5 dakikalık görüntüleyici son süresi yavaş bağlantıda yetersiz olabilir. Desteklenen biçimlerde akış/erken oynatma ve ilerlemeye duyarlı zaman aşımı ekle.
- [ ] **MEDIA-05 · P2 · Kısmi — Görüntüleyici araçları.** Standart açılış boyutunu koruyarak isteğe bağlı büyütme/tam ekran, fotoğrafta zoom/pan, önceki/sonraki medya ve video hız kontrolü. Mevcut 640×520 sabit boyut bir hata değil; ek kontroller yeni iş.
- [ ] **MEDIA-06 · P1 · Eksik — Sesli mesaj kaydı.** Mikrofon izni, kayıt/iptal/dinle/gönder ve süre gösterimi. Gelen sesli mesajın oynatılması zaten var.
- [ ] **MEDIA-07 · P1 · Eksik — Sticker, GIF ve albüm çizimi.** Bunları sıradan dosya düğmesinden ayrı sun; uygun seçici ve gönderim ekle. Animasyon ve otomatik oynatma tercihlerini dikkate al.
- [ ] **MEDIA-08 · P1 · Eksik — Diğer mesaj türleri.** Anket/quiz, kişi kartı, konum/canlı konum gibi içerikleri türüne göre göster; desteklenen yanıt/oy verme/paylaşma eylemlerini ekle. Şu an çoğu genel ek açıklamasına düşüyor.
- [ ] **MEDIA-09 · P0 · Kısmi — Korunan ve süreli içerik.** Bazı korunan/süreli medya yolları zaten kapalı. Desteklenmeyen içeriğe açık durum göster; view-once/TTL, otomatik silme, mesaj silinince açık viewer/cache temizliği ve kaydetme yasaklarını uçtan uca doğrula. Başlangıçta güvenli biçimde destek dışı kalması, uygunsuz açılmasından iyidir.
- [ ] **MEDIA-10 · P2 · Kısmi — İndirme ve depolama yönetimi.** İndirme klasörü tercihi, tamamlanan dosyayı Finder'da gösterme, önbellek boyutu/temizleme ve başarısızlık sonrası geçici dosya temizliği. Normal indirme ile açık viewer'ın aynı dosyayı kullanmasını da doğrula.
- [ ] **MEDIA-11 · P1 · Doğrulama — Aktarım sınırları ve dosya güvenliği.** Büyük dosya, disk dolu, salt okunur hedef, aynı dosyanın değişmesi, bozuk MIME/codec, iptal ve kilitlenme testleri. Mevcut 2.000 MiB yükleme/oynatma ve 32 MiB fotoğraf sınırları kullanıcıya açık gösterilsin; hesap/sunucu limitleriyle uyum değerlendirilsin.
- [ ] **MEDIA-12 · P2 · Kısmi — Fotoğraf kaynak sınırı.** Bir sohbet nesnesinde 32 fotoğraf görünümü tutuluyor; kapatılanların temizliğiyle bu sınırın uzun kullanımda pencereyi yeniden açma gerektirmesini önle. Geçmişte önizleme ve albüm sırası korunmalı.

Dayanak: [chat.js viewer ve transfer bölümleri](prototype/chat.js), native `IcqramChat::{chooseFile,uploadPart,finishUpload,download,media,photo,cancelMedia}`.

## 7. Giriş, hesap ve gizlilik ayarları

- [ ] **AUTH-01 · P1 · Eksik — QR ile giriş.** Düğme var, native yanıt `QR_UNAVAILABLE`. Token yenileme, süre bitimi, onay ve gerekiyorsa 2FA ile gerçek akışı bağla; tamamlanana kadar kullanılamadığı açık olsun.
- [ ] **AUTH-02 · P1 · Kısmi — Kod teslim bilgisi ve yeniden isteme.** Kodun Telegram/SMS/arama/e-posta ile geldiğini, server süresini ve yeniden kod iste seçeneğini göster. Sunucu izin vermeden SMS seçeneği vaat etme.
- [ ] **AUTH-03 · P1 · Eksik — Parola kurtarma ve ek giriş yolları.** 2FA parolasını girme var; unutulan parola/kurtarma, ek e-posta kurulumu ve desteklenmeyen doğrulama adımları için tam akış yok. Mevcut e-posta **kodu** kabulü ile yeni e-posta **kurulumu**nu ayrı ele al.
- [ ] **AUTH-04 · P2 · Karar — Yeni hesap oluşturma.** Native kod `SIGNUP_REQUIRED` ile resmî uygulamaya yönlendiriyor. Kayıt akışını ekle veya mevcut hesap gereksinimini kalıcı ürün sınırı olarak açık tut.
- [ ] **AUTH-05 · P1 · Eksik — Hesap düzenleme.** Ad, kullanıcı adı, biyografi ve avatar güncelleme; mevcut Account information yalnız okunur. Durum etiketiyle normal ad düzenlemesi birbirini bozmamalı.
- [ ] **AUTH-06 · P1 · Eksik — Retro güvenlik ayarları.** Yerel parola/otomatik kilit, aktif cihazları görme ve oturum sonlandırma, 2FA yönetimi ve Telegram gizlilik ayarlarını bağla. Native kilit kontrollerinin bulunması bu ayarların ekranda bulunduğu anlamına gelmez.
- [ ] **AUTH-07 · P1 · Kısmi — Hesaptan çıkışı görünür yapma.** Web logout düğmesi native görünümde gizli taskbar içinde; macOS File menüsünde upstream Log Out var. Settings/Main içinde açık Log Out ekle; Quit ile ayır ve taslak/aktarımı gözeten onay kullan.
- [ ] **AUTH-08 · P2 · Eksik — Birden fazla hesap.** Hesap ekleme/geçiş ekranı yok. Eklenecekse bildirim, pencere, taslak, durum etiketi ve indirme verileri hesaplar arasında karışmamalı.
- [ ] **AUTH-09 · P0 · Doğrulama — Giriş uç durumları.** Yanlış/süresi bitmiş kod, yanlış 2FA, SRP yenileme, FLOOD_WAIT, iptal, oturum iptali ve kilit açmayı native uygulamada test et. JavaScript testleri gerçek Telegram oturumlarının kabul testi değildir.

Dayanak: [boot.js](prototype/boot.js), [Account information ve Settings](prototype/index.html), native `Intro::IcqramAuth`, `IcqramShell` ve macOS global menu değişiklikleri.

## 8. Bildirimler, ses ve durum

- [ ] **NOTIFY-01 · P1 · Doğrulama — Gerçek bildirim matrisi.** İnsan, bot, grup, kanal ve forum konusunu; uygulama açık, küçültülmüş, yalnız tray'de ve macOS kilitli durumlarda test et. İzin/Focus/ekran paylaşımı ayarlarıyla beklenen davranışı kaydet; sistem tercihini kalıcı olarak değiştirme.
- [ ] **NOTIFY-02 · P1 · Kısmi — Tam mesaja gitme.** Bildirim sohbeti ve konuyu açıyor; özgün mesaj kimliği custom yönlendirmeye taşınmıyor. Bildirime tıklama ilgili mesaja kaydırsın ve onu kısa süre vurgulasın.
- [ ] **NOTIFY-03 · P1 · Doğrulama — Okunma ve bildirim bastırma.** Geçmişi görünür okumayla Msg Mode, eski mesajda kaydırma, açık viewer ve konu değişimini ayır. Mevcut bastırma aktif pencere/konuya bakıyor; unread temizleme ve bir kez bildirim davranışı gerçek hesaplarla doğrulansın.
- [ ] **NOTIFY-04 · P1 · Eksik — Sohbet bazlı bildirim ayarı.** Genel kategori tercihleri var ve Telegram mute ayarına uyuluyor; bunu retro pencereden değiştirme yok. LIST-04 ile birlikte süreli mute ve mention davranışını ekle.
- [ ] **SOUND-01 · P0 · Eksik — Dağıtılabilir ses seti.** Yerel orijinal kayıtlar public kaynakta yok. Hakları açık özgün startup/mesaj/uyarı sesleri ekle veya kullanıcıya kendi dosyasını seçtiren bir düzen kur; temiz kurulumda ses beklentisi yanıltıcı olmasın.
- [ ] **SOUND-02 · P2 · Kısmi — Ses tercihleri.** Startup ve mesaj sesi ayrı açılsın/kapatılsın; seviye, önizleme ve eksik dosya bildirimi olsun. Mevcut global ses tercihi startup ve bildirim sesini birlikte etkiliyor.
- [ ] **STATUS-01 · P1 · Kısmi — Paylaşılan durumun yaşam döngüsü.** Beş saniyelik isim güncelleme beklemesini kullanıcıya göster; art arda seçimleri birleştir. Başka cihazdan isim değişmesi, etiketin başka yerde düzenlenmesi ve paylaşımı kapatma çakışmalarını yönet.
- [ ] **STATUS-02 · P1 · Doğrulama — İki istemci arasında durum testi.** Diğer IBQgram ve resmî Telegram'da etiket ekle/değiştir/kaldır, uzun ad, birden çok soyadı, başarısız güncelleme ve yeniden açılış. Local Offline/Invisible gerçek bağlantı/gizlilik ayarını değiştirmemeli; açıklaması görünür kalmalı.
- [ ] **STATUS-03 · P2 · Karar — Otomatik Away.** Kullanıcı isterse hareketsizlikte yerel Away ve geri dönüş. İsim paylaşımı açıksa sunucu hız sınırlarına uy; varsayılan olarak dışarıya otomatik ad güncelleme ekleme.

Dayanak: [notifications.js](prototype/notifications.js), [audio.js](prototype/audio.js), [account.js](prototype/account.js), native `notifications_icqram`, `IsReadingChat`, `OpenNotificationChat`, `IcqramAccount::setPresence`.

## 9. Pencereler ve görsel tutarlılık

- [ ] **UI-01 · P1 · Kısmi — Kapanan pencere kaynakları.** Kapatma `hide()` yapıyor; nesne listeden çıkarılmıyor. Yeni sohbet açma sınırı `_chats.size() >= 17` ve yardımcı pencereler de aynı koleksiyonda. Kapalı/boşta pencereleri güvenli boşalt; taslak/aktarımı koru; normal açılış ve bildirim açılışı aynı sınır kuralını kullansın.
- [ ] **UI-02 · P1 · Kısmi — Tam İngilizce ürün arayüzü.** Giriş, hata mesajları, menüler, dosya diyalogları, tarih ve viewer'da Türkçe/İngilizce karışıyor. Kullanıcının istediği İngilizce varsayılanını tüm ekranlara uygula; dizeleri tek yerde topla. Belgelerin Türkçe olması bundan bağımsızdır.
- [ ] **UI-03 · P1 · Doğrulama — Tüm ekranlarda klasik görünüm.** Light/dark/system, normal/ince yazı, uzun adlar, emoji, minimum boyut, transfer satırı ve konu değişiminde taşma/kayma kontrolü. Mevcut tasarımı değiştirmeden referans ölçülerini sabitle.
- [ ] **UI-04 · P2 · Kısmi — Pencere konum ve boyut tercihleri.** Ana pencere boyutu kaydoluyor; chat/directory geometrileri ve monitör/Spaces değişiklikleri için ortak kalıcılık yok. Ekran dışına taşmayı önle; sabit açılması istenen viewer varsayılanını koru.
- [ ] **UI-05 · P1 · Doğrulama — macOS yaşam döngüsü.** Tek uygulama örneği, Dock/tray görünürlüğü, sol/sağ tık, menünün dışarı tıklamayla kapanması, farklı Space'te açma, Command-W/Q ve oturumdan çıkış. Önceden düzelen davranışları yeni release paketi üzerinde tekrar doğrula.
- [ ] **UI-06 · P2 · Kısmi — Erişilebilirlik.** VoiceOver, klavye ile liste/konu/tab dolaşımı, odak sırası, ölçeklendirme, kontrast ve reduced-motion. Bazı ARIA ve hareket azaltma kuralları var; tüm native pencerelerde kabul testi yok.
- [ ] **UI-07 · P2 · Kısmi — Yazım tercihlerini saklama.** Chat yazı tipi, yazı/zemin rengi ve Enter ile gönder seçimi yalnız pencere durumunda. Bunları tutarlı ayar yap; yerel görüntü tercihini karşı tarafa gönderilen biçimle karıştırma.
- [ ] **UI-08 · P1 · Kısmi — Ürün sürümü ve kalan adlar.** About `0.1`, paket `0.1.0-alpha.1`, native upstream sürümü `7.4.4`. Ürün ve upstream sürümünü açık ayrı göster; kullanıcıya görünen eski `icqram` metinlerini düzelt. Oturum yolu ve dahili kimlikleri plansız yeniden adlandırma.

Dayanak: [index.html](prototype/index.html), [native.js](prototype/native.js), [chat.js](prototype/chat.js), [style.css](prototype/style.css), native `IcqramShell` ve `core/version.h`.

## 10. Güvenlik ve Telegram uyumluluğu

- [ ] **SEC-01 · P0 · Eksik — Sponsorlu içerik entegrasyonu.** Custom sohbet/directory ekranları sponsorlu mesaj veya sponsorlu arama sonucu istemiyor/çizmiyor. Kanal, bot ve genel arama akışını; gösterim/tıklama/raporlama, önbellek ve uygun Premium davranışıyla tamamla. Video reklam kurallarını tam ekran video eklendiğinde uygula. Bu, yalnız tasarım iyileştirmesi değildir; aşağıdaki Telegram belgelerine bağlı dağıtım işidir.
- [ ] **SEC-02 · P0 · Doğrulama — Temel Telegram davranışı.** Okundu, yazıyor, last-seen/online, silinen/süreli içerik ve korunan medya için diğer istemcilerle kabul matrisi oluştur. Ürün kapsamı ile API uyumluluğunu ayrı takip et; sadece kaynak yayını yapılmış olması uyumluluk kanıtı değildir.
- [ ] **SEC-03 · P0 · Doğrulama — WebView/native sınırı.** Mesaj kaynağı, yöntem yetkisi, parametre boyutu, hesap/konu bağlamı, dosya URL'leri ve geç gelen cevapları kötü amaçlı girdilerle sınayacak native entegrasyon testleri ve bağımsız inceleme.
- [ ] **SEC-04 · P0 · Doğrulama — Kilit ve hesaplar arası veri temizliği.** Ana pencere yanında Settings/Profile/Directory/Commands/Viewer, açık fotoğraf, devam eden indirme ve gecikmiş cevaplar kilit/logout sırasında içerik sızdırmamalı. Yardımcı pencereler için aynı doğrulama uygulanmalı.
- [ ] **SEC-05 · P0 · Doğrulama — Yerel veri ve geçici dosyalar.** Oturum/parola ile şifreleme davranışı, dosya izinleri, WebView saklama alanı, geçici medya ve çökme sonrası kalıntıları incele. Doğrulanmadan “diskte tüm veriler şifreli” iddiası kullanma.
- [ ] **SEC-06 · P0 · Doğrulama — Ağ hedefleri ve DC ayrımı.** Temiz ortamda runtime bağlantı hedefleri, üretim/test DC seçimi, geçersiz sunucu anahtarının reddi ve proxy davranışını sınayacak planı çalıştır. MTProto kaynak farkının olmaması tek başına bu testleri karşılamıyor.
- [ ] **SEC-07 · P1 · Eksik — Gizlilik açıklaması ve özel bildirim kanalı.** Saklanan veriler, Telegram'a iletilenler, isim etiketi, indirmeler, telemetri durumu ve veri silmeyi anlatan kısa politika; güvenlik açıkları için kullanılabilir özel iletişim/raporlama yolu. Mevcut SECURITY metni henüz somut bir özel kanal vermiyor.
- [ ] **SEC-08 · P1 · Kısmi — API ve sürüm bakımı.** Sabit upstream/dependency sürümlerini güvenlik düzeltmeleri açısından düzenli gözden geçir; yamaları güncelleyip yerel testleri çalıştır. API uygulama anahtarının binary'den çıkarılabileceğini kabul eden kötüye kullanım/olay müdahale planı oluştur; anahtarı gizli tutan bir “proxy çözümü” varsayma.

Telegram'ın [API koşulları](https://core.telegram.org/api/terms) temel davranışların korunmasını ve kanal sponsorlu mesaj desteğini istiyor. [Sponsorlu içerik belgesi](https://core.telegram.org/api/sponsored-messages) bot sohbetleri ve genel aramayı da kapsıyor. Bu iki belge 18 Kasım 2026 tarihinde kontrol edildi. Buradaki P0 önceliği bu gerekliliklerle mevcut custom ekranlar arasındaki eksik bağlantıya dayanır.

Dayanak: [SECURITY](docs/SECURITY.md), [yerel güvenlik doğrulaması](scripts/security-check.py), [WebView yaması](desktop/patches/webview-local-file-loading.patch), [Desktop yaması](desktop/patches/ibqgram-desktop.patch). Sır taraması, bağımsız uygulama güvenlik denetimi değildir.

## 11. Dağıtım, kaynak ve bakım

- [ ] **REL-01 · P0 · Eksik — Temiz Release derlemesi.** Mevcut komut Debug üretiyor. Hesap verisi bulunmayan ayrı dizinde release build/paketleme oluştur; bir kere giriş yapılmış Debug klasörünü paketleme.
- [ ] **REL-02 · P0 · Doğrulama — Bağımsız temiz makinede derleme.** Public repo + public bağımlılıklar + geliştiricinin kendi API bilgileriyle sıfırdan native derleme ve açılış. İlk yayında yamalar, kaynak eşitliği ve UI paketleme doğrulandı; tamamen temiz makinede tam native build tekrarlanmadı.
- [ ] **REL-03 · P0 · Eksik — İmza, notarization ve kurulum paketi.** Developer ID, hardened runtime/entitlement kontrolü, Apple notarization/stapling ve Gatekeeper testi; ardından DMG veya uygun ZIP. Gerekli geliştirici hesabı ve sertifikalar ayrı bağımlılıktır.
- [ ] **REL-04 · P0 · Eksik — Kurulum ve veri yolu geçişi.** Uygulama verisini build çıktısından bağımsız desteklenen kullanıcı dizinine taşı. Eski geliştirme oturumunu, taslağı ve ayarları koruyan göç/yedek/geri dönüş planı; imzalı paketin yeni bildirim kimliğini de doğrula.
- [ ] **REL-05 · P1 · Eksik — Güncelleme düzeni.** Upstream otomatik güncelleme kapalı. IBQgram sürüm kontrolü, imzalı güncelleme doğrulaması ve geri dönüş tasarla; ilk etapta güvenilir manuel güncelleme yolu yeterli olabilir.
- [ ] **REL-06 · P0 · Kısmi — Varlık hakları ve bildirimler.** Güncel IBQgram logosu var; runtime klasik ikonlar, fontlar, butonlar, ICQ Now içeriği ve eklenecek sesler için dosya bazlı kaynak/lisans envanteri çıkar. Dağıtım hakkı belirsiz varlığı değiştir/çıkar; yeni marka ve kaynak kod lisansını birbirine karıştırma.
- [ ] **REL-07 · P1 · Kısmi — Sürüm kanıtları.** Her pakete karşılık gelen kaynak etiketi, upstream/submodule revizyonları, bağımlılık lisansları/SBOM, hash ve imza doğrulama adımlarını ekle. Mevcut kaynak ZIP hash'i binary için aynı kanıtı sağlamaz.
- [ ] **REL-08 · P1 · Eksik — Yerel yayın kontrol listesi.** Sır taraması, kaynak yaması kontrolü, testler, native build, kaynak–bundle eşitliği ve manuel kabul adımlarını tek yerel release komutunda topla. **GitHub Actions/CI eklenmeyecek.**
- [ ] **REL-09 · P2 · Kısmi — Native geliştirme akışı.** Native düzenlemeden yayımlanan yamaya güvenli aktarım/doğrulama komutu ekle. Hazırlanmış source klasörü ignore edildiği için yalnız kök commit almak yeni C++ değişikliğini yayımlamıyor.
- [ ] **REL-10 · P2 · Eksik — Desteklenen ortam bilgisi.** Minimum macOS/Xcode ve kaynak gereksinimleri; bilinen sorunlar, kurulum/kaldırma, güncelleme ve hassas verileri temizlenmiş hata raporu şablonları. Opt-in olmadan uzaktan crash/telemetri ekleme.

Dayanak: [DEVELOPMENT](docs/DEVELOPMENT.md), [LICENSING](docs/LICENSING.md), [SOURCE-AUDIT](docs/SOURCE-AUDIT.md), [build-native.py](scripts/build-native.py), [prepare-source.py](scripts/prepare-source.py).

## 12. Test ve performans

- [ ] **QA-01 · P1 · Kısmi — Native davranış testleri.** İlk sürümde 102 yerel test geçti; önemli kısmı JavaScript, kaynak ve paket sınırlarını sınar. C++ API akışları, hata/iptal ve gerçek pencereler için kontrollü test ortamı ekle; mevcut sayıyı canlı Telegram kapsamı gibi sunma.
- [ ] **QA-02 · P1 · Eksik — Tekrarlanabilir ürün kabul paketi.** Gerçek olmayan hesap/verilerle bütün pencerelerin light/dark görüntüleri ve ölçüleri, kritik klavye/tıklama akışları; kullanıcı hesabına istenmeyen mesaj göndermeyen bir test düzeni.
- [ ] **QA-03 · P1 · Kısmi — Uzun geçmiş ve büyük liste.** Geçmiş DOM'u her yenilemede tamamen yeniden kuruluyor; liste ve tüm dialog sayfaları da periyodik çekiliyor. Büyük rehber, yüzlerce konu, uzun geçmiş ve çoklu pencereyi ölç; kısmi çizim/sanallaştırma ve artımlı güncelleme uygula.
- [ ] **QA-04 · P2 · Kısmi — Boşta CPU/bellek ve pil.** Chat state 750 ms, komut paleti ve liste snapshot 1,5 s, geçmiş 30 s ve liste/dialoglar 60 s aralıklarla işleniyor. Bunların hepsi ağ isteği değildir. Native olaylara taşıyabildiklerini taşı; gizli/minimize pencerelerde kaynak kullanımını ve kalıcı nesneleri ölç.
- [ ] **QA-05 · P1 · Doğrulama — Uzun süre çalıştırma.** Çok sayıda farklı sohbet aç/kapat, art arda medya izle, büyüt/küçült, tema/konu değiştir; zamanlayıcı, dosya tanıtıcısı, bellek ve odak kaçaklarını kontrol et.
- [ ] **QA-06 · P1 · Doğrulama — Unicode ve veri sınırları.** Emoji, Türkçe, RTL, birleşen karakterler, çok uzun ad/başlık, bozuk entity ve büyük ID; kopyalama, mesaj hedefi ve çizim güvenliği aynı kalmalı.
- [ ] **QA-07 · P2 · Kısmi — Kodun sürdürülebilirliği.** Uzun/minify benzeri JS/C++ satırlarını biçimlendir; büyük chat/account işlemlerini davranışı koruyarak ayır. Paket `check` listesine şu an dışarıda kalan `auxiliary.js` ve `now.js` gibi çalıştırılan betikleri de dahil et.

Dayanak: [yerel testler](scripts/), [package.json](package.json), [app.js](prototype/app.js), [chat.js](prototype/chat.js), [bot-commands.js](prototype/bot-commands.js). Test sayısı ilk yayın kaydıdır; bu liste hazırlanırken uygulamaya yeni özellik eklenmedi.

## 13. İlk macOS sürümünden sonra değerlendirilecekler

Bu bölümdeki maddeler mevcut ürünün bozuk olduğu anlamına gelmez ve ilk sürüm sözü değildir.

- [ ] **FUTURE-01 · P3 · Karar — Windows ve Linux.** Derleme, WebView, bildirim/tray, kurulum ve platform kabul testleri. Apple Silicon dışındaki macOS desteğini de ayrı hedef olarak değerlendir.
- [ ] **FUTURE-02 · P3 · Karar — Sesli/görüntülü arama ve ekran paylaşımı.** Telegram Desktop altyapısında bulunmaları özel retro arayüzden kullanılabildiklerini göstermiyor.
- [ ] **FUTURE-03 · P3 · Karar — Stories ve geniş Premium/Stars özellikleri.** Çıkartmaların ötesindeki özel içerik/ürün akışları; destek dışı içerik için anlaşılır gösterim yine gerekli.
- [ ] **FUTURE-04 · P3 · Karar — Dil seçimi.** Önce tüm arayüz İngilizce tamamlanacak; ardından istenirse Türkçe ve başka diller için kullanıcı tercihi.
- [ ] **FUTURE-05 · P3 · Karar — Proxy ayarları ve ileri veri araçları.** Retro ayarlardan proxy yönetimi, sohbet dışa aktarma ve ileri depolama araçları; güvenlik/önbellek testlerinden bağımsız yeni ürün yüzeyleri.

## Teknik ve ürün sınırları

| Bugünkü davranış | Sonraki işlem |
| --- | --- |
| Metin/draft: 4.000 UTF-16 birimi; Chars farklı Unicode ölçüsü kullanıyor | CORE-11 |
| Geçmiş: istek başına 50 mesaj; Older ile eski sayfalar var | CORE-01, CHAT-05, QA-03; geçmiş yalnız 50 mesajla sınırlı değil |
| Bir sohbet nesnesinde 2.048 farklı metin gönderim denemesi | CORE-09 |
| Yeni sohbet açılışında `_chats.size() >= 17` kontrolü; yardımcı pencereler de sayılabiliyor | UI-01; bu, “17 açık sohbet destekli” garantisi değil |
| Yerel eklenmiş bot listesi: hesap başına 100 kayıt | LIST-02 |
| Tek seçili/yüklenen dosya; yükleme ve oynatılabilir belge sınırı 2.000 MiB | MEDIA-02/03/11; genel indirme için aynı sınır varsayılmıyor |
| Fotoğraf: 32 MiB giriş kontrolü, sohbet nesnesinde 32 görünüm; önizleme en fazla 1.280 px | MEDIA-05/11/12 |
| Viewer: 640×520; mevcut indirme bekleme süresi 5 dakika | MEDIA-04/05 |
| Bot paleti: en fazla 100 komut, açıklamalar 256 karaktere kısaltılıyor | BOT-04; uzun açıklamayı tam gösterme ihtiyacını değerlendir |
| UIN araması global numara rehberi değil | LIST-06; Telegram'ın erişim sınırlarını aşmaya çalışılmayacak |

## Eksik sayılmayan bilinçli tercihler

- **GitHub Actions ve CI kapalı kalacak.** Yerel otomatik kontroller yapılabilir; kullanıcı bunu istemediği için bulut CI işi yok.
- **ICQ Now statik, yerel ve klasik müze sayfası olarak kalacak.** Responsive portal, gerçek ICQ dizini veya genel amaçlı web tarayıcısına dönüştürülmeyecek.
- **Offline/Invisible nostaljik durum etiketidir.** Telegram okunma/yazıyor/online davranışını gizleyen bir ghost mode yapılmayacak.
- **E-posta ve ilgi alanı araması Telegram'ın sağlamadığı bir rehber gibi sunulmayacak.** Kişi EMail alanına uydurma veri doldurulmayacak.
- **Gizli sohbet/E2E vaadi yok.** Mevcut sohbetler Telegram bulut sohbetidir; bunu başka bir arayüz ekleyerek değiştirmiş sayamayız.
- **Eski logo denemeleri ve özel ekran görüntüleri depoya geri alınmayacak.** Dahili `icqram` adları ise veri uyumluluğu için gerektiğinde korunacak.

## Önerilen uygulama sırası

1. **Veri ve temel güvenilirlik:** CORE-01/02/03, MEDIA-09, UI-01; ardından CORE-05/AUTH-09/SEC-04 kabul testleri.
2. **Günlük sohbet:** CHAT-01/02/03/05/06, BOT-01/02, LIST-04, CORE-07/11 ve UI-02.
3. **Medya ve grup tamamlama:** MEDIA-01/02/03, GROUP-04/05 ve NOTIFY-02/03.
4. **Dağıtım hazırlığı:** SEC-01/02, SOUND-01, REL-01/02/03/04/06/07/08; ilgili güvenlik doğrulamaları tamamlanmadan genel kullanıcı paketi yayımlama.
5. **Kalite ve sonraki kapsam:** kalan P1/P2 işleri; P3 maddelerini ayrı ürün kararıyla seç.

Sponsorlu içerik, lisans/varlık envanteri ve temiz release hazırlığı ilk adımlarla paralel hazırlanabilir. Buradaki sıra, genel kullanıcı dağıtımının dördüncü adım tamamlanmadan hazır olduğu anlamına gelmez.
