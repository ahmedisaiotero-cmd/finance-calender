@echo off
cd /d "%~dp0"
if exist shared rmdir shared
mklink /J shared ..\lib
echo Linked sync-ios\shared -> ..\lib
