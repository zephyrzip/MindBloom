let currentMode = 'text';
let isDrawing = false;
let drawColor = '#000000';
let brushSize = 4;
let textColor = '#000000';
let entries = {};
let currentDate = new Date().toISOString().split('T')[0];
let draggedElement = null;
let offsetX = 0;
let offsetY = 0;
let resizingElement = null;
let startWidth = 0;
let startHeight = 0;
let startX = 0;
let startY = 0;
let isHighlighter = false;
let undoStack = [];
const MAX_UNDO = 50;

const canvas = document.getElementById('journalCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');
const eraserCursor = document.getElementById('eraserCursor');
const wordEditor = document.getElementById('wordEditor');

function initCanvas() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
}

initCanvas();
window.addEventListener('resize', initCanvas);

document.getElementById('dateInput').value = currentDate;

// Enable design mode for better contenteditable experience
document.execCommand('defaultParagraphSeparator', false, 'div');

// Text color picker
document.getElementById('textColorPicker').addEventListener('click', function (e) {
    if (e.target.classList.contains('color-btn')) {
        textColor = e.target.getAttribute('data-color');
        this.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        applyFormatting('foreColor', textColor);
    }
});

// Draw color picker
document.getElementById('drawColorPicker').addEventListener('click', function (e) {
    if (e.target.classList.contains('color-btn')) {
        drawColor = e.target.getAttribute('data-color');
        this.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    }
});

// Apply text formatting
function applyFormatting(command, value = null) {
    wordEditor.focus();
    document.execCommand(command, false, value);
    saveEntry();
}

// Toggle highlight picker
function toggleHighlightPicker(event) {
    event.stopPropagation();
    const picker = document.getElementById('highlightPicker');
    picker.classList.toggle('show');
}

document.addEventListener('click', function (e) {
    const picker = document.getElementById('highlightPicker');
    if (!e.target.closest('#highlightPicker') && !e.target.closest('button')) {
        picker.classList.remove('show');
    }
});

// Auto-save on content change
wordEditor.addEventListener('input', function () {
    saveEntry();
});

// Keyboard shortcuts
wordEditor.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                applyFormatting('bold');
                break;
            case 'i':
                e.preventDefault();
                applyFormatting('italic');
                break;
            case 'u':
                e.preventDefault();
                applyFormatting('underline');
                break;
            case 'z':
                if (!e.shiftKey) {
                    e.preventDefault();
                    undo();
                }
                break;
        }
    }
});

// Drawing functionality
canvas.addEventListener('mouseenter', function () {
    if (currentMode === 'eraser') {
        eraserCursor.style.display = 'block';
    }
});

canvas.addEventListener('mouseleave', function () {
    eraserCursor.style.display = 'none';
});

canvas.addEventListener('mousemove', function (e) {
    if (currentMode === 'eraser') {
        const size = brushSize * 3;
        eraserCursor.style.width = size + 'px';
        eraserCursor.style.height = size + 'px';
        eraserCursor.style.left = (e.offsetX - size / 2) + 'px';
        eraserCursor.style.top = (e.offsetY - size / 2) + 'px';
        eraserCursor.style.display = 'block';
    } else {
        eraserCursor.style.display = 'none';
    }

    if (isDrawing && (currentMode === 'draw' || currentMode === 'eraser')) {
        ctx.lineTo(e.offsetX, e.offsetY);

        if (currentMode === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = brushSize * 3;
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = brushSize;

            if (isHighlighter) {
                ctx.globalAlpha = 0.3;
                ctx.lineWidth = brushSize * 4;
            } else {
                ctx.globalAlpha = 1.0;
            }
        }

        ctx.strokeStyle = drawColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
});

document.addEventListener('keydown', function (e) {
    if (currentMode === 'eraser' && e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            brushSize = Math.min(brushSize + 2, 50);
        } else if (e.key === '-') {
            e.preventDefault();
            brushSize = Math.max(brushSize - 2, 2);
        }
    }
});

