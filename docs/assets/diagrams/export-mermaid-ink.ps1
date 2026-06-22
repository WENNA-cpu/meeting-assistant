# 通过 mermaid.ink 导出中文流程图（Kroki 缺中文字体会显示 ???）
$dir = "E:\AiMeetWise\docs\assets\diagrams"
$imgDir = "E:\AiMeetWise\docs\images"
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
python (Join-Path $dir "export_mermaid_ink.py")
