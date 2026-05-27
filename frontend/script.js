// --- GLOBAL STATE ---
let customQuestions = [];
let finalRoleToSave = "";
let currentActiveEventId = null;
let html5QrcodeScanner = null;
let currentAdminEventId = null;
let currentAttendeesData = [];

//GOOGLE SHEETS
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycby_rMXrcRAB-kAvH_BldA-8pucok1T6FmI2NM7-PbecTYcTApk0vUaUhcgvcIjJxtAs/exec";

// --- PAGE NAVIGATION ---
async function showPage(pageId) {
    if (pageId === "start") {
        const qrPage = document.getElementById("qrResultPage");
        if (qrPage && !qrPage.classList.contains("hidden")) {
            return;
        }
    }

    const pages = document.querySelectorAll("section, .page, .dashboard-page");
    pages.forEach(p => p.classList.add("hidden"));

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove("hidden");
    }

    if (pageId !== "adminScanner" && html5QrcodeScanner) {
        try {
            await html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
            const readerEl = document.getElementById("qr-reader");
            if (readerEl) readerEl.innerHTML = "";
            const resultsEl = document.getElementById("qr-reader-results");
            if (resultsEl) resultsEl.innerText = "";
        } catch (err) {
            console.error("Error clearing scanner:", err);
        }
    }

    if (pageId === "adminScanner" && typeof startQRScanner === "function") {
        startQRScanner();
    }

    if (pageId === "adminHome" || pageId === "studentHome") {
        const qrPage = document.getElementById("qrResultPage");
        if (qrPage && !qrPage.classList.contains("hidden")) {
            return;
        }
        
        if (typeof loadEvents === "function") {
            loadEvents();
        }
    }

    if (targetPage && pageId === "qrResultPage") {
        targetPage.style.display = "block";
    }
}

// Helper to reset forms safely since resetPage was missing
function safeResetForm(formId) {
    const form = document.getElementById(formId);
    if (form && typeof form.reset === "function") {
        form.reset();
    }
}


// --- GLOBAL TEXT INPUT FORMATTING ---

document.addEventListener("input", function(e) {

    if (e.target.type === "email" || e.target.id.toLowerCase().includes("email")) {
        e.target.value = e.target.value.toLowerCase();
        return; 
    }

    if (
        e.target.type !== "password" && 
        !e.target.id.toLowerCase().includes("password") &&
        e.target.id !== "description" &&
        e.target.id !== "title" &&
        e.target.id !== "time_limit"
    ) {
        e.target.value = e.target.value.toUpperCase();
    }
});


// --- AUTHENTICATION ENGINES ---
async function studentLogin() {
    const email = document.getElementById('studentEmail').value;
    const password = document.getElementById('studentPassword').value;

    if (!email || !password) {
        return alert("Please enter both email and password.");
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            
            const studentEmail = sessionStorage.getItem("loggedInStudentEmail")?.toLowerCase();
            
            alert("Login successful!");
            showPage('studentHome');
            loadEvents();
        } else {
            const errData = await res.json();
            alert(errData.detail || "Invalid Credentials");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Server connection error.");
    }
}


async function adminLogin() {
    const email = document.querySelector("#adminEmail")?.value;
    const password = document.querySelector("#adminPassword")?.value;

    if (!email || !password) return alert("Please fill in all fields.");
    if (!email.endsWith("@rtu.edu.ph")) return alert("Only RTU institutional email allowed.");

    const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role);
        
        const adminEmail = sessionStorage.getItem("loggedInAdminEmail"); 
        
        alert("Admin Login successful!");
        showPage("adminHome");
    } else {
        alert(data.detail || "Login failed");
    }
}


function validateStep1() {
    const role = document.querySelector('input[name="roleStudent"]:checked')?.value
                || document.querySelector('input[name="roleAdmin"]:checked')?.value;
   
    const name = document.getElementById("studentRegisterName")?.value
                || document.getElementById("adminRegisterName")?.value;
   
    if (!role) return alert("Please select a role.");
    if (!name?.trim()) return alert("Name is required.");  


    if (role === "roleStudent") {
        const studentNumber = document.getElementById("studentNumber")?.value;
        const yearLevel = document.getElementById("yearLevel")?.value;
        const department = document.getElementById("department")?.value;
        const course = document.getElementById("course")?.value;


        if (!studentNumber?.trim() || !yearLevel?.trim() || !department?.trim() || !course?.trim()) {
            return alert("Please complete all information.");
        }
    }


    if (role === "roleAdmin") {
        const adminStudentNumber = document.getElementById("adminStudentNumber")?.value;
        const adminYearLevel = document.getElementById("adminYearLevel")?.value;
        const organization = document.getElementById("organization")?.value;
        const position = document.getElementById("position")?.value;


        if (!adminStudentNumber?.trim() || !adminYearLevel?.trim() || !organization?.trim() || !position?.trim()) {
            return alert("Please complete all information");
        }
    }
    finalRoleToSave = role === "roleAdmin" ? "admin" : "student";
    showPage("accountCreationStep2");
}