function switchModeTab(mode) {
    document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.mode-tab[data-mode="${mode}"]`).classList.add('active');

    document.querySelectorAll('.tools-content').forEach(content => content.classList.remove('active'));

    if (mode === 'text') {
        document.getElementById('textTools').classList.add('active');
        setMode('text');
    } else if (mode === 'draw') {
        document.getElementById('drawTools').classList.add('active');
        setMode('draw');
    } else if (mode === 'image') {
        document.getElementById('imageTools').classList.add('active');
        setMode('text');
    }
}

function setDrawMode(mode) {
    document.querySelectorAll('#drawModeBtn, #eraserModeBtn').forEach(btn => btn.classList.remove('active'));

    if (mode === 'draw') {
        document.getElementById('drawModeBtn').classList.add('active');
        setMode('draw');
    } else if (mode === 'eraser') {
        document.getElementById('eraserModeBtn').classList.add('active');
        setMode('eraser');
    }
}

function setMode(mode) {
    currentMode = mode;
    canvas.classList.remove('drawing-mode', 'eraser-mode');
    eraserCursor.style.display = 'none';
    wordEditor.contentEditable = mode === 'text';

    if (mode === 'draw') {
        canvas.classList.add('drawing-mode');
        wordEditor.style.pointerEvents = 'none';
    } else if (mode === 'eraser') {
        canvas.classList.add('eraser-mode');
        wordEditor.style.pointerEvents = 'none';
    } else {
        wordEditor.style.pointerEvents = 'auto';
    }
}

function setBrushSize(size) {
    brushSize = parseInt(size);
}

function toggleHighlighter() {
    isHighlighter = !isHighlighter;
    document.getElementById('highlighterBtn').classList.toggle('active');
}

canvas.addEventListener('mousedown', (e) => {
    if (currentMode === 'draw' || currentMode === 'eraser') {
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    }
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        saveEntry();
    }
});

function addImage(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageBox = document.createElement('div');
            imageBox.className = 'image-box';
            imageBox.style.left = '100px';
            imageBox.style.top = '100px';
            imageBox.style.width = '300px';
            imageBox.style.height = '200px';

            const img = document.createElement('img');
            img.src = event.target.result;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                container.removeChild(imageBox);
                saveEntry();
            };

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'resize-handle';
            resizeHandle.addEventListener('mousedown', startResize);

            imageBox.appendChild(img);
            imageBox.appendChild(deleteBtn);
            imageBox.appendChild(resizeHandle);
            imageBox.addEventListener('mousedown', function (e) {
                if (!e.target.classList.contains('resize-handle') && !e.target.classList.contains('delete-btn')) {
                    document.querySelectorAll('.image-box').forEach(box => box.classList.remove('active'));
                    this.classList.add('active');
                    startDrag(e);
                }
            });

            container.appendChild(imageBox);
            saveEntry();
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
}

function startDrag(e) {
    draggedElement = e.currentTarget;
    const rect = draggedElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
}

function drag(e) {
    if (draggedElement) {
        const containerRect = container.getBoundingClientRect();
        let newX = e.clientX - containerRect.left - offsetX;
        let newY = e.clientY - containerRect.top - offsetY;

        newX = Math.max(0, Math.min(newX, container.offsetWidth - draggedElement.offsetWidth));
        newY = Math.max(0, Math.min(newY, container.offsetHeight - draggedElement.offsetHeight));

        draggedElement.style.left = newX + 'px';
        draggedElement.style.top = newY + 'px';
    }
}

function stopDrag() {
    draggedElement = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
    saveEntry();
}

function startResize(e) {
    e.stopPropagation();
    resizingElement = e.target.parentElement;
    startWidth = resizingElement.offsetWidth;
    startHeight = resizingElement.offsetHeight;
    startX = e.clientX;
    startY = e.clientY;

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
}

function resize(e) {
    if (resizingElement) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newWidth = startWidth + deltaX;
        let newHeight = startHeight + deltaY;

        newWidth = Math.max(100, Math.min(newWidth, container.offsetWidth - parseInt(resizingElement.style.left)));
        newHeight = Math.max(100, Math.min(newHeight, container.offsetHeight - parseInt(resizingElement.style.top)));

        resizingElement.style.width = newWidth + 'px';
        resizingElement.style.height = newHeight + 'px';
    }
}

function stopResize() {
    resizingElement = null;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    saveEntry();
}

function saveEntry() {
    const canvasData = canvas.toDataURL();
    const textContent = wordEditor.innerHTML;
    const images = Array.from(container.querySelectorAll('.image-box')).map(box => ({
        src: box.querySelector('img').src,
        left: box.style.left,
        top: box.style.top,
        width: box.style.width,
        height: box.style.height
    }));

    const state = {
        canvas: canvasData,
        textContent: textContent,
        images: images
    };

    undoStack.push(JSON.parse(JSON.stringify(state)));
    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    }

    entries[currentDate] = state;
    updateEntryCount();
}

function undo() {
    if (undoStack.length > 1) {
        undoStack.pop();
        const previousState = undoStack[undoStack.length - 1];

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        container.querySelectorAll('.image-box').forEach(el => el.remove());

        if (previousState.canvas) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = previousState.canvas;
        }

        wordEditor.innerHTML = previousState.textContent;

        previousState.images.forEach(data => {
            createImageBox(data);
        });

        entries[currentDate] = previousState;
    } else {
        alert('Nothing to undo');
    }
}

function createImageBox(data) {
    const imageBox = document.createElement('div');
    imageBox.className = 'image-box';
    imageBox.style.left = data.left;
    imageBox.style.top = data.top;
    imageBox.style.width = data.width;
    imageBox.style.height = data.height;

    const img = document.createElement('img');
    img.src = data.src;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        container.removeChild(imageBox);
        saveEntry();
    };

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.addEventListener('mousedown', startResize);

    imageBox.appendChild(img);
    imageBox.appendChild(deleteBtn);
    imageBox.appendChild(resizeHandle);
    imageBox.addEventListener('mousedown', function (e) {
        if (!e.target.classList.contains('resize-handle') && !e.target.classList.contains('delete-btn')) {
            document.querySelectorAll('.image-box').forEach(box => box.classList.remove('active'));
            this.classList.add('active');
            startDrag(e);
        }
    });

    container.appendChild(imageBox);
}

function loadEntry() {
    currentDate = document.getElementById('dateInput').value;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    container.querySelectorAll('.image-box').forEach(el => el.remove());
    undoStack = [];
    wordEditor.innerHTML = '';

    if (entries[currentDate]) {
        const entry = entries[currentDate];

        if (entry.canvas) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
            };
            img.src = entry.canvas;
        }

        wordEditor.innerHTML = entry.textContent || '';

        entry.images.forEach(data => {
            createImageBox(data);
        });

        undoStack.push(JSON.parse(JSON.stringify(entry)));
    }
}

function changeDate(days) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + days);
    currentDate = date.toISOString().split('T')[0];
    document.getElementById('dateInput').value = currentDate;
    loadEntry();
}

function clearCanvas() {
    if (confirm('Clear everything on this page? This cannot be undone!')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        container.querySelectorAll('.image-box').forEach(el => el.remove());
        wordEditor.innerHTML = '';
        delete entries[currentDate];
        undoStack = [];
        updateEntryCount();
    }
}

function updateEntryCount() {
    const count = Object.keys(entries).length;
    document.getElementById('entryCount').textContent = `${count} ${count === 1 ? 'entry' : 'entries'} saved`;
}

switchModeTab('text');
updateEntryCount();

let emotionChart, moodHistoryChart;

async function analyzeSentiment() {
    const textContent = document.getElementById('wordEditor').innerText || document.getElementById('wordEditor').textContent || "";
    const images = Array.from(document.querySelectorAll('.image-box img')).map(img => img.src);

    const modal = document.getElementById("sentimentModal");
    const modalText = document.getElementById("sentimentText");
    const moodEmoji = document.getElementById("moodEmoji");
    const chartCanvas = document.getElementById("emotionChart");
    const historyCanvas = document.getElementById("moodHistoryChart");

    modal.style.display = "flex";
    modalText.textContent = "Analyzing your journal entry...";
    moodEmoji.textContent = "🤔";
    chartCanvas.style.display = "none";
    historyCanvas.style.display = "none";

    try {
        const response = await fetch("https://sentimentalanalyser-production.up.railway.app/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: textContent, images: images })
        });

        const data = await response.json();
        if (data.EmotionalSummary) {
            modalText.innerHTML = data.EmotionalSummary;
            chartCanvas.style.display = "block";

            // ✨ Emoji map
            const emotion = data.DominantEmotion.toLowerCase();
            const emojiMap = {
                joy: "😀", happy: "😊", sadness: "😢", anger: "😡", calm: "😌",
                fear: "😨", anxiety: "😰", surprise: "😲", disgust: "🤢", depression: "🥀"
            };
            moodEmoji.textContent = emojiMap[Object.keys(emojiMap).find(k => emotion.includes(k))] || "😐";

            // ✨ Emotion bar chart (current entry)
            const emotions = data.EmotionScores || {};
            const labels = Object.keys(emotions);
            const values = Object.values(emotions).map(v => Math.round(v * 100));
            const colors = labels.map(l => emotionColor(l));
            if (emotionChart) emotionChart.destroy();
            emotionChart = new Chart(chartCanvas, {
                type: 'bar',
                data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
                options: { scales: { y: { beginAtZero: true, max: 100 } } }
            });

            // Load mood history
            loadMoodHistory();
        } else {
            modalText.textContent = data.error || "⚠️ No response.";
            moodEmoji.textContent = "❓";
        }
    } catch (err) {
        modalText.textContent = "❌ Error: " + err.message;
        moodEmoji.textContent = "💥";
    }
}

// ✨ Function to color code each emotion
function emotionColor(emotion) {
    const e = emotion.toLowerCase();
    if (e.includes("joy") || e.includes("happy")) return "#FFD700"; // yellow
    if (e.includes("sad")) return "#4C9AFF"; // blue
    if (e.includes("anger")) return "#FF4C4C"; // red
    if (e.includes("calm")) return "#56E39F"; // green
    if (e.includes("fear") || e.includes("anxiety")) return "#FFA500"; // orange
    if (e.includes("disgust")) return "#8FBC8F"; // dull green
    if (e.includes("surprise")) return "#BA68C8"; // purple
    if (e.includes("depression")) return "#708090"; // gray-blue
    if (e.includes("loneliness")) return "#A0A0A0"; // gray
    return "#667EEA"; // default violet
}

async function loadMoodHistory() {
    const res = await fetch("https://sentimentalanalyser-production.up.railway.app/history");
    const history = await res.json();
    const historyCanvas = document.getElementById("moodHistoryChart");
    if (!history.length) return;

    historyCanvas.style.display = "block";
    const labels = history.map(h => h.timestamp.split(" ")[0]);
    const emotions = history.map(h => h.DominantEmotion);
    const values = history.map(h => h.EmotionScores[h.DominantEmotion] || 0);
    const colors = emotions.map(e => emotionColor(e));

    if (moodHistoryChart) moodHistoryChart.destroy();
    moodHistoryChart = new Chart(historyCanvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Dominant Emotion Strength',
                data: values,
                fill: true,
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118,75,162,0.1)',
                pointBackgroundColor: colors,
                pointRadius: 6,
                pointHoverRadius: 8,
                tension: 0.3
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return `Emotion: ${emotions[ctx.dataIndex]} (${(ctx.raw * 100).toFixed(1)}%)`;
                        }
                    }
                },
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, max: 1 },
                x: { ticks: { color: "#334155" } }
            }
        }
    });
}

function closeModal() {
    document.getElementById("sentimentModal").style.display = "none";
}

async function postToCommunity() {
    const textContent = document.getElementById('wordEditor').innerText.trim();
    if (!textContent) {
        alert("Please write something in your journal before posting.");
        return;
    }

    // Filter bad or depressing words
    const sanitized = sanitizeText(textContent);

    try {
        const response = await fetch("http://127.0.0.1:5000/community", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: sanitized,
                timestamp: new Date().toLocaleString()
            })
        });

        if (response.ok) {
            alert("✅ Your journal has been posted to the community!");
            window.open("community.html", "_blank");
        } else {
            const data = await response.json();
            alert("❌ Failed to post: " + (data.error || "Unknown error"));
        }
    } catch (error) {
        console.error(error);
        alert("⚠️ Error posting to community. Check if Flask is running.");
    }
}

function sanitizeText(input) {
    const badWords = [
        "hate", "worthless", "useless", "stupid", "idiot", "kill",
        "suicide", "hopeless", "depressed", "sad", "die",
        "fuck", "shit", "bitch", "bastard", "asshole"
    ];
    let filtered = input;
    for (const word of badWords) {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        filtered = filtered.replace(regex, "❤️");
    }
    return filtered;
}