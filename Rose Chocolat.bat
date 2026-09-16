@echo off
start "" /min "C:\Users\ASUS\AppData\Local\ms-playwright-go\1.57.0\node.exe" "C:\Users\ASUS\.gemini\antigravity-ide\scratch\rose_chocolat\server.js"
timeout /t 2 /nobreak > nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:3000"
