# Küçük boyutlu, hazır nginx imajını temel alarak yalnızca gerekli yapılandırmayı ekliyoruz.
FROM nginx:alpine

# mkcert tarafından oluşturulan sertifikaları ve nginx konfigurasyonunu kopyalıyoruz.
COPY docker/nginx/certs /etc/nginx/certs
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
