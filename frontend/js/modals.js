import { currentPacketRequestId } from './packet-details.js';
import { renderStatsCharts } from './stats.js';

export function initModals() {
    // Modal functionality
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModalBtn = document.getElementById('closeModal');
    const statsModalOverlay = document.getElementById('statsModalOverlay');
    const closeStatsModalBtn = document.getElementById('closeStatsModal');
    const statsToggleBtn = document.getElementById('statsToggleBtn'); // Get the toggle button
    const selectRequestModalOverlay = document.getElementById('selectRequestModalOverlay');
    const closeSelectRequestModalBtn = document.getElementById('closeSelectRequestModal');


    closeModalBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });

    closeStatsModalBtn.addEventListener('click', () => {
        statsModalOverlay.classList.remove('active');
    });

    statsModalOverlay.addEventListener('click', (e) => {
        if (e.target === statsModalOverlay) {
            statsModalOverlay.classList.remove('active');
        }
    });

    // Add event listener to open the stats modal
    statsToggleBtn.addEventListener('click', () => {
        statsModalOverlay.classList.add('active');
        renderStatsCharts(); // Render charts when the modal is opened
    });

    const aiAnalysisModalOverlay = document.getElementById('aiAnalysisNewModalOverlay');
    const openAiAnalysisModalBtn = document.getElementById('aiAnalyzeBtn');
    const closeAiAnalysisModalBtn = document.getElementById('closeAiAnalysisNewModal');

    openAiAnalysisModalBtn.addEventListener('click', async () => {
        if (openAiAnalysisModalBtn.classList.contains('disabled')) {
            selectRequestModalOverlay.classList.add('active');
            return;
        }

        if (!currentPacketRequestId) {
            alert('Please select a packet to analyze first.');
            return;
        }

        aiAnalysisModalOverlay.classList.add('active');
        const loadingContainer = aiAnalysisModalOverlay.querySelector('.loading-container');
        const resultsContainer = aiAnalysisModalOverlay.querySelector('.results-container');
        
        // Show loading state
        loadingContainer.style.display = 'flex';
        resultsContainer.style.display = 'none';

        try {
            const response = await fetch(`/api/ai-inspect/${currentPacketRequestId}`);
            const data = await response.json();

            if (response.ok) {
                document.getElementById('securityContent').innerHTML = marked.parse(data.analysis.security);
                document.getElementById('performanceContent').innerHTML = marked.parse(data.analysis.performance);
                document.getElementById('insightsContent').innerHTML = marked.parse(data.analysis.insights);
                document.getElementById('recommendationsContent').innerHTML = marked.parse(data.analysis.recommendations);
            } else {
                throw new Error(data.error || 'Failed to fetch AI analysis.');
            }
        } catch (error) {
            console.error('AI Analysis Error:', error);
            document.getElementById('securityContent').textContent = `Error: ${error.message}`;
            document.getElementById('performanceContent').textContent = 'Could not load analysis.';
            document.getElementById('insightsContent').textContent = 'Could not load analysis.';
            document.getElementById('recommendationsContent').textContent = 'Could not load analysis.';
        } finally {
            // Hide loading and show results
            loadingContainer.style.display = 'none';
            resultsContainer.style.display = 'grid';
            
            // Add .active class to cards to trigger animation
            const cards = resultsContainer.querySelectorAll('.card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('active');
                }, index * 100); // Stagger the animation
            });
        }
    });

    closeAiAnalysisModalBtn.addEventListener('click', () => {
        aiAnalysisModalOverlay.classList.remove('active');
    });

    aiAnalysisModalOverlay.addEventListener('click', (e) => {
        if (e.target === aiAnalysisModalOverlay) {
            aiAnalysisModalOverlay.classList.remove('active');
        }
    });

    const replayModalOverlay = document.getElementById('replayModalOverlay');
    const openReplayModalBtn = document.getElementById('replayBtn');
    const closeReplayModalBtn = document.getElementById('closeReplayModal');
    const cancelReplayBtn = document.getElementById('cancelReplayBtn');
    const sendReplayBtn = document.getElementById('sendReplayBtn');
    const replayInputForm = document.getElementById('replayInputForm');
    const replayResultsDisplay = document.getElementById('replayResultsDisplay');
    const closeReplayResultsBtn = document.getElementById('closeReplayResultsBtn');


    openReplayModalBtn.addEventListener('click', async () => {
        if (openReplayModalBtn.classList.contains('disabled')) {
            selectRequestModalOverlay.classList.add('active');
            return;
        }

        if (!currentPacketRequestId) {
            alert('Please select a request to replay.');
            return;
        }

        // Show input form, hide results display
        replayInputForm.style.display = 'flex';
        replayResultsDisplay.style.display = 'none';

        // Fetch original request details to populate the modal
        try {
            const response = await fetch(`/api/requests/${currentPacketRequestId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch request details.');
            }
            const data = await response.json();

            document.getElementById('replayMethod').value = data.method;
            document.getElementById('replayUrl').value = data.url;
            document.getElementById('replayHeaders').value = JSON.stringify(JSON.parse(data.req_headers), null, 2);
            
            // Decode base64 body before displaying
            const reqBody = data.req_body ? atob(data.req_body) : '';
            document.getElementById('replayBody').value = reqBody;

            replayModalOverlay.classList.add('active');
        } catch (error) {
            console.error('Replay prep error:', error);
            alert(`Error preparing replay: ${error.message}`);
        }
    });

    closeReplayModalBtn.addEventListener('click', () => {
        replayModalOverlay.classList.remove('active');
    });

    cancelReplayBtn.addEventListener('click', () => {
        replayModalOverlay.classList.remove('active');
    });

    replayModalOverlay.addEventListener('click', (e) => {
        if (e.target === replayModalOverlay) {
            replayModalOverlay.classList.remove('active');
        }
    });

    const replayTabs = document.querySelectorAll('.replay-tab');
    const replayTabContents = document.querySelectorAll('.replay-tab-content');

    replayTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            replayTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            replayTabContents.forEach(c => {
                if (c.dataset.tabContent === tabName) {
                    c.classList.add('active');
                } else {
                    c.classList.remove('active');
                }
            });
        });
    });

    sendReplayBtn.addEventListener('click', async () => {
        const originalId = currentPacketRequestId;
        const method = document.getElementById('replayMethod').value;
        const url = document.getElementById('replayUrl').value;
        let headers;
        try {
            headers = JSON.parse(document.getElementById('replayHeaders').value);
        } catch (e) {
            alert('Invalid JSON in headers field.');
            return;
        }
        const body = document.getElementById('replayBody').value;

        // Show loading state (optional, but good UX)
        // For now, just hide input and show a message or go directly to results
        replayInputForm.style.display = 'none';
        replayResultsDisplay.style.display = 'flex'; // Temporarily show to put loading message if needed

        try {
            const response = await fetch('/api/replay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    originalId,
                    method,
                    url,
                    headers,
                    body,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Replay request failed.');
            }

            const data = await response.json(); // { ok: true, newRequestId: '...' }
            
            // Fetch the details of the newly replayed request
            const replayedDetailsResponse = await fetch(`/api/requests/${data.newRequestId}`);
            if (!replayedDetailsResponse.ok) {
                throw new Error('Failed to fetch details of replayed request.');
            }
            const replayedData = await replayedDetailsResponse.json();

            // Populate results display
            document.getElementById('replayedStatus').textContent = `${replayedData.res_status} ${replayedData.method} ${replayedData.url}`;
            document.getElementById('replayedReqHeaders').textContent = JSON.stringify(JSON.parse(replayedData.req_headers), null, 2);
            document.getElementById('replayedReqBody').textContent = replayedData.req_body ? atob(replayedData.req_body) : 'No request body.';
            document.getElementById('replayedResHeaders').textContent = JSON.stringify(JSON.parse(replayedData.res_headers), null, 2);
            document.getElementById('replayedResBody').textContent = replayedData.res_body ? atob(replayedData.res_body) : 'No response body.';

            // Show results display, hide input form
            replayInputForm.style.display = 'none';
            replayResultsDisplay.style.display = 'flex';
            
            // Optionally update the main requests table to show the new replayed request
            // This might involve calling applyFilters() or a more targeted update
            // For now, we'll just let the WebSocket pick it up or require a refresh
            // applyFilters(); // This is exported from requests.js, would need to import
            
        } catch (error) {
            console.error('Replay error:', error);
            alert(`Error replaying request: ${error.message}`);
            // If an error, show input form again or keep results display with error
            replayInputForm.style.display = 'flex';
            replayResultsDisplay.style.display = 'none';
        }
    });

    closeReplayResultsBtn.addEventListener('click', () => {
        replayModalOverlay.classList.remove('active');
        // Optionally reset form/results state here if modal is reopened frequently
    });

    closeSelectRequestModalBtn.addEventListener('click', () => {
        selectRequestModalOverlay.classList.remove('active');
    });

    selectRequestModalOverlay.addEventListener('click', (e) => {
        if (e.target === selectRequestModalOverlay) {
            selectRequestModalOverlay.classList.remove('active');
        }
    });
}