async function registerUser() {
    const name = document.getElementById("studentRegisterName")?.value
                || document.getElementById("adminRegisterName")?.value;
    const email = document.getElementById("registerEmail")?.value;
    const password = document.getElementById("registerPassword")?.value;
    const confirmPassword = document.getElementById("registerConfirmPassword")?.value;

    if (!email.endsWith("@rtu.edu.ph")) return alert("Only RTU institutional email allowed.");
    if (password !== confirmPassword) return alert("Passwords do not match");
    if (!name || !name.trim()) return alert("Name is required.");
    if (!finalRoleToSave) return alert("Session error: Please go back to Step 1.");

    let payload = { name, email, password, role: finalRoleToSave };

    if (finalRoleToSave === "student") {
        payload.student_number = document.getElementById("studentNumber")?.value || "";
        payload.year_level = document.getElementById("yearLevel")?.value || "";
        payload.department = document.getElementById("department")?.value || "";
        payload.course = document.getElementById("course")?.value || "";
    } else if (finalRoleToSave === "admin") {
        payload.student_number = document.getElementById("adminStudentNumber")?.value || "";
        payload.year_level = document.getElementById("adminYearLevel")?.value || "";
        payload.organization = document.getElementById("organization")?.value || "";
        payload.position = document.getElementById("position")?.value || "";
    }

    const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Account created successfully!");
        finalRoleToSave = "";
        ["step2Form", "studentRegForm", "adminRegForm"].forEach(safeResetForm);
        showPage("start");
    } else {
        const data = await res.json();
        alert(data.detail || "Registration failed");
    }
}

// --- QR CODE SCANNER SYSTEM ---
let isProcessingScan = false;
async function onScanSuccess(decodedText, decodedResult) {
    if (document.getElementById('qr-reader-results')) {
        document.getElementById('qr-reader-results').innerText = `Scanned ID/Data: ${decodedText}`;
    }

    if (isProcessingScan) return; 
    isProcessingScan = true;

    try {
        const qrData = JSON.parse(decodedText);
        
        const token = localStorage.getItem("token");

        const res = await fetch("http://127.0.0.1:8000/attendance/scan", { 
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({
                ticket_id: qrData.ticket_id,
                event_id: qrData.event_id
            })
        });

        if (typeof html5QrcodeScanner !== 'undefined') {
            await html5QrcodeScanner.clear(); 
        }

        if (res.ok) {
            alert(`Attendance logged successfully for Ticket #${qrData.ticket_id}!`);
            if (qrData.event_id) {
                await loadAttendeesList(qrData.event_id);
                switchAdminTab('attendees');
            }
            
            if (typeof stopScannerAndGoBack === 'function') {
                stopScannerAndGoBack(); 
            }
        } else {
            const errData = await res.json();
            alert("Database Error: " + (errData.detail || "Failed to log attendance."));
        }

    } catch (error) {
        console.error("Scanning Error:", error);
        alert("Invalid QR Code content or Server cannot be reached.");
    }
    stopScannerAndGoBack();
}


