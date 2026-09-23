@echo off
cd /d "%~dp0"
start "" http://localhost:8080/student.html
python -m http.server 8080
