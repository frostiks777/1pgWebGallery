@echo off
rem Telegram-bridge launcher (long-polling). Token and chat_id come from telegram-bot\.env
cd /d "%~dp0"
title Telegram-bridge bot
node bot.mjs
pause
