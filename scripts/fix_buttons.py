import os
import re
import glob

def fix_button_text(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Find buttons with bg-gradient and text-slate-900 and replace with text-white
    # But since it's tailwind classes, let's just do a simple string replace for all lines that have bg-gradient and text-slate-900
    
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        if 'bg-gradient' in line and 'text-slate-900' in line:
            line = line.replace('text-slate-900', 'text-white')
        new_lines.append(line)
        
    with open(file_path, 'w') as f:
        f.write('\n'.join(new_lines))

features_dir = "/home/aspl96/caredata/CareData-Intelligence/frontend/src/features"
for root, dirs, files in os.walk(features_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_button_text(os.path.join(root, file))
