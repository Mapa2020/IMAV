Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = Chr(34) & currentDir & "\iniciar_imav.bat" & Chr(34)
' Ejecutar de forma invisible (0) y sin bloquear
WshShell.Run batPath, 0, False
