class HabitChallenge {
  constructor() {
    this.currentHabit = '';
    this.completedDays = 0;
    this.dayMarkers = [];
    this.challengeStartDate = null;
    this.lastCompletedDate = null;

    this.initializeElements();
    this.addEventListeners();
    this.loadSavedData();
    this.updateUI();
  }

  initializeElements() {
    this.habitSelect = document.getElementById('habitSelect');
    this.habitMsg = document.getElementById('habitMsg');
    this.markDoneBtn = document.getElementById('markDone');
    this.resetBtn = document.getElementById('resetChallenge');
    this.progressFill = document.getElementById('progressFill');
    this.progressText = document.getElementById('progressText');
    this.streakDisplay = document.getElementById('streakDisplay');
    this.streakCount = document.getElementById('streakCount');
    this.dayMarkers = document.querySelectorAll('.day-marker');
  }

  addEventListeners() {
    this.habitSelect.addEventListener('change', () => this.selectHabit());
    this.markDoneBtn.addEventListener('click', () => this.markDayComplete());
    this.resetBtn.addEventListener('click', () => this.resetChallenge());
  }

  selectHabit() {
    this.currentHabit = this.habitSelect.value;
    this.saveData();
    this.updateUI();
  }

  markDayComplete() {
    if (!this.currentHabit || this.completedDays >= 7) return;

    const today = new Date().toDateString();
    if (this.lastCompletedDate === today) {
      alert('You\'ve already completed your habit for today! 🎉');
      return;
    }

    this.completedDays++;
    this.lastCompletedDate = today;

    if (!this.challengeStartDate) {
      this.challengeStartDate = today;
    }

    this.saveData();
    this.updateUI();
    this.animateSuccess();

    if (this.completedDays === 7) {
      setTimeout(() => {
        this.celebrateCompletion();
      }, 500);
    }
  }

  resetChallenge() {
    if (confirm('Are you sure you want to reset your challenge? This will clear all progress.')) {
      this.currentHabit = '';
      this.completedDays = 0;
      this.challengeStartDate = null;
      this.lastCompletedDate = null;
      this.habitSelect.value = '';
      this.saveData();
      this.updateUI();
    }
  }

  updateUI() {
    // Update habit message
    if (this.currentHabit) {
      this.habitMsg.textContent = `Current habit: ${this.currentHabit}`;
      this.markDoneBtn.disabled = false;
    } else {
      this.habitMsg.textContent = 'No habit selected yet.';
      this.markDoneBtn.disabled = true;
    }

    // Update progress bar
    const progressPercentage = (this.completedDays / 7) * 100;
    this.progressFill.style.width = progressPercentage + '%';

    // Update progress text
    if (this.completedDays === 7) {
      this.progressText.textContent = '🎉 Challenge Complete! 🎉';
      this.progressText.style.color = '#28a745';
      this.progressText.style.fontWeight = 'bold';
    } else {
      this.progressText.textContent = `Progress: ${this.completedDays}/7 days`;
      this.progressText.style.color = '#2d3748';
      this.progressText.style.fontWeight = '500';
    }

    // Update day markers
    this.dayMarkers.forEach((marker, index) => {
      marker.classList.remove('completed', 'current');

      if (index < this.completedDays) {
        marker.classList.add('completed');
      } else if (index === this.completedDays && this.completedDays < 7) {
        marker.classList.add('current');
      }
    });

    // Update streak display
    if (this.completedDays > 0) {
      this.streakDisplay.style.display = 'block';
      this.streakCount.textContent = this.completedDays;
    } else {
      this.streakDisplay.style.display = 'none';
    }

    // Disable mark done button if challenge is complete
    if (this.completedDays >= 7) {
      this.markDoneBtn.disabled = true;
      this.markDoneBtn.textContent = '✨ Challenge Complete';
    } else {
      this.markDoneBtn.textContent = '✅ Mark as Done';
    }
  }

  animateSuccess() {
    // Animate the progress section
    const progressSection = document.querySelector('.progress-section');
    progressSection.classList.add('success-animation');
    setTimeout(() => {
      progressSection.classList.remove('success-animation');
    }, 600);

    // Animate the completed day marker
    const completedMarker = document.querySelector(`[data-day="${this.completedDays}"]`);
    if (completedMarker) {
      setTimeout(() => {
        completedMarker.classList.add('completed');
      }, 200);
    }
  }

  celebrateCompletion() {
    const section = document.querySelector('.habit-section');
    section.classList.add('celebration');

    setTimeout(() => {
      section.classList.remove('celebration');
    }, 1000);

    alert('🎉 Congratulations! You\'ve completed your 7-day habit challenge! 🎉\n\nYou\'ve built a great foundation. Consider starting a new challenge to keep the momentum going!');
  }

  showStorageWarning() {
    // Show warning about data persistence
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 10px;
                    border-radius: 8px;
                    margin: 10px 0;
                    font-size: 0.9rem;
                    text-align: center;
                `;
    warningDiv.innerHTML = '⚠️ Note: Your progress will reset if you refresh the page. Keep this tab open to maintain your streak!';

    const habitContent = document.querySelector('.habit-content');
    habitContent.insertBefore(warningDiv, habitContent.firstChild);

    // Remove warning after 10 seconds
    setTimeout(() => {
      if (warningDiv.parentNode) {
        warningDiv.remove();
      }
    }, 10000);
  }

  saveData() {
    const data = {
      currentHabit: this.currentHabit,
      completedDays: this.completedDays,
      challengeStartDate: this.challengeStartDate,
      lastCompletedDate: this.lastCompletedDate
    };

    try {
      localStorage.setItem('habitChallenge', JSON.stringify(data));
    } catch (error) {
      // localStorage not available, store in memory only
      this.savedData = data;
      console.log('Data saved to memory only - will reset on page refresh');
    }
  }

  loadSavedData() {
    // Try to load from localStorage if available, otherwise use session storage
    try {
      const saved = localStorage.getItem('habitChallenge');
      if (saved) {
        const data = JSON.parse(saved);
        this.currentHabit = data.currentHabit || '';
        this.completedDays = data.completedDays || 0;
        this.challengeStartDate = data.challengeStartDate || null;
        this.lastCompletedDate = data.lastCompletedDate || null;

        if (this.currentHabit) {
          this.habitSelect.value = this.currentHabit;
        }
      }
    } catch (error) {
      // localStorage not available, data will reset on page refresh
      console.log('Local storage not available - data will reset on page refresh');
      this.showStorageWarning();
    }
  }
}

// Initialize the habit challenge when page loads
document.addEventListener('DOMContentLoaded', () => {
  new HabitChallenge();
});