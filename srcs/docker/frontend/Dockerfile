# Hafif ve güncel bir Node.js tabanı seçerek TypeScript/Vite araçlarının sorunsuz kurulmasını sağlıyoruz.
FROM node:20-alpine
# Derleme ve çalışma işlemleri için kapsayıcının kök çalışma dizinini belirliyoruz.
WORKDIR /app
# Doğru klasör (frontend) altındaki package.json'ı kopyalayarak bağımlılık önbelleğini etkin kullanıyoruz.
COPY frontend/package.json ./
# Projeyi geliştirme modunda çalıştırmak için gerekli paketleri kuruyoruz.
RUN npm install
# Kalan tüm frontend kaynaklarını doğru klasörden içeri alıyoruz.
COPY frontend/. .
# Vite geliştirme sunucusunun dinlediği portu dışarı açıyoruz ki nginx proxy yapabilsin.
EXPOSE 5173
# Vite'i tüm arayüzlere bağlayıp nginx'in erişmesine izin veren komutu varsayılan başlatma olarak tanımlıyoruz.
CMD ["npm","run","dev","--","--host","0.0.0.0"]
