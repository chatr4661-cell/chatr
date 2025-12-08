@rem Gradle wrapper batch script for Windows
@echo off
setlocal

set DIRNAME=%~dp0
set APP_HOME=%DIRNAME%

java -jar "%APP_HOME%\gradle\wrapper\gradle-wrapper.jar" %*

endlocal
