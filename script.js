let allGoldData = [];
const chartColors = ['#d4af37', '#38bdf8', '#10b981', '#f97316', '#a78bfa', '#ef4444', '#14b8a6', '#f472b6'];
let trendChart;
let trendSeries = [];
let chartState = {
    range: '7D',
    interval: 'hour'
};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard().catch(err => {
        console.error('Initial Load Error:', err);
        showError();
    });
});

async function initDashboard() {
    console.log('Initializing Dashboard...');
    const response = await fetch(`data/gold_prices.json?v=${Date.now()}`);
    if (!response.ok) throw new Error('Data file not found');
    
    allGoldData = await response.json();
    if (!allGoldData || !Array.isArray(allGoldData) || allGoldData.length === 0) {
        console.warn('Data is empty or invalid format');
        return;
    }

    // Sort by timestamp (newest first)
    allGoldData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const latest = allGoldData[0];
    const previous = allGoldData.length > 1 ? allGoldData[1] : null;

    renderCharts(allGoldData);
    updateHeroStats(latest, previous);
    populateFilters();
    renderInitialTable();

    // Add Filter Event
    const filterBtn = document.getElementById('apply-filters');
    if (filterBtn) {
        filterBtn.addEventListener('click', applyFilters);
    }
    setupChartControls();

    window.addEventListener('resize', debounce(() => {
        renderCharts(getFilteredDays(), getSelectedBrand());
    }, 150));
}

function getSelectedBrand() {
    return document.getElementById('brand-filter')?.value || 'all';
}

function getFilteredDays() {
    const fromDate = document.getElementById('date-from')?.value;
    const toDate = document.getElementById('date-to')?.value;

    return allGoldData.filter(day => {
        return (!fromDate || day.date >= fromDate) && (!toDate || day.date <= toDate);
    });
}

function debounce(fn, wait) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

function renderCharts(days, brand = 'all') {
    renderBrandComparison(days, brand);
    drawTrendChart(days, brand);
}

function formatMillions(value) {
    return `${(value / 1000).toFixed(1)}M`;
}

