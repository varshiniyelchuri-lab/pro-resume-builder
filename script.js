let currentResumeId = null;
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// DOM Elements
const views = document.querySelectorAll('.view');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateNavUI();
    setupRouting();
    setupAuthListeners();
    setupBuilderListeners();
});

function updateNavUI() {
    const isAuth = !!authToken;
    document.getElementById('nav-dashboard').style.display = isAuth ? 'inline' : 'none';
    document.getElementById('nav-logout').style.display = isAuth ? 'inline' : 'none';
    document.getElementById('nav-login').style.display = isAuth ? 'none' : 'inline';
    document.getElementById('nav-register').style.display = isAuth ? 'none' : 'inline';
}

function navigateTo(route) {
    if ((route === 'dashboard' || route === 'builder') && !authToken) {
        alert('Please login first to access this feature.');
        route = 'login';
    }

    views.forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(`view-${route}`);
    if(targetView) targetView.classList.add('active');
    
    if (route === 'dashboard') loadDashboard();
    if (route === 'builder' && !currentResumeId) clearBuilderForm();
}

function setupRouting() {
    document.body.addEventListener('click', (e) => {
        const route = e.target.getAttribute('data-route') || (e.target.closest('[data-route]') && e.target.closest('[data-route]').getAttribute('data-route'));
        if (route) {
            e.preventDefault();
            navigateTo(route);
        }
    });

    document.querySelectorAll('[data-action="go-to-builder"]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentResumeId = null; // New resume
            navigateTo('builder');
        });
    });

    document.getElementById('nav-logout').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

// Authentication Handlers
function setupAuthListeners() {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = e.target.querySelector('button');
        btn.innerText = 'Loading...';
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.msg || 'Login failed');
            
            finishLogin(data.token, data.user);
        } catch (err) {
            alert(err.message);
        } finally {
            btn.innerText = 'Login';
        }
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const btn = e.target.querySelector('button');
        btn.innerText = 'Loading...';

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.msg || 'Registration failed');
            
            finishLogin(data.token, data.user);
        } catch (err) {
            alert(err.message);
        } finally {
            btn.innerText = 'Register';
        }
    });
}

function finishLogin(token, user) {
    authToken = token;
    currentUser = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    updateNavUI();
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    navigateTo('dashboard');
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNavUI();
    navigateTo('home');
}

// Storage Helpers (API)
async function getSavedResumes() {
    try {
        const res = await fetch('/api/resumes', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to fetch resumes');
        return await res.json();
    } catch(e) {
        console.error(e);
        return [];
    }
}

async function saveResumeToStorage(resumeData) {
    const url = currentResumeId ? `/api/resumes/${currentResumeId}` : '/api/resumes';
    const method = currentResumeId ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(resumeData)
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.msg || 'Failed to save');
        currentResumeId = data._id; // update ID from mongo
        return true;
    } catch (err) {
        alert(err.message);
        return false;
    }
}

// Dashboard Handlers
async function loadDashboard() {
    const list = document.getElementById('resume-list');
    list.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading resumes...</p>';
    
    const resumes = await getSavedResumes();
    
    if (resumes.length === 0) {
        list.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No resumes found. Create your first one!</p>';
        return;
    }

    list.innerHTML = '';
    resumes.forEach(resume => {
        const card = document.createElement('div');
        card.className = 'resume-card';
        card.innerHTML = `
            <h3>${resume.personalInfo.fullName || 'Untitled Resume'}</h3>
            <p>Template: ${resume.template}</p>
            <p>Last Updated: ${new Date(resume.updatedAt || resume.createdAt || Date.now()).toLocaleDateString()}</p>
            <div class="resume-card-actions">
                <button class="btn-primary btn-sm" onclick="editResume('${resume._id}')">Edit</button>
                <button class="btn-secondary btn-sm" onclick="deleteResume('${resume._id}')">Delete</button>
            </div>
        `;
        list.appendChild(card);
    });
}

window.editResume = async (id) => {
    currentResumeId = id;
    const resumes = await getSavedResumes();
    const resume = resumes.find(r => r._id === id);
    if (resume) {
        navigateTo('builder');
        populateBuilderForm(resume);
    }
};

