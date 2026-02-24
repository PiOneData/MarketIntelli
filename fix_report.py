import re

path = r'c:\Users\dhara\Music\windlocal\frontend\src\components\ReportView.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove any line that contains ONLY a HelpCircle JSX element (with optional whitespace)
# e.g.   <HelpCircle size={8} className="text-cyan-400" />
lines = content.split('\n')
filtered = [line for line in lines if '<HelpCircle' not in line]

# Also remove HelpCircle from the import line
filtered_joined = '\n'.join(filtered)
filtered_joined = re.sub(r',\s*HelpCircle', '', filtered_joined)

with open(path, 'w', encoding='utf-8') as f:
    f.write(filtered_joined)

removed = len(lines) - len(filtered)
print(f"Removed {removed} HelpCircle line(s). Done.")
