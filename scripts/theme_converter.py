import os
import re

def convert_to_light_mode(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Define the mapping of dark mode classes to light mode classes
    replacements = [
        # Backgrounds
        (r'bg-slate-900(/[\d]+)?', 'bg-white'),
        (r'bg-slate-950(/[\d]+)?', 'bg-slate-50'),
        (r'bg-slate-800(/[\d]+)?', 'bg-slate-50'),
        (r'bg-slate-700(/[\d]+)?', 'bg-slate-100'),
        (r'bg-black(/[\d]+)?', 'bg-slate-900/30'), # For overlays
        
        # specific dark gradients
        (r'bg-gradient-to-r from-slate-900 via-\[#[0-9a-f]+\] to-slate-900', 'bg-white'),
        (r'bg-gradient-to-b from-\[#[0-9a-f]+\] to-\[#[0-9a-f]+\]', 'bg-white'),
        (r'bg-\[#[0-9a-f]+\]', 'bg-white'),

        # Borders
        (r'border-slate-800(/[\d]+)?', 'border-slate-200'),
        (r'border-slate-700(/[\d]+)?', 'border-slate-200'),
        (r'border-slate-600(/[\d]+)?', 'border-slate-300'),
        
        # Text colors
        (r'text-white', 'text-slate-900'),
        (r'text-slate-200', 'text-slate-700'),
        (r'text-slate-300', 'text-slate-600'),
        (r'text-slate-400', 'text-slate-500'),
        (r'text-slate-500', 'text-slate-400'),
        
        # Divide
        (r'divide-slate-800(/[\d]+)?', 'divide-slate-100'),
        
        # Specific component adjustments (v0 style)
        (r'rounded-xl', 'rounded-2xl'),
        (r'shadow-xl', 'shadow-sm'),
        (r'shadow-lg', 'shadow-sm'),
        (r'shadow-md', 'shadow-sm'),
        (r'shadow-2xl', 'shadow-[0_8px_30px_rgb(0,0,0,0.12)]'),
        
        # Tones - making sure icons and badges look right
        # Instead of just replacing, we might need manual regex for the badges if they use 500/10 etc.
        (r'bg-cyan-500/10', 'bg-cyan-100'),
        (r'border-cyan-500/30', 'border-cyan-200'),
        (r'border-cyan-500/20', 'border-cyan-200'),
        (r'text-cyan-400', 'text-cyan-600'),
        (r'text-cyan-300', 'text-cyan-700'),
        (r'bg-cyan-500/5', 'bg-cyan-50/50'),
        (r'bg-cyan-500/20', 'bg-cyan-100'),
        (r'border-cyan-500/60', 'border-cyan-300'),

        (r'bg-emerald-500/10', 'bg-emerald-100'),
        (r'border-emerald-500/30', 'border-emerald-200'),
        (r'border-emerald-500/20', 'border-emerald-200'),
        (r'text-emerald-400', 'text-emerald-600'),

        (r'bg-amber-500/10', 'bg-amber-100'),
        (r'border-amber-500/30', 'border-amber-200'),
        (r'border-amber-500/20', 'border-amber-200'),
        (r'text-amber-400', 'text-amber-600'),

        (r'bg-rose-500/10', 'bg-rose-100'),
        (r'border-rose-500/30', 'border-rose-200'),
        (r'border-rose-500/20', 'border-rose-200'),
        (r'text-rose-400', 'text-rose-600'),
        
        (r'bg-blue-500/10', 'bg-blue-100'),
        (r'border-blue-500/30', 'border-blue-200'),
        (r'border-blue-500/20', 'border-blue-200'),
        (r'text-blue-400', 'text-blue-600'),

        (r'bg-purple-500/10', 'bg-purple-100'),
        (r'border-purple-500/30', 'border-purple-200'),
        (r'border-purple-500/20', 'border-purple-200'),
        (r'text-purple-400', 'text-purple-600'),
    ]

    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)

    with open(file_path, 'w') as f:
        f.write(content)

# Apply to all features
import glob
features_dir = "/home/aspl96/caredata/CareData-Intelligence/frontend/src/features"
for root, dirs, files in os.walk(features_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            # Skip datasets since we already did it manually
            if "datasets" in root:
                continue
            # Skip dashboard since we did it
            if "dashboard" in root:
                continue
            convert_to_light_mode(os.path.join(root, file))
