class AdminAnalytics {
    constructor() {
        this.authManager = window.authManager;
        this.charts = {};
        this.currentTimeframe = 'week';
        this.refreshInterval = null;
    }

    async initialize() {
        this.setupEventListeners();
        await this.loadAllAnalytics();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Timeframe selection
        const timeframeButtons = document.querySelectorAll('.timeframe-selector');
        timeframeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.currentTimeframe = button.dataset.timeframe;
                this.loadAllAnalytics();
            });
        });

        // Chart type toggles
        const chartToggles = document.querySelectorAll('.chart-type-toggle');
        chartToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const chartId = e.target.dataset.chartId;
                const chartType = e.target.value;
                this.updateChartType(chartId, chartType);
            });
        });
    }

    async loadAllAnalytics() {
        try {
            const data = await this.fetchAnalyticsData();
            this.renderTransactionMetrics(data.transactions);
            this.renderFinancialMetrics(data.financial);
            this.renderUserMetrics(data.users);
            this.renderCharts(data);
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics data');
        }
    }

    async fetchAnalyticsData() {
        try {
            const response = await axios.get(`/api/admin-dashboard/analytics/${this.currentTimeframe}/`, {
                headers: this.authManager.getAuthHeaders()
            });
            return response.data;
        } catch (error) {
            throw new Error('Failed to fetch analytics data');
        }
    }

    renderTransactionMetrics(data) {
        // Update transaction count metrics
        document.getElementById('totalTransactions').textContent = data.total;
        document.getElementById('successfulTransactions').textContent = data.successful;
        document.getElementById('failedTransactions').textContent = data.failed;
        
        // Update success rate
        const successRate = ((data.successful / data.total) * 100).toFixed(2);
        document.getElementById('successRate').textContent = `${successRate}%`;
        
        // Update trend indicator
        const trendElement = document.getElementById('transactionTrend');
        const trendPercentage = ((data.current - data.previous) / data.previous * 100).toFixed(2);
        trendElement.innerHTML = this.getTrendHTML(trendPercentage);
    }

    renderFinancialMetrics(data) {
        // Update financial metrics
        document.getElementById('totalRevenue').textContent = `₹${data.revenue.toFixed(2)}`;
        document.getElementById('averageTransaction').textContent = `₹${data.average.toFixed(2)}`;
        document.getElementById('pendingSettlements').textContent = `₹${data.pending.toFixed(2)}`;
        
        // Update revenue trend
        const trendElement = document.getElementById('revenueTrend');
        const trendPercentage = ((data.currentRevenue - data.previousRevenue) / data.previousRevenue * 100).toFixed(2);
        trendElement.innerHTML = this.getTrendHTML(trendPercentage);
    }

    renderUserMetrics(data) {
        // Update user metrics
        document.getElementById('totalUsers').textContent = data.total;
        document.getElementById('activeUsers').textContent = data.active;
        document.getElementById('newUsers').textContent = data.new;
        
        // Update user growth trend
        const trendElement = document.getElementById('userGrowthTrend');
        const trendPercentage = ((data.current - data.previous) / data.previous * 100).toFixed(2);
        trendElement.innerHTML = this.getTrendHTML(trendPercentage);
    }

    renderCharts(data) {
        this.renderTransactionChart(data.transactions.timeline);
        this.renderRevenueChart(data.financial.timeline);
        this.renderUserActivityChart(data.users.activity);
        this.renderGeographicalChart(data.geographical);
    }

    renderTransactionChart(data) {
        const ctx = document.getElementById('transactionChart').getContext('2d');
        
        if (this.charts.transaction) {
            this.charts.transaction.destroy();
        }

        this.charts.transaction = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Transactions',
                    data: data.values,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Transaction Volume Over Time'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderRevenueChart(data) {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        this.charts.revenue = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Revenue',
                    data: data.values,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgb(54, 162, 235)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Revenue Distribution'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `₹${value}`
                        }
                    }
                }
            }
        });
    }

    renderUserActivityChart(data) {
        const ctx = document.getElementById('userActivityChart').getContext('2d');
        
        if (this.charts.userActivity) {
            this.charts.userActivity.destroy();
        }

        this.charts.userActivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Active Users',
                    data: data.active,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: 'New Users',
                    data: data.new,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'User Activity Trends'
                    }
                }
            }
        });
    }

    renderGeographicalChart(data) {
        const ctx = document.getElementById('geographicalChart').getContext('2d');
        
        if (this.charts.geographical) {
            this.charts.geographical.destroy();
        }

        this.charts.geographical = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Geographical Distribution'
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    updateChartType(chartId, newType) {
        const chart = this.charts[chartId];
        if (chart) {
            chart.config.type = newType;
            chart.update();
        }
    }

    getTrendHTML(percentage) {
        const isPositive = percentage >= 0;
        return `
            <span class="trend ${isPositive ? 'positive' : 'negative'}">
                <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                ${Math.abs(percentage)}%
            </span>
        `;
    }

    showError(message) {
        const alertElement = document.createElement('div');
        alertElement.className = 'alert alert-danger alert-dismissible fade show';
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.analytics-container').prepend(alertElement);
    }

    startAutoRefresh() {
        // Refresh analytics every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadAllAnalytics();
        }, 5 * 60 * 1000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize analytics when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const analytics = new AdminAnalytics();
    analytics.initialize().catch(error => {
        console.error('Failed to initialize analytics:', error);
    });

    // Make instance available globally
    window.adminAnalytics = analytics;
});
