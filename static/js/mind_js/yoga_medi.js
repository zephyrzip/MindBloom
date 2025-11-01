const yogaPractices = [
    {
        title: "Mountain Pose (Tadasana)",
        description: "Stand tall with your feet together, spine straight, and arms at your sides. Breathe deeply and feel your connection to the earth.",
        image: STATIC_URL + "images/mind_img/yoga_mountain.png"
    },
    {
        title: "Tree Pose (Vrikshasana)",
        description: "Shift your weight to one leg and place the sole of your other foot on your inner thigh. Find your balance and bring your hands to prayer position.",
        image: STATIC_URL + "images/mind_img/yoga_tree.png"
    },
    {
        title: "Child's Pose (Balasana)",
        description: "Kneel on the floor, sit back on your heels, and bend forward until your forehead touches the mat. Extend your arms forward or alongside your body.",
        image: STATIC_URL + "images/mind_img/yoga_balasana.png"
    },
    {
        title: "Eight-Limbed (Ashtangasana)",
        description: "Shift your shoulders and heart forward beyond your fingertips and lower just your chest and chin to the ground. Keep your elbows narrow with your tailbone lifting toward the sky",
        image: STATIC_URL + "images/mind_img/yoga_ashtanga.png"
    },
    {
        title: "Yoga of Awareness (Kundalini)",
        description: "Lift your chest and take your hands to your heart. Keep hugging your top knee behind your standing knee. Keep your front knee in line with your grounded ankle.",
        image: STATIC_URL + "images/mind_img/yoga_kundalini.png"
    }
];

const meditationPractices = [
    {
        title: "Mindful Breathing",
        description: "Find a comfortable seated position. Close your eyes and bring your attention to your breath without trying to change it.",
        image: STATIC_URL + "images/mind_img/meditation_mindful.png"
    },
    {
        title: "Loving-Kindness Meditation",
        description: "Used to strengthen feelings of compassion, kindness, and acceptance toward oneself first and then to loved ones, acquaintances, and eventually all beings.",
        image: STATIC_URL + "images/mind_img/meditation_loving.png"
    },
    {
        title: "Noting",
        description: "We are so caught up in a thought or emotion that we’ve lost our awareness of the breath. We “note” the thought to restore awareness, create a bit of space, as a way of letting go.",
        image: STATIC_URL + "images/mind_img/meditation_noting.png"
    },
    {
        title: "Transcendental Meditation",
        description: "Repeat a personal mantra for 20 minutes twice a day to settle the mind into a state of deep rest. It is non-religious and simple to practice.",
        image: STATIC_URL + "images/mind_img/meditation_transcendental.png"
    },
    {
        title: "Focused Meditation",
        description: "Involves concentration using any of the five senses.you can also bring in external influences to help focus your attention. For example, counting mala beads.",
        image: STATIC_URL + "images/mind_img/meditation_focused.png"
    }
];

// Generate slides function
function generateSlides(practices, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = practices.map((practice, index) => `
                <div class="practice-slide ${index === 0 ? 'active' : ''}">
                    <h4>${practice.title}</h4>
                    <p>${practice.description}</p>
                    <div class="practice-img">
                        <img src="${practice.image}" alt="${practice.title}">
                    </div>
                </div>
            `).join('');
}

// Yoga and Meditation Slides
let yogaIndex = 0;
let meditationIndex = 0;

function showPractice(type, index) {
    const slides = document.querySelectorAll(`.column:nth-child(${type === 'yoga' ? 1 : 2}) .practice-slide`);
    slides.forEach((slide, i) => {
        slide.classList.remove("active");
        if (i === index) slide.classList.add("active");
    });
}

function nextPractice(type) {
    if (type === "yoga") {
        const slides = document.querySelectorAll(".column:nth-child(1) .practice-slide");
        yogaIndex = (yogaIndex + 1) % slides.length;
        showPractice("yoga", yogaIndex);
    } else {
        const slides = document.querySelectorAll(".column:nth-child(2) .practice-slide");
        meditationIndex = (meditationIndex + 1) % slides.length;
        showPractice("meditation", meditationIndex);
    }
}

function prevPractice(type) {
    if (type === "yoga") {
        const slides = document.querySelectorAll(".column:nth-child(1) .practice-slide");
        yogaIndex = (yogaIndex - 1 + slides.length) % slides.length;
        showPractice("yoga", yogaIndex);
    } else {
        const slides = document.querySelectorAll(".column:nth-child(2) .practice-slide");
        meditationIndex = (meditationIndex - 1 + slides.length) % slides.length;
        showPractice("meditation", meditationIndex);
    }
}

