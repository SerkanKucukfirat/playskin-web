# Playskin web sitesi

Playskin için hazırlanan yeni, animasyonlu web sitesi. Düz HTML, CSS ve tek bir JavaScript dosyasıyla çalışır; derleme adımı yoktur.

## Sayfalar

| Dosya | Sayfa |
|---|---|
| `index.html` | Ana sayfa: "Play Your Skin" sinematik laboratuvar deneyimi (`assets/lab/`) |
| `klasik.html` | Önceki ana sayfa (WebGL krom molekül sahnesi, ürün galerisi, lipozom bölümü) |
| `hakkimizda.html` | Hakkımızda |
| `urunler.html` | Ürünler (kategori filtresiyle 69 ürün, 24’er gösterim) |
| `urun.html` | Ürün detay şablonu (NAD+ Peptide Serum) |
| `laboratuvar.html` | Laboratuvarımız ve lipozom teknolojisi |
| `blog.html` | Blog listesi |
| `iletisim.html` | İletişim formu ve adres |

Görseller ve logo `assets/` klasöründedir. Ortak davranışlar (imleç, mıknatıslı butonlar, kaydırma efektleri, menü, formlar, ürün filtresi, WebGL) `assets/site.js` içindedir. Yazı tipi Poppins, Google Fonts üzerinden yüklenir.

## Yerelde açmak

```bash
python3 -m http.server 8000
```

Ardından tarayıcıda `http://localhost:8000` adresini açın.

## Yayın

Site GitHub Pages ile yayınlanır: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**. Adres: `https://serkankucukfirat.github.io/playskin-web/`

## Bilinen eksikler

- Formlar (bülten ve iletişim) henüz bir sunucuya bağlı değil; gönderimde yalnızca teşekkür mesajı gösterilir.
- Ürün detay sayfası tek şablondur; diğer ürünler bu sayfaya bağlanır.
- Blog yazılarının kendi sayfaları yok.
- Görseller katalog PDF'inden alındı; yüksek çözünürlüklü orijinaller gelince `assets/` içindeki dosyalarla değiştirilmeli.
- Laboratuvar sayfasındaki "Bilim, Etik, Sürdürülebilirlik" metinleri onay bekliyor.

## Ana sayfa deneyimi (`assets/lab/`)

Tek bir three.js (r160, jsDelivr) sahnesi sayfa boyunca yaşar; kaydırma bir zaman çizelgesini sürer (`lab.js` içindeki `S1`…`S7`).

| Bölüm | Sahne |
|---|---|
| Açılış | Cam damlanın içinde Pink Cleansing Mist; kamera yaklaşır, şişe dönerek etiketi gösterir, damlanın içine girilir |
| Ürünlerin dünyası | Pink Mist → Vitamin C → NAD⁺; damla mercek olur, ürün merceğin arkasında değişir, atmosfer rengi ürünle değişir |
| Doku | Serum damlası düşer, cilt yüzeyinde dalga, krem yayılır, mist bulutu |
| Formül | Lipozom 3D kesiti (temsili), etiketler sırayla açılır |
| Rutin | İhtiyaç seçimi → rutin kartları (`products.json`) |
| Ürünle tanış | Seçilen ürün; Kullanım / İçerik / Detay sekmeleri |
| Işık ritüeli | Karanlık sahne, LED renkleri sırayla |

- Ürün şişeleri playskin.com.tr'deki 2400 px ambalaj görsellerinden kesildi ve silindire sarıldı; etiket birebir korunur.
- `products.json` playskin.com.tr ürün sayfalarından alındı. Rutin eşleştirmeleri örnektir, onay bekler.
- LED maske için ürün bilgisi yok; bölümde yer tutucu metin var.
- WebGL yoksa yazılar ve rutin yine çalışır; açılışta düz ürün görseli gösterilir.