function startQRScanner() {
    const qrReaderEl = document.getElementById("qr-reader");
    if (!qrReaderEl) return;


    if (!html5QrcodeScanner) {
        qrReaderEl.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; width: 100%; height: 100%; min-height: 250px; flex: 1; box-sizing: border-box;">
            <p style="font-weight: bold; margin: 0 0 20px 0; color: #555; width: 100%;">Camera Scanner Ready</p>
            <button id="triggerScanBtn" style="background: black; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-block;">START SCANNING</button>
        </div>
        `;


        document.getElementById("triggerScanBtn").addEventListener("click", () => {
            qrReaderEl.innerHTML = "";


            html5QrcodeScanner = new Html5QrcodeScanner(
                "qr-reader",
                {
                    fps: 15,
                    qrbox: { width: 250, height: 250 },
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
                },
                false
            );
            html5QrcodeScanner.render(onScanSuccess, (error) => {});
        });
    }
}


function stopQRScannerEngineOnly() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            html5QrcodeScanner = null;
            if (document.getElementById('qr-reader-results')) {
                document.getElementById('qr-reader-results').innerText = "";
            }
        }).catch(err => {
            console.error(err);
        });
    }
}


function stopScannerAndGoBack() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            html5QrcodeScanner = null;
            document.getElementById('qr-reader-results').innerText = "";
            showPage('adminHome');
        }).catch(err => {
            showPage('adminHome');
        });
    } else {
        showPage('adminHome');
    }
}


document.addEventListener("DOMContentLoaded", () => {
    const toggleButtons = document.querySelectorAll(".toggle-password-btn");


    toggleButtons.forEach(button => {
        button.addEventListener("click", function (e) {
            e.preventDefault();


            const targetId = this.getAttribute("data-target");
            const targetInput = document.getElementById(targetId);


            if (targetInput) {
                const isHidden = targetInput.getAttribute("type") === "password";
                targetInput.setAttribute("type", isHidden ? "text" : "password");
                this.style.opacity = isHidden ? "0.4" : "1.0";
            }
        });
    });
});




// --- EVENT MANAGEMENT & MANAGEMENT PREVIEWS ---
function addQuestion() {
    const container = document.getElementById("questionContainer");
    if (!container) return;

    const div = document.createElement("div");
    div.className = "question-box";
    div.innerHTML = `
        <input type="text" placeholder="Question Text" class="q-text">
        <button type="button" class="add-btn">Add</button>
        <button type="button" class="q-remove">Remove</button>
        <div class="question-preview"><br></div>
    `;
    container.appendChild(div);

    const input = div.querySelector(".q-text");
    const preview = div.querySelector(".question-preview");
    const addBtn = div.querySelector(".add-btn");
    const removeBtn = div.querySelector(".q-remove");
    let savedQuestionText = "";

    addBtn.addEventListener("click", () => {
        const question = input.value.trim();
        if (!question) return alert("Please enter a question");

        savedQuestionText = question;
        customQuestions.push({ question_text: question, question_type: "text" });

        preview.innerHTML = `
            <p>${question}</p>
            <input type="text" placeholder="Your answer" disabled>
        `;
        input.disabled = true;
        addBtn.disabled = true;
    });

    removeBtn.addEventListener("click", () => {
        if (savedQuestionText) {
            customQuestions = customQuestions.filter(q => q.question_text !== savedQuestionText);
        }
        div.remove();
        updateQuestionPreview();
    });
}

function updateQuestionPreview() {
    const container = document.getElementById("questionContainer");
    const preview = document.getElementById("preview-questions");
    if (!container || !preview) return;

    preview.innerHTML = "";
    container.querySelectorAll(".question-box").forEach((q, index) => {
        const text = q.querySelector(".q-text").value;
        if (text.trim() !== "") {
            const p = document.createElement("p");
            p.textContent = `${index + 1}. ${text}`;
            preview.appendChild(p);
        }
    });
}

function helperFormatTime(timeStr) {
    if (!timeStr) return "";
    const [hour, minute] = timeStr.split(":");
    let h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${minute} ${ampm}`;
}

function showFinalPreview() {
    const preview = document.getElementById("finalPreview");
    if (!preview) return;

    const title = document.getElementById("title")?.value || "Event Title";
    const description = document.getElementById("description")?.value || "Event Description";
    const startTime = document.getElementById("startTime")?.value;
    const endTime = document.getElementById("endTime")?.value;

    const timeLimit = (startTime && endTime)
        ? `${helperFormatTime(startTime)} to ${helperFormatTime(endTime)} only`
        : "Not Set";

    preview.style.display = "block";
    preview.innerHTML = `
        <h2>FORM PREVIEW</h2>
        <p><strong>${title}</strong></p>
        <p><strong>${description}</strong></p>
        <p><strong>TIME: </strong>${timeLimit}</p>
        <p>NAME</p> <input type="text" disabled>
        <p>STUDENT NUMBER</p> <input type="text" disabled>
        <p>BLOCK</p> <input type="text" disabled>
        <p>DEPARTMENT</p> <input type="text" disabled>
        <p>COURSE</p> <input type="text" disabled>
        <div id="customQuestionsContainer"></div>
    `;

    const customContainer = document.getElementById("customQuestionsContainer");
    customQuestions.forEach(q => {
        customContainer.innerHTML += `<p>${q.question_text}</p><input type="text" disabled>`;
    });
}

// --- BACKEND API COMMUNICATIONS ---
async function saveQuestions(eventId) {
    for (const q of customQuestions) {
        await fetch(`http://127.0.0.1:8000/events/${eventId}/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question_text: q.question_text,
                question_type: "text",
                required: false
            })
        });
    }
}

async function submitEvent(e) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    try {
        const titleInput = document.getElementById("title");
        const descInput = document.getElementById("description");
        const startTimeInput = document.getElementById("startTime");
        const endTimeInput = document.getElementById("endTime");

        if (!titleInput || !titleInput.value.trim()) return alert("Please enter an event title");

        const finalTimeLimit = (startTimeInput?.value && endTimeInput?.value)
            ? `${helperFormatTime(startTimeInput.value)} to ${helperFormatTime(endTimeInput.value)} only`
            : "Not Set";

        const response = await fetch("http://127.0.0.1:8000/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: titleInput.value,
                description: descInput ? descInput.value : "",
                time_limit: finalTimeLimit,
                venue: "TBA"
            })
        });

        if (!response.ok) return alert("Failed to create event in backend");

        const result = await response.json();
        if (result.id) await saveQuestions(result.id);

        localStorage.setItem("justCreatedEvent", "true");
        alert("Event Created with Questions!");
       
        showPage("adminHome");
        customQuestions = [];
    } catch (error) {
        console.error("Error creating event:", error);
    }
    return false;
}

async function loadEvents() {
    const adminContainer = document.getElementById("adminEventList");
    const studentContainer = document.getElementById("studentEventList");

    if (!adminContainer && !studentContainer) return;

    try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://127.0.0.1:8000/events", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            }
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status}`);
            return;
        }

        const events = await response.json();

        if (adminContainer) adminContainer.innerHTML = "";
        if (studentContainer) studentContainer.innerHTML = "";


        if (Array.isArray(events)) {
            events.forEach(item => {
                if (!item.title && !item.description) return;


                if (studentContainer) {
                    const studentCard = document.createElement("div");
                    studentCard.className = "event-card";
                    studentCard.addEventListener("click", () => {
                        openEventForm(item.id);
                    });
                    studentCard.innerHTML = `
                        <div class="event-title-badge">${item.title || "NO TITLE"}</div>
                        <div class="event-details-group">
                          <div class="event-time-limit">Time Limit: ${item.time_limit || "NOT SET"}</div>
                          <p class="event-description-text">${item.description || "No description available."}</p>
                        </div>
                    `;
                    studentContainer.appendChild(studentCard);
                }            


                if (adminContainer) {
                    const adminCard = document.createElement("div");
                    adminCard.className = "event-card admin-card";
                    adminCard.addEventListener("click", () => {
                        openAdminEventDetail(item.id);
                    });
                    adminCard.innerHTML = `
                        <div class="event-title-badge" style="background-color: #2c3e50;">${item.title || "NO TITLE"}</div>
                        <div class="event-details-group">
                          <div class="event-time-limit">Time Limit: ${item.time_limit || "NOT SET"}</div>
                          <p class="event-description-text">${item.description || "No description available."}</p>


                        </div>
                    `;
                    adminContainer.appendChild(adminCard);
                }
            });
        }
    } catch (error) {
        console.error("Error loading events:", error);
    }
}

