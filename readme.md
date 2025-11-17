# Transcendence

## Kişisel Notlar
- qemu kurdum
- daemon'ı açmak için `colima start` komutu yazdım; artık bir servis konteynerları ayağa kaldırmak için çalışıyor.

## Proje Durumu
- Vite + TypeScript tabanlı frontend hazır; SPA router ile modüler view'ler kullanılıyor (şu an `/auth` paneli).
- `/game` rotası artık takım arkadaşının Pong oyununu canvas üzerinde render ediyor; route değişimlerinde animasyon/dinleyici temizliği yapılarak SPA yapısı korunuyor.
- Giriş yapmış kullanıcılar auth panelindeki session banner üzerinden “Play Now” düğmesine basarak oyuna geçebiliyor; çıkış ve oyun geçişi aynı bileşende gruplanmış durumda.
- Oyun ekranı W/S ve ↑/↓ tuşlarını dinleyerek paddle’ları kontrol ediyor, skor panosu DOM üzerinde güncelleniyor ve pencere yeniden boyutlandığında canvas oranı korunuyor.
- Oyun ekranına “Oyundan Çık” butonu eklendi; kullanıcı dashboard’a dönebiliyor ve logout sonrasında oyun ekranı erişilemez hale geliyor.
- Auth paneli oturum açıldığında form kartlarını gizleyip yerine tek “Play Now” CTA’sı gösteriyor; çıkış yapıldığında formlar geri geliyor. Böylece login/register ekranı yalnızca ihtiyaç olduğunda gösteriliyor.
- Gerçek Google OAuth 2.0 akışı entegre edildi: `/api/users/oauth/google/start` Google ekranına yönlendiriyor, callback tarafında token takası yapılıyor ve kullanıcı otomatik giriş yapıyor; hatalar frontend’de banner olarak gösteriliyor.
- Google test amaçlı “Google ID gir” formları kaldırıldı; artık sadece gerçek OAuth butonuyla kayıt/giriş yapılabiliyor.
- Auth paneli artık dikey üçlü buton (Kayıt Ol / Giriş Yap / Google ile Devam Et) düzenine sahip; ilk iki seçenek ilgili formu açarken Google butonu ikonuyla birlikte doğrudan OAuth akışını tetikliyor.
- `/api/users/profile` endpoint’i mevcut oturumun ID, e-posta, nickname, provider ve kayıt tarihini döndürüyor; dashboard bu veriyi çekerek profil kartını güncelliyor.
- Aynı endpoint üzerinden nickname güncellemek için `PATCH /api/users/profile` eklendi; dashboard’daki kalem simgesiyle kullanıcılar takma adlarını düzenleyebiliyor.
- Oturum açmış kullanıcılar için yeni bir `/dashboard` rotası eklendi; profil kartı, oturum bilgileri ve “Play Now” butonu bu ekranda. Oyun ekranı (`/game`) yalnızca dashboard üzerinden erişilebiliyor ve logout sonrası kullanıcı otomatik olarak `/auth` rotasına dönüyor.
- Turnuva modülü için `/tournament` rotası eklendi; “Turnuva Oluştur” formu ve “Aktif Turnuvalar” listesi bu ekranda. Backend’de `/api/tournaments` ailesiyle turnuva oluşturma, katılma ve başlatma akışı sağlanıyor; eksik slotlar otomatik AI oyuncularla tamamlanıyor. Katılım sırasında alias alanı kaldırıldı, kullanıcıların mevcut nickname’i otomatik kullanılıyor.
- Monitoring altyapısı eklendi: Backend `/metrics` endpoint’i Prometheus formatında metrik üretiyor, Docker Compose’a Prometheus (9090) ve Grafana (3001) servisleri dahil edildi.

## Yapılacaklar
- Turnuvalarda maç/sonuç kaydı tutup profil ekranına “katıldığı turnuva sayısı, galibiyet ve kazanma yüzdesi” gibi istatistikleri ekle.
- Aynı e-posta için local ve Google hesaplarını birlikte kullanmayı sağlayacak “linked accounts” mimarisini değerlendirme (şu an tek yönlü dönüştürme var).
- Production TLS (ör. Let’s Encrypt) ve dağıtım stratejisi hazırlığı.
- CI/CD otomasyonu: lint/test/build script’lerini pipeline’a bağla.
- Monitoring (Prometheus + Grafana) ve microservice ayrışımı gibi daha önce ertelenen modülleri planla (temel monitoring kuruldu, ileri seviye metrikler ve dashboard’lar genişletilecek).

