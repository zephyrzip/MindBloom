// Dynamic AI-Powered Mental Health Assessment
// Compatible with existing HTML structure

// ============================================================================
// CONFIGURATION - Adjust these to match your setup
// ============================================================================
const TOTAL_QUESTIONS = 10;
const API_ENDPOINT = '/api/generate-question/';
const SUBMIT_ENDPOINT = '/api/submit-assessment/';
const ELIGIBILITY_ENDPOINT = '/api/check-eligibility/';
const PINCODE_LOCATION_ENDPOINT = '/api/get-pincode-from-location/';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let currentQuestion = 0;
let conversationHistory = [];
let answers = {};
let userFingerprint = null;
let detectedPincode = null;
let locationPermissionGranted = false;
let isGeneratingQuestion = false;
let currentQuestionData = null;

// ============================================================================
// DOM ELEMENTS - Will find these automatically
// ============================================================================
let questionsContainer, prevBtn, nextBtn, progressFill, progressText;
let resultDiv, form, pincodeSection, pincodeInput, getResultBtn;

// ============================================================================
// INITIALIZATION
// ============================================================================
function initializeDOMElements() {
    questionsContainer = document.getElementById('questionsContainer');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    progressFill = document.getElementById('quizProgressFill');
    progressText = document.getElementById('quizProgressText');
    resultDiv = document.getElementById('result');
    form = document.getElementById('quizForm');
    pincodeSection = document.getElementById('pincodeSection');
    pincodeInput = document.getElementById('pincodeInput');
    getResultBtn = document.getElementById('getResultBtn');
    
    // Verify all elements exist
    const required = {
        questionsContainer, prevBtn, nextBtn, progressFill, progressText,
        resultDiv, form, pincodeSection, pincodeInput, getResultBtn
    };
    
    for (let [name, element] of Object.entries(required)) {
        if (!element) {
            console.error(`❌ Required element not found: ${name}`);
            console.log(`Please ensure your HTML has an element with id="${name}"`);
        }
    }
}

// ============================================================================
// FINGERPRINT GENERATION (For rate limiting)
// ============================================================================
function generateFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    
    const fingerprint = {
        canvas: canvas.toDataURL(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        colorDepth: screen.colorDepth,
        hardwareConcurrency: navigator.hardwareConcurrency
    };
    
    return btoa(JSON.stringify(fingerprint));
}

// ============================================================================
// LOCATION DETECTION
// ============================================================================
async function requestLocation() {
    if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        return null;
    }
    
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                locationPermissionGranted = true;
                const { latitude, longitude } = position.coords;
                
                try {
                    const response = await fetch(PINCODE_LOCATION_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude })
                    });
                    
                    const data = await response.json();
                    resolve(data.success && data.pincode ? data.pincode : null);
                } catch (error) {
                    console.error('Error fetching pincode:', error);
                    resolve(null);
                }
            },
            (error) => {
                console.log('Location permission denied:', error.message);
                locationPermissionGranted = false;
                resolve(null);
            },
            { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
        );
    });
}

// ============================================================================
// ELIGIBILITY CHECK (Cooldown period)
// ============================================================================
async function checkEligibility() {
    try {
        const response = await fetch(ELIGIBILITY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fingerprint: userFingerprint })
        });
        
        const data = await response.json();

        if (!data.can_submit) {
            showRateLimitMessage(data.days_remaining);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking eligibility:', error);
        return true; // Allow on error
    }
}

// ============================================================================
// RATE LIMIT MESSAGE
// ============================================================================
function showRateLimitMessage(daysRemaining) {
    const container = document.querySelector('.quizzz') || document.body;
    container.innerHTML = `
        <div class="header" style="text-align: center; padding: 20px;">
            <h1>⏳ Assessment Cooldown Active</h1>
            <p>Thank you for participating in our mental health survey!</p>
        </div>

        <div class="result moderate show" style="max-width: 600px; margin: 40px auto; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div class="result-icon" style="font-size: 4rem; text-align: center;">⏰</div>
            <h2 class="result-title" style="text-align: center; margin: 20px 0;">Please Wait ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''}</h2>
            <p class="result-description" style="margin: 20px 0; text-align: center; line-height: 1.6;">
                You have already completed this assessment recently. 
                To maintain data integrity and prevent duplicate responses, 
                you can retake the assessment in <strong>${daysRemaining} day(s)</strong>.
            </p>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0; color: #0369a1; text-align: center;">
                    <strong>Why the cooldown?</strong><br>
                    This helps us maintain accurate mental health statistics for your area 
                    and prevents gaming the system. Your honest participation matters!
                </p>
            </div>

            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 30px; flex-wrap: wrap;">
                <button onclick="location.href='/'" style="padding: 12px 25px; background: #f8f9fa; color: #333; border: 2px solid #667eea; border-radius: 16px; cursor: pointer; font-weight: 600;">
                    🏠 Back to Home
                </button>
                <button onclick="location.href='/map'" style="padding: 12px 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 16px; cursor: pointer; font-weight: 600;">
                    🗺️ View Stress Map
                </button>
            </div>
        </div>
    `;
}

