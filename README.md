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

Tek bir three.js (r160, jsDelivr) sahnesi sayfa boyunca yaşar; kaydırma gecikmesiz bir zaman çizelgesini sürer (`lab.js`).

| Bölüm | İçerik |
|---|---|
| Açılış | Parlak zeminde dev Pink Cleansing Mist, mist püskürmesi; kamera yaklaşır, şişe dönerek etiketi gösterir |
| Ürünlerin dünyası | Pink Mist → Vitamin C → NAD⁺ → CC Cream; ürünler ışık taramasıyla değişir, atmosfer ürün rengini alır |
| Kampanyalar | playskin.com.tr slider bannerları (web/mobil) + LED Face Mask video slaytı |
| Doku | Serum damlası, cilt yüzeyinde dalga, krem, mist |
| Formül | Lipozom 3D kesiti (temsili), etiketler sırayla |
| Playskin dünyası | Yatay akan editoryal galeri (Drive'daki çekimler, CC Cream videosu) |
| Playskin'de yeni | Derma Calm videosu + 'Playskin'de yeni' slider ürünleri |
| Rutin / Ürünle tanış | İhtiyaç seçimi, `products.json` |
| LED Face Mask | Video kaydırmayla oynar; renk adları videodaki ışıkla eşzamanlı |

- Şişeler playskin.com.tr ve Drive'daki ambalaj görsellerinden kesildi; etiket birebir korunur.
- Videolar `assets/lab/video/` içinde, kaydırmayla sarılabilmesi için sık anahtar kare ile kodlandı.
- Rutin eşleştirmeleri örnektir, onay bekler.
