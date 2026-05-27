/**
 * File Upload Component
 * Handles file upload with drag-and-drop, validation, and progress tracking
 */

document.addEventListener('DOMContentLoaded', function () {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseButton = document.getElementById('browseButton');
    const fileList = document.getElementById('fileList');

    if (!uploadArea || !fileInput) return;

    // Browse button click
    if (browseButton) {
        browseButton.addEventListener('click', function () {
            fileInput.click();
        });
    }

    // Upload area click
    uploadArea.addEventListener('click', function (e) {
        if (e.target !== browseButton) {
            fileInput.click();
        }
    });

    // File input change
    fileInput.addEventListener('change', function (e) {
        handleFiles(e.target.files);
    });

    // Drag and drop events
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // Handle file selection
    function handleFiles(files) {
        if (files.length === 0) return;

        const file = files[0];

        // Validate file type
        if (file.type !== 'application/pdf') {
            showErrorMessage('Please upload a PDF file only.', uploadArea.parentElement);
            return;
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            showErrorMessage('File size must not exceed 10MB. Please upload a smaller file.', uploadArea.parentElement);
            return;
        }

        // Show file in list
        displayUploadedFile(file);

        // Simulate upload (in production, this would upload to server)
        simulateUpload(file);
    }

    // Display uploaded file
    function displayUploadedFile(file) {
        if (fileList) {
            fileList.style.display = 'block';
            fileList.innerHTML = `
        <div class="file-item">
          <div class="file-info">
            <div class="file-icon" aria-hidden="true">📄</div>
            <div class="file-details">
              <div class="file-name">${file.name}</div>
              <div class="file-size">${formatFileSize(file.size)}</div>
              <div class="progress-bar mt-sm">
                <div class="progress-fill" id="uploadProgress" style="width: 0%;">0%</div>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-small" id="cancelUpload">Cancel</button>
        </div>
      `;

            // Cancel upload button
            const cancelButton = document.getElementById('cancelUpload');
            if (cancelButton) {
                cancelButton.addEventListener('click', function () {
                    fileList.style.display = 'none';
                    fileInput.value = '';
                });
            }
        }
    }

    // Simulate file upload with progress
    function simulateUpload(file) {
        const progressBar = document.getElementById('uploadProgress');
        if (!progressBar) return;

        let progress = 0;
        const interval = setInterval(function () {
            progress += 10;
            progressBar.style.width = progress + '%';
            progressBar.textContent = progress + '%';

            if (progress >= 100) {
                clearInterval(interval);

                // Show success message
                setTimeout(function () {
                    showSuccessMessage('Capability statement uploaded successfully!', uploadArea.parentElement.parentElement);

                    // Update current file display
                    const noFileMessage = document.getElementById('noFileMessage');
                    const currentFile = document.getElementById('currentFile');

                    if (noFileMessage) noFileMessage.style.display = 'none';
                    if (currentFile) {
                        currentFile.style.display = 'block';
                        document.getElementById('currentFileName').textContent = file.name;
                        document.getElementById('currentFileSize').textContent = formatFileSize(file.size);
                        document.getElementById('currentFileDate').textContent = 'Uploaded on ' + new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }

                    // Hide upload area
                    if (fileList) fileList.style.display = 'none';
                    fileInput.value = '';

                }, 500);
            }
        }, 200);
    }

    // Delete current file
    const deleteButton = document.getElementById('deleteButton');
    if (deleteButton) {
        deleteButton.addEventListener('click', function () {
            if (confirm('Are you sure you want to delete your capability statement?')) {
                const noFileMessage = document.getElementById('noFileMessage');
                const currentFile = document.getElementById('currentFile');

                if (noFileMessage) noFileMessage.style.display = 'block';
                if (currentFile) currentFile.style.display = 'none';

                showSuccessMessage('Capability statement deleted successfully.', uploadArea.parentElement.parentElement);
            }
        });
    }
});
