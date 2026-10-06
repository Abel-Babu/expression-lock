import re
with open('src/portal.js', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

text = re.sub(r'<li class="active">.*?Pending Approvals', '<li class="active">⏱️ Pending Approvals', text)
text = re.sub(r'<li>.*?Accounts', '<li>💼 Accounts', text)
text = re.sub(r'<li>.*?Wire Transfers', '<li>💸 Wire Transfers', text)
text = re.sub(r'<li>.*?Audit Logs', '<li>📜 Audit Logs', text)
text = re.sub(r'<li>.*?Settings', '<li>⚙️ Settings', text)

with open('src/portal.js', 'w', encoding='utf-8') as f:
    f.write(text)
