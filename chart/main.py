import requests
import csv
import datetime
import time

def log_message(message):
    print(message)
    with open("log.txt", "a", encoding="utf-8") as logfile:
        logfile.write(f"{datetime.datetime.now()}: {message}\n")

API_KEY = 'rQ8e6vWpK51Y1Bp8pX1pSPkIXY2h2Lpr'

tickers = [

    "BKNG", "BKR", "BMY", "C", "CAT", "CCI",
    "CI", "CL", "CMCSA", "CME", "COST", "COF", "COP", "CSX", "CTAS", "CTSH",
    "CVS", "CVX", "DD", "DHR", "DLR", "DOW", "EBAY", "EL", "EMR", "EQIX",
    "ETN", "EXC", "EXPE", "FDX", "FIS", "FISV", "FTNT", "GD", "GE", "GILD",
    "GM", "GOOG", "GS", "HAL", "HON", "IBM", "ICE", "ILMN", "ISRG", "ITW",
    "KLAC", "KMB", "LHX", "LMT", "LRCX", "LOW", "LULU", "MAR", "MCO", "MDLZ",
    "MDT", "MET", "MNST", "MO", "MS", "MSI", "MTCH", "NEE", "NFLX", "NOW",
    "NSC", "NTAP", "NUE", "ORCL", "PANW", "PAYX", "PCAR", "PLD", "PYPL", "REGN",
    "RMD", "ROST", "RTX", "SCHW", "SBUX", "SNPS", "SO", "SPG", "SYK", "TMO",
    "TMUS", "TRV",  "UBER", "UPS", "VRTX", "WBA", "WELL", "ZTS"
]
 # İstediğin kadar sembol ekleyebilirsin
multiplier = 5
timespan = 'minute'

start_date_str = '2023-09-11'
start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
end_date = datetime.date.today()

for ticker in tickers:
    filename = f"{ticker}_5min_{start_date_str}_to_{end_date}.csv"

    with open(filename, 'w', newline='') as csvfile:
        fieldnames = ['datetime', 'open', 'high', 'low', 'close', 'volume', 'date']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() < 5:
            date_str = current_date.strftime('%Y-%m-%d')
            log_message(f"\n{ticker} - {date_str} için veriler çekilmeye başlanıyor...")
            attempts = 0
            success = False
            while attempts < 3:
                attempts += 1
                log_message(f"{ticker} - {date_str} için istekte bulunuluyor... (Deneme {attempts})")
                url = (
                    f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/"
                    f"{date_str}/{date_str}?adjusted=true&sort=asc&limit=50000&apiKey={API_KEY}"
                )
                try:
                    response = requests.get(url)
                    data = response.json()
                except Exception as e:
                    log_message(f"{ticker} - {date_str} için JSON parse hatası: {e}")
                    log_message("90 saniye bekleniyor ve aynı tarih için tekrar denenecek...")
                    time.sleep(90)
                    continue

                if 'error' in data:
                    log_message(f"{ticker} - {date_str} için hata alındı: {data['error']}")
                    log_message("90 saniye bekleniyor ve aynı tarih için tekrar denenecek...")
                    time.sleep(90)
                    continue

                if data.get('status', '').upper() != 'OK':
                    log_message(f"{ticker} - {date_str} için geçersiz durum: {data}")
                    log_message("90 saniye bekleniyor ve tekrar denenecek...")
                    time.sleep(90)
                    continue

                if 'results' in data:
                    if len(data['results']) > 0:
                        with open(filename, 'a', newline='') as csvfile:
                            writer = csv.DictWriter(csvfile, fieldnames=['datetime', 'open', 'high', 'low', 'close', 'volume', 'date'])
                            for bar in data['results']:
                                dt = datetime.datetime.fromtimestamp(bar['t'] / 1000).strftime('%Y-%m-%d %H:%M:%S')
                                writer.writerow({
                                    'datetime': dt,
                                    'open': bar['o'],
                                    'high': bar['h'],
                                    'low': bar['l'],
                                    'close': bar['c'],
                                    'volume': bar['v'],
                                    'date': date_str
                                })
                        log_message(f"{ticker} - {date_str} için veri çekildi (sonuç sayısı: {len(data['results'])}).")
                    else:
                        log_message(f"{ticker} - {date_str} için sonuç boş döndü. Bu tarih için veri olmayabilir.")
                    success = True
                    break
                else:
                    log_message(f"{ticker} - {date_str} için beklenmeyen yanıt alındı: {data}")
                    log_message("90 saniye bekleniyor ve tekrar denenecek...")
                    time.sleep(90)
                    continue

            if not success:
                log_message(f"{ticker} - {date_str} için 3 deneme sonunda geçerli veri alınamadı, bu tarih atlanıyor.")
        else:
            log_message(f"{ticker} - {current_date} hafta sonu olduğu için atlanıyor.")
        current_date += datetime.timedelta(days=1)

    log_message(f"\n{ticker} verileri {filename} dosyasına kaydedildi.")