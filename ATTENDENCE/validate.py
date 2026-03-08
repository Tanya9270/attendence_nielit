with open('Presentation.tex', 'r', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')
print(f'Total lines: {len(lines)}')

opens = content.count('{')
closes = content.count('}')
print(f'Open braces: {opens}, Close braces: {closes}, Balanced: {opens == closes}')

import re
frames = len(re.findall(r'\\begin\{frame', content))
endframes = len(re.findall(r'\\end\{frame', content))
sectionslides = content.count('\\sectionslide{')
titleslides = content.count('\\titleslide')
# section slides have their own \begin{frame} inside the command definition
print(f'Regular frames: {frames}, End frames: {endframes}')
print(f'Section slide calls: {sectionslides}, Title slide calls: {titleslides}')
# Each sectionslide/titleslide adds 1 frame via the definition
# The definition itself has \begin{frame} so those are already counted in frames
# We need total unique slides = frames (from direct \begin{frame}) + sectionslide calls + titleslide calls
# But the definition includes \begin{frame}, and each call expands to one \begin{frame}
# Let's count just the invocations in the document body
doc_start = content.find('\\begin{document}')
doc_body = content[doc_start:]
body_frames = len(re.findall(r'\\begin\{frame', doc_body))
body_ends = len(re.findall(r'\\end\{frame', doc_body))
body_sections = doc_body.count('\\sectionslide{')
body_titles = doc_body.count('\\titleslide')
print(f'Body: {body_frames} begin frames + {body_sections} sectionslide + {body_titles} titleslide')
print(f'Total slides = {body_frames + body_sections + body_titles}')

imgs = re.findall(r'includegraphics.*?\{(.*?)\}', content)
print(f'Images referenced ({len(imgs)}):')
import os
for img in sorted(set(imgs)):
    e = os.path.exists(img)
    print(f'  {img}: {"OK" if e else "MISSING"}')