async function openEventForm(eventId) {
    try {
        currentActiveEventId = eventId;
       
        const response = await fetch(`http://127.0.0.1:8000/events/${eventId}`);
        if (!response.ok) throw new Error("HTTP request failed");

        const event = await response.json();

        const titleEl = document.getElementById("currentEventTitle");
        const descEl = document.getElementById("currentEventDescription");
        const timeEl = document.getElementById("currentEventTime");

        if (titleEl) titleEl.innerText = event.title || "Untitled Event";
        if (descEl) descEl.innerText = event.description || "";
        if (timeEl) timeEl.innerHTML = `<strong>TIME:</strong> ${event.time_limit || "Not Set"}`;
       
        const questions = event.questions || [];
        const questionsContainer = document.getElementById("questionsContainer");
       
        if (questionsContainer) {
            questionsContainer.innerHTML = "";


            if (questions.length > 0) {
                questions.forEach(q => {
                    const fieldWrapper = document.createElement("div");
                    fieldWrapper.className = "input-field-group";
                    fieldWrapper.style.marginBottom = "20px";
                    fieldWrapper.innerHTML = `
                        <label class="form-label" style="display: block; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; text-align: left; font-size: 14px; color: #333;">
                            ${q.question_text || "Field"}
                        </label>
                        <input type="text"
                               class="form-control student-answer-input"
                               data-question-id="${q.id}"
                               name="question_${q.id}"
                               required
                               style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; background-color: #fafafa; box-sizing: border-box;" />
                    `;
                    questionsContainer.appendChild(fieldWrapper);
                });
            } else {
                questionsContainer.innerHTML = "<p style='color: #777; font-style: italic; text-align: left;'>No fields required for this event.</p>";
            }
        }
       
        document.getElementById("dynamicStudentForm").classList.remove("hidden");
        document.getElementById("qrResultContainer").classList.add("hidden");
       
        showPage("studentEventFormPage");
    } catch (err) {
        alert("An error occurred while loading the event registration form.");
    }
}

