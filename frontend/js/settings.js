document.addEventListener('DOMContentLoaded', () => {
    const settingsDropdownBtn = document.getElementById('settingsDropdownBtn');
    const settingsDropdownContent = document.getElementById('settingsDropdownContent');

    if (settingsDropdownBtn && settingsDropdownContent) {
        settingsDropdownBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the document click listener from immediately closing it
            settingsDropdownContent.classList.toggle('show');
        });

        // Close the dropdown if the user clicks outside of it
        window.addEventListener('click', (event) => {
            if (!settingsDropdownBtn.contains(event.target) && !settingsDropdownContent.contains(event.target)) {
                if (settingsDropdownContent.classList.contains('show')) {
                    settingsDropdownContent.classList.remove('show');
                }
            }
        });
    }

    // The actual event listeners for aiAnalyzeBtn, replayBtn, and jsonBeautifyToggle
    // are handled in modals.js and packet-details.js.
    // The IDs are preserved in the new HTML structure, so they should continue to work.
    // We only need to ensure the dropdown closes when one of these items are clicked,
    // assuming their handlers don't already close the dropdown or a modal.
    const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
    const replayBtn = document.getElementById('replayBtn');
    const jsonBeautifyToggle = document.getElementById('jsonBeautifyToggle'); // This is a checkbox input now

    if (aiAnalyzeBtn) {
        aiAnalyzeBtn.addEventListener('click', () => {
            // Give a small delay to allow the modal to start opening before closing dropdown
            setTimeout(() => {
                if (settingsDropdownContent.classList.contains('show')) {
                    settingsDropdownContent.classList.remove('show');
                }
            }, 50);
        });
    }

    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            // Give a small delay to allow the modal to start opening before closing dropdown
            setTimeout(() => {
                if (settingsDropdownContent.classList.contains('show')) {
                    settingsDropdownContent.classList.remove('show');
                }
            }, 50);
        });
    }

    // For the beautifier toggle, no need to close the dropdown as it's a toggle
    // and often expected to be interactable without closing the parent.
});