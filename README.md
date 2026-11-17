# Playskin web sitesi

Playskin için hazırlanan yeni, animasyonlu web sitesi. Düz HTML, CSS ve tek bir JavaScript dosyasıyla çalışır; derleme adımı yoktur.

## Sayfalar

| Dosya | Sayfa |
|---|---|
| `index.html` | Ana sayfa (WebGL krom molekül sahnesi, ürün galerisi, lipozom bölümü) |
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