## Oyun Entegrasyonu Güncellemeleri
- `srcs/frontend/src/game/pong.ts`: Oyun motoru SPA mimarisi için yeniden düzenlendi; canvas boyutu pencere yüksekliğine göre ayarlanıyor, hash tabanlı router tarafından terk edildiğinde animasyon/dinleyiciler temizleniyor ve skor panosu DOM üzerinden güncelleniyor. Kodun her kritik bloğu açıklayıcı yorumlarla belirlendi.
- `srcs/frontend/src/components/session-banner.ts`: Oturumu olan kullanıcılar için “Play Now” butonu eklendi; hash `/game` olarak set edilerek router oyun görünümüne gönderiliyor, aynı bileşen “Çıkış” düğmesini de koruyor.
- `srcs/frontend/src/components/auth-panel.ts`: Oturum durumu takibiyle form kartları yalnızca kullanıcı giriş yapmadığında gösteriliyor; giriş sonrasında aynı panelde bir CTA kartı ve oyun bağlantısı sunuluyor.
- `srcs/frontend/src/utils/styles.ts`: Yeni `.session-banner__actions` düzeni sayesinde “Play Now” ve “Çıkış” butonları hizalı duruyor, dar ekranlarda satır kırıldığında da düzen bozulmuyor.
- Oyun artık paddle’lar orta pozisyonda ve top hareketsiz başlayacak şekilde servis bekliyor; herhangi bir oyuncu paddle hareket ettirdiğinde top oyuna giriyor. 10 puana ulaşan oyuncu kazandığında durum mesajı gösteriliyor ve bir sonraki maç yine paddle hareketiyle başlıyor.
- Google OAuth akışı, e-posta daha önce local kayıtla eşleşmişse artık aynı kullanıcı kaydını Google sağlayıcısına dönüştürüyor; nickname/ID korunuyor ve kullanıcı yalnızca OAuth ile giriş yapmaya devam ediyor.
- `srcs/frontend/src/views/dashboard.ts`: Yeni dashboard view’i kullanıcı bilgilerini ve Play Now aksiyonunu gösteriyor; oturum kapalıyken otomatik `/auth` rotasına yönlendiriyor.
- `srcs/frontend/src/views/tournament.ts`: Turnuva oluşturma ve listeleme arayüzü; sekmeli yapı, join/start butonları ve bracket önizlemesi içeriyor.