// ============================================================================
// AI QUESTION GENERATION
// ============================================================================
async function generateNextQuestion() {
    if (isGeneratingQuestion) {
        console.log('Already generating question...');
        return null;
    }
    
    isGeneratingQuestion = true;
    showLoadingIndicator();
    
    try {
        console.log(`🤖 Requesting AI question ${currentQuestion + 1}/${TOTAL_QUESTIONS}`);
        
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_history: conversationHistory,
                question_number: currentQuestion + 1,
                total_questions: TOTAL_QUESTIONS
            })
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to generate question');
        }
        
        console.log(`✅ AI question generated: "${data.question}"`);
        
        hideLoadingIndicator();
        isGeneratingQuestion = false;
        
        return {
            id: `ai_q_${currentQuestion + 1}`,
            question: data.question,
            type: data.type || 'scale',
            options: data.options || generateDefaultOptions(),
            follow_up_areas: data.follow_up_areas || []
        };
    } catch (error) {
        console.error('❌ Error generating AI question:', error);
        hideLoadingIndicator();
        isGeneratingQuestion = false;
        
        // Show user-friendly error and use fallback
        showTemporaryMessage('Using backup question...', 2000);
        return generateFallbackQuestion();
    }
}

// ============================================================================
// FALLBACK QUESTIONS (if AI fails)
// ============================================================================
function generateFallbackQuestion() {
    const fallbacks = [
        {
            question: "How are you feeling today overall?",
            options: [
                { value: 10, text: "😊 Great, feeling positive and energized" },
                { value: 20, text: "😌 Okay, managing well enough" },
                { value: 30, text: "😕 Not great, feeling stressed or down" },
                { value: 40, text: "😔 Really struggling today" }
            ]
        },
        {
            question: "How would you describe your stress levels lately?",
            options: [
                { value: 10, text: "😎 Low stress, feeling relaxed" },
                { value: 20, text: "😌 Moderate, manageable stress" },
                { value: 30, text: "😟 High stress, struggling to cope" },
                { value: 40, text: "😰 Overwhelming, constant stress" }
            ]
        },
        {
            question: "How has your sleep been recently?",
            options: [
                { value: 10, text: "😴 Sleeping well, feeling rested" },
                { value: 20, text: "🌙 Some issues but mostly okay" },
                { value: 30, text: "😓 Poor sleep, often tired" },
                { value: 40, text: "😵 Barely sleeping, exhausted" }
            ]
        }
    ];
    
    const index = currentQuestion % fallbacks.length;
    const fallback = fallbacks[index];
    
    console.log(`⚠️ Using fallback question ${currentQuestion + 1}`);
    
    return {
        id: `fallback_q_${currentQuestion + 1}`,
        question: fallback.question,
        type: 'scale',
        options: fallback.options,
        follow_up_areas: []
    };
}

function generateDefaultOptions() {
    return [
        { value: 10, text: "😊 Not at all / Rarely" },
        { value: 20, text: "😌 Sometimes / Occasionally" },
        { value: 30, text: "😕 Frequently / Often" },
        { value: 40, text: "😔 Almost always / Constantly" }
    ];
}

// ============================================================================
// LOADING INDICATOR
// ============================================================================
function showLoadingIndicator() {
    if (!questionsContainer) return;
    
    questionsContainer.innerHTML = `
        <div class="loading-indicator" style="text-align: center; padding: 60px 20px;">
            <div class="spinner" style="
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                width: 60px;
                height: 60px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            <p style="color: #667eea; font-size: 1.1em; margin: 10px 0;">
                🤔 Analyzing your responses...
            </p>
            <p style="color: #999; font-size: 0.9em;">
                Generating personalized question
            </p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

function hideLoadingIndicator() {
    const loader = questionsContainer?.querySelector('.loading-indicator');
    if (loader) loader.remove();
}

function showTemporaryMessage(message, duration = 3000) {
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: #667eea; color: white; 
        padding: 15px 20px; border-radius: 8px; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000; animation: slideIn 0.3s ease;
    `;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
        msgDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => msgDiv.remove(), 300);
    }, duration);
}

