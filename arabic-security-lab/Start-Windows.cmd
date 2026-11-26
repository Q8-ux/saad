@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 lab.py
) else (
  where python >nul 2>nul
  if not errorlevel 1 (
    python lab.py
  ) else (
    echo يحتاج تشغيل المصدر إلى Python 3.10 أو أحدث. استخدم نسخة EXE الجاهزة من إصدارات المشروع.
    pause
  )
)