## Google OAuth Akışı
- `srcs/backend/src/server.ts` gerçek Google OAuth start/callback endpoint’lerini sağlıyor. Start rotası rastgele `state` üretip cookie’de saklıyor, kullanıcıyı Google’a yönlendiriyor. Callback rotası token takası yapıyor, profil bilgisini çekiyor, veritabanında kullanıcıyı bulup (yoksa oluşturup) JWT cookie’lerini üretip frontend’e `/#/auth?oauth=...` ile yönlendiriyor.
- `srcs/backend/.env.example` dosyasına `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` değişkenleri eklendi; backend bu değerlerle Google API çağrılarını yapıyor.
- `srcs/frontend/src/components/auth-panel.ts` Google OAuth için ayrı bir kart ve buton içeriyor; backend’den dönen `oauth` query parametresi okunup banner olarak kullanıcıya gösteriliyor. Route hash’inde query olsa bile SPA router yalnızca path kısmını dikkate aldığı için navigasyon bozulmuyor.
- Başarılı girişte mesaj “Google ile giriş tamamlandı” olarak görünüyor; `denied`, `token_error`, `profile_error`, `email_conflict` gibi durumlarda hangi adımda sorun çıktığı kullanıcıya anlatılıyor.
- Docker Compose konfigürasyonu ile frontend, backend ve nginx HTTPS reverse proxy olarak birlikte ayağa kalkıyor.
- `make up`/`make down` hedefleri Docker Compose komutlarını kısayol olarak çalıştırıyor; `make up-detached` arka planda, `make vclean` volume'ları temizleyerek kapatır. HTTPS reverse proxy `8443` portunu da açar.
- Klasör isimlendirmeleri küçültüldü (backend, frontend, docker vb.) ve Docker yapılandırmaları buna göre güncellendi.
- nginx yapılandırması HTTPS (self-signed) + reverse proxy akışını ve başlıkları açıkça belgeleyecek şekilde yorumlandı.
- Fastify + TypeScript backend iskeleti oluşturuldu; `/health` endpoint'i ile servislerin durumu izlenebiliyor.
- SQLite veritabanı backend içinde `sqlite3` ile yönetiliyor; `users` tablosu otomatik oluşturuluyor ve kalıcı volume (`backend-data`) üzerinden saklanıyor.
- Prometheus için `srcs/docker/prometheus/prometheus.yml` dosyasında backend scrape ayarları bulunur; servis `http://localhost:9090` üzerinden, Grafana ise `http://localhost:3001` (admin/admin) ile erişilebilir. Grafana’da Prometheus'u data source olarak ekleyip metrikleri (ör. `tournament_created_total`, `http_request_duration_seconds`) dashboard’a bağlayabilirsin.
- `users` tablosuna `provider`/`provider_id` alanları eklendi, Google kayıtları için `UNIQUE(provider, provider_id)` kısıtı tanımlandı; kolonlar eski tablolarla uyumlu olacak şekilde otomatik ekleniyor.
- `/api/users/register` manuel kayıt endpoint'i e-posta, kullanıcı adı ve şifreyi doğrulayıp bcrypt ile hash'leyerek veritabanına yazıyor.
- `/api/users/register/google` endpoint'i Google OAuth sonrası gelen `googleId` + e-posta + kullanıcı adını kayıt altına alıyor; benzersiz kısıtlar ihlalinde 409 döner.
- `/api/users/login` ve `/api/users/login/google` endpoint'leri JWT üretip httpOnly cookie olarak set ediyor; `/api/users/logout`, `/api/users/me` ve `/api/users/refresh` rotaları oturum yönetimini tamamlıyor.
- Login/kayıt/yenileme rotaları IP bazlı rate limit ile brute-force denemelerine karşı korunuyor.
- Frontend auth paneli, modüler bileşenler, form durum mesajları ve cookie tabanlı oturum takibi ile bu endpoint'leri çağırır; kullanıcı adları banner'da HTML encode edilerek XSS riski azaltılır.
- Formlar live-validation mekanizması ile (HTML5 constraint API + özel mesajlar) kullanıcıya gönderim öncesi geri bildirim veriyor.
- Frontend auth paneli, modüler bileşenler, form durum mesajları ve cookie tabanlı oturum takibi ile bu endpoint'leri çağırır.

## Güvenlik Güncellemeleri
| Önce | Şimdi |
| --- | --- |
| Login rotaları mock token üretip JSON ile döndürüyordu, token `localStorage`'da saklanıyordu. | JWT `jsonwebtoken` ile imzalanıp httpOnly + `SameSite=Lax` cookie olarak set ediliyor; token JavaScript'ten erişilemiyor. |
| Sadece HTTP proxy vardı. | nginx her container build'ında self-signed TLS sertifikası üretip 443'te HTTPS yayınlıyor; 80'e gelen istekler otomatik HTTPS'e yönleniyor. |
| Güvenlik başlıkları manuel değildi. | Fastify `onSend` hook'u ile HSTS, X-Frame-Options, X-Content-Type-Options, XSS-Protection ve Referrer-Policy başlıkları otomatik set ediliyor. |
| Oturum durumu sadece `localStorage` verisi üzerinden okunuyordu. | `GET /api/users/me` ile backend doğrusu kontrol ediliyor; frontend cookie varlığını sunucudan teyit ediyor, `localStorage` yalnızca kullanıcı bilgisi cache'liyor. |
| Çıkış işlemi sadece istemci tarafında token silmekten ibaretti. | `/api/users/logout` cookie'yi server tarafında temizliyor, ardından frontend `clearSession` çağırıyor. |
| Rate limiting yoktu. | Login, kayıt ve refresh istekleri IP başına in-memory rate limiter ile sınırlandırıldı. |