// ============================================================================
// DISPLAY QUESTION
// ============================================================================
async function displayQuestion(questionData = null) {
    // Generate question if not provided
    if (!questionData) {
        questionData = await generateNextQuestion();
    }
    
    if (!questionData) {
        console.error('Failed to get question data');
        return;
    }
    
    currentQuestionData = questionData;
    
    // Clear container
    questionsContainer.innerHTML = '';
    
    // Create question HTML
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-slide active';
    questionDiv.dataset.questionId = questionData.id;
    
    const optionsHTML = questionData.options.map((option, idx) => `
        <label class="option" data-value="${option.value}">
            <input type="radio" name="current_question" value="${option.value}" id="opt_${idx}">
            <span class="option-text">${option.text}</span>
        </label>
    `).join('');
    
    questionDiv.innerHTML = `
        <h3 class="question-title">Question ${currentQuestion + 1}: ${questionData.question}</h3>
        <div class="options">
            ${optionsHTML}
        </div>
    `;
    
    questionsContainer.appendChild(questionDiv);
    updateProgress();
    updateNavigationButtons();
}

// ============================================================================
// NAVIGATION
// ============================================================================
function updateNavigationButtons() {
    if (!prevBtn || !nextBtn) return;
    
    prevBtn.style.display = currentQuestion === 0 ? 'none' : 'inline-block';
    nextBtn.textContent = currentQuestion === TOTAL_QUESTIONS - 1 ? 'Complete Assessment' : 'Next';
}

function updateProgress() {
    if (!progressFill || !progressText) return;
    
    const progress = ((currentQuestion + 1) / TOTAL_QUESTIONS) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `Question ${currentQuestion + 1} of ${TOTAL_QUESTIONS}`;
}

async function handleNext() {
    const selectedOption = document.querySelector('input[name="current_question"]:checked');
    
    if (!selectedOption) {
        alert('Please select an answer before proceeding.');
        return;
    }
    
    const currentQuestionId = currentQuestionData.id;
    const selectedValue = parseInt(selectedOption.value);
    const selectedText = selectedOption.parentElement.querySelector('.option-text').textContent;
    
    // Save answer
    answers[currentQuestionId] = selectedValue;
    
    // Add to conversation history
    conversationHistory.push({
        question_number: currentQuestion + 1,
        question_id: currentQuestionId,
        question_text: currentQuestionData.question,
        answer_value: selectedValue,
        answer_text: selectedText
    });
    
    console.log(`✅ Answer recorded: Q${currentQuestion + 1} = ${selectedValue} ("${selectedText}")`);
    
    // Move to next question or finish
    if (currentQuestion < TOTAL_QUESTIONS - 1) {
        currentQuestion++;
        await displayQuestion();
    } else {
        showPincodeSection();
    }
}

function handlePrevious() {
    if (currentQuestion > 0) {
        currentQuestion--;
        
        // Get previous question from history
        const previousEntry = conversationHistory[currentQuestion];
        
        // Reconstruct question
        const questionData = {
            id: previousEntry.question_id,
            question: previousEntry.question_text,
            options: generateDefaultOptions(),
            type: 'scale'
        };
        
        displayQuestion(questionData);
        
        // Pre-select previous answer
        setTimeout(() => {
            const previousValue = answers[previousEntry.question_id];
            const option = document.querySelector(`input[value="${previousValue}"]`);
            if (option) {
                option.checked = true;
                option.closest('.option').classList.add('selected');
            }
        }, 100);
    }
}

// ============================================================================
// PINCODE SECTION
// ============================================================================
function showPincodeSection() {
    if (!pincodeSection) return;
    
    // Hide quiz
    const quizContent = document.querySelector('.quiz-content');
    const progressContainer = document.querySelector('.quiz-progress-container');
    if (quizContent) quizContent.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'none';
    
    // Show pincode section
    pincodeSection.style.display = 'flex';
    
    if (detectedPincode) {
        pincodeInput.value = detectedPincode;
        pincodeInput.placeholder = `Detected: ${detectedPincode}`;
    } else {
        pincodeInput.placeholder = 'Enter your 6-digit pincode';
    }
}

