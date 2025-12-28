import { currentPacketRequestId } from './packet-details.js';
import { renderStatsCharts } from './stats.js';

// Helper function to close all modals
function closeAllModals() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('statsModalOverlay').classList.remove('active');
    document.getElementById('aiAnalysisNewModalOverlay').classList.remove('active');
    document.getElementById('replayModalOverlay').classList.remove('active');
    document.getElementById('selectRequestModalOverlay').classList.remove('active');
    document.getElementById('warningModalOverlay').classList.remove('active');
}

export function initModals() {
    // General Modal elements (used for request details, though not explicitly handled in this file for opening)
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModalBtn = document.getElementById('closeModal');

    // Stats Modal elements
    const statsModalOverlay = document.getElementById('statsModalOverlay');
    const closeStatsModalBtn = document.getElementById('closeStatsModal');
    const statsToggleBtn = document.getElementById('statsToggleBtn');

    // AI Analysis Modal elements
    const aiAnalysisNewModalOverlay = document.getElementById('aiAnalysisNewModalOverlay');
    const closeAiAnalysisNewModal = document.getElementById('closeAiAnalysisNewModal');
    const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');

    // Replay Modal elements
    const replayModalOverlay = document.getElementById('replayModalOverlay');
    const closeReplayModal = document.getElementById('closeReplayModal');
    const replayBtn = document.getElementById('replayBtn');

    // Select Request Modal elements
    const selectRequestModalOverlay = document.getElementById('selectRequestModalOverlay');
    const closeSelectRequestModalBtn = document.getElementById('closeSelectRequestModal');

    // Warning Modal elements (clear all confirmation)
    const warningModalOverlay = document.getElementById('warningModalOverlay');
    const cancelClearBtn = document.getElementById('cancelClearBtn');


    // Event Listeners for closing modals
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeAllModals();
        }
    });
    closeModalBtn.addEventListener('click', closeAllModals);

    statsModalOverlay.addEventListener('click', (e) => {
        if (e.target === statsModalOverlay) {
            closeAllModals();
        }
    });
    closeStatsModalBtn.addEventListener('click', closeAllModals);

    aiAnalysisNewModalOverlay.addEventListener('click', (e) => {
        if (e.target === aiAnalysisNewModalOverlay) {
            closeAllModals();
        }
    });
    closeAiAnalysisNewModal.addEventListener('click', closeAllModals);

    replayModalOverlay.addEventListener('click', (e) => {
        if (e.target === replayModalOverlay) {
            closeAllModals();
        }
    });
    closeReplayModal.addEventListener('click', closeAllModals);

    selectRequestModalOverlay.addEventListener('click', (e) => {
        if (e.target === selectRequestModalOverlay) {
            closeAllModals();
        }
    });
    closeSelectRequestModalBtn.addEventListener('click', closeAllModals);

    warningModalOverlay.addEventListener('click', (e) => {
        if (e.target === warningModalOverlay) {
            closeAllModals();
        }
    });
    // The confirmClearBtn has its own handler in main.js, which also closes the modal.
    // We only need to handle cancel here if it's not already handled.
    if (cancelClearBtn) {
        cancelClearBtn.addEventListener('click', closeAllModals);
    }
    

    // Event Listeners for opening modals
    if (statsToggleBtn) {
        statsToggleBtn.addEventListener('click', () => {
            closeAllModals(); // Close any other open modals
            statsModalOverlay.classList.add('active');
            renderStatsCharts(); // Render/update charts when modal opens
        });
    }

    if (aiAnalyzeBtn) {
        aiAnalyzeBtn.addEventListener('click', async () => {
            if (!currentPacketRequestId) {
                closeAllModals();
                selectRequestModalOverlay.classList.add('active');
                return;
            }
            closeAllModals();
            aiAnalysisNewModalOverlay.classList.add('active');

            const loadingContainer = document.getElementById('loadingContainer');
            const resultsContainer = document.getElementById('resultsContainer');
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const securityContent = document.getElementById('securityContent');
            const insightsContent = document.getElementById('insightsContent');
            const performanceContent = document.getElementById('performanceContent');
            const recommendationsContent = document.getElementById('recommendationsContent');

            loadingContainer.style.display = 'flex';
            resultsContainer.style.display = 'none';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
            
            // Clear previous results
            securityContent.innerHTML = '';
            insightsContent.innerHTML = '';
            performanceContent.innerHTML = '';
            recommendationsContent.innerHTML = '';

            try {
                // Simulate progress
                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    if (progress <= 90) {
                        progressBar.style.width = `${progress}%`;
                        progressText.textContent = `${progress}%`;
                    } else {
                        clearInterval(interval);
                    }
                }, 200);

                const response = await fetch(`/api/ai-inspect/${currentPacketRequestId}`);
                const data = await response.json();

                clearInterval(interval); // Stop simulation
                progressBar.style.width = '100%';
                progressText.textContent = '100%';

                if (data) {
                    securityContent.innerHTML = marked.parse(data.security || 'No security insights.');
                    insightsContent.innerHTML = marked.parse(data.insights || 'No general insights.');
                    performanceContent.innerHTML = marked.parse(data.performance || 'No performance insights.');
                    recommendationsContent.innerHTML = marked.parse(data.recommendations || 'No recommendations.');
                } else {
                    securityContent.innerHTML = 'Failed to get AI analysis.';
                    insightsContent.innerHTML = '';
                    performanceContent.innerHTML = '';
                    recommendationsContent.innerHTML = '';
                }

                loadingContainer.style.display = 'none';
                resultsContainer.style.display = 'grid'; // Changed to grid for cards-grid
            } catch (error) {
                console.error('Error fetching AI analysis:', error);
                clearInterval(interval); // Stop simulation on error
                loadingContainer.style.display = 'none';
                resultsContainer.style.display = 'grid'; // Still display results container to show error
                securityContent.innerHTML = 'Error: Could not fetch AI analysis.';
                insightsContent.innerHTML = '';
                performanceContent.innerHTML = '';
                recommendationsContent.innerHTML = '';
            }
        });
    }

    if (replayBtn) {
        replayBtn.addEventListener('click', async () => {
            if (!currentPacketRequestId) {
                closeAllModals();
                selectRequestModalOverlay.classList.add('active');
                return;
            }
            closeAllModals();
            replayModalOverlay.classList.add('active');
            
            try {
                const response = await fetch(`/api/requests/${currentPacketRequestId}`);
                const data = await response.json();

                document.getElementById('replayMethod').value = data.method;
                document.getElementById('replayUrl').value = data.url;
                
                // Decode headers if base64 encoded, otherwise parse as JSON string
                let decodedReqHeaders = data.req_headers;
                try {
                    // Attempt to parse to pretty print, if it fails, use as is.
                    decodedReqHeaders = JSON.stringify(JSON.parse(data.req_headers), null, 2);
                } catch (e) {
                    console.warn("Could not parse request headers to JSON, using raw string.", e);
                }
                document.getElementById('replayHeaders').value = decodedReqHeaders;

                // Decode body if base64 encoded, otherwise use as is.
                // Assuming `req_body` is base64 encoded as per `packet-details.js`
                let decodedReqBody = '';
                if (data.req_body) {
                    try {
                        decodedReqBody = atob(data.req_body);
                        // Try to pretty print if it's JSON
                        if (data.req_content_type && data.req_content_type.includes('json')) {
                            decodedReqBody = JSON.stringify(JSON.parse(decodedReqBody), null, 2);
                        }
                    } catch (e) {
                        console.warn("Could not decode or parse request body, using raw.", e);
                        decodedReqBody = atob(data.req_body); // Fallback to raw decoded
                    }
                }
                document.getElementById('replayBody').value = decodedReqBody;

                // Set initial active tab to headers (or body if headers are empty)
                const replayHeadersTab = document.querySelector('.replay-tab[data-tab="headers"]');
                const replayBodyTab = document.querySelector('.replay-tab[data-tab="body"]');
                const replayHeadersContent = document.querySelector('.replay-tab-content[data-tab-content="headers"]');
                const replayBodyContent = document.querySelector('.replay-tab-content[data-tab-content="body"]');

                if (decodedReqHeaders.trim() !== '') {
                    replayHeadersTab.classList.add('active');
                    replayHeadersContent.classList.add('active');
                    replayBodyTab.classList.remove('active');
                    replayBodyContent.classList.remove('active');
                } else if (decodedReqBody.trim() !== '') {
                    replayBodyTab.classList.add('active');
                    replayBodyContent.classList.add('active');
                    replayHeadersTab.classList.remove('active');
                    replayHeadersContent.classList.remove('active');
                } else {
                    // Default to headers if both are empty
                    replayHeadersTab.classList.add('active');
                    replayHeadersContent.classList.add('active');
                    replayBodyTab.classList.remove('active');
                    replayBodyContent.classList.remove('active');
                }

            } catch (error) {
                console.error('Error fetching request details for replay:', error);
                alert('Failed to load request details for replay. Please try again.');
                closeAllModals();
            }
        });
    }
}