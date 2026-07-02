@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Please right-click this file and choose "Run as administrator".
  pause
  exit /b 1
)

echo Disabling old inbound block rules for Node.js...
netsh advfirewall firewall set rule name="Node.js JavaScript Runtime" dir=in new enable=no

echo Adding allow rule for Prompt Gallery Admin on TCP 8787...
netsh advfirewall firewall add rule name="Prompt Gallery Admin 8787" dir=in action=allow protocol=TCP localport=8787 profile=private

echo.
echo Done. Try opening this address on iPad while on the same Wi-Fi:
echo http://192.168.0.119:8787/admin
echo.
pause