# Hisse Senedi Grafik Analizi — Bitirme Projesi: Veri Toplama ve Rapor

Sakarya Üniversitesi Bilgisayar Mühendisliği bitirme projesinin **veri toplama ve görselleştirme** ayağı. Proje, mum grafiği görselini ve sayısal göstergeleri birlikte işleyen hibrit bir CNN ile hisse yönünü tahmin ediyor. Model, cihaz üzerinde çalışan mobil uygulamada kullanılıyor ([MyYapayApp](https://github.com/KursadEren/MyYapayApp)).

## İçerik

| Yol | Ne yapar |
|---|---|
| `chart/main.py` | Polygon.io API'sinden ~100 ABD hissesinin **5 dakikalık OHLCV** verisini indirir (2023-09-11 → bugün). Hafta sonlarını atlar, başarısız istekleri 3 kez dener, `log.txt`'ye yazar. Her hisse için bir CSV üretir. |
| `chart/*.csv` | İndirilmiş örnek veri (ADBE, AMZN, APH, …). Sütunlar: `datetime, open, high, low, close, volume, date`. |
| `chart/my-app/` | CSV'yi okuyup **TradingView lightweight-charts** ile mum grafiği çizen React uygulaması. Veri setindeki grafiklerin nasıl göründüğünü kontrol etmek için kullanılır. |
| `bitirme.pdf` / `.docx` / `.pages` | Bitirme raporu. |
| `MyApp`, `goruntuisleme` | Bağlantısı kopuk eski alt modül işaretçileri, içerikleri bu repoda yok. Mobil uygulama için [MyYapayApp](https://github.com/KursadEren/MyYapayApp) reposuna bak. |

## Proje zinciri

`ArtificalIntel` (veri indirme) → [my-appBitirme](https://github.com/KursadEren/my-appBitirme) (grafik görsellerinden veri seti üretme) → model eğitimi (PyTorch → ONNX, 43 MB → 11 MB nicemleme) → [MyYapayApp](https://github.com/KursadEren/MyYapayApp) (cihaz üzerinde çıkarım).

## Çalıştırma

```bash
# Veri indirme
pip install requests
export POLYGON_API_KEY=anahtarin   # anahtarı koda yazma
cd chart && python3 main.py

# Grafik görüntüleyici
cd chart/my-app && npm install && npm start
```

> Not: Bu repoda daha önce açıkta bir Polygon.io anahtarı vardı. Git geçmişi temizlendi ve kod artık anahtarı `POLYGON_API_KEY` ortam değişkeninden okuyor.
