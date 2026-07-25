@echo off
REM Wrapper script to run npm with Node from D:\ drive
setlocal enabledelayedexpansion
set PATH=D:\;%PATH%
call D:\npm.cmd %*
