let allGoldData = [];

document.addEventListener('DOMContentLoaded', () => {
    initDashboard().catch(err => {
        console.error('Initial Load Error:', err);
        showError();
    });
});

async function initDashboard() {
    console.log('Initializing Dashboard...');
    const response = await fetch('data/gold_prices.json');
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

    updateHeroStats(latest, previous);
    populateFilters();
    renderInitialTable();

    // Add Filter Event
    const filterBtn = document.getElementById('apply-filters');
    if (filterBtn) {
        filterBtn.addEventListener('click', applyFilters);
    }
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
    const brand = document.getElementById('brand-filter')?.value || 'all';
    const fromDate = document.getElementById('date-from')?.value;
    const toDate = document.getElementById('date-to')?.value;

    const filteredDays = allGoldData.filter(day => {
        const matchesDate = (!fromDate || day.date >= fromDate) && (!toDate || day.date <= toDate);
        return matchesDate;
    });

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