// ============================================================================
// SUBMISSION
// ============================================================================
function calculateScore() {
    const totalScore = Object.values(answers).reduce((sum, value) => sum + value, 0);
    const maxScore = TOTAL_QUESTIONS * 40;
    return { totalScore, maxScore };
}

async function submitAssessment(pincode, score, maxScore) {
    try {
        const response = await fetch(SUBMIT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pincode: pincode,
                score: score,
                max_score: maxScore,
                fingerprint: userFingerprint,
                conversation_history: conversationHistory
            })
        });
        
        const data = await response.json();
        
        if (response.status === 429) {
            alert(data.message || 'Rate limit exceeded. Please try again later.');
            setTimeout(() => location.reload(), 2000);
            return null;
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to submit assessment');
        }
        
        return data;
    } catch (error) {
        console.error('Error submitting assessment:', error);
        throw error;
    }
}

// ============================================================================
// RESULTS DISPLAY
// ============================================================================
async function displayResults(totalScore, maxScore, submissionData) {
    if (!resultDiv) return;
    
    // Hide other sections
    if (pincodeSection) pincodeSection.style.display = 'none';
    if (form) form.style.display = 'none';
    const progressContainer = document.querySelector('.quiz-progress-container');
    if (progressContainer) progressContainer.style.display = 'none';

    const scorePercentage = (totalScore / maxScore) * 100;
    let resultClass, resultIcon, resultTitle, resultDescription, recommendations;

    if (scorePercentage <= 30) {
        resultClass = 'excellent';
        resultIcon = '🌟';
        resultTitle = 'Excellent Mental Wellness!';
        resultDescription = 'Based on your responses, you\'re managing stress well and have healthy coping mechanisms.';
        recommendations = `
            <div class="recommendations">
                <h4>Keep up the great work:</h4>
                <ul>
                    <li>Continue your current self-care practices</li>
                    <li>Maintain your work-life balance</li>
                    <li>Share your strategies with others</li>
                </ul>
            </div>
        `;
    } else if (scorePercentage <= 50) {
        resultClass = 'good';
        resultIcon = '😊';
        resultTitle = 'Good Mental Health';
        resultDescription = 'You\'re doing well overall, with some areas for improvement in stress management.';
        recommendations = `
            <div class="recommendations">
                <h4>Recommended actions:</h4>
                <ul>
                    <li>Practice deep breathing exercises daily</li>
                    <li>Try meditation or mindfulness (5-10 minutes)</li>
                    <li>Ensure 7-8 hours of quality sleep</li>
                    <li>Regular physical activity</li>
                </ul>
            </div>
        `;
    } else if (scorePercentage <= 75) {
        resultClass = 'moderate';
        resultIcon = '😟';
        resultTitle = 'Moderate Stress Levels';
        resultDescription = 'Your responses indicate significant stress that may be impacting your daily life.';
        recommendations = `
            <div class="recommendations">
                <h4>Important steps to take:</h4>
                <ul>
                    <li>Consider speaking with a mental health professional</li>
                    <li>Practice daily stress management techniques</li>
                    <li>Reach out to trusted friends or family</li>
                    <li>Evaluate and adjust your daily routine</li>
                </ul>
                <div class="helpline" style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
                    <h4>📞 Mental Health Support:</h4>
                    <div style="font-size: 1.2em; font-weight: bold; color: #92400e;">
                        KIRAN Helpline: 1800-599-0019 (24/7)
                    </div>
                </div>
            </div>
        `;
    } else {
        resultClass = 'concerning';
        resultIcon = '🚨';
        resultTitle = 'High Stress - Support Recommended';
        resultDescription = 'Your stress levels appear very high. Professional support is strongly recommended.';
        recommendations = `
            <div class="recommendations">
                <h4>🚨 Urgent Action Required:</h4>
                <ul>
                    <li><strong>Contact a mental health professional immediately</strong></li>
                    <li>Reach out to trusted friends or family today</li>
                    <li>Use emergency services if you\'re in crisis</li>
                </ul>
                <div class="helpline" style="margin-top: 20px; padding: 15px; background: #fee2e2; border-radius: 8px; border-left: 4px solid #dc2626;">
                    <h4>📞 Emergency Mental Health Support:</h4>
                    <div style="margin: 10px 0;">
                        <div style="font-size: 1.3em; font-weight: bold; color: #991b1b; margin: 5px 0;">
                            KIRAN: 9152987821
                        </div>
                        <div style="font-size: 1.3em; font-weight: bold; color: #991b1b; margin: 5px 0;">
                            24/7: 1800-599-0019
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    let communityStats = '';
    if (submissionData && submissionData.total_assessments > 0) {
        communityStats = `
            <div class="community-stats" style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 10px;">
                <h4>📊 Your Area Statistics (Pincode: ${submissionData.pincode})</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                    <div style="padding: 10px; background: white; border-radius: 8px;">
                        <div style="font-size: 0.9em; color: #64748b;">Total Assessments</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: #0369a1;">${submissionData.total_assessments}</div>
                    </div>
                    <div style="padding: 10px; background: white; border-radius: 8px;">
                        <div style="font-size: 0.9em; color: #64748b;">Area Stress Level</div>
                        <div style="font-size: 1.2em; font-weight: bold;">${submissionData.stress_level || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    resultDiv.innerHTML = `
        <div class="result-icon" style="font-size: 5rem; margin-bottom: 20px; text-align: center;">${resultIcon}</div>
        <h2 class="result-title" style="text-align: center;">${resultTitle}</h2>
        <p class="result-description" style="text-align: center;">${resultDescription}</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0;"><strong>Your Score: ${totalScore}/${maxScore}</strong> (${scorePercentage.toFixed(1)}%)</p>
        </div>
        
        ${recommendations}
        ${communityStats}
        
        <div style="margin-top: 30px; text-align: center;">
            <button class="btn btn-primary" onclick="location.href='/'" style="padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em;">
                Back to Home
            </button>
        </div>
    `;

    resultDiv.className = `result ${resultClass} show`;
    resultDiv.style.display = 'block';
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function initializeEventListeners() {
    // Navigation buttons
    if (prevBtn) prevBtn.addEventListener('click', handlePrevious);
    if (nextBtn) nextBtn.addEventListener('click', handleNext);
    
    // Option selection
    document.addEventListener('click', function(e) {
        if (e.target.closest('.option')) {
            const option = e.target.closest('.option');
            const input = option.querySelector('input[type="radio"]');
            if (!input) return;
            
            // Remove previous selection
            document.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add new selection
            option.classList.add('selected');
            input.checked = true;
        }
    });
    
    // Submit button
    if (getResultBtn) {
        getResultBtn.addEventListener('click', async function() {
            const pin = pincodeInput.value.trim();
            
            if (!/^\d{6}$/.test(pin)) {
                alert("Please enter a valid 6-digit pincode.");
                pincodeInput.focus();
                return;
            }
            
            const btn = this;
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Submitting...';
            
            try {
                const { totalScore, maxScore } = calculateScore();
                const submissionResult = await submitAssessment(pin, totalScore, maxScore);
                
                if (submissionResult) {
                    await displayResults(totalScore, maxScore, submissionResult);
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert('Failed to submit assessment. Please try again.');
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }
    
    // Pincode input validation
    if (pincodeInput) {
        pincodeInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^\d]/g, '');
        });
        
        pincodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (getResultBtn) getResultBtn.click();
            }
        });
    }
    
    // Form submission
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    }
}

// ============================================================================
// MAIN INITIALIZATION
// ============================================================================
async function init() {
    console.log('🚀 Initializing Dynamic AI Mental Health Assessment...');
    
    // Find DOM elements
    initializeDOMElements();
    
    // Generate fingerprint
    userFingerprint = generateFingerprint();
    console.log('✅ User fingerprint generated');
    
    // Check eligibility
    const isEligible = await checkEligibility();
    if (!isEligible) {
        console.log('❌ User not eligible - cooldown active');
        return;
    }
    
    console.log('✅ User eligible - starting assessment');
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Request location in background
    requestLocation().then(pincode => {
        detectedPincode = pincode;
        if (pincode) {
            console.log('📍 Location detected:', pincode);
        }
    });
    
    // Start with first question
    await displayQuestion();
    
    console.log('✅ Assessment initialized successfully');
}

// ============================================================================
// START APPLICATION WHEN DOM IS READY
// ============================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded
    init();
}