async function submitStudentResponse(e) {
    if (e) {
        if (typeof e.preventDefault === "function") e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
    }

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in first.");
        if (typeof showPage === "function") showPage("start");
        return false;
    }

    const answers = [];
    document.querySelectorAll(".student-answer-input").forEach(input => {
        answers.push({
            question_id: input.getAttribute("data-question-id"),
            answer: input.value
        });
    });

    try {
        const res = await fetch("http://127.0.0.1:8000/responses", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ event_id: currentActiveEventId, answers: answers })
        });

        if (!res.ok) {
            const errData = await res.json();
            alert(errData.detail || "Failed to submit answers.");
            return false;
        }

        const responseResult = await res.json();

        const finalTicketId = responseResult && responseResult.id ? responseResult.id : ("TKT-" + Date.now());
        const finalEventId = typeof currentActiveEventId !== "undefined" && currentActiveEventId ? currentActiveEventId : "EVENT";

        const qrDataString = JSON.stringify({
            ticket_id: finalTicketId,
            event_id: finalEventId
        });

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataString)}`;
        
        document.querySelectorAll("section, .page, .dashboard-page").forEach(p => {
            p.classList.add("hidden");
        });

        const qrPage = document.getElementById("qrResultPage");
        if (qrPage) {
            qrPage.classList.remove("hidden");
            qrPage.style.display = "block";
        }

        const qrContainer = document.getElementById("qrResultContainer");
        if (qrContainer) {
            qrContainer.classList.remove("hidden");
            qrContainer.style.display = "block";
        }

        const qrCanvas = document.getElementById("qrcodeCanvas");
        if (qrCanvas) {
            qrCanvas.innerHTML = ""; 

            new QRCode(qrCanvas, {
                text: qrDataString,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }

        return true;
    } catch (error) {
        console.error("Error submitting response:", error);
        alert("Server connection error.");
        return false;
    }
}


async function openAdminEventDetail(eventId) {
    try {
        currentAdminEventId = eventId;
        switchAdminTab('form');
       
        const response = await fetch(`http://127.0.0.1:8000/events/${eventId}`);
        if (!response.ok) throw new Error("Failed to fetch event details");
       
        const event = await response.json();


        const titleEl = document.getElementById("adminEventTitle");
        const timeEl = document.getElementById("adminEventTime");


        if (titleEl) titleEl.innerText = event.title || "Untitled Event";
        if (timeEl) timeEl.innerHTML = `<strong>TIME:</strong> ${event.time_limit || "Not Set"}`;


        const questions = event.questions || [];
        const formContainer = document.getElementById("adminFormQuestionsContainer");
       
        if (formContainer) {
            formContainer.innerHTML = "";
            if (questions.length > 0) {
                questions.forEach(q => {
                    const fieldWrapper = document.createElement("div");
                    fieldWrapper.className = "input-field-group";
                    fieldWrapper.style.marginBottom = "25px";
                    fieldWrapper.innerHTML = `
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; text-align: left; font-size: 14px; color: #333; font-family: sans-serif;">
                            ${q.question_text || "Field"}
                        </label>
                        <input type="text"
                               style="width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; background-color: #f5f5f5; box-sizing: border-box;" />
                    `;
                    formContainer.appendChild(fieldWrapper);
                });
            } else {
                formContainer.innerHTML = "<p style='color: #777; font-style: italic;'>No fields configured.</p>";
            }
        }


        await loadAttendeesList(eventId);
        showPage("adminEventDetailPage");
    } catch (err) {
        alert("An error occurred while loading admin event details.");
    }
}


