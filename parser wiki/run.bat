@echo off
REM Converts the saved wiki HTML pages to clean Markdown (default paths, see README.md).
python "%~dp0wiki_to_md.py" %*
pause
