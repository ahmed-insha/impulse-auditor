// main.js

// -- State Management --
const STATE_KEY = 'impulseAuditorState';

let appState = {
  user: {
    currentSavings: 0,
    monthlySalary: 0,
    hourlyWage: 0,
    essentialsPct: 50,
    goalsPct: 20,
    initialGoalFunds: 0,
    lastContributionMonth: '',
    onboardingComplete: false
  },
  goals: [],
  history: []
};

function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (saved) {
    appState = JSON.parse(saved);
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(appState));
}

// -- DOM Elements --
const dom = {
  onboardingScreen: document.getElementById('onboarding'),
  mainAppScreen: document.getElementById('main-app'),
  onboardingForm: document.getElementById('onboarding-form'),
  
  wageDisplay: document.getElementById('wage-display'),
  
  navBtns: document.querySelectorAll('.nav-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  
  displaySavings: document.getElementById('display-savings'),
  btnEditProfile: document.getElementById('btn-edit-profile'),
  topGoalProgress: document.getElementById('top-goal-progress'),
  recentAuditsList: document.getElementById('recent-audits-list'),
  
  auditForm: document.getElementById('audit-form'),
  auditItem: document.getElementById('audit-item'),
  auditPrice: document.getElementById('audit-price'),
  auditResult: document.getElementById('audit-result'),
  auditVerdict: document.getElementById('audit-verdict'),
  auditHours: document.getElementById('audit-hours'),
  auditReasoning: document.getElementById('audit-reasoning'),
  btnSaveAudit: document.getElementById('btn-save-audit'),
  
  addGoalForm: document.getElementById('add-goal-form'),
  goalName: document.getElementById('goal-name'),
  goalTarget: document.getElementById('goal-target'),
  goalsList: document.getElementById('goals-list'),
  
  historyList: document.getElementById('history-list')
};

// -- Initialization --
function init() {
  loadState();
  if (appState.user.onboardingComplete) {
    showMainApp();
  } else {
    showOnboarding();
  }
  setupEventListeners();
}

// -- UI Flow --
function showOnboarding() {
  dom.onboardingScreen.classList.add('active');
  dom.onboardingScreen.classList.remove('hidden');
  dom.mainAppScreen.classList.add('hidden');
  dom.mainAppScreen.classList.remove('active');
}

function showMainApp() {
  dom.onboardingScreen.classList.add('hidden');
  dom.onboardingScreen.classList.remove('active');
  dom.mainAppScreen.classList.add('active');
  dom.mainAppScreen.classList.remove('hidden');
  
  updateDashboard();
  renderGoals();
  renderHistory();
}

function switchTab(tabId) {
  dom.navBtns.forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  dom.tabPanes.forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add('active');
      pane.classList.remove('hidden');
    } else {
      pane.classList.remove('active');
      pane.classList.add('hidden');
    }
  });

  if (tabId === 'dashboard') updateDashboard();
  if (tabId === 'goals') renderGoals();
  if (tabId === 'history') renderHistory();
}