window.deleteResume = async (id) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
        const res = await fetch(`/api/resumes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if(!res.ok) {
            const data = await res.json();
            throw new Error(data.msg || 'Failed to delete');
        }
        loadDashboard();
    } catch (err) {
        alert(err.message);
    }
};

// Builder Actions & Real-time Preview Engine
function setupBuilderListeners() {
    // Accordion
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Real-time Input Reflection
    document.querySelectorAll('.live-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const previewId = e.target.getAttribute('data-preview');
            if (previewId) {
                const previewEl = document.getElementById(previewId);
                if (previewId === 'p-skills') {
                    // special handling for skills mapping
                    renderSkills(e.target.value);
                } else {
                    previewEl.innerText = e.target.value;
                }
            }
        });
    });

    // Template Change
    document.getElementById('b-template').addEventListener('change', (e) => {
        const container = document.getElementById('resume-preview-container');
        container.className = e.target.value;
    });

    // Dynamic Lists
    document.getElementById('add-experience').addEventListener('click', () => addExperienceField());
    document.getElementById('add-education').addEventListener('click', () => addEducationField());

    // Profile Photo Upload handling
    document.getElementById('b-photo').addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.getElementById('p-photo');
                img.src = e.target.result;
                img.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            const img = document.getElementById('p-photo');
            img.removeAttribute('src');
            img.style.display = 'none';
        }
    });

    // Save
    document.getElementById('save-resume').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.innerText = 'Saving...';
        btn.disabled = true;
        const data = getFormData();
        const success = await saveResumeToStorage(data);
        if (success) {
            alert('Resume saved successfully!');
        }
        btn.innerText = 'Save Resume';
        btn.disabled = false;
    });

    // Download PDF
    document.getElementById('download-pdf').addEventListener('click', () => {
        const element = document.getElementById('resume-preview-container');
        const opt = {
            margin:       0,
            filename:     `${document.getElementById('b-fullname').value || 'resume'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'pt', format: 'a4', orientation: 'portrait' }
        };
        // Quick disable shadow for PDF
        const originalShadow = element.style.boxShadow;
        element.style.boxShadow = 'none';
        html2pdf().set(opt).from(element).save().then(() => {
            element.style.boxShadow = originalShadow;
        });
    });
}

function renderSkills(skillsStr) {
    const container = document.getElementById('p-skills');
    container.innerHTML = '';
    const skills = skillsStr.split(',').map(s => s.trim()).filter(s => s);
    skills.forEach(skill => {
        const span = document.createElement('span');
        span.className = 'skill-badge';
        span.innerText = skill;
        container.appendChild(span);
    });
}

// Experience Dynamic Fields
let expCount = 0;
function addExperienceField(data = {}) {
    expCount++;
    const id = `exp-${expCount}`;
    const list = document.getElementById('experience-list');
    const div = document.createElement('div');
    div.className = 'list-item';
    div.id = id;
    div.innerHTML = `
        <button type="button" class="remove-btn" onclick="document.getElementById('${id}').remove(); updateExperiencePreview()">X</button>
        <div class="form-group"><label>Job Title</label><input type="text" class="exp-title" value="${data.jobTitle || ''}" oninput="updateExperiencePreview()"></div>
        <div class="form-group"><label>Company</label><input type="text" class="exp-company" value="${data.company || ''}" oninput="updateExperiencePreview()"></div>
        <div class="form-group"><label>Duration</label><input type="text" class="exp-duration" value="${data.duration || ''}" oninput="updateExperiencePreview()"></div>
        <div class="form-group"><label>Description</label><textarea class="exp-desc" oninput="updateExperiencePreview()">${data.description || ''}</textarea></div>
    `;
    list.appendChild(div);
    updateExperiencePreview();
}

window.updateExperiencePreview = () => {
    const container = document.getElementById('p-experience');
    container.innerHTML = '';
    document.querySelectorAll('#experience-list .list-item').forEach(item => {
        const title = item.querySelector('.exp-title').value;
        const company = item.querySelector('.exp-company').value;
        const duration = item.querySelector('.exp-duration').value;
        const desc = item.querySelector('.exp-desc').value;

        if (title || company) {
            const div = document.createElement('div');
            div.className = 'exp-item';
            div.innerHTML = `
                <div class="item-header"><span>${title}</span> <span>${duration}</span></div>
                <div class="item-company">${company}</div>
                <div class="item-desc">${desc}</div>
            `;
            container.appendChild(div);
        }
    });
};

// Education Dynamic Fields
let eduCount = 0;
function addEducationField(data = {}) {
    eduCount++;
    const id = `edu-${eduCount}`;
    const list = document.getElementById('education-list');
    const div = document.createElement('div');
    div.className = 'list-item';
    div.id = id;
    div.innerHTML = `
        <button type="button" class="remove-btn" onclick="document.getElementById('${id}').remove(); updateEducationPreview()">X</button>
        <div class="form-group"><label>Degree</label><input type="text" class="edu-degree" value="${data.degree || ''}" oninput="updateEducationPreview()"></div>
        <div class="form-group"><label>College/University</label><input type="text" class="edu-college" value="${data.college || ''}" oninput="updateEducationPreview()"></div>
        <div class="form-group"><label>Year</label><input type="text" class="edu-year" value="${data.year || ''}" oninput="updateEducationPreview()"></div>
    `;
    list.appendChild(div);
    updateEducationPreview();
}

