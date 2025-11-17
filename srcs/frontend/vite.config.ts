import { defineConfig } from 'vite';

// Vite geliştirme sunucusunu Docker container'ı içinden erişilebilir hale getiriyoruz.
export default defineConfig({
  server: {
    // 0.0.0.0 -> tüm arayüzlerde dinle; nginx proxy'si bu sayede erişiyor.
    host: '0.0.0.0',
    // Vite'in varsayılanı 5173; nginx konfigürasyonumuz da bu porta yönleniyor.
    port: 5173
  }
});
