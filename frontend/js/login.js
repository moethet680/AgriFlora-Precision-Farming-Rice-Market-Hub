// frontend/js/login.js

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Page dynamic ဖြစ်အောင် reload ဖြစ်ခြင်းကို တားဆီးရန်

            const phone = document.getElementById("phoneInput").value.trim();
            const pin = document.getElementById("pinInput").value.trim();

            if (!phone || !pin) {
                alert("ဖုန်းနံပါတ်နှင့် PIN ကို ပြည့်စုံစွာ ဖြည့်သွင်းပါ ငြိမ်း။");
                return;
            }

            const loginData = {
                phone: phone,
                pin: pin
            };

            // Backend Flask API ဆီသို့ Login စစ်ဆေးရန် တောင်းဆိုခြင်း
            fetch("http://127.0.0.1:5000/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(loginData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    // အကောင့်ဝင်မှုအောင်မြင်ပါက Token သို့မဟုတ် User Info ကို သိမ်းဆည်းခြင်း
                    localStorage.setItem("userToken", data.token);
                    localStorage.setItem("userName", data.name);
                    
                    alert(`ကြိုဆိုပါသည် ${data.name} ရေ...`);
                    
                    // ⭐️ အောင်မြင်ရင် Dashboard စာမျက်နှာ (သို့) ပင်မ View သို့ ရွှေ့မည်
                    window.location.href = "dashboard.html"; 
                } else {
                    alert("အကောင့်ဝင်ရန် ပျက်ကွက်ပါသည်: " + data.reason);
                }
            })
            .catch(err => {
                console.error("Login Error:", err);
                alert("ဆာဗာနှင့် ချိတ်ဆက်၍ မရပါ ငြိမ်း။");
            });
        });
    }
});