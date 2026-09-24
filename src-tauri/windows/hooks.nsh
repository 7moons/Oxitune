; Oscilla used to be called YTMD. Installing Oscilla (also as an update from
; YTMD) removes the old YTMD install so the two don't sit side by side. Its
; uninstaller runs silently, which keeps user data: the settings folder
; (moved to ~/.oscilla by Oscilla itself) and the WebView data (YouTube Music
; sign-in), which both apps share through the unchanged identifier.
!macro NSIS_HOOK_PREINSTALL
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\YTMD" "UninstallString"
  ReadRegStr $1 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\YTMD" "InstallLocation"
  ${If} $0 != ""
    ${If} $1 != ""
      ; _?= makes the uninstaller run in place, so ExecWait really waits.
      ExecWait '$0 /S _?=$1'
      Delete "$1\uninstall.exe"
      RMDir "$1"
    ${Else}
      ExecWait '$0 /S'
    ${EndIf}
  ${EndIf}
!macroend