Bu değişikliklerle subject'in “parolalar hashlenmeli, XSS/SQLi’den korunmalı, HTTPS zorunlu, formlar doğrulanmalı ve rotalar korunmalı” maddeleri sağlanır hale geldi. HTTPS ve JWT secret gibi değerler `.env` üzerinden yönetiliyor; repository'ye kritik bilgiler girilmemesi garanti edildi.

## Konfigürasyon ve Çalıştırma
1. Backend bağımlılıklarını yüklemek için `cd srcs/backend && npm install` çalıştırın (yalnızca yerel ortamda gerekir, Docker build süreci konteyner içinde kurulum yapar).
2. `srcs/backend/.env.example` dosyasını kopyalayıp gerçek değerlerinizi girin:
   ```bash
   cp srcs/backend/.env.example srcs/backend/.env
   ```
   - `JWT_SECRET` için güçlü bir değer üretin.
   - Geliştirme ortamında `COOKIE_SECURE=false` bırakabilirsiniz; production için `true` yapın.
   - Google Cloud Console’da OAuth 2.0 “Web application” client oluşturup `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` değişkenlerini doldurun. Authorized redirect URI olarak `https://localhost:8443/api/users/oauth/google/callback` değerini ekleyin ve aynı değeri `.env`’deki `GOOGLE_REDIRECT_URI` alanına yazın.
3. Geliştirme makinenize [mkcert](https://github.com/FiloSottile/mkcert) kurun.  
   - **macOS:**  
     ```bash
     brew install mkcert nss
     mkcert -install
     ```
   - **Linux (Debian/Ubuntu örneği):**  
     ```bash
     sudo apt update
     sudo apt install mkcert libnss3-tools
     mkcert -install
     ```  
     (Farklı dağıtımlarda paket isimleri değişebilir; mkcert yayın sayfasındaki yönergeleri izleyin.)  
   - **42 havuz makineleri:** sudo yetkisi olmadığından `mkcert -install` komutu çalışmayabilir. Bu durumda self-signed sertifika ile devam etmek gerekebilir; pipeline veya değerlendirme sürecine göre sertifika adımı manuel gözden geçirilmelidir.
   `make` komutları sertifika dosyalarını otomatik üreteceği için ekstra komut vermenize gerek kalmaz.
4. `make up-detached` komutu ile servisleri (frontend, backend, nginx) ayağa kaldırın. `mkcert` ile üretilen sertifikalar `srcs/docker/nginx/certs` altında oluşturulur ve `make down`/`make vclean` çağrılarında silinir.
5. İlk çalıştırmada tarayıcıya güvenilir CA (mkcert) yüklendiğinden emin olun; artık `https://localhost:8443/#/auth` adresinde uyarı görmezsiniz. Panelde kayıt/giriş formlarını kullanırken isteklerin HTTPS üzerinden gittiğini, cookie’nin httpOnly olduğunu ve oturum süresi dolduğunda `/api/users/refresh` ile otomatik yenilendiğini gözlemleyebilirsiniz.
6. Oturumu kapatmak için “Çıkış” düğmesi hem cookie’yi hem de lokal saklanan kullanıcı bilgisini temizler.
7. Geliştirme ortamında auth akışını otomatik test etmek için backend dizininde `npm run test:auth` (veya tüm doğrulama için `npm run verify`) çalıştırabilirsiniz. Testler varsayılan olarak `https://localhost:8443` adresini hedefler ve self-signed sertifikayı kabul etmek için TLS doğrulamasını devre dışı bırakır. İleride CI/CD kurulmak istenmezse `scripts/auth-flow.ts`, `npm run test:auth` ve bu bölüme ait açıklamaları kaldırmayı unutmayın ki gereksiz kod/bağımlılık kalmasın.

Geliştirme sürecinde `make down` ile konteynerleri durdurabilir, `make vclean` ile volume dahil tüm kalıcı veriyi temizleyebilirsiniz.
