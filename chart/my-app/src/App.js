import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { createChart, CrosshairMode } from 'lightweight-charts';

// "YYYY-MM-DD" string'ini Date objesine çevirir.
const parseDate = (dateStr) => new Date(dateStr);

// Günlük aggregate: Her günün tüm intraday barlarını tek mumda toplar.
// Açılış: ilk barın açılışı, kapanış: son barın kapanışı,
// En yüksek: gün içindeki en yüksek, en düşük: gün içindeki en düşük,
// Hacim: gün içindeki tüm barların hacmi toplamı.
// time alanını "YYYY-MM-DD" formatında döndürür.
const aggregateDailyData = (rawData) => {
  const grouped = {};
  rawData.forEach(item => {
    const day = item.time.substring(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(item);
  });
  const dailyData = [];
  Object.keys(grouped).forEach(day => {
    const rows = grouped[day];
    rows.sort((a, b) => parseDate(a.time) - parseDate(b.time));
    const open = parseFloat(rows[0].open);
    const close = parseFloat(rows[rows.length - 1].close);
    const high = Math.max(...rows.map(r => parseFloat(r.high)));
    const low = Math.min(...rows.map(r => parseFloat(r.low)));
    const volume = rows.reduce((sum, r) => sum + parseFloat(r.volume), 0);
    dailyData.push({ time: day, open, high, low, close, volume });
  });
  dailyData.sort((a, b) => parseDate(a.time) - parseDate(b.time));
  return dailyData;
};

const aggregateTo10Min = (data) => {
  const result = [];
  const dailyGroups = {};
  data.forEach(row => {
    const d = new Date(row.time);
    if (d.getHours() < 17) { // Sadece saat 17'ye kadar olan veriler
      const day = row.time.substring(0, 10);
      if (!dailyGroups[day]) dailyGroups[day] = [];
      dailyGroups[day].push(row);
    }
  });
  Object.keys(dailyGroups).forEach(day => {
    const rows = dailyGroups[day];
    rows.sort((a, b) => new Date(a.time) - new Date(b.time));
    const buckets = {};
    rows.forEach(row => {
      const d = new Date(row.time);
      const hour = d.getHours();
      const minute = d.getMinutes();
      const bucketMinute = Math.floor(minute / 10) * 10;
      const bucketKey = `${day} ${hour.toString().padStart(2, '0')}:${bucketMinute.toString().padStart(2, '0')}:00`;
      if (!buckets[bucketKey]) buckets[bucketKey] = [];
      buckets[bucketKey].push(row);
    });
    Object.keys(buckets).forEach(bucketKey => {
      const bucketRows = buckets[bucketKey];
      bucketRows.sort((a, b) => new Date(a.time) - new Date(b.time));
      const open = parseFloat(bucketRows[0].open);
      const close = parseFloat(bucketRows[bucketRows.length - 1].close);
      const high = Math.max(...bucketRows.map(r => parseFloat(r.high)));
      const low = Math.min(...bucketRows.map(r => parseFloat(r.low)));
      const volume = bucketRows.reduce((sum, r) => sum + parseFloat(r.volume), 0);
      const time = new Date(bucketKey).getTime() / 1000;
      result.push({ time, open, high, low, close, volume });
    });
  });
  result.sort((a, b) => a.time - b.time);
  return result;
};

const App = () => {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [intradayDataSet, setIntradayDataSet] = useState({ aggregated: [], detailed: [] });
  // aggregationMode: 'annual', 'monthly', '5-day', 'detailed'
  const [aggregationMode, setAggregationMode] = useState('annual');
  const [errorMessage, setErrorMessage] = useState('');
  const stockCode = "AAPL";

  useEffect(() => {
    if (chartContainerRef.current) {
      chartInstanceRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 600,
        layout: {
          backgroundColor: '#ffffff',
          textColor: '#000000',
        },
        grid: {
          vertLines: { color: '#eee' },
          horzLines: { color: '#eee' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: { borderColor: '#ccc' },
        timeScale: {
          borderColor: '#ccc',
          timeVisible: true,
          secondsVisible: false,
          barSpacing: 10,
        },
      });

      candlestickSeriesRef.current = chartInstanceRef.current.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      volumeSeriesRef.current = chartInstanceRef.current.addHistogramSeries({
        color: '#26a69a',
        lineWidth: 2,
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });

      const csvFilePath = '/AAPL_5min_2023-09-11_to_2025-04-01.csv';
      Papa.parse(csvFilePath, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          const validRows = results.data.filter(row =>
            row.datetime && row.open && row.high && row.low && row.close && row.volume && row.date
          );
          const detailedData = validRows.map(row => ({
            time: row.datetime,
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            volume: parseFloat(row.volume),
          }));
          const aggregatedData = aggregateDailyData(detailedData);
          setIntradayDataSet({ aggregated: aggregatedData, detailed: detailedData });
          // 5-day modunda aggregated veriyi kullanıyoruz
          updateChartData('5-day', { aggregated: aggregatedData, detailed: detailedData });
        },
        error: function (err) {
          console.error('CSV dosyası yüklenirken hata oluştu:', err);
          setErrorMessage('CSV dosyası yüklenirken hata oluştu.');
        },
      });

      const handleResize = () => {
        if (chartContainerRef.current && chartInstanceRef.current) {
          chartInstanceRef.current.resize(chartContainerRef.current.clientWidth, 600);
        }
      };
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartInstanceRef.current) {
          chartInstanceRef.current.remove();
        }
      };
    }
  }, []);

  // 5-day modunda aggregated daily veriyi kullanıyoruz
  const updateChartData = (mode, dataSet) => {
    let dataToSet;
    if (mode === '5-day') {
      dataToSet = dataSet.aggregated;
      chartInstanceRef.current.timeScale().fitContent();
    } else if (mode === 'detailed') {
      dataToSet = aggregateTo10Min(dataSet.detailed);
      chartInstanceRef.current.timeScale().fitContent();
    } else if (mode === 'annual' || mode === 'monthly') {
      dataToSet = dataSet.aggregated;
      chartInstanceRef.current.timeScale().fitContent();
    }
  
    if (!dataToSet || dataToSet.length === 0) {
      setErrorMessage('Seçilen görünüm için yeterli veri yok.');
      return;
    }
    setErrorMessage('');
    candlestickSeriesRef.current.setData(dataToSet);
    const volumeData = dataToSet.map(item => ({
      time: item.time,
      value: item.volume,
      color: item.close >= item.open ? 'rgba(38,166,154, 0.5)' : 'rgba(239,83,80, 0.5)',
    }));
    volumeSeriesRef.current.setData(volumeData);
  };

  // Otomatik ekran görüntüsü fonksiyonu: aggregated daily veriyi 5 günlük pencere halinde ayırır.
  const captureAllScreenshots = async () => {
    if (!intradayDataSet.aggregated || intradayDataSet.aggregated.length === 0) return;
    // Aggregated veriyi tarih sırasına göre sırala (zaten sorted olmalı)
    const aggregatedSorted = [...intradayDataSet.aggregated].sort((a, b) => new Date(a.time) - new Date(b.time));
    let screenshotId = 1000;
    for (let i = 0; i < aggregatedSorted.length; i += 5) {
      const startDateStr = aggregatedSorted[i].time;
      const startTimestamp = new Date(startDateStr).getTime() / 1000;
      let endTimestamp;
      if (i + 4 < aggregatedSorted.length) {
        const endDateStr = aggregatedSorted[i + 4].time;
        // Son günün bitişi: 23:59:59
        endTimestamp = new Date(endDateStr).getTime() / 1000 + 86400 - 1;
      } else {
        const lastDateStr = aggregatedSorted[aggregatedSorted.length - 1].time;
        endTimestamp = new Date(lastDateStr).getTime() / 1000 + 86400 - 1;
      }
      // Ayarlanan 5 günlük pencereyi görünür yap
      chartInstanceRef.current.timeScale().setVisibleRange({ from: startTimestamp, to: endTimestamp });
      // Grafik güncellenmesi için bekle
      await new Promise(resolve => setTimeout(resolve, 1000));
      const canvas = chartContainerRef.current.querySelector('canvas');
      if (canvas) {
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `${stockCode}_${screenshotId}.png`;
        link.href = image;
        link.click();
        screenshotId++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleAggregationChange = (mode) => {
    setAggregationMode(mode);
    updateChartData(mode, intradayDataSet);
    if (mode === '5-day') {
      // 5 Günlük görünüm moduna geçince otomatik ekran görüntülerini al
      setTimeout(() => {
        captureAllScreenshots();
      }, 500);
    }
  };

  return (
    <div style={{ margin: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Hisse Senedi Grafiği</h2>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => handleAggregationChange('annual')} style={{ marginRight: '10px' }}>
          Yıllık Görünüm
        </button>
        <button onClick={() => handleAggregationChange('monthly')} style={{ marginRight: '10px' }}>
          Aylık Görünüm
        </button>
        <button onClick={() => handleAggregationChange('5-day')} style={{ marginRight: '10px' }}>
          5 Günlük Görünüm (Otomatik Ekran Görüntüsü)
        </button>
        <button onClick={() => handleAggregationChange('detailed')}>
          Detaylı Günlük Görünüm
        </button>
      </div>
      {errorMessage && <div style={{ color: 'red', marginBottom: '10px' }}>{errorMessage}</div>}
      <div ref={chartContainerRef} style={{ width: '100%', height: '600px' }} />
    </div>
  );
};

export default App;