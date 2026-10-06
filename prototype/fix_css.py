with open('style.css', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('.top-header h2 { margin: 0; font-weight: 600; color: var(--white); }',
                    '.top-header h2 { margin: 0; font-weight: 600; color: var(--primary-orange); }')
text = text.replace('.history-panel h3 { margin-bottom: 1.5rem; color: var(--white); font-weight: 600; }',
                    '.history-panel h3 { margin-bottom: 1.5rem; color: var(--primary-orange); font-weight: 600; }')

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(text)