// Yoga Timer Functions
let yogaTimerInterval;
let yogaTotalTime = 600;
let yogaTimeRemaining = yogaTotalTime;
let isYogaTimerRunning = false;

function updateYogaTimerDisplay() {
    const minutes = Math.floor(yogaTimeRemaining / 60);
    const seconds = yogaTimeRemaining % 60;
    document.getElementById('yogaTimerDisplay').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const progressPercentage = 100 - (yogaTimeRemaining / yogaTotalTime * 100);
    document.getElementById('yogaTimerBar').style.width = `${progressPercentage}%`;

    if (yogaTimeRemaining < 60) {
        document.getElementById('yogaTimerBar').style.background = '#e74c3c';
    } else if (yogaTimeRemaining < 180) {
        document.getElementById('yogaTimerBar').style.background = '#f39c12';
    }
}

function startYogaTimer() {
    if (isYogaTimerRunning) return;

    isYogaTimerRunning = true;
    yogaTimerInterval = setInterval(() => {
        yogaTimeRemaining--;
        updateYogaTimerDisplay();

        if (yogaTimeRemaining <= 0) {
            clearInterval(yogaTimerInterval);
            document.getElementById('yogaTimerDisplay').textContent = "Time's up!";
            isYogaTimerRunning = false;
        }
    }, 1000);
}

function pauseYogaTimer() {
    clearInterval(yogaTimerInterval);
    isYogaTimerRunning = false;
}

function resetYogaTimer() {
    clearInterval(yogaTimerInterval);
    isYogaTimerRunning = false;
    yogaTimeRemaining = yogaTotalTime;
    updateYogaTimerDisplay();
    document.getElementById('yogaTimerBar').style.background = 'linear-gradient(90deg, #3498db, #2ecc71)';
}

function setCustomTimer() {
    const minutes = parseInt(document.getElementById('timerDuration').value);
    if (minutes > 0 && minutes <= 120) {
        yogaTotalTime = minutes * 60;
        resetYogaTimer();
    } else {
        alert('Please enter a value between 1 and 120 minutes');
    }
}

// Breathing Exercise
let breathingIntervalId = null;
let breathingPhase = 0;

function startBreathing() {
    stopBreathing();
    breathingPhase = 0;
    updateBreathingPhase();
    breathingIntervalId = setInterval(updateBreathingPhase, 4000);
}

function stopBreathing() {
    if (breathingIntervalId) {
        clearInterval(breathingIntervalId);
        breathingIntervalId = null;
    }
    document.getElementById('breathingText').textContent = "Click Start to Begin";
    document.getElementById('breathingCircle').style.transform = "scale(1)";
}

function updateBreathingPhase() {
    const circle = document.getElementById('breathingCircle');
    const text = document.getElementById('breathingText');

    if (breathingPhase === 0) {
        text.textContent = "🌬️ Inhale...";
        circle.style.transform = "scale(1.4)";
        circle.style.background = "radial-gradient(circle, #2ecc71, #27ae60)";
    } else if (breathingPhase === 1) {
        text.textContent = "😌 Hold...";
        circle.style.transform = "scale(1.4)";
    } else {
        text.textContent = "💨 Exhale...";
        circle.style.transform = "scale(1)";
        circle.style.background = "radial-gradient(circle, #3498db, #2980b9)";
    }
    breathingPhase = (breathingPhase + 1) % 3;
}

// Initialize everything when page loads
document.addEventListener("DOMContentLoaded", function () {
    // Generate slides
    generateSlides(yogaPractices, 'yogaSlides');
    generateSlides(meditationPractices, 'meditationSlides');

    // Timer event listeners
    document.getElementById('startYogaTimer').addEventListener('click', startYogaTimer);
    document.getElementById('pauseYogaTimer').addEventListener('click', pauseYogaTimer);
    document.getElementById('resetYogaTimer').addEventListener('click', resetYogaTimer);
    document.getElementById('setTimer').addEventListener('click', setCustomTimer);

    // Breathing exercise event listeners
    document.getElementById('startBreathing').addEventListener('click', startBreathing);
    document.getElementById('stopBreathing').addEventListener('click', stopBreathing);

    // Initialize timer display
    updateYogaTimerDisplay();
});