function switchAdminTab(tabName) {
    const formTab = document.getElementById("adminTabForm");
    const attendeesTab = document.getElementById("adminTabAttendees");
    const formBtn = document.getElementById("tabFormBtn");
    const attendeesBtn = document.getElementById("tabAttendeesBtn");


    if (!formTab || !attendeesTab || !formBtn || !attendeesBtn) return;


    if (tabName === 'form') {
        formTab.classList.remove("hidden");
        attendeesTab.classList.add("hidden");
        formBtn.style.background = "black";
        formBtn.style.color = "white";
        attendeesBtn.style.background = "#f0f0f0";
        attendeesBtn.style.color = "black";
    } else {
        formTab.classList.add("hidden");
        attendeesTab.classList.remove("hidden");
        formBtn.style.background = "#f0f0f0";
        formBtn.style.color = "black";
        attendeesBtn.style.background = "black";
        attendeesBtn.style.color = "white";
    }
}

async function loadAttendeesList(eventId) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/events/${eventId}/attendees`);
        if (!response.ok) throw new Error("Failed to fetch attendees");
       
        currentAttendeesData = await response.json();
        const tableBody = document.getElementById("attendeesTableBody");
       
        if (tableBody) {
            tableBody.innerHTML = "";
           
            if (currentAttendeesData.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #777; font-style: italic;">No attendees registered yet.</td></tr>`;
                return;
            }


            currentAttendeesData.forEach(row => {
                const tr = document.createElement("tr");
                tr.style.borderBottom = "1px solid #dbdbdb";
                tr.innerHTML = `
                    <td style="padding: 12px; border: 1px solid #dbdbdb;">${row.name || "-"}</td>
                    <td style="padding: 12px; border: 1px solid #dbdbdb;">${row.student_number || "-"}</td>
                    <td style="padding: 12px; border: 1px solid #dbdbdb;">${row.block || "-"}</td>
                    <td style="padding: 12px; border: 1px solid #dbdbdb;">${row.department || "-"}</td>
                    <td style="padding: 12px; border: 1px solid #dbdbdb;">${row.course || "-"}</td>
                    <td style="padding: 12px; border: 1px solid #dbdbdb; font-size: 12px; color: #555;">${row.custom_answers || "-"}</td>
                `;
                tableBody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Error loading attendees table:", err);
    }
}


function downloadAttendeesCSV() {
    if (!currentAttendeesData || currentAttendeesData.length === 0) {
        alert("No data available to download.");
        return;
    }


    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "NAME,STUDENT NUMBER,BLOCK,DEPARTMENT,COURSE,ADDITIONAL ANSWERS\n";


    currentAttendeesData.forEach(row => {
        let cleanCustom = (row.custom_answers || "").replace(/"/g, '""');
        let line = `"${row.name || ''}","${row.student_number || ''}","${row.block || ''}","${row.department || ''}","${row.course || ''}","${cleanCustom}"`;
        csvContent += line + "\n";
    });


    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendees_Event_${currentAdminEventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


function loadStudentAccountDetails() {
    document.getElementById("viewStudentName").innerText = "STUDENT ACC";
    document.getElementById("viewStudentNumber").innerText = "2025-200469";
    document.getElementById("viewYearLevel").innerText = "2";
    document.getElementById("viewDepartment").innerText = "ICS";
    document.getElementById("viewCourse").innerText = "IT";
    document.getElementById("viewEmail").innerText = "2025-200469@rtu.edu.ph";
    
    showPage("studentAccount");
}

function loadAdminAccountDetails() {
    document.getElementById("viewAdminName").innerText = "ADMIN ACCOUNT";
    document.getElementById("viewAdminStudentNumber").innerText = "2024-100469";
    document.getElementById("viewAdminYearLevel").innerText = "2";
    document.getElementById("viewAdminOrganization").innerText = "ICS";
    document.getElementById("viewAdminPosition").innerText = "MEMBER";
    document.getElementById("viewAdminEmail").innerText = "2024-100469@rtu.edu.ph";
    
    showPage("adminAccount");
}