window.updateEducationPreview = () => {
    const container = document.getElementById('p-education');
    container.innerHTML = '';
    document.querySelectorAll('#education-list .list-item').forEach(item => {
        const degree = item.querySelector('.edu-degree').value;
        const college = item.querySelector('.edu-college').value;
        const year = item.querySelector('.edu-year').value;

        if (degree || college) {
            const div = document.createElement('div');
            div.className = 'edu-item';
            div.innerHTML = `
                <div class="item-header"><span>${degree}</span> <span>${year}</span></div>
                <div class="item-company">${college}</div>
            `;
            container.appendChild(div);
        }
    });
};

const getFormData = () => {
    const expData = Array.from(document.querySelectorAll('#experience-list .list-item')).map(item => ({
        jobTitle: item.querySelector('.exp-title').value,
        company: item.querySelector('.exp-company').value,
        duration: item.querySelector('.exp-duration').value,
        description: item.querySelector('.exp-desc').value
    }));

    const eduData = Array.from(document.querySelectorAll('#education-list .list-item')).map(item => ({
        degree: item.querySelector('.edu-degree').value,
        college: item.querySelector('.edu-college').value,
        year: item.querySelector('.edu-year').value
    }));

    return {
        template: document.getElementById('b-template').value,
        personalInfo: {
            fullName: document.getElementById('b-fullname').value,
            email: document.getElementById('b-email').value,
            phone: document.getElementById('b-phone').value,
            address: document.getElementById('b-address').value,
            linkedin: document.getElementById('b-linkedin').value,
            portfolio: document.getElementById('b-portfolio').value,
            objective: document.getElementById('b-summary').value,
            photo: document.getElementById('p-photo').getAttribute('src') || ''
        },
        experience: expData,
        education: eduData,
        skills: document.getElementById('b-skills').value.split(',').map(s=>s.trim()).filter(s=>s)
    };
};

function clearBuilderForm() {
    document.getElementById('builder-form').reset();
    document.getElementById('experience-list').innerHTML = '';
    document.getElementById('education-list').innerHTML = '';
    expCount = 0;
    eduCount = 0;
    
    document.getElementById('b-photo').value = '';
    document.getElementById('p-photo').removeAttribute('src');
    document.getElementById('p-photo').style.display = 'none';
    
    document.getElementById('p-fullname').innerText = 'John Doe';
    document.getElementById('p-email').innerText = 'john@example.com';
    document.getElementById('p-phone').innerText = '+1 234 567 890';
    document.getElementById('p-address').innerText = 'New York, USA';
    document.getElementById('p-summary').innerText = 'Experienced professional with a passion for web development.';
    document.getElementById('p-experience').innerHTML = '';
    document.getElementById('p-education').innerHTML = '';
    document.getElementById('p-skills').innerHTML = '';
    
    document.getElementById('b-template').dispatchEvent(new Event('change'));
}

function populateBuilderForm(resume) {
    clearBuilderForm();
    document.getElementById('b-template').value = resume.template || 'template1';
    document.getElementById('b-fullname').value = resume.personalInfo.fullName || '';
    document.getElementById('b-email').value = resume.personalInfo.email || '';
    document.getElementById('b-phone').value = resume.personalInfo.phone || '';
    document.getElementById('b-address').value = resume.personalInfo.address || '';
    document.getElementById('b-linkedin').value = resume.personalInfo.linkedin || '';
    document.getElementById('b-portfolio').value = resume.personalInfo.portfolio || '';
    document.getElementById('b-summary').value = resume.personalInfo.objective || '';
    document.getElementById('b-skills').value = (resume.skills || []).join(', ');

    if (resume.personalInfo.photo) {
        document.getElementById('p-photo').src = resume.personalInfo.photo;
        document.getElementById('p-photo').style.display = 'block';
    } else {
        document.getElementById('p-photo').removeAttribute('src');
        document.getElementById('p-photo').style.display = 'none';
    }

    // Manually trigger visual updates for basic fields
    document.getElementById('p-fullname').innerText = resume.personalInfo.fullName || 'Your Name';
    document.getElementById('p-email').innerText = resume.personalInfo.email || 'email@example.com';
    document.getElementById('p-phone').innerText = resume.personalInfo.phone || '';
    document.getElementById('p-address').innerText = resume.personalInfo.address || '';
    document.getElementById('p-summary').innerText = resume.personalInfo.objective || '';
    renderSkills(document.getElementById('b-skills').value);
    
    document.getElementById('b-template').dispatchEvent(new Event('change'));

    // Populate Dynamic Lists
    if(resume.experience && resume.experience.length) {
        resume.experience.forEach(exp => addExperienceField(exp));
    }
    if(resume.education && resume.education.length) {
        resume.education.forEach(edu => addEducationField(edu));
    }
}