function formatChartTime(time) {
    if (!time) return 'Latest point';

    if (typeof time === 'number') {
        return new Date(time * 1000).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    const dateText = typeof time === 'string'
        ? time
        : `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;

    return new Date(`${dateText}T00:00:00`).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatAxisTime(time) {
    if (typeof time === 'number') {
        const date = new Date(time * 1000);
        return chartState.interval === 'hour'
            ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }

    const dateText = typeof time === 'string'
        ? time
        : `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;

    return chartState.interval === 'month'
        ? new Date(`${dateText}T00:00:00`).toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' })
        : new Date(`${dateText}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getLatestEntries(days, brand) {
    const latestDay = days.find(day => day.entries?.length);
    if (!latestDay) return [];

    return latestDay.entries
        .filter(entry => brand === 'all' || entry.brand === brand)
        .sort((a, b) => b.sell - a.sell);
}

function renderBrandComparison(days, brand = 'all') {
    const container = document.getElementById('brand-comparison');
    if (!container) return;

    const entries = getLatestEntries(days, brand);
    if (!entries.length) {
        container.innerHTML = '<div class="empty-state">No data available</div>';
        return;
    }

    const maxValue = Math.max(...entries.flatMap(entry => [entry.buy, entry.sell])) * 1.08;
    container.innerHTML = entries.map(entry => {
        const buyWidth = Math.max(4, entry.buy / maxValue * 100);
        const sellWidth = Math.max(4, entry.sell / maxValue * 100);
        const spread = entry.sell - entry.buy;

        return `
            <div class="brand-row">
                <div class="brand-name">${entry.brand}</div>
                <div class="brand-bars">
                    <div class="mini-bar buy"><span style="width: ${buyWidth}%"></span></div>
                    <div class="mini-bar sell"><span style="width: ${sellWidth}%"></span></div>
                </div>
                <div class="brand-price">
                    <strong>${formatMillions(entry.sell)}</strong>
                    Buy ${formatMillions(entry.buy)} | Spread ${formatMillions(spread)}
                </div>
            </div>
        `;
    }).join('');
}

function setupChartControls() {
    document.querySelectorAll('#range-controls button').forEach(button => {
        button.addEventListener('click', () => {
            setActiveControl('#range-controls', button);
            chartState.range = button.dataset.range;
            renderCharts(getFilteredDays(), getSelectedBrand());
        });
    });

    document.querySelectorAll('#interval-controls button').forEach(button => {
        button.addEventListener('click', () => {
            setActiveControl('#interval-controls', button);
            chartState.interval = button.dataset.interval;
            renderCharts(getFilteredDays(), getSelectedBrand());
        });
    });
}

function setActiveControl(groupSelector, activeButton) {
    document.querySelectorAll(`${groupSelector} button`).forEach(button => {
        button.classList.toggle('active', button === activeButton);
    });
}

function getChartDays(days) {
    const chronological = [...days]
        .filter(day => day.entries?.length)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (chartState.range === 'ALL' || !chronological.length) {
        return chronological;
    }

    const latestTime = new Date(chronological[chronological.length - 1].timestamp).getTime();
    const rangeDays = chartState.range === '1D' ? 1 : chartState.range === '7D' ? 7 : 31;
    const fromTime = latestTime - rangeDays * 24 * 60 * 60 * 1000;
    return chronological.filter(day => new Date(day.timestamp).getTime() >= fromTime);
}

function bucketKey(timestamp, interval) {
    const date = new Date(timestamp);
    if (interval === 'month') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    }
    if (interval === 'day') {
        return date.toISOString().slice(0, 10);
    }
    return Math.floor(date.getTime() / 1000);
}

function aggregatePoints(points, interval) {
    if (interval === 'hour') {
        return points.map(point => ({
            time: bucketKey(point.timestamp, interval),
            value: point.sell / 1000
        }));
    }

    const buckets = new Map();
    points.forEach(point => {
        const key = bucketKey(point.timestamp, interval);
        const bucket = buckets.get(key) || { total: 0, count: 0 };
        bucket.total += point.sell / 1000;
        bucket.count += 1;
        buckets.set(key, bucket);
    });

    return [...buckets.entries()].map(([time, bucket]) => ({
        time,
        value: Number((bucket.total / bucket.count).toFixed(3))
    }));
}

function buildTrendSeries(days, brand) {
    const chartDays = getChartDays(days);
    const brandSet = new Set();

    chartDays.forEach(day => {
        day.entries?.forEach(entry => {
            if (brand === 'all' || entry.brand === brand) brandSet.add(entry.brand);
        });
    });

    const brands = [...brandSet].slice(0, brand === 'all' ? 6 : 1);
    return brands.map((brandName, index) => {
        const rawPoints = chartDays
            .map(day => {
                const entry = day.entries?.find(item => item.brand === brandName);
                return entry ? { timestamp: day.timestamp, sell: entry.sell } : null;
            })
            .filter(Boolean);

        return {
            brand: brandName,
            color: chartColors[index % chartColors.length],
            points: aggregatePoints(rawPoints, chartState.interval)
        };
    }).filter(series => series.points.length);
}

function drawTrendChart(days, brand = 'all') {
    const container = document.getElementById('trend-chart');
    if (!container) return;

    if (!window.LightweightCharts) {
        container.innerHTML = '<div class="empty-state">Chart library is loading...</div>';
        return;
    }

    if (!trendChart) {
        trendChart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { color: 'rgba(3, 7, 18, 0)' },
                textColor: '#9ca3af',
                fontFamily: 'Outfit, sans-serif'
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.06)' }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.08)'
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.08)',
                timeVisible: chartState.interval === 'hour',
                secondsVisible: false,
                tickMarkFormatter: formatAxisTime
            },
            localization: {
                timeFormatter: formatChartTime
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: false
            }
        });

        trendChart.subscribeCrosshairMove(updateLegendFromCrosshair);
    } else {
        trendChart.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
            timeScale: {
                timeVisible: chartState.interval === 'hour',
                secondsVisible: false,
                tickMarkFormatter: formatAxisTime
            },
            localization: {
                timeFormatter: formatChartTime
            }
        });
    }

    trendSeries.forEach(series => trendChart.removeSeries(series.instance));
    trendSeries = [];
    const seriesList = buildTrendSeries(days, brand);
    if (!seriesList.length) {
        updateLegend([]);
        return;
    }

    trendSeries = seriesList.map(series => {
        const instance = trendChart.addLineSeries({
            color: series.color,
            lineWidth: 2,
            lastValueVisible: true,
            priceLineVisible: false,
            priceFormat: {
                type: 'custom',
                formatter: value => `${value.toFixed(2)}M`
            }
        });
        instance.setData(series.points);
        return { ...series, instance };
    });

    updateLegend(trendSeries);
    trendChart.timeScale().fitContent();
}

function getLatestSeriesTime(seriesList) {
    const lastTimes = seriesList
        .map(series => series.points[series.points.length - 1]?.time)
        .filter(Boolean);

    return lastTimes[lastTimes.length - 1];
}

function updateLegend(seriesList, prices = new Map(), activeTime = null) {
    const legend = document.getElementById('chart-legend');
    const timeValue = document.getElementById('chart-time-value');
    if (!legend) return;

    if (!seriesList.length) {
        legend.innerHTML = '<span class="empty-state">No chart data in this range</span>';
        if (timeValue) timeValue.textContent = 'No chart data';
        return;
    }

    const timeLabel = formatChartTime(activeTime || getLatestSeriesTime(seriesList));
    if (timeValue) timeValue.textContent = timeLabel;

    const seriesHtml = seriesList.map(series => {
        const price = prices.get(series.instance);
        const fallback = series.points[series.points.length - 1]?.value;
        const value = typeof price === 'number' ? price : price?.value ?? fallback;

        return `
            <span class="legend-item">
                <span class="legend-dot" style="background: ${series.color}"></span>
                ${series.brand} <strong>${Number(value).toFixed(2)}M</strong>
            </span>
        `;
    }).join('');

    legend.innerHTML = seriesHtml;
}

function updateLegendFromCrosshair(param) {
    if (!param?.time || !param.seriesData) {
        updateLegend(trendSeries);
        return;
    }

    updateLegend(trendSeries, param.seriesData, param.time);
}

function updateHeroStats(latest, previous) {
    if (!latest || !latest.entries) return;

    const brandConfigs = [
        { id: 'sjc', name: 'SJC' },
        { id: 'doji', name: 'DOJI HN' },
        { id: 'pnj', name: 'PNJ TP.HCM' }
    ];

    brandConfigs.forEach(config => {
        const latestEntry = latest.entries.find(e => e.brand === config.name);
        const valEl = document.getElementById(`${config.id}-val`);
        
        if (latestEntry && valEl) {
            valEl.textContent = formatPrice(latestEntry.sell);
            
            // Try to find previous entry for this specific brand
            const prevEntry = previous ? previous.entries.find(e => e.brand === config.name) : null;
            
            const card = valEl.closest('.glass-card');
            const changeEl = card ? card.querySelector('.stat-change') : null;
            
            if (changeEl && prevEntry) {
                const diff = latestEntry.sell - prevEntry.sell;
                const percent = (diff / latestEntry.sell) * 100;
                
                if (diff > 0) {
                    changeEl.textContent = `+${diff.toLocaleString()} VND (+${percent.toFixed(2)}%)`;
                    changeEl.className = 'stat-change price-up-badge'; // We'll add this class
                    changeEl.style.color = '#10b981';
                } else if (diff < 0) {
                    changeEl.textContent = `${diff.toLocaleString()} VND (${percent.toFixed(2)}%)`;
                    changeEl.style.color = '#ef4444';
                } else {
                    changeEl.textContent = 'Stable';
                    changeEl.style.color = '#9ca3af';
                }
            }
        }
    });
}

function populateFilters() {
    const brandSelect = document.getElementById('brand-filter');
    if (!brandSelect) return;

    const brandSet = new Set();
    allGoldData.forEach(day => {
        if (day.entries) {
            day.entries.forEach(entry => brandSet.add(entry.brand));
        }
    });

    // Clear existing (except "All")
    brandSelect.innerHTML = '<option value="all">All Brands</option>';

    [...brandSet].sort().forEach(brandName => {
        const option = document.createElement('option');
        option.value = brandName;
        option.textContent = brandName;
        brandSelect.appendChild(option);
    });

    // Set default dates
    const dateFromEl = document.getElementById('date-from');
    const dateToEl = document.getElementById('date-to');
    
    if (allGoldData.length > 0) {
        const dates = allGoldData.map(d => d.date).filter(Boolean).sort();
        if (dateFromEl) dateFromEl.value = dates[0];
        if (dateToEl) dateToEl.value = dates[dates.length - 1];
    }
}

function applyFilters() {
    const brand = getSelectedBrand();
    const filteredDays = getFilteredDays();

    const dataForTable = [];
    filteredDays.forEach(day => {
        const entries = day.entries.filter(e => brand === 'all' || e.brand === brand);
        
        entries.forEach(entry => {
            // Finding delta for specific brand
            const dayIdx = allGoldData.findIndex(d => d.timestamp === day.timestamp);
            const prevDayWithBrand = allGoldData.slice(dayIdx + 1).find(d => 
                d.entries.some(e => e.brand === entry.brand)
            );
            
            const prevEntry = prevDayWithBrand ? prevDayWithBrand.entries.find(e => e.brand === entry.brand) : null;
            const diff = prevEntry ? entry.sell - prevEntry.sell : 0;

            dataForTable.push({
                time: day.timestamp,
                brand: entry.brand,
                buy: entry.buy,
                sell: entry.sell,
                diff: diff
            });
        });
    });

    renderCharts(filteredDays, brand);
    renderDataTableFromList(dataForTable);
}

function renderInitialTable() {
    // Show top 20 latest entries across all brands
    const rows = [];
    allGoldData.slice(0, 5).forEach(day => {
        if (day.entries) {
            day.entries.forEach(entry => {
                const dayIdx = allGoldData.findIndex(d => d.timestamp === day.timestamp);
                const prevDayWithBrand = allGoldData.slice(dayIdx + 1).find(d => 
                    d.entries.some(e => e.brand === entry.brand)
                );
                const prevEntry = prevDayWithBrand ? prevDayWithBrand.entries.find(e => e.brand === entry.brand) : null;
                const diff = prevEntry ? entry.sell - prevEntry.sell : 0;

                rows.push({
                    time: day.timestamp,
                    brand: entry.brand,
                    buy: entry.buy,
                    sell: entry.sell,
                    diff: diff
                });
            });
        }
    });
    renderDataTableFromList(rows.slice(0, 30));
}

function renderDataTableFromList(rows) {
    const tbody = document.getElementById('data-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted)">No data found matching your filters.</td></tr>';
        return;
    }

    rows.forEach(row => {
        const tr = document.createElement('tr');
        const diffClass = row.diff > 0 ? 'price-up' : (row.diff < 0 ? 'price-down' : '');
        const diffIcon = row.diff > 0 ? '▲' : (row.diff < 0 ? '▼' : '•');
        
        tr.innerHTML = `
            <td style="color: var(--text-muted); font-size: 0.85rem;">${row.time}</td>
            <td><span class="brand-tag">${row.brand}</span></td>
            <td class="price-up">${(row.buy / 1000).toFixed(2)}</td>
            <td class="price-down">${(row.sell / 1000).toFixed(2)}</td>
            <td><span class="${diffClass}">${diffIcon} ${Math.abs(row.diff).toLocaleString()}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function formatPrice(val) {
    if (val === undefined || val === null) return 'N/A';
    return (val / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 1 }) + 'M';
}

function showError() {
    const ids = ['sjc-val', 'doji-val', 'pnj-val'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'Error';
    });
}