// -- Event Listeners --
function setupEventListeners() {
  // Onboarding Submit
  dom.onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const savings = parseFloat(document.getElementById('current-savings').value);
    const salary = parseFloat(document.getElementById('monthly-salary').value);
    const initialFunds = parseFloat(document.getElementById('initial-goal-funds').value);
    const essentials = parseFloat(document.getElementById('essentials-pct').value);
    const goalsP = parseFloat(document.getElementById('goals-pct').value);
    
    appState.user.currentSavings = savings;
    appState.user.monthlySalary = salary;
    appState.user.initialGoalFunds = initialFunds;
    appState.user.essentialsPct = essentials;
    appState.user.goalsPct = goalsP;
    // Calculation: 40 hrs * 4 weeks = 160 hrs
    appState.user.hourlyWage = salary / 160;
    appState.user.onboardingComplete = true;

    // Distribute unallocated funds immediately if goals exist
    if (appState.user.initialGoalFunds > 0 && appState.goals.length > 0) {
      let unallocated = appState.user.initialGoalFunds;
      for (let goal of appState.goals) {
        if (unallocated <= 0) break;
        const space = goal.targetAmount - goal.currentSaved;
        if (space > 0) {
          const amount = Math.min(unallocated, space);
          goal.currentSaved += amount;
          unallocated -= amount;
        }
      }
      appState.user.initialGoalFunds = unallocated;
    }
    if (!appState.user.lastContributionMonth) {
      appState.user.lastContributionMonth = new Date().toISOString().substring(0, 7);
    }
    
    saveState();
    showMainApp();
  });

  // Navigation Click
  dom.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Edit Profile Click
  if (dom.btnEditProfile) {
    dom.btnEditProfile.addEventListener('click', () => {
      document.getElementById('current-savings').value = appState.user.currentSavings || '';
      document.getElementById('monthly-salary').value = appState.user.monthlySalary || '';
      document.getElementById('initial-goal-funds').value = appState.user.initialGoalFunds || 0;
      document.getElementById('essentials-pct').value = appState.user.essentialsPct || 50;
      document.getElementById('goals-pct').value = appState.user.goalsPct || 20;
      showOnboarding();
    });
  }

  // Add Goal Submit
  dom.addGoalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = dom.goalName.value;
    const target = parseFloat(dom.goalTarget.value);
    
    let startingFunds = 0;
    if (appState.user.initialGoalFunds > 0) {
      startingFunds = Math.min(appState.user.initialGoalFunds, target);
      appState.user.initialGoalFunds -= startingFunds;
    }

    const newGoal = {
      id: 'g_' + Date.now(),
      name,
      targetAmount: target,
      currentSaved: startingFunds,
      priority: 'medium'
    };
    
    appState.goals.push(newGoal);
    saveState();
    
    dom.addGoalForm.reset();
    renderGoals();
    updateDashboard(); // Updates top goal progress
  });

  // Auditor Trigger (Real AI Implementation)
  dom.auditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const item = dom.auditItem.value;
    const price = parseFloat(dom.auditPrice.value);
    
    // Labor Hours Calculation (mostly for history logic/UI)
    const laborHours = price / appState.user.hourlyWage;
    
    // Monthly Contribution Rollover Check
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (appState.user.lastContributionMonth && appState.user.lastContributionMonth !== currentMonth) {
      const monthlyContribution = (appState.user.goalsPct / 100) * appState.user.monthlySalary;
      if (appState.goals.length > 0) {
        appState.goals[0].currentSaved += monthlyContribution;
      }
    }
    appState.user.lastContributionMonth = currentMonth;
    saveState();
    
    dom.auditResult.classList.remove('hidden');
    dom.auditVerdict.textContent = 'Thinking...';
    dom.auditVerdict.className = '';
    dom.auditHours.textContent = '';
    dom.auditReasoning.textContent = 'Consulting the AI Gods... 🔮';
    dom.btnSaveAudit.style.display = 'none';

    // Get Top Goal context
    let topGoalName = '';
    let topGoalRemaining = 0;
    if (appState.goals.length > 0) {
      topGoalName = appState.goals[0].name;
      topGoalRemaining = appState.goals[0].targetAmount - appState.goals[0].currentSaved;
    }
    
    // Calculate Safe To Spend Context
    const essentialsPct = (appState.user.essentialsPct || 50) / 100;
    const goalsPct = (appState.user.goalsPct || 20) / 100;
    const safeToSpend = appState.user.monthlySalary * (1 - essentialsPct - goalsPct);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item,
          price,
          hourlyWage: appState.user.hourlyWage,
          topGoalName,
          topGoalRemaining,
          safeToSpend
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('API Connect Error Status:', response.status);
        console.error('API Error Payload:', errText);
        throw new Error(`API Connection Failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      
      const aiDecision = data.decision || 'Wait 48h';
      const aiReasoning = data.reasoning || 'The AI was speechless. Just wait 48 hours to be safe.';
      
      let verdictClass = 'verdict-wait';
      if (aiDecision.toLowerCase().includes('buy')) verdictClass = 'verdict-buy';
      if (aiDecision.toLowerCase().includes('pivot')) verdictClass = 'verdict-pivot';

      dom.auditVerdict.textContent = aiDecision;
      dom.auditVerdict.className = verdictClass;
      dom.auditHours.textContent = `Reality Check: This costs ${laborHours.toFixed(1)} hours of your life.`;
      dom.auditReasoning.textContent = `"${aiReasoning}"`;
      dom.btnSaveAudit.style.display = 'inline-block';
      
      // History Saving
      dom.btnSaveAudit.onclick = () => {
        const record = {
          id: 'a_' + Date.now(),
          itemName: item,
          price: price,
          laborHoursCost: laborHours,
          aiDecision: aiDecision,
          timestamp: new Date().toISOString()
        };
        appState.history.unshift(record);
        saveState();
        
        dom.auditForm.reset();
        dom.auditResult.classList.add('hidden');
        
        alert('Audit verified and stored in History! 💸');
        switchTab('dashboard');
      };
    } catch (error) {
      console.error("Caught error in fetch/parse:", error);
      dom.auditVerdict.textContent = 'ERROR 💀';
      dom.auditReasoning.textContent = error.message;
      dom.auditHours.textContent = 'Check the developer console (F12) for exact details!';
      dom.btnSaveAudit.style.display = 'none';
    }
  });
}

// -- Render Functions --
function updateDashboard() {
  dom.wageDisplay.textContent = `$${appState.user.hourlyWage.toFixed(2)} / hr`;
  dom.displaySavings.textContent = `$${appState.user.currentSavings.toLocaleString()}`;
  
  // New Dashboard Calculations
  const essentialsPct = (appState.user.essentialsPct || 50) / 100;
  const goalsPct = (appState.user.goalsPct || 20) / 100;
  const safeToSpend = appState.user.monthlySalary * (1 - essentialsPct - goalsPct);
  
  const safeElem = document.getElementById('display-safe-to-spend');
  if (safeElem) safeElem.textContent = `$${Math.max(0, safeToSpend).toLocaleString()}`;
  
  const today = new Date();
  let payday = new Date(today.getFullYear(), today.getMonth(), 30);
  if (today > payday) payday = new Date(today.getFullYear(), today.getMonth() + 1, 30);
  const diffDays = Math.ceil(Math.abs(payday - today) / (1000 * 60 * 60 * 24));
  
  const payElem = document.getElementById('display-payday');
  if (payElem) payElem.textContent = `${diffDays} days`;
  
  const vibeElem = document.getElementById('display-vibe-status');
  if (vibeElem) {
    if (safeToSpend > 500) vibeElem.textContent = 'Financial King/Queen 👑';
    else if (safeToSpend > 100) vibeElem.textContent = 'Doing Okay 👍';
    else vibeElem.textContent = 'Touching Grass Req\'d 💀';
  }
  
  if (appState.goals.length > 0) {
    const topGoal = appState.goals[0];
    dom.topGoalProgress.innerHTML = `<strong>${topGoal.name}</strong><br>$${topGoal.currentSaved.toLocaleString()} / $${topGoal.targetAmount.toLocaleString()}`;
  } else {
    dom.topGoalProgress.textContent = "No active goals.";
  }

  dom.recentAuditsList.innerHTML = '';
  const recent = appState.history.slice(0, 3);
  if (recent.length === 0) {
    dom.recentAuditsList.innerHTML = '<li>No recent audits. Go calculate something!</li>';
  } else {
    recent.forEach(audit => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${audit.itemName}</strong> - <span style="color:var(--accent-cyan);">${audit.aiDecision}</span> <br> <small>$${audit.price} (${audit.laborHoursCost.toFixed(1)} hrs)</small>`;
      dom.recentAuditsList.appendChild(li);
    });
  }
}

function renderGoals() {
  dom.goalsList.innerHTML = '';
  if (appState.goals.length === 0) {
    dom.goalsList.innerHTML = '<li>You need some big dreams. Add a goal!</li>';
    return;
  }
  
  appState.goals.forEach(goal => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${goal.name}</strong><br>Target: $${goal.targetAmount} (Saved: $${goal.currentSaved})`;
    dom.goalsList.appendChild(li);
  });
}

function renderHistory() {
  dom.historyList.innerHTML = '';
  if (appState.history.length === 0) {
    dom.historyList.innerHTML = '<li>No history yet.</li>';
    return;
  }
  
  appState.history.forEach(audit => {
    const date = new Date(audit.timestamp).toLocaleDateString();
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <strong>${audit.itemName}</strong>
        <span style="color: grey; font-size: 0.8rem;">${date}</span>
      </div>
      <div>$${audit.price} &rarr; <em>${audit.laborHoursCost.toFixed(1)} hrs</em></div>
      <div style="margin-top: 0.5rem; font-weight: bold; color: var(--accent-cyan);">AI Verdict: ${audit.aiDecision}</div>
    `;
    dom.historyList.appendChild(li);
  });
}

// Boot up
init();
