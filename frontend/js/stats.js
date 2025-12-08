// stats.js
import { allRequests } from './requests.js';

let responseTimeChart;
let statusChart;

export function renderStatsCharts() {
    // Destroy existing charts if they exist to prevent duplicates
    if (responseTimeChart) {
        responseTimeChart.destroy();
    }
    if (statusChart) {
        statusChart.destroy();
    }

    // --- Response Time Distribution Chart ---
    const responseTimeCtx = document.getElementById('responseTimeChartModal').getContext('2d');
    
    // Generate dummy data for response times (replace with actual data later)
    // For now, let's assume allRequests has 'duration' in ms
    const responseTimes = allRequests.map(req => parseFloat(req.duration.replace('ms', '')));
    
    const lessThan200ms = responseTimes.filter(time => time < 200).length;
    const between200and500ms = responseTimes.filter(time => time >= 200 && time <= 500).length;
    const greaterThan500ms = responseTimes.filter(time => time > 500).length;

    responseTimeChart = new Chart(responseTimeCtx, {
        type: 'bar',
        data: {
            labels: ['< 200ms', '200-500ms', '> 500ms'],
            datasets: [{
                label: 'Number of Requests',
                data: [lessThan200ms, between200and500ms, greaterThan500ms],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.6)', // Green for <200ms
                    'rgba(245, 158, 11, 0.6)', // Yellow for 200-500ms
                    'rgba(239, 68, 68, 0.6)'   // Red for >500ms
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Requests'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Response Time'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Legend is handled by HTML
                },
                title: {
                    display: false
                }
            }
        }
    });

    // --- Status Codes Chart ---
    const statusCtx = document.getElementById('statusChartModal').getContext('2d');

    // Generate dummy data for status codes (replace with actual data later)
    const statusCounts = {};
    allRequests.forEach(req => {
        const status = req.status;
        const statusCategory = status.startsWith('2') ? '2xx Success' :
                               status.startsWith('3') ? '3xx Redirection' :
                               status.startsWith('4') ? '4xx Client Error' :
                               status.startsWith('5') ? '5xx Server Error' :
                               'Other';
        statusCounts[statusCategory] = (statusCounts[statusCategory] || 0) + 1;
    });

    const statusLabels = Object.keys(statusCounts);
    const statusData = Object.values(statusCounts);
    const statusColors = [
        'rgba(16, 185, 129, 0.7)', // 2xx Green
        'rgba(59, 130, 246, 0.7)', // 3xx Blue
        'rgba(245, 158, 11, 0.7)', // 4xx Orange
        'rgba(239, 68, 68, 0.7)',   // 5xx Red
        'rgba(107, 114, 128, 0.7)'  // Other Gray
    ];

    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: statusLabels,
            datasets: [{
                data: statusData,
                backgroundColor: statusColors,
                borderColor: 'var(--background-color)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'var(--text-color)',
                        font: {
                            family: 'Inter, sans-serif'
                        }
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });

    // Update the stat cards with current aggregated data
    updateStatCards();
}

export function updateStatCards() {
    const totalRequests = allRequests.length;
    document.querySelector('.stat-card.requests .stat-value').textContent = totalRequests;

    const methodCounts = {};
    allRequests.forEach(req => {
        methodCounts[req.method] = (methodCounts[req.method] || 0) + 1;
    });
    const topMethod = Object.keys(methodCounts).sort((a, b) => methodCounts[b] - methodCounts[a])[0] || 'N/A';
    document.querySelector('.stat-card.methods .stat-value').textContent = topMethod;

    const successRequests = allRequests.filter(req => req.status.startsWith('2')).length;
    const successRate = totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(1) : 0;
    document.querySelector('.stat-card.status .stat-value').textContent = `${successRate}%`;

    const totalDuration = allRequests.reduce((sum, req) => sum + parseFloat(req.duration.replace('ms', '')), 0);
    const avgResponseTime = totalRequests > 0 ? (totalDuration / totalRequests).toFixed(0) : 0;
    document.querySelector('.stat-card.performance .stat-value').textContent = `${avgResponseTime}ms`